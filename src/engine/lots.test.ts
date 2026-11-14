import { describe, expect, it } from 'vitest';
import { BARRIOS } from './barrios';
import { buildBoard } from './board';
import { placeLandmarks } from './landmarks';
import { buildLots, lotsOfBarrio } from './lots';

describe('lotes y barrios', () => {
  const board = buildBoard();
  const landmarks = placeLandmarks(board);
  const lots = buildLots(board, landmarks);

  it('hay 57 manzanas y 19 edificios emblemáticos (3 edificios ocupan una manzana entera)', () => {
    expect(lots.filter((l) => l.kind === 'manzana')).toHaveLength(57);
    expect(lots.filter((l) => l.kind === 'emblematico')).toHaveLength(19);
  });

  it('los ids son únicos y todo lote tiene precio y barrio válidos', () => {
    expect(new Set(lots.map((l) => l.id)).size).toBe(lots.length);
    for (const l of lots) {
      expect(l.price).toBeGreaterThan(0);
      expect(l.barrio).toBeGreaterThanOrEqual(0);
      expect(l.barrio).toBeLessThan(BARRIOS.length);
    }
  });

  it('los 8 barrios tienen lotes, entre 5 y 15 cada uno', () => {
    for (const b of BARRIOS) {
      const n = lotsOfBarrio(lots, b.id).length;
      expect(n).toBeGreaterThanOrEqual(5);
      expect(n).toBeLessThanOrEqual(15);
    }
  });

  it('la Plaza de Armas queda en el Barrio Plaza y la Estación en el Barrio Estación', () => {
    const of = (id: string) => lots.find((l) => l.id === `em:${id}`)!;
    expect(of('plaza-de-armas').barrio).toBe(0);
    expect(of('estacion').barrio).toBe(6);
    expect(of('corte-apelaciones').barrio).toBe(1);
  });

  it('una manzana ocupada por un edificio no tiene además una casa', () => {
    const plazaCell = lots.find((l) => l.id === 'em:plaza-de-armas')!.cell;
    const same = lots.filter((l) => l.cell.row === plazaCell.row && l.cell.col === plazaCell.col && l.kind === 'manzana');
    expect(same).toHaveLength(0);
  });
});
