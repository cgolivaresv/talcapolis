import type { Board } from './board';

/**
 * Edificios y lugares emblemáticos de Talca dentro del tablero.
 *
 * Fuentes: Wikivoyage "Talca" y Wikipedia "Plaza de Armas de Talca" (ubicaciones por calles).
 * Un edificio se ancla a una intersección, a una manzana (entre 2 calles de cada eje)
 * o al punto medio de un tramo de calle. Los ids de calle son "N-oriente", "N-sur", etc.
 */
export type Anchor =
  | { type: 'intersection'; vertical: string; horizontal: string }
  | { type: 'block'; vertical: [string, string]; horizontal: [string, string] }
  | { type: 'segment'; id: string };

export interface Landmark {
  id: string;
  name: string;
  icon: string;
  anchor: Anchor;
  /** Dónde queda, en palabras. */
  where: string;
}

/** Nombres actuales de las avenidas del tablero (según Wikivoyage). */
export const STREET_ALIASES: Record<string, string> = {
  '4-norte': 'Alameda B. O’Higgins',
  '2-sur': 'Av. Manuel Larraín',
  '11-oriente': 'Av. Salvador Allende',
  '1-poniente': 'Cardenal Silva Henríquez',
};

export const LANDMARKS: Landmark[] = [
  {
    id: 'plaza-de-armas',
    name: 'Plaza de Armas',
    icon: '⛲',
    anchor: { type: 'block', vertical: ['1-poniente', '1-oriente'], horizontal: ['1-sur', '1-norte'] },
    where: 'Entre 1 Sur, 1 Norte, 1 Poniente y 1 Oriente. Origen de la numeración de las calles.',
  },
  {
    id: 'catedral',
    name: 'Catedral de San Agustín',
    icon: '⛪',
    anchor: { type: 'intersection', vertical: '1-poniente', horizontal: '1-norte' },
    where: '1 Poniente esquina 1 Norte, en la Plaza de Armas.',
  },
  {
    id: 'u-talca-casa-central',
    name: 'Universidad de Talca (Casa Central)',
    icon: '🎓',
    anchor: { type: 'segment', id: '1-poniente:1-sur-1-norte' },
    where: 'Costado poniente de la Plaza de Armas, junto a la Catedral.',
  },
  {
    id: 'intendencia',
    name: 'Intendencia',
    icon: '🏛️',
    anchor: { type: 'intersection', vertical: '1-oriente', horizontal: '1-norte' },
    where: '1 Norte con 1 Oriente, frente a la Plaza de Armas.',
  },
  {
    id: 'edificio-ohiggins',
    name: 'Edificio O’Higgins (ex Banco de Talca)',
    icon: '🏢',
    anchor: { type: 'intersection', vertical: '1-oriente', horizontal: '1-sur' },
    where: 'Esquina 1 Sur con 1 Oriente.',
  },
  {
    id: 'casa-independencia',
    name: 'Casa de la Independencia',
    icon: '🏠',
    anchor: { type: 'intersection', vertical: '2-oriente', horizontal: '1-norte' },
    where: '1 Norte con 2 Oriente. Museo O’Higginiano.',
  },
  {
    id: 'escuelas-concentradas',
    name: 'Escuelas Concentradas',
    icon: '🏫',
    anchor: { type: 'block', vertical: ['3-oriente', '4-oriente'], horizontal: ['1-sur', '1-norte'] },
    where: 'Manzana 1 Sur, 3 Oriente, 1 Norte y 4 Oriente, frente a la Plaza Cienfuegos.',
  },
  {
    id: 'mercado-central',
    name: 'Mercado Central',
    icon: '🛒',
    anchor: { type: 'block', vertical: ['4-oriente', '5-oriente'], horizontal: ['1-sur', '1-norte'] },
    where: 'Manzana 1 Sur, 4 Oriente, 1 Norte y 5 Oriente.',
  },
  {
    id: 'santuario-maria-auxiliadora',
    name: 'Santuario María Auxiliadora',
    icon: '⛪',
    anchor: { type: 'intersection', vertical: '5-oriente', horizontal: '2-sur' },
    where: 'Esquina de 2 Sur con 5 Oriente.',
  },
  {
    id: 'iglesia-corazon-de-maria',
    name: 'Iglesia Corazón de María',
    icon: '⛪',
    anchor: { type: 'intersection', vertical: '8-oriente', horizontal: '2-sur' },
    where: '2 Sur con 8 Oriente, frente a la Plaza Serrano.',
  },
  {
    id: 'teatro-regional',
    name: 'Teatro Regional del Maule',
    icon: '🎭',
    anchor: { type: 'intersection', vertical: '1-oriente', horizontal: '4-norte' },
    where: 'Alameda (4 Norte) esquina 1 Oriente.',
  },
  {
    id: 'corte-apelaciones',
    name: 'Corte de Apelaciones',
    icon: '⚖️',
    anchor: { type: 'intersection', vertical: '2-poniente', horizontal: '4-norte' },
    where: 'Alameda (4 Norte) esquina 2 Poniente.',
  },
  {
    id: 'liceo-la-salle',
    name: 'Liceo La Salle',
    icon: '🏫',
    anchor: { type: 'segment', id: '4-norte:1-poniente-1-oriente' },
    where: 'Alameda, entre 1 Poniente y 1 Oriente.',
  },
  {
    id: 'liceo-abate-molina',
    name: 'Liceo Abate Molina',
    icon: '🏫',
    anchor: { type: 'segment', id: '4-norte:5-oriente-6-oriente' },
    where: 'Alameda, entre 5 y 6 Oriente.',
  },
  {
    id: 'liceo-marta-donoso',
    name: 'Liceo Marta Donoso Espejo',
    icon: '🏫',
    anchor: { type: 'segment', id: '4-norte:6-oriente-7-oriente' },
    where: 'Alameda, entre 6 y 7 Oriente.',
  },
  {
    id: 'extension-utalca',
    name: 'Centro de Extensión UTalca',
    icon: '🎨',
    anchor: { type: 'intersection', vertical: '1-poniente', horizontal: '2-norte' },
    where: '2 Norte con 1 Poniente.',
  },
  {
    id: 'extension-ucm',
    name: 'Centro de Extensión UCM',
    icon: '🎨',
    anchor: { type: 'segment', id: '3-norte:2-poniente-1-poniente' },
    where: '3 Norte, entre 1 y 2 Poniente.',
  },
  {
    id: 'mercado-provisorio',
    name: 'Mercado Provisorio',
    icon: '🥕',
    anchor: { type: 'segment', id: '2-norte:5-oriente-6-oriente' },
    where: '2 Norte, entre 5 y 6 Oriente.',
  },
  {
    id: 'estacion',
    name: 'Estación de Trenes de Talca',
    icon: '🚆',
    anchor: { type: 'intersection', vertical: '11-oriente', horizontal: '2-sur' },
    where: 'Av. Salvador Allende (11 Oriente) con Av. Manuel Larraín (2 Sur), frente a la Plaza La Loba.',
  },
];

