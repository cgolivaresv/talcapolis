import { EXTRA_STREETS, STREET_POSITIONS_M } from './geometry';

/**
 * Modelo del tablero de Talcapolis.
 *
 * Talca tiene calles numeradas Oriente/Poniente y Norte/Sur. No existe la calle "0":
 * la secuencia es ... 2 Poniente, 1 Poniente, 1 Oriente, 2 Oriente ...
 *
 * Orientación en pantalla (según el diseño del tablero):
 *   - Arriba: 2 Poniente  -> Abajo: 11 Oriente   (eje Poniente-Oriente, de arriba hacia abajo)
 *   - Izquierda: 2 Sur    -> Derecha: 4 Norte    (eje Sur-Norte, de izquierda a derecha)
 *
 * Nota de nomenclatura: "vertical" = calles Oriente/Poniente (índice x en el modelo) y
 * "horizontal" = calles Norte/Sur (índice y). Son nombres del modelo, no de la pantalla:
 * la UI decide cómo proyectarlos.
 *
 * Cada TRAMO de calle entre dos intersecciones consecutivas es una casilla/propiedad.
 */

export type Side = 'Poniente' | 'Oriente' | 'Norte' | 'Sur';

export interface BoardConfig {
  /** Límites del tablero, inclusivos. */
  west: { side: 'Poniente' | 'Oriente'; n: number };
  east: { side: 'Poniente' | 'Oriente'; n: number };
  south: { side: 'Norte' | 'Sur'; n: number };
  north: { side: 'Norte' | 'Sur'; n: number };
}

/** Configuración acordada: arriba 2 Poniente, abajo 11 Oriente, izquierda 2 Sur, derecha 4 Norte. */
export const TALCAPOLIS_CONFIG: BoardConfig = {
  west: { side: 'Poniente', n: 2 },
  east: { side: 'Oriente', n: 11 },
  south: { side: 'Sur', n: 2 },
  north: { side: 'Norte', n: 4 },
};

export interface Street {
  id: string; // p.ej. "2-poniente"
  name: string; // p.ej. "2 Poniente"
  orientation: 'vertical' | 'horizontal';
  /** Posición en su eje: vertical => x; horizontal => y. */
  index: number;
  /** Grupo de color estilo Monopoly (0-7), repartido a lo largo del eje de la calle. */
  group: number;
  /** Posición real en metros desde el borde del tablero (ver geometry.ts). */
  positionM: number;
  /** Solo para calles parciales: tramo (en metros, eje transversal) donde la calle existe. */
  spanM?: [number, number];
}

/** Distancia típica entre calles (m), usada si una calle no tiene posición medida. */
const DEFAULT_SPACING_M = 125;

export const GROUP_COUNT = 8;

export interface Intersection {
  id: string;
  x: number; // índice de la calle Oriente/Poniente (0 = la más al poniente)
  y: number; // índice de la calle Norte/Sur (0 = la más al sur)
  vertical: Street;
  horizontal: Street;
}

export interface Segment {
  id: string;
  /** Calle a la que pertenece el tramo. */
  street: Street;
  from: string; // id intersección
  to: string; // id intersección
  /** Nombre legible: "1 Norte entre 3 Oriente y 4 Oriente". */
  name: string;
}

export interface Board {
  config: BoardConfig;
  verticalStreets: Street[];
  horizontalStreets: Street[];
  intersections: Intersection[];
  segments: Segment[];
}

const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-');

/** Convierte un valor con signo (Poniente < 0, Oriente > 0) a calle. */
function verticalStreet(signed: number, index: number): Street {
  const side: Side = signed < 0 ? 'Poniente' : 'Oriente';
  const name = `${Math.abs(signed)} ${side}`;
  const id = slug(name);
  return { id, name, orientation: 'vertical', index, group: 0, positionM: STREET_POSITIONS_M[id] ?? index * DEFAULT_SPACING_M };
}

/** Convierte un valor con signo (Sur < 0, Norte > 0) a calle. */
function horizontalStreet(signed: number, index: number): Street {
  const side: Side = signed < 0 ? 'Sur' : 'Norte';
  const name = `${Math.abs(signed)} ${side}`;
  const id = slug(name);
  return { id, name, orientation: 'horizontal', index, group: 0, positionM: STREET_POSITIONS_M[id] ?? index * DEFAULT_SPACING_M };
}

