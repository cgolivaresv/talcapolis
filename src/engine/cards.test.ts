import { describe, expect, it } from 'vitest';
import { buildBoard } from './board';
import { CARDS, JAIL_NODE, applyCard, cardSquaresOf, createDeck, drawCard, landmarkNode, type PlayerState } from './cards';
import { placeLandmarks } from './landmarks';

const board = buildBoard();
const landmarks = placeLandmarks(board);
const ctx = { board, landmarks };
const player = (over: Partial<PlayerState> = {}): PlayerState => ({
  id: 'p1', money: 500, at: '1-oriente/1-sur', inJail: false, freeJailCards: 0, ownedLotIds: [], ...over,
});

describe('casillas "?"', () => {
  const squares = cardSquaresOf(board, landmarks);

  it('hay entre 8 y 16 casillas, todas en intersecciones que existen', () => {
    expect(squares.size).toBeGreaterThanOrEqual(8);
    expect(squares.size).toBeLessThanOrEqual(16);
    const ids = new Set(board.intersections.map((i) => i.id));
    for (const s of squares) expect(ids.has(s)).toBe(true);
  });

  it('ninguna está en una esquina ni en una intersección con edificio', () => {
    const lmNodes = new Set(landmarks.filter((l) => l.anchor.type === 'intersection').map((l) => landmarkNode(board, l)));
    for (const s of squares) {
      expect(lmNodes.has(s)).toBe(false);
      expect([JAIL_NODE, '2-poniente/2-sur', '11-oriente/2-sur', '11-oriente/4-norte']).not.toContain(s);
    }
  });
});

describe('tarjetas', () => {
  it('los ids son únicos y los edificios citados existen', () => {
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(CARDS.length);
    for (const c of CARDS) {
      if (c.action.type === 'moveToLandmark') {
        const id = c.action.landmarkId;
        expect(landmarks.some((l) => l.id === id)).toBe(true);
      }
    }
  });

  it('dinero: cobra y paga', () => {
    const gain = applyCard({ id: 'x', text: '', action: { type: 'money', amount: 80 } }, player(), [], ctx);
    expect(gain.player.money).toBe(580);
    const loss = applyCard({ id: 'x', text: '', action: { type: 'money', amount: -20 } }, player(), [], ctx);
    expect(loss.player.money).toBe(480);
  });

  it('avanzar a un edificio mueve al jugador a su intersección', () => {
    const r = applyCard({ id: 'x', text: '', action: { type: 'moveToLandmark', landmarkId: 'estacion' } }, player(), [], ctx);
    expect(r.player.at).toBe('11-oriente/2-sur');
  });

  it('la cárcel lleva a la Corte, salvo que tenga tarjeta de libertad', () => {
    const jail = applyCard({ id: 'x', text: '', action: { type: 'goToJail' } }, player(), [], ctx);
    expect(jail.player).toMatchObject({ at: JAIL_NODE, inJail: true });
    const saved = applyCard({ id: 'x', text: '', action: { type: 'goToJail' } }, player({ freeJailCards: 1 }), [], ctx);
    expect(saved.player).toMatchObject({ inJail: false, freeJailCards: 0 });
  });

  it('paga por lote y cobra a los demás sin dejarlos en negativo', () => {
    const per = applyCard({ id: 'x', text: '', action: { type: 'payPerLot', amount: 10 } }, player({ ownedLotIds: ['a', 'b', 'c'] }), [], ctx);
    expect(per.player.money).toBe(470);
    const others = [player({ id: 'p2', money: 100 }), player({ id: 'p3', money: 4 })];
    const from = applyCard({ id: 'x', text: '', action: { type: 'collectFromEach', amount: 10 } }, player(), others, ctx);
    expect(from.player.money).toBe(514);
    expect(from.others.map((o) => o.money)).toEqual([90, 0]);
  });

  it('no modifica los estados que recibe', () => {
    const p = player();
    applyCard({ id: 'x', text: '', action: { type: 'money', amount: 80 } }, p, [], ctx);
    expect(p.money).toBe(500);
  });
});

describe('mazo', () => {
  it('es determinista por semilla y reparte todas las tarjetas antes de repetir', () => {
    const run = (seed: number) => {
      let d = createDeck(seed);
      const ids: string[] = [];
      for (let i = 0; i < CARDS.length; i++) {
        const r = drawCard(d);
        ids.push(r.card.id);
        d = r.deck;
      }
      return ids;
    };
    expect(run(7)).toEqual(run(7));
    expect(run(7)).not.toEqual(run(8));
    expect(new Set(run(7)).size).toBe(CARDS.length);
  });

  it('al agotarse se vuelve a barajar', () => {
    let d = createDeck(1);
    for (let i = 0; i < CARDS.length + 3; i++) d = drawCard(d).deck;
    expect(d.next).toBe(3);
  });
});
