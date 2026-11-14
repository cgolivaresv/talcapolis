import type { Board } from './board';
import type { Lot } from './lots';
import { lotsOfBarrio, lotsOfManzana } from './lots';
import { LANDMARK_INFO, landmarkRentOf, lotRent } from './properties';

/** Dueños de los lotes: id de lote -> índice del jugador. */
export type Owners = Record<string, number>;

/**
 * Lotes que dan a una intersección: de las 4 manzanas que la rodean, los sitios que miran a
 * cualquiera de las dos calles que se cruzan allí (hasta 8). Son los que se pueden comprar al
 * caer en ella, y los que cobran arriendo.
 */
export function lotsAround(board: Board, lots: Lot[], nodeId: string): Lot[] {
  const n = board.intersections.find((i) => i.id === nodeId);
  if (!n) return [];
  const rowMax = board.verticalStreets.length - 2;
  const colMax = board.horizontalStreets.length - 2;
  return lots.filter(
    (l) =>
      l.cell.row >= n.x - 1 &&
      l.cell.row <= Math.min(n.x, rowMax) &&
      l.cell.col >= n.y - 1 &&
      l.cell.col <= Math.min(n.y, colMax) &&
      (l.frontStreetId === n.vertical.id || l.frontStreetId === n.horizontal.id),
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

/** Arriendos que debe pagar quien cae en una intersección: uno por cada lote ajeno con dueño. */
export function rentsDue(board: Board, lots: Lot[], owners: Owners, nodeId: string, payer: number) {
  const due: { lot: Lot; owner: number; amount: number }[] = [];
  for (const lot of lotsAround(board, lots, nodeId)) {
    const owner = owners[lot.id];
    if (owner === undefined || owner === payer) continue;
    due.push({ lot, owner, amount: rentOf(lot, owner, owners, lots) });
  }
  return due;
}

/** ¿Tiene el jugador todos los lotes del barrio? */
export const ownsWholeBarrio = (lots: Lot[], owners: Owners, barrio: number, player: number) =>
  lotsOfBarrio(lots, barrio).every((l) => owners[l.id] === player);
