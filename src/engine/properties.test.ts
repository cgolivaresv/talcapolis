import { describe, expect, it } from 'vitest';
import { LANDMARKS } from './landmarks';
import {
  LANDMARK_INFO,
  baseRentOfLot,
  landmarkPriceOf,
  landmarkRentOf,
  lotRent,
} from './properties';

describe('edificios emblemáticos', () => {
  it('todos los edificios tienen clase y precio, y no sobran datos', () => {
    expect(Object.keys(LANDMARK_INFO).sort()).toEqual(LANDMARKS.map((l) => l.id).sort());
    for (const l of LANDMARKS) expect(landmarkPriceOf(l.id)).toBeGreaterThan(0);
  });

  it('el arriendo se duplica por cada edificio más de la misma clase', () => {
    expect(landmarkRentOf('estacion', 1)).toBe(600);
    expect(landmarkRentOf('liceo-la-salle', 1)).toBe(360);
    expect(landmarkRentOf('liceo-la-salle', 2)).toBe(720);
    expect(landmarkRentOf('liceo-la-salle', 4)).toBe(2880);
  });
});

describe('arriendo de casas y locales', () => {
  it('es el triple del precio, con mínimo de $2', () => {
    expect(baseRentOfLot(100)).toBe(300);
    expect(baseRentOfLot(40)).toBe(120);
    expect(baseRentOfLot(0)).toBe(2);
  });

  it('tener la manzana completa lo multiplica por 1,5 y el barrio completo por 2', () => {
    expect(lotRent(100)).toBe(300);
    expect(lotRent(100, { ownsManzana: true })).toBe(450);
    expect(lotRent(100, { ownsBarrio: true })).toBe(600);
    expect(lotRent(100, { ownsManzana: true, ownsBarrio: true })).toBe(900);
  });
});
