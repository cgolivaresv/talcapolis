/**
 * Servicios: propiedades que no son casas ni locales. Cada uno está en un tramo de calle y se ofrece
 * (junto con los lotes de ese tramo) a quien cae en él. Su arriendo depende de los dados:
 * un servicio cobra SERVICE_RENT_ONE veces lo que suman los dados de quien cae, y si el dueño
 * tiene los dos, SERVICE_RENT_BOTH veces (como las empresas de servicios del Monopoly).
 */
export interface Service {
  id: string;
  name: string;
  /** Tramo de calle donde está. */
  segmentId: string;
  price: number;
  /** Gráfico (src/ui/glyphs.ts). */
  icon: 'electricity' | 'water';
}

export const SERVICE_PRICE = 150;
export const SERVICE_RENT_ONE = 20;
export const SERVICE_RENT_BOTH = 50;

export const SERVICES: Service[] = [
  { id: 'svc:electricidad', name: 'Compañía Eléctrica del Maule', segmentId: '1-norte:5-oriente-6-oriente', price: SERVICE_PRICE, icon: 'electricity' },
  { id: 'svc:agua', name: 'Aguas Nuevosur Talca', segmentId: '2-norte:7-oriente-8-oriente', price: SERVICE_PRICE, icon: 'water' },
];

export const isServiceId = (id: string) => id.startsWith('svc:');
export const serviceById = (id: string) => SERVICES.find((s) => s.id === id);
export const serviceAt = (segmentId: string) => SERVICES.find((s) => s.segmentId === segmentId);

/** Arriendo de un servicio según los dados de quien cae y cuántos servicios tiene el dueño. */
export function serviceRent(diceSum: number, ownedByOwner: number): number {
  return diceSum * (ownedByOwner >= SERVICES.length ? SERVICE_RENT_BOTH : SERVICE_RENT_ONE);
}
