import { useState } from 'react';
import medallion from '../assets/premium/center-medallion.svg';
import { MAX_PLAYERS, MIN_PLAYERS, validatePlayerNames } from '../engine/game';
import { PLAYER_COLORS } from './colors';

/** Pantalla inicial: cantidad de jugadores y nombres. */
export function SetupScreen({ onStart }: { onStart: (names: string[]) => void }) {
  const [count, setCount] = useState(3);
  const [names, setNames] = useState(() => Array.from({ length: MAX_PLAYERS }, (_, k) => `Jugador ${k + 1}`));
  const chosen = names.slice(0, count).map((n) => n.trim());
  const problem = validatePlayerNames(chosen);

  return (
    <main className="setup-screen">
      <img className="setup-medallion" src={medallion} alt="Talcapolis · Edición Arquitectónica · Talca, Chile" />
      <form
        className="panel setup"
        onSubmit={(e) => {
          e.preventDefault();
          if (!problem) onStart(chosen);
        }}
      >
        <header className="panel-head">
          <h2>Nueva partida</h2>
        </header>
        <div className="segmented" role="group" aria-label="Cantidad de jugadores">
          {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, k) => k + MIN_PLAYERS).map((n) => (
            <button key={n} type="button" className={n === count ? 'on' : undefined} aria-pressed={n === count} onClick={() => setCount(n)}>
              {n}
            </button>
          ))}
          <span>jugadores</span>
        </div>
        <ul className="setup-names">
          {names.slice(0, count).map((n, k) => (
            <li key={k}>
              <span className="avatar" style={{ background: PLAYER_COLORS[k] }} aria-hidden="true">
                {(n.trim().charAt(0) || String(k + 1)).toUpperCase()}
              </span>
              <input
                value={n}
                maxLength={16}
                aria-label={`Nombre del jugador ${k + 1}`}
                onChange={(e) => setNames((all) => all.map((x, j) => (j === k ? e.target.value : x)))}
              />
            </li>
          ))}
        </ul>
        {problem && <p className="setup-error">{problem}</p>}
        <button type="submit" className="btn btn-primary btn-lg" disabled={!!problem}>
          Empezar
        </button>
      </form>
    </main>
  );
}