/** Rango de enteros con signo saltándose el 0 (no existe la calle "0"). */
function signedRange(from: number, to: number): number[] {
  const out: number[] = [];
  for (let v = from; v <= to; v++) if (v !== 0) out.push(v);
  return out;
}

export function buildBoard(config: BoardConfig = TALCAPOLIS_CONFIG): Board {
  const westV = config.west.side === 'Poniente' ? -config.west.n : config.west.n;
  const eastV = config.east.side === 'Poniente' ? -config.east.n : config.east.n;
  const southV = config.south.side === 'Sur' ? -config.south.n : config.south.n;
  const northV = config.north.side === 'Sur' ? -config.north.n : config.north.n;

  if (westV >= eastV) throw new Error('El límite poniente debe quedar al poniente del límite oriente');
  if (southV >= northV) throw new Error('El límite sur debe quedar al sur del límite norte');

  const baseV = signedRange(westV, eastV).map((v, i) => verticalStreet(v, i));
  const baseH = signedRange(southV, northV).map((v, i) => horizontalStreet(v, i));

  // Calles intermedias (parciales): solo si las dos calles entre las que existen están en el tablero.
  const extras = (orientation: Street['orientation'], own: Street[], cross: Street[]): Street[] =>
    EXTRA_STREETS.filter((e) => e.orientation === orientation).flatMap((e) => {
      const a = cross.find((s) => s.id === e.spans[0]);
      const b = cross.find((s) => s.id === e.spans[1]);
      // Debe caer dentro de los límites del tablero en su propio eje.
      const inside = e.positionM >= own[0].positionM && e.positionM <= own[own.length - 1].positionM;
      if (!a || !b || !inside) return [];
      return [{
        id: e.id,
        name: e.name,
        orientation,
        index: 0,
        group: 0,
        positionM: e.positionM,
        spanM: [Math.min(a.positionM, b.positionM), Math.max(a.positionM, b.positionM)] as [number, number],
      }];
    });

  const finish = (list: Street[]) => {
    list.sort((p, q) => p.positionM - q.positionM);
    list.forEach((s, i) => {
      s.index = i;
      s.group = Math.floor((i * GROUP_COUNT) / list.length);
    });
    return list;
  };
  const verticalStreets = finish([...baseV, ...extras('vertical', baseV, baseH)]);
  const horizontalStreets = finish([...baseH, ...extras('horizontal', baseH, baseV)]);

  // Una calle parcial solo existe dentro de su tramo; las enteras cubren todo el tablero.
  const covers = (s: Street, crossPos: number) =>
    !s.spanM || (crossPos >= s.spanM[0] - 0.5 && crossPos <= s.spanM[1] + 0.5);

  const intersections: Intersection[] = [];
  for (const h of horizontalStreets) {
    for (const v of verticalStreets) {
      if (!covers(v, h.positionM) || !covers(h, v.positionM)) continue;
      intersections.push({ id: `${v.id}/${h.id}`, x: v.index, y: h.index, vertical: v, horizontal: h });
    }
  }

  const segments: Segment[] = [];
  // Tramos horizontales: a lo largo de cada calle Norte/Sur, entre intersecciones consecutivas.
  for (const h of horizontalStreets) {
    const along = intersections.filter((i) => i.horizontal === h).sort((p, q) => p.x - q.x);
    for (let k = 0; k < along.length - 1; k++) {
      const a = along[k];
      const b = along[k + 1];
      segments.push({
        id: `${h.id}:${a.vertical.id}-${b.vertical.id}`,
        street: h,
        from: a.id,
        to: b.id,
        name: `${h.name} entre ${a.vertical.name} y ${b.vertical.name}`,
      });
    }
  }
  // Tramos verticales: a lo largo de cada calle Oriente/Poniente, entre intersecciones consecutivas.
  for (const v of verticalStreets) {
    const along = intersections.filter((i) => i.vertical === v).sort((p, q) => p.y - q.y);
    for (let k = 0; k < along.length - 1; k++) {
      const a = along[k];
      const b = along[k + 1];
      segments.push({
        id: `${v.id}:${a.horizontal.id}-${b.horizontal.id}`,
        street: v,
        from: a.id,
        to: b.id,
        name: `${v.name} entre ${a.horizontal.name} y ${b.horizontal.name}`,
      });
    }
  }

  return { config, verticalStreets, horizontalStreets, intersections, segments };
}
