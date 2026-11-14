import { lerpPositionM, type Board, type Street } from './board';
import { BARRIOS, barrioAt } from './barrios';
import type { PlacedLandmark } from './landmarks';
import { landmarkPriceOf } from './properties';

/**
 * Lotes: lo único que se compra en Talcapolis. Las calles no se compran.
 * Cada manzana (cuadra) tiene al menos 3 sitios, que pueden ser:
 *   - casa
 *   - local comercial (cuesta el doble que una casa del mismo barrio)
 *   - edificio emblemático (ocupa uno de los sitios de su manzana)
 */
export type LotKind = 'casa' | 'local' | 'emblematico';

export interface Lot {
  id: string;
  kind: LotKind;
  name: string;
  barrio: number;
  price: number;
  /** Manzana donde está (índices entre calles enteras: fila Poniente->Oriente, columna Sur->Norte). */
  cell: { row: number; col: number };
  /** Id de la manzana, igual para todos sus sitios. */
  manzanaId: string;
  landmarkId?: string;
}

/** Sitios mínimos por manzana. */
export const MIN_SITES_PER_MANZANA = 3;

const fullStreets = (list: Street[]) => list.filter((s) => !s.spanM);

export function buildLots(board: Board, landmarks: PlacedLandmark[]): Lot[] {
  const rows = fullStreets(board.verticalStreets); // Poniente -> Oriente
  const cols = fullStreets(board.horizontalStreets); // Sur -> Norte
  const clamp = (v: number, max: number) => Math.max(0, Math.min(v, max));
  const rowIdx = (id: string) => rows.findIndex((s) => s.id === id);
  const colIdx = (id: string) => cols.findIndex((s) => s.id === id);

  /** Manzana que contiene un punto, dado en metros. */
  const cellAt = (rowM: number, colM: number) => {
    let r = 0;
    while (r + 1 < rows.length && rows[r + 1].positionM <= rowM) r++;
    let c = 0;
    while (c + 1 < cols.length && cols[c + 1].positionM <= colM) c++;
    return { row: clamp(r, rows.length - 2), col: clamp(c, cols.length - 2) };
  };
  const manzanaId = (r: number, c: number) => `mz:${rows[r].id}-${rows[r + 1].id}:${cols[c].id}-${cols[c + 1].id}`;
  const manzanaName = (r: number, c: number) => `${rows[r].name} a ${rows[r + 1].name}, ${cols[c].name} a ${cols[c + 1].name}`;
  const barrioOfCell = (r: number, c: number) =>
    barrioAt((rows[r].positionM + rows[r + 1].positionM) / 2, (cols[c].positionM + cols[c + 1].positionM) / 2);

  // 1. Edificios emblemáticos: cada uno ocupa un sitio de su manzana.
  const emblemsByCell = new Map<string, Lot[]>();
  for (const l of landmarks) {
    const a = l.anchor;
    let cell: { row: number; col: number };
    if (a.type === 'block') {
      cell = { row: Math.min(rowIdx(a.vertical[0]), rowIdx(a.vertical[1])), col: Math.min(colIdx(a.horizontal[0]), colIdx(a.horizontal[1])) };
    } else if (a.type === 'intersection') {
      // Una esquina toca 4 manzanas: se asigna la que queda hacia el poniente y el sur.
      cell = { row: clamp(rowIdx(a.vertical), rows.length - 2), col: clamp(colIdx(a.horizontal) - 1, cols.length - 2) };
    } else {
      cell = cellAt(lerpPositionM(board.verticalStreets, l.row), lerpPositionM(board.horizontalStreets, l.col));
    }
    const lot: Lot = {
      id: `em:${l.id}`,
      kind: 'emblematico',
      name: l.name,
      barrio: barrioOfCell(cell.row, cell.col),
      price: landmarkPriceOf(l.id),
      cell,
      manzanaId: manzanaId(cell.row, cell.col),
      landmarkId: l.id,
    };
    const key = `${cell.row},${cell.col}`;
    emblemsByCell.set(key, [...(emblemsByCell.get(key) ?? []), lot]);
  }

  // 2. Cada manzana se completa con casas y locales hasta tener al menos 3 sitios.
  const lots: Lot[] = [];
  for (let r = 0; r < rows.length - 1; r++) {
    for (let c = 0; c < cols.length - 1; c++) {
      const emblems = emblemsByCell.get(`${r},${c}`) ?? [];
      lots.push(...emblems);
      const barrio = barrioOfCell(r, c);
      const generic = Math.max(0, MIN_SITES_PER_MANZANA - emblems.length);
      for (let g = 0; g < generic; g++) {
        const kind: LotKind = (r + c + g) % 3 === 0 ? 'local' : 'casa';
        const base = BARRIOS[barrio].casaPrice;
        lots.push({
          id: `${manzanaId(r, c)}#${g + 1}`,
          kind,
          name: `${kind === 'casa' ? 'Casa' : 'Local comercial'} ${g + 1}, ${manzanaName(r, c)}`,
          barrio,
          price: kind === 'casa' ? base : base * 2,
          cell: { row: r, col: c },
          manzanaId: manzanaId(r, c),
        });
      }
    }
  }
  return lots;
}

/** Todos los lotes de un barrio: quien los reúna obtiene el barrio. */
export const lotsOfBarrio = (lots: Lot[], barrio: number) => lots.filter((l) => l.barrio === barrio);

/** Todos los sitios de una manzana. */
export const lotsOfManzana = (lots: Lot[], manzanaId: string) => lots.filter((l) => l.manzanaId === manzanaId);
