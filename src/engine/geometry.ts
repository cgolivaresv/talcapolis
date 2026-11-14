/**
 * Geometría real del tablero, medida sobre OpenStreetMap.
 *
 * Las posiciones están en metros desde el borde del tablero (2 Poniente / 2 Sur), a lo largo
 * del eje de cada calle: Poniente->Oriente para las calles Oriente/Poniente y Sur->Norte para
 * las calles Norte/Sur. Se calcularon con las intersecciones reales (nodos compartidos) y la
 * grilla girada 4,4° para quitarle la inclinación de la ciudad.
 *
 * Datos (c) colaboradores de OpenStreetMap, licencia ODbL: https://www.openstreetmap.org/copyright
 */
export const STREET_POSITIONS_M: Record<string, number> = {
  '2-poniente': 0,
  '1-poniente': 125,
  '1-oriente': 250,
  '2-oriente': 376,
  '3-oriente': 499,
  '4-oriente': 624,
  '5-oriente': 747,
  '6-oriente': 880,
  '7-oriente': 1009,
  '8-oriente': 1130,
  '9-oriente': 1263,
  '10-oriente': 1471,
  '11-oriente': 1622,
  '2-sur': 0,
  '1-sur': 131,
  '1-norte': 253,
  '2-norte': 411,
  '3-norte': 529,
  '4-norte': 710,
};

/**
 * Calles intermedias ("1½ Norte", etc.). Son parciales: solo existen entre las dos calles
 * indicadas en `spans` (inclusive), y solo se cruzan con las calles que caen en ese tramo.
 * Se incluyeron únicamente las que tienen intersecciones reales dentro del tablero.
 */
export interface ExtraStreet {
  id: string;
  name: string;
  orientation: 'vertical' | 'horizontal';
  positionM: number;
  /** Ids de las dos calles del eje transversal entre las que existe. */
  spans: [string, string];
}

export const EXTRA_STREETS: ExtraStreet[] = [
];