export interface PlacedLandmark extends Landmark {
  /** Posición en unidades de grilla: fila = calle Oriente/Poniente, columna = calle Norte/Sur. */
  row: number;
  col: number;
}

/** Calcula la posición de cada edificio en la grilla. Lanza error si un ancla no existe en el tablero. */
export function placeLandmarks(board: Board, list: Landmark[] = LANDMARKS): PlacedLandmark[] {
  const vIndex = new Map(board.verticalStreets.map((s) => [s.id, s.index]));
  const hIndex = new Map(board.horizontalStreets.map((s) => [s.id, s.index]));
  const interById = new Map(board.intersections.map((i) => [i.id, i]));
  const segById = new Map(board.segments.map((s) => [s.id, s]));
  const maxRow = board.verticalStreets.length - 1;
  const maxCol = board.horizontalStreets.length - 1;

  const need = <T,>(v: T | undefined, what: string): T => {
    if (v === undefined) throw new Error(`Ancla inexistente en el tablero: ${what}`);
    return v;
  };

  return list.map((l) => {
    const a = l.anchor;
    if (a.type === 'intersection') {
      return { ...l, row: need(vIndex.get(a.vertical), a.vertical), col: need(hIndex.get(a.horizontal), a.horizontal) };
    }
    if (a.type === 'block') {
      const r1 = need(vIndex.get(a.vertical[0]), a.vertical[0]);
      const r2 = need(vIndex.get(a.vertical[1]), a.vertical[1]);
      const c1 = need(hIndex.get(a.horizontal[0]), a.horizontal[0]);
      const c2 = need(hIndex.get(a.horizontal[1]), a.horizontal[1]);
      if (Math.abs(r1 - r2) !== 1 || Math.abs(c1 - c2) !== 1) {
        throw new Error(`La manzana de "${l.id}" debe estar entre calles consecutivas`);
      }
      return { ...l, row: (r1 + r2) / 2, col: (c1 + c2) / 2 };
    }
    const seg = need(segById.get(a.id), a.id);
    const from = need(interById.get(seg.from), seg.from);
    const to = need(interById.get(seg.to), seg.to);
    let row = (from.x + to.x) / 2;
    let col = (from.y + to.y) / 2;
    // Se dibuja dentro de la manzana contigua al tramo, no encima de la ficha de la calle.
    if (from.y === to.y) col += col === maxCol ? -0.5 : 0.5;
    else row += row === maxRow ? -0.5 : 0.5;
    return { ...l, row, col };
  });
}
