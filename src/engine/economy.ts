import type { Board } from './board';
import type { Lot } from './lots';
import { lotsOfBarrio, lotsOfManzana } from './lots';
import { LANDMARK_INFO, LEVEL_RENT, landmarkRentOf, lotRent } from './properties';
import { SERVICES, serviceAt, serviceRent } from './services';

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

/** Qué hay en cada propiedad: dueños, hipotecas y mejoras. */
export interface Holdings {
  owners: Owners;
  /** Propiedades hipotecadas (no cobran arriendo). */
  mortgaged: Record<string, boolean>;
  /** Mejoras de cada casa o local (0 si no aparece). */
  levels: Record<string, number>;
}

/** Arriendo que cobra el dueño `owner` por un lote, según lo que tenga reunido y sus mejoras. */
export function rentOf(lot: Lot, owner: number, h: Holdings | Owners, lots: Lot[]): number {
  const holdings: Holdings = 'owners' in h && typeof h.owners === 'object' ? (h as Holdings) : { owners: h as Owners, mortgaged: {}, levels: {} };
  const owns = (l: Lot) => holdings.owners[l.id] === owner;
  if (lot.kind === 'emblematico' && lot.landmarkId) {
    const kind = LANDMARK_INFO[lot.landmarkId].kind;
    const same = lots.filter((l) => l.landmarkId && owns(l) && LANDMARK_INFO[l.landmarkId].kind === kind).length;
    return landmarkRentOf(lot.landmarkId, same);
  }
  const base = lotRent(lot.price, {
    ownsManzana: lotsOfManzana(lots, lot.manzanaId).every(owns),
    ownsBarrio: lotsOfBarrio(lots, lot.barrio).every(owns),
  });
  return Math.round(base * LEVEL_RENT[holdings.levels[lot.id] ?? 0]);
}

/** Algo por lo que se paga arriendo: un lote o un servicio. */
export interface RentDue {
  id: string;
  name: string;
  owner: number;
  amount: number;
}

/**
 * Arriendo que debe pagar quien cae en un tramo de calle: solo el de la propiedad más cara entre las
 * ajenas con dueño que dan a él (lotes y servicio), sin contar las hipotecadas. Si no hay ninguna, nada.
 * `diceSum` es lo que sumaron los dados de quien cae (los servicios cobran según los dados).
 */
export function rentsDue(board: Board, lots: Lot[], h: Holdings, segmentId: string, payer: number, diceSum = 7): RentDue[] {
  const due: RentDue[] = [];
  for (const lot of lotsOnSegment(board, lots, segmentId)) {
    const owner = h.owners[lot.id];
    if (owner === undefined || owner === payer || h.mortgaged[lot.id]) continue;
    due.push({ id: lot.id, name: lot.name, owner, amount: rentOf(lot, owner, h, lots) });
  }
  const svc = serviceAt(segmentId);
  if (svc) {
    const owner = h.owners[svc.id];
    if (owner !== undefined && owner !== payer && !h.mortgaged[svc.id]) {
      const count = SERVICES.filter((s) => h.owners[s.id] === owner).length;
      due.push({ id: svc.id, name: svc.name, owner, amount: serviceRent(diceSum, count) });
    }
  }
  const top = due.reduce<RentDue | null>((best, d) => (best && best.amount >= d.amount ? best : d), null);
  return top ? [top] : [];
}

/** ¿Tiene el jugador todos los lotes del barrio? */
export const ownsWholeBarrio = (lots: Lot[], owners: Owners, barrio: number, player: number) =>
  lotsOfBarrio(lots, barrio).every((l) => owners[l.id] === player);
