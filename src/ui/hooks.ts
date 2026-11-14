import { useCallback, useEffect, useRef, useState } from 'react';

/** Duración de las transiciones de salida (debe coincidir con --t-out en styles/tokens.css). */
export const EXIT_MS = 220;

/**
 * Mantiene montado un elemento mientras se reproduce su animación de cierre.
 * `mounted` indica si hay que renderizarlo; `open` si debe verse abierto.
 */
export function useExit(open: boolean, ms: number = EXIT_MS) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      // un fotograma después, para que la transición de entrada parta del estado cerrado
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
    const id = window.setTimeout(() => setMounted(false), ms);
    return () => window.clearTimeout(id);
  }, [open, ms]);
  return { mounted, open: open && shown };
}

/** ¿Coincide la consulta de medios? (p. ej. pantallas angostas). */
export function useMediaQuery(query: string): boolean {
  const get = () => typeof window !== 'undefined' && window.matchMedia(query).matches;
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return matches;
}

/** Tamaño de un elemento, actualizado al cambiar. */
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

export interface Toast {
  id: number;
  text: string;
  tone: 'good' | 'warn' | 'info';
  leaving: boolean;
}

const toneOf = (text: string): Toast['tone'] => {
  if (/quiebra|paga|preso|Cárcel|rechaza/i.test(text)) return 'warn';
  if (/compra|cobra|gana|cierran|SALIDA/i.test(text)) return 'good';
  return 'info';
};

/**
 * Convierte las entradas nuevas del historial de la partida en avisos breves.
 * No inventa nada: cada aviso es una línea que el juego ya registró.
 */
export function useToasts(log: string[], ms = 4200) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seen = useRef(log.length);
  const nextId = useRef(1);

  useEffect(() => {
    if (log.length <= seen.current) {
      seen.current = log.length;
      return;
    }
    const fresh = log.slice(seen.current).slice(-3);
    seen.current = log.length;
    const added = fresh.map<Toast>((text) => ({ id: nextId.current++, text, tone: toneOf(text), leaving: false }));
    setToasts((all) => [...all, ...added].slice(-2));
    for (const t of added) {
      window.setTimeout(() => setToasts((all) => all.map((x) => (x.id === t.id ? { ...x, leaving: true } : x))), ms - EXIT_MS);
      window.setTimeout(() => setToasts((all) => all.filter((x) => x.id !== t.id)), ms);
    }
  }, [log, ms]);

  const dismiss = useCallback((id: number) => {
    setToasts((all) => all.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
    window.setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), EXIT_MS);
  }, []);

  return { toasts, dismiss };
}

export interface DrawnCardInfo {
  key: number;
  player: string;
  text: string;
  effect: string;
}

const CARD_LINE = /^(.+?) saca una tarjeta: «(.+?)» ?(.*)$/;

/** Última tarjeta que el historial registra como sacada (si la hay). */
export function useDrawnCard(log: string[]): DrawnCardInfo | null {
  const [card, setCard] = useState<DrawnCardInfo | null>(null);
  const seen = useRef(log.length);
  useEffect(() => {
    if (log.length <= seen.current) {
      seen.current = log.length;
      return;
    }
    const fresh = log.slice(seen.current);
    seen.current = log.length;
    for (const line of fresh) {
      const m = CARD_LINE.exec(line);
      if (m) setCard({ key: log.length, player: m[1], text: m[2], effect: m[3] });
    }
  }, [log]);
  return card;
}

/** Recorrido que acaba de elegir un jugador: lo guarda la interfaz para animar la ficha por las calles. */
export interface Trail {
  player: number;
  path: string[];
  key: number;
}

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Posición que se muestra de cada ficha. Cuando un jugador se mueve, la ficha pasa por cada casilla del
 * recorrido que se eligió (en vez de cruzar en línea recta) y termina en la posición real del juego.
 * Es solo presentación: el estado del juego ya tiene la posición final.
 */
export function useShownPositions(ats: string[], trail: Trail | null, onStep?: () => void, stepMs = 150): string[] {
  const [shown, setShown] = useState(ats);
  const shownRef = useRef(ats);
  const handled = useRef(0);
  const timers = useRef<number[]>([]);
  const atsKey = ats.join('|');
  const stepRef = useRef(onStep);
  stepRef.current = onStep;

  useEffect(() => {
    const target = atsKey.split('|');
    const commit = (next: string[]) => {
      shownRef.current = next;
      setShown(next);
    };
    const changed = target.findIndex((a, k) => a !== shownRef.current[k]);
    if (changed < 0) return;
    const path = trail && trail.key !== handled.current && trail.player === changed ? trail.path.slice(1) : null;
    if (!path || path.length === 0 || prefersReducedMotion()) {
      commit(target);
      return;
    }
    handled.current = trail!.key;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = path.map((square, n) =>
      window.setTimeout(() => {
        commit(shownRef.current.map((s, k) => (k === changed ? square : s)));
        stepRef.current?.();
      }, (n + 1) * stepMs),
    );
    // Al final la ficha queda en la posición real del juego (por si una tarjeta la movió después).
    timers.current.push(window.setTimeout(() => commit(target), (path.length + 1) * stepMs));
  }, [atsKey, trail, stepMs]);

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );
  return shown;
}
