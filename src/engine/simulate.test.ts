import { describe, expect, it } from 'vitest';
import { RANDOM_ACTIONS, type RandomAction } from './actions';
import { buildBoard } from './board';
import { cardSquaresOf } from './cards';
import { moveTo, newGame, roll, skipBuy } from './game';
import { placeLandmarks } from './landmarks';
import { buildLots } from './lots';
import { simulate, summarize, type Policy } from './simulate';

/**
 * Con SIM_GAMES=300 (y opcionalmente SIM_PLAYERS=4, SIM_POLICY=random) imprime un resumen de equilibrio:
 *   SIM_GAMES=300 npx vitest run src/engine/simulate.test.ts
 */
declare const process: { env: Record<string, string | undefined> };
const GAMES = Number(process.env.SIM_GAMES ?? 0);

describe('simulación de partidas', () => {
  it('las partidas automáticas respetan las reglas y terminan', () => {
    for (const players of [2, 4, 6]) {
      for (let seed = 1; seed <= 3; seed++) {
        const r = simulate({ players, seed, maxRolls: 4000 });
        expect(r.rolls).toBeGreaterThan(0);
        expect(r.lotsSold).toBeGreaterThanOrEqual(0);
        for (const m of r.finalMoney) expect(m).toBeGreaterThanOrEqual(0);
        if (r.finished) expect(r.winner).not.toBeNull();
      }
    }
  });

  it.runIf(GAMES > 0)('resumen de equilibrio', () => {
    const players = Number(process.env.SIM_PLAYERS ?? 4);
    const policy = (process.env.SIM_POLICY ?? 'smart') as Policy;
    const results = Array.from({ length: GAMES }, (_, k) => simulate({ players, seed: 1000 + k, policy, maxRolls: 6000, reserve: Number(process.env.SIM_RESERVE ?? 150) }));
    const avg = (k: 'rent' | 'start' | 'bought' | 'fines' | 'bankIn' | 'bankOut') => Math.round(results.reduce((s, r) => s + r.flows[k], 0) / results.length);
    console.log('FLUJOS por partida', JSON.stringify({ rent: avg('rent'), start: avg('start'), bought: avg('bought'), fines: avg('fines'), bankIn: avg('bankIn'), bankOut: avg('bankOut') }));
    console.log(`SIM ${players} jugadores, política ${policy}:`, JSON.stringify(summarize(results, players)));
  });
});

describe('acciones aleatorias de la ciudad', () => {
  const board = buildBoard();
  const landmarks = placeLandmarks(board);
  const lots = buildLots(board, landmarks);
  const cardSquares = cardSquaresOf(board, landmarks);
  const ctx = { board, landmarks, lots, cardSquares };
  const randomNode = board.intersections.find((n) => !cardSquares.has(n.id) && !['11-oriente/2-sur', '2-poniente/2-sur', '2-poniente/4-norte', '11-oriente/4-norte'].includes(n.id))!;

  /** Fuerza una única acción y hace caer al jugador 0 en una casilla de acción. */
  function land(action: RandomAction) {
    const saved = RANDOM_ACTIONS.splice(0, RANDOM_ACTIONS.length, action);
    try {
      const g = newGame(['A', 'B'], 4);
      const withOption = { ...g, dice: [1, 2] as [number, number], options: [{ square: randomNode.id, path: ['x', 'y', randomNode.id], passedStart: false }] };
      return moveTo(withOption, randomNode.id, ctx);
    } finally {
      RANDOM_ACTIONS.splice(0, RANDOM_ACTIONS.length, ...saved);
    }
  }

  it('hay varias acciones con ids distintos', () => {
    expect(RANDOM_ACTIONS.length).toBeGreaterThanOrEqual(8);
    expect(new Set(RANDOM_ACTIONS.map((a) => a.id)).size).toBe(RANDOM_ACTIONS.length);
  });

  it('una acción de dinero cobra o paga', () => {
    const g = land({ id: 't', text: 'x', effect: { type: 'money', amount: 25 } });
    expect(g.players[0].money).toBe(1525);
    expect(g.log.at(-1)).toContain('casilla de acción');
  });

  it('perder el turno hace que el jugador salte su próxima vez', () => {
    let g = land({ id: 't', text: 'x', effect: { type: 'loseTurn' } });
    expect(g.current).toBe(1);
    // B juega su turno y vuelve a A, que debe perder el suyo
    for (let k = 0; k < 40 && !g.log.some((l) => l.includes('pierde este turno')); k++) {
      if (g.buyOptions.length) g = skipBuy(g);
      else if (g.options.length) g = moveTo(g, g.options[0].square, ctx);
      else g = roll(g, board);
    }
    expect(g.log.some((l) => l.includes('A pierde este turno'))).toBe(true);
    expect(g.current).toBe(1);
  });

  it('tirar de nuevo mantiene el turno', () => {
    const g = land({ id: 't', text: 'x', effect: { type: 'extraTurn' } });
    expect(g.current).toBe(0);
    expect(g.log.at(-1)).toContain('tira de nuevo');
  });

  it('mover a un edificio cambia la posición', () => {
    const g = land({ id: 't', text: 'x', effect: { type: 'moveToLandmark', landmarkId: 'catedral' } });
    expect(g.players[0].at).not.toBe(randomNode.id);
  });
});
