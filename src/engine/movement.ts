import type { Board } from './board';
import { legalMoves } from './traffic';

/** SALIDA: la Estación, esquina de 11 Oriente con 2 Sur. Al pasar por ella se cobra. */
export const START_NODE = '11-oriente/2-sur';
/** Esquina "A LA CÁRCEL": quien cae aquí va a la Cárcel. */
export const GO_TO_JAIL_NODE = '11-oriente/4-norte';
/** Lo que se cobra al pasar por la SALIDA. */
export const START_BONUS = 200;

export interface Destination {
  /** Intersección donde se termina el movimiento. */
  node: string;
  /** Intersecciones recorridas, incluida la de salida y la de llegada. */
  path: string[];
  /** ¿Pasó (o terminó) en la SALIDA durante el recorrido? */
  passedStart: boolean;
}

/**
 * Todas las intersecciones a las que se puede llegar avanzando exactamente `steps` tramos por las
 * calles, respetando el sentido del tránsito. No se da media vuelta en una intersección
 * (salvo que no haya otra salida). Devuelve un recorrido por destino.
 */
export function destinations(board: Board, from: string, steps: number, cameFrom: string | null = null): Destination[] {
  const found = new Map<string, string[]>();
  const seen = new Set<string>();

  const walk = (node: string, prev: string | null, remaining: number, path: string[]) => {
    if (remaining === 0) {
      if (!found.has(node)) found.set(node, path);
      return;
    }
    const key = `${node}|${prev}|${remaining}`;
    if (seen.has(key)) return;
    seen.add(key);
    const moves = legalMoves(board, node);
    const forward = moves.filter((m) => m.to !== prev);
    for (const m of forward.length > 0 ? forward : moves) walk(m.to, node, remaining - 1, [...path, m.to]);
  };

  walk(from, cameFrom, steps, [from]);
  return [...found].map(([node, path]) => ({ node, path, passedStart: path.slice(1).includes(START_NODE) }));
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
