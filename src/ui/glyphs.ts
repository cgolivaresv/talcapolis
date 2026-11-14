import bank from '../assets/graficos/bank.svg';
import hotel from '../assets/graficos/hotel.svg';
import house from '../assets/graficos/house.svg';
import luck from '../assets/graficos/luck.svg';
import electricity from '../assets/graficos/service-electricity.svg';
import water from '../assets/graficos/service-water.svg';
import cathedral from '../assets/graficos/token-cathedral.svg';
import market from '../assets/graficos/token-market.svg';
import plaza from '../assets/graficos/token-plaza.svg';
import theatre from '../assets/graficos/token-theatre.svg';
import train from '../assets/graficos/token-train.svg';
import type { Lot } from '../engine/lots';

/** Biblioteca gráfica «Talcapolis — Edición Arquitectónica Talca» (src/assets/graficos). */
export type Glyph = 'bank' | 'hotel' | 'house' | 'luck' | 'cathedral' | 'market' | 'plaza' | 'theatre' | 'train' | 'electricity' | 'water';

export const GLYPH_URL: Record<Glyph, string> = { bank, hotel, house, luck, cathedral, market, plaza, theatre, train, electricity, water };

/** Gráfico de cada edificio emblemático. */
export const LANDMARK_GLYPH: Record<string, Glyph> = {
  'plaza-de-armas': 'plaza',
  catedral: 'cathedral',
  'santuario-maria-auxiliadora': 'cathedral',
  'iglesia-corazon-de-maria': 'cathedral',
  'teatro-regional': 'theatre',
  estacion: 'train',
  'mercado-central': 'market',
  'mercado-provisorio': 'market',
  intendencia: 'bank',
  'corte-apelaciones': 'bank',
  'casa-independencia': 'house',
  // Universidades, liceos, escuelas y edificios de oficinas.
  'u-talca-casa-central': 'hotel',
  'edificio-ohiggins': 'hotel',
  'escuelas-concentradas': 'hotel',
  'liceo-la-salle': 'hotel',
  'liceo-abate-molina': 'hotel',
  'liceo-marta-donoso': 'hotel',
  'extension-utalca': 'hotel',
  'extension-ucm': 'hotel',
};

export const glyphOfLandmark = (id: string): Glyph => LANDMARK_GLYPH[id] ?? 'hotel';

/** Casa => casa, local comercial => mercado, emblemático => el de su edificio. */
export const glyphOfLot = (lot: Pick<Lot, 'kind' | 'landmarkId'>): Glyph =>
  lot.kind === 'emblematico' && lot.landmarkId ? glyphOfLandmark(lot.landmarkId) : lot.kind === 'local' ? 'market' : 'house';
