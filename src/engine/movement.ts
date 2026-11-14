import type { Board, Segment } from './board';
import { legalMoves } from './traffic';

/** SALIDA: la Estación, esquina de 11 Oriente con 2 Sur. Al pasar por ella se cobra. */
export const START_NODE = '11-oriente/2-sur';
/** Esquina "A LA CÁRCEL": quien cae aquí va a la Cárcel. */
export const GO_TO_JAIL_NODE = '11-oriente/4-norte';
/** Lo que se cobra al pasar por la SALIDA. */
export const START_BONUS = 100;

/**
 * El recorrido se compone de dos tipos de casillas, que se alternan:
 *   - intersecciones (esquinas de las cuadras): casillas de acción, donde no se compra;
 *   - tramos de calle: donde se compra y se paga arriendo.
 * Los ids de intersección tienen la forma "vertical/horizontal"; los de tramo, "calle:a-b".
 */
export const isNodeId = (squareId: string) => squareId.includes('/');
export const isSegmentId = (squareId: string) => !isNodeId(squareId);

export interface Destination {
  /** Casilla donde se termina el movimiento: una intersección o un tramo de calle. */
  square: string;
  /** Casillas recorridas, incluida la de salida y la de llegada. */
  path: string[];
  /** ¿Pasó (o terminó) en la SALIDA durante el recorrido? */
  passedStart: boolean;
}

/**
 * Todas las casillas a las que se puede llegar avanzando exactamente `steps` casillas, respetando el
 * sentido del tránsito. Desde una intersección se entra a un tramo; desde un tramo se llega a la
 * intersección del otro extremo. No se da media vuelta (salvo que no haya otra salida).
 *
 * `cameFrom` es la intersección anterior: si `from` es un tramo, la intersección por la que se entró;
 * si es una intersección, la que se dejó atrás.
 */
export function destinations(board: Board, from: string, steps: number, cameFrom: string | null = null): Destination[] {
  const segments = new Map<string, Segment>(board.segments.map((s) => [s.id, s]));
  const found = new Map<string, string[]>();
  const seen = new Set<string>();

  const walk = (square: string, prev: string | null, remaining: number, path: string[]) => {
    if (remaining === 0) {
      if (!found.has(square)) found.set(square, path);
      return;
    }
    const key = `${square}|${prev}|${remaining}`;
    if (seen.has(key)) return;
    seen.add(key);

    const segment = segments.get(square);
    if (segment) {
      // Estando en un tramo, solo se sigue hasta el otro extremo.
      const far = prev === segment.from ? segment.to : segment.from;
      walk(far, prev, remaining - 1, [...path, far]);
      return;
    }
    const moves = legalMoves(board, square);
    const forward = moves.filter((m) => m.to !== prev);
    for (const m of forward.length > 0 ? forward : moves) walk(m.segment.id, square, remaining - 1, [...path, m.segment.id]);
  };

  walk(from, cameFrom, steps, [from]);
  return [...found].map(([square, path]) => ({ square, path, passedStart: path.slice(1).includes(START_NODE) }));
}

/**
 * Intersección "de la que se viene" al terminar un movimiento en `dest`.
 * Si se termina en un tramo es la intersección por la que se entró; si se termina en una
 * intersección, la que había antes del último tramo.
 */
export function cameFromAfter(dest: Destination, previous: string | null): string | null {
  const p = dest.path;
  if (isSegmentId(dest.square)) return p[p.length - 2] ?? null;
  return p.length >= 3 ? p[p.length - 3] : previous;
}

/** Número aleatorio en [0,1) a partir de una semilla; devuelve también la semilla siguiente (mulberry32). */
export function nextRandom(seed: number): [number, number] {
  const t = (seed + 0x6d2b79f5) >>> 0;
  let r = Math.imul(t ^ (t >>> 15), 1 | t);
  r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
  return [((r ^ (r >>> 14)) >>> 0) / 4294967296, t];
}

/** Tira dos dados de seis caras. */
export function rollDice(seed: number): { dice: [number, number]; seed: number } {
  const [a, s1] = nextRandom(seed);
  const [b, s2] = nextRandom(s1);
  return { dice: [Math.floor(a * 6) + 1, Math.floor(b * 6) + 1], seed: s2 };
}
