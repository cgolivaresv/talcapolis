/**
 * Barrios de Talcapolis. Cada barrio tiene un color y agrupa lotes (casas, locales comerciales y
 * edificios emblemáticos). Quien reúna todos los lotes de un barrio "obtiene el barrio".
 *
 * Todo el tablero es el sector "Centro" de Talca (entre la Alameda, 2 Sur, la línea férrea y el río
 * Claro). No hay límites oficiales que lo subdividan, así que cada barrio se define por un LUGAR REAL
 * de Talca y cada manzana pertenece al barrio de su lugar más cercano. Los nombres son reales; los
 * límites son una aproximación y pueden reemplazarse por un mapa oficial.
 *
 * Los barrios van de más barato (0, café) a más caro (7, azul oscuro), como en el Monopoly.
 */
export interface Barrio {
  id: number;
  name: string;
  /** Lugar real que define el barrio. */
  anchorName: string;
  /** Posición del lugar, en metros desde el borde del tablero (fila: Poniente->Oriente, columna: Sur->Norte). */
  center: { rowM: number; colM: number };
  /** Precio de una casa en este barrio. El local comercial cuesta el doble. */
  casaPrice: number;
}

export const BARRIOS: Barrio[] = [
  { id: 0, name: 'Barrio Estación', anchorName: 'Estación de Trenes', center: { rowM: 1560, colM: 100 }, casaPrice: 20 },
  { id: 1, name: 'Barrio Serrano', anchorName: 'Plaza Serrano', center: { rowM: 1070, colM: 60 }, casaPrice: 30 },
  { id: 2, name: 'Barrio CREA', anchorName: 'Centro Regional de Abastecimiento', center: { rowM: 1560, colM: 640 }, casaPrice: 40 },
  { id: 3, name: 'Barrio Cienfuegos', anchorName: 'Plaza Cienfuegos y Mercado Central', center: { rowM: 620, colM: 192 }, casaPrice: 50 },
  { id: 4, name: 'Barrio Norte', anchorName: 'Casa de la Independencia', center: { rowM: 430, colM: 430 }, casaPrice: 60 },
  { id: 5, name: 'Barrio Alameda Oriente', anchorName: 'Liceos de la Alameda', center: { rowM: 930, colM: 650 }, casaPrice: 70 },
  { id: 6, name: 'Barrio Alameda Poniente', anchorName: 'Teatro Regional del Maule', center: { rowM: 200, colM: 650 }, casaPrice: 80 },
  { id: 7, name: 'Barrio Plaza de Armas', anchorName: 'Plaza de Armas', center: { rowM: 187, colM: 192 }, casaPrice: 100 },
];

/** Barrio de un punto del tablero (en metros): el del lugar real más cercano. */
export function barrioAt(rowM: number, colM: number): number {
  let best = 0;
  let bestD = Infinity;
  for (const b of BARRIOS) {
    const d = (b.center.rowM - rowM) ** 2 + (b.center.colM - colM) ** 2;
    if (d < bestD) {
      bestD = d;
      best = b.id;
    }
  }
  return best;
}
