import type { Board } from './board';
import type { Lot } from './lots';
import { lotsOfBarrio, lotsOfManzana } from './lots';
import { LANDMARK_INFO, landmarkRentOf, lotRent } from './properties';

/** Dueños de los lotes: id de lote -> índice del jugador. */
export type Owners = Record<string, number>;

/**
 * Lotes que dan a un tramo de calle: los sitios de las manzanas de ambos lados que miran a esa calle
 * (uno por lado, o solo uno si la calle está en el borde del tablero). Son los que se pueden comprar al
 * caer en el tramo, y los que cobran arriendo. Las intersecciones no tienen lotes.
 */
export function lotsOnSegment(board: Board, lots: Lot[], segmentId: string): Lot[] {
  const seg = board.segments.find((s) => s.id === segmentId);
  if (!seg) return [];
  const a = board.intersections.find((i) => i.id === seg.from);
  const b = board.intersections.find((i) => i.id === seg.to);
  if (!a || !b) return [];
  // A lo largo de una calle Oriente/Poniente varía la columna (índice Norte/Sur); a lo largo de una Norte/Sur, la fila.
  const alongVertical = seg.street.orientation === 'vertical';
  return lots.filter(
    (l) =>
      l.frontStreetId === seg.street.id &&
      (alongVertical ? l.cell.col === Math.min(a.y, b.y) : l.cell.row === Math.min(a.x, b.x)),
  );
}

/** Arriendo que cobra el dueño `owner` por un lote, según lo que tenga reunido. */
export function rentOf(lot: Lot, owner: number, owners: Owners, lots: Lot[]): number {
  const owns = (l: Lot) => owners[l.id] === owner;
  if (lot.kind === 'emblematico' && lot.landmarkId) {
    const kind = LANDMARK_INFO[lot.landmarkId].kind;
    const same = lots.filter((l) => l.landmarkId && owns(l) && LANDMARK_INFO[l.landmarkId].kind === kind).length;
    return landmarkRentOf(lot.landmarkId, same);
  }
  return lotRent(lot.price, {
    ownsManzana: lotsOfManzana(lots, lot.manzanaId).every(owns),
    ownsBarrio: lotsOfBarrio(lots, lot.barrio).every(owns),
  });
}

/**
 * Arriendo que debe pagar quien cae en un tramo de calle: solo el del sitio más caro entre los lotes
 * ajenos con dueño que dan a él (si no hay ninguno, nada).
 */
export function rentsDue(board: Board, lots: Lot[], owners: Owners, segmentId: string, payer: number) {
  const due: { lot: Lot; owner: number; amount: number }[] = [];
  for (const lot of lotsOnSegment(board, lots, segmentId)) {
    const owner = owners[lot.id];
    if (owner === undefined || owner === payer) continue;
    due.push({ lot, owner, amount: rentOf(lot, owner, owners, lots) });
  }
  const top = due.reduce<(typeof due)[number] | null>((best, d) => (best && best.amount >= d.amount ? best : d), null);
  return top ? [top] : [];
}

/** ¿Tiene el jugador todos los lotes del barrio? */
export const ownsWholeBarrio = (lots: Lot[], owners: Owners, barrio: number, player: number) =>
  lotsOfBarrio(lots, barrio).every((l) => owners[l.id] === player);
