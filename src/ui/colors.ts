import type { CSSProperties } from 'react';

/** Color de las fichas de edificio emblemático (distinto del de todos los barrios). */
export const EMBLEM_COLOR = '#5b3a7a'; // violeta
/** Color de las fichas de servicios (aún no hay servicios en el juego). */
export const SERVICE_COLOR = '#1f8a8a'; // verde azulado
/** Color de la ficha informativa de una calle (que no se compra). */
export const STREET_COLOR = '#6b7378'; // gris piedra

/** Luminancia relativa (0 negro, 1 blanco) de un color #rrggbb. */
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}

/** Variables CSS para pintar una ficha con el color dado, con texto legible encima. */
export function cardTheme(bg: string): CSSProperties {
  const light = luminance(bg) > 0.3;
  return {
    '--card': bg,
    '--card-fg': light ? '#222629' : '#f5f1e8',
    '--card-accent': light ? 'rgba(34, 38, 41, 0.72)' : 'rgba(245, 241, 232, 0.78)',
  } as CSSProperties;
}

/** Color de la ficha de cada jugador (en orden de asiento). */
export const PLAYER_COLORS = ['#e8423a', '#2f7fd6', '#f2b90c', '#2e9e5b', '#8e44ad', '#555555'];

export const KIND_LABEL = { casa: 'Casa', local: 'Local comercial', emblematico: 'Edificio emblemático' } as const;
