import { describe, expect, it } from 'vitest';
import { BARRIOS, barrioAt } from './barrios';
import { buildBoard } from './board';
import { placeLandmarks } from './landmarks';
import { MIN_SITES_PER_MANZANA, SITES_PER_MANZANA, buildLots, lotsFacingStreet, lotsOfBarrio, lotsOfManzana } from './lots';

describe('lotes y barrios', () => {
  const board = buildBoard();
  const landmarks = placeLandmarks(board);
  const lots = buildLots(board, landmarks);
  const manzanaIds = [...new Set(lots.map((l) => l.manzanaId))];

  it('hay 60 manzanas y cada una tiene al menos 3 sitios', () => {
    expect(manzanaIds).toHaveLength(60);
    for (const id of manzanaIds) expect(lotsOfManzana(lots, id).length).toBeGreaterThanOrEqual(MIN_SITES_PER_MANZANA);
  });

  it('cada manzana tiene un sitio por cada calle que la rodea', () => {
    for (const id of manzanaIds) {
      const sides = lotsOfManzana(lots, id).map((l) => l.side).sort();
      expect(sides).toEqual(['E', 'N', 'S', 'W']);
      expect(lotsOfManzana(lots, id)).toHaveLength(SITES_PER_MANZANA);
    }
  });

  it('toda calle entera tiene sitios a sus dos lados', () => {
    const fronts = lots.map((l) => l.frontStreetId);
    for (const id of new Set(fronts)) {
      const n = lotsFacingStreet(lots, id).length;
      expect(n).toBeGreaterThanOrEqual(3);
    }
  });

  it('están los 19 edificios emblemáticos, además de casas y locales comerciales', () => {
    expect(lots.filter((l) => l.kind === 'emblematico')).toHaveLength(19);
    expect(lots.filter((l) => l.kind === 'casa').length).toBeGreaterThan(0);
    expect(lots.filter((l) => l.kind === 'local').length).toBeGreaterThan(0);
  });

  it('los ids son únicos y todo lote tiene precio y barrio válidos', () => {
    expect(new Set(lots.map((l) => l.id)).size).toBe(lots.length);
    for (const l of lots) {
      expect(l.price).toBeGreaterThan(0);
      expect(l.barrio).toBeGreaterThanOrEqual(0);
      expect(l.barrio).toBeLessThan(BARRIOS.length);
    }
  });

  it('el local comercial cuesta el doble que una casa del mismo barrio', () => {
    for (const b of BARRIOS) {
      const casa = lots.find((l) => l.barrio === b.id && l.kind === 'casa');
      const local = lots.find((l) => l.barrio === b.id && l.kind === 'local');
      if (casa) expect(casa.price).toBe(b.casaPrice);
      if (local) expect(local.price).toBe(b.casaPrice * 2);
    }
  });

  it('todos los sitios de una manzana son del mismo barrio', () => {
    for (const id of manzanaIds) {
      expect(new Set(lotsOfManzana(lots, id).map((l) => l.barrio)).size).toBe(1);
    }
  });

  it('los 8 barrios tienen lotes', () => {
    for (const b of BARRIOS) expect(lotsOfBarrio(lots, b.id).length).toBeGreaterThanOrEqual(10);
  });

  it('cada lugar real queda en su barrio', () => {
    const of = (id: string) => lots.find((l) => l.id === `em:${id}`)!;
    expect(of('plaza-de-armas').barrio).toBe(7);
    expect(of('estacion').barrio).toBe(0);
    expect(of('teatro-regional').barrio).toBe(6);
    expect(of('mercado-central').barrio).toBe(3);
  });

  it('barrioAt asigna el lugar real más cercano', () => {
    for (const b of BARRIOS) expect(barrioAt(b.center.rowM, b.center.colM)).toBe(b.id);
  });
});
