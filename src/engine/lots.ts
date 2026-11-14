import { lerpPositionM, type Board, type Street } from './board';
import { BARRIOS, barrioOfCell } from './barrios';
import type { PlacedLandmark } from './landmarks';
import { landmarkPriceOf } from './properties';

/**
 * Lotes: lo único que se compra en Talcapolis. Las calles no se compran.
 *   - manzana:     una casa por manzana (se puede ampliar a más casas y a local comercial).
 *   - emblematico: un edificio emblemático de Talca.
 */
export interface Lot {
  id: string;
  kind: 'manzana' | 'emblematico';
  name: string;
  barrio: number;
  price: number;
  /** Celda de manzana donde está (índices entre calles enteras). */
  cell: { row: number; col: number };
  landmarkId?: string;
}

const fullStreets = (list: Street[]) => list.filter((s) => !s.spanM);

export function buildLots(board: Board, landmarks: PlacedLandmark[]): Lot[] {
  const rows = fullStreets(board.verticalStreets); // Poniente -> Oriente
  const cols = fullStreets(board.horizontalStreets); // Sur -> Norte
  const clamp = (v: number, max: number) => Math.max(0, Math.min(v, max));

  /** Celda que contiene un punto, dado en metros. */
  const cellAt = (rowM: number, colM: number) => {
    let r = 0;
    while (r + 1 < rows.length && rows[r + 1].positionM <= rowM) r++;
    let c = 0;
    while (c + 1 < cols.length && cols[c + 1].positionM <= colM) c++;
    return { row: clamp(r, rows.length - 2), col: clamp(c, cols.length - 2) };
  };
  const rowIdx = (id: string) => rows.findIndex((s) => s.id === id);
  const colIdx = (id: string) => cols.findIndex((s) => s.id === id);

  const lots: Lot[] = [];
  const occupied = new Set<string>();

  for (const l of landmarks) {
    const a = l.anchor;
    let cell: { row: number; col: number };
    if (a.type === 'block') {
      cell = { row: Math.min(rowIdx(a.vertical[0]), rowIdx(a.vertical[1])), col: Math.min(colIdx(a.horizontal[0]), colIdx(a.horizontal[1])) };
      occupied.add(`${cell.row},${cell.col}`); // el edificio ocupa toda la manzana
    } else if (a.type === 'intersection') {
      // Una esquina toca 4 manzanas: se asigna la que queda hacia el poniente y el sur.
      cell = { row: clamp(rowIdx(a.vertical), rows.length - 2), col: clamp(colIdx(a.horizontal) - 1, cols.length - 2) };
    } else {
      cell = cellAt(lerpPositionM(board.verticalStreets, l.row), lerpPositionM(board.horizontalStreets, l.col));
    }
    lots.push({
      id: `em:${l.id}`,
      kind: 'emblematico',
      name: l.name,
      barrio: barrioOfCell(cell.row, cell.col),
      price: landmarkPriceOf(l.id),
      cell,
      landmarkId: l.id,
    });
  }

  for (let r = 0; r < rows.length - 1; r++) {
    for (let c = 0; c < cols.length - 1; c++) {
      if (occupied.has(`${r},${c}`)) continue;
      const barrio = barrioOfCell(r, c);
      lots.push({
        id: `mz:${rows[r].id}-${rows[r + 1].id}:${cols[c].id}-${cols[c + 1].id}`,
        kind: 'manzana',
        name: `Casas de ${rows[r].name} a ${rows[r + 1].name}, ${cols[c].name} a ${cols[c + 1].name}`,
        barrio,
        price: BARRIOS[barrio].manzanaPrice,
        cell: { row: r, col: c },
      });
    }
  }
  return lots;
}

/** Todos los lotes de un barrio: quien los reúna obtiene el barrio. */
export const lotsOfBarrio = (lots: Lot[], barrio: number) => lots.filter((l) => l.barrio === barrio);
