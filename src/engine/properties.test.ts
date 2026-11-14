import { describe, expect, it } from 'vitest';
import { buildBoard } from './board';
import { LANDMARKS } from './landmarks';
import {
  LANDMARK_INFO,
  MAX_BUILDING_LEVEL,
  buildCostOf,
  landmarkPriceOf,
  landmarkRentOf,
  rentAtLevel,
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
  const board = buildBoard();
  const seg = board.segments[0];

  it('el arriendo crece con cada nivel', () => {
    const rents = Array.from({ length: MAX_BUILDING_LEVEL + 1 }, (_, l) => rentAtLevel(seg, l));
    for (let i = 1; i < rents.length; i++) expect(rents[i]).toBeGreaterThan(rents[i - 1]);
  });

  it('rechaza niveles inválidos', () => {
    expect(() => rentAtLevel(seg, 6)).toThrow();
    expect(() => rentAtLevel(seg, -1)).toThrow();
    expect(() => rentAtLevel(seg, 1.5)).toThrow();
  });

  it('construir cuesta más en los grupos caros', () => {
    const cheap = board.segments.find((s) => s.street.group === 0)!;
    const dear = board.segments.find((s) => s.street.group === 7)!;
    expect(buildCostOf(dear)).toBeGreaterThan(buildCostOf(cheap));
  });
});
