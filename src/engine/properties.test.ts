import { describe, expect, it } from 'vitest';
import { LANDMARKS } from './landmarks';
import {
  LANDMARK_INFO,
  MAX_BUILDING_LEVEL,
  buildCostOf,
  landmarkPriceOf,
  landmarkRentOf,
  manzanaRentAtLevel,
} from './properties';

describe('edificios emblemáticos', () => {
  it('todos los edificios tienen clase y precio, y no sobran datos', () => {
    expect(Object.keys(LANDMARK_INFO).sort()).toEqual(LANDMARKS.map((l) => l.id).sort());
    for (const l of LANDMARKS) expect(landmarkPriceOf(l.id)).toBeGreaterThan(0);
  });

  it('el arriendo se duplica por cada edificio más de la misma clase', () => {
    expect(landmarkRentOf('estacion', 1)).toBe(25);
    expect(landmarkRentOf('liceo-la-salle', 1)).toBe(15);
    expect(landmarkRentOf('liceo-la-salle', 2)).toBe(30);
    expect(landmarkRentOf('liceo-la-salle', 4)).toBe(120);
  });
});

describe('casas y locales comerciales', () => {
  it('el arriendo crece con cada nivel', () => {
    const rents = Array.from({ length: MAX_BUILDING_LEVEL + 1 }, (_, l) => manzanaRentAtLevel(100, l));
    for (let i = 1; i < rents.length; i++) expect(rents[i]).toBeGreaterThan(rents[i - 1]);
  });

  it('tener todo el barrio duplica el arriendo de una manzana sin construir, y solo de esa', () => {
    expect(manzanaRentAtLevel(100, 0, true)).toBe(2 * manzanaRentAtLevel(100, 0, false));
    expect(manzanaRentAtLevel(100, 2, true)).toBe(manzanaRentAtLevel(100, 2, false));
  });

  it('rechaza niveles inválidos', () => {
    expect(() => manzanaRentAtLevel(100, 6)).toThrow();
    expect(() => manzanaRentAtLevel(100, -1)).toThrow();
    expect(() => manzanaRentAtLevel(100, 1.5)).toThrow();
  });

  it('construir cuesta más en los barrios caros', () => {
    expect(buildCostOf(7)).toBeGreaterThan(buildCostOf(0));
  });
});
