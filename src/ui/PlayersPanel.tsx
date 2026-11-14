import type { Game } from '../engine/game';
import { PLAYER_COLORS } from './colors';

interface Props {
  game: Game;
  totalLots: number;
  /** Solo en móvil: cierra el panel desplegable. */
  onClose?: () => void;
}

/** Jugadores, saldos e indicador del jugador en turno, más datos generales de la partida. */
export function PlayersPanel({ game, totalLots, onClose }: Props) {
  const sold = Object.keys(game.owners).length;
  const alive = game.bankrupt.filter((b) => !b).length;
  return (
    <section className="panel players-panel" aria-label="Jugadores">
      <header className="panel-head">
        <h2>Jugadores</h2>
        <button type="button" className="sheet-close" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>
      </header>
      <ul className="player-list">
        {game.players.map((p, k) => {
          const active = k === game.current && game.winner === null;
          return (
            <li key={p.id} className={['player', active ? 'is-active' : '', game.bankrupt[k] ? 'is-out' : ''].join(' ').trim()}>
              <span className="avatar" style={{ background: PLAYER_COLORS[k] }} aria-hidden="true">
                {p.id.trim().charAt(0).toUpperCase()}
              </span>
              <span className="player-name">
                {p.id}
                <small>
                  {game.bankrupt[k] ? 'En quiebra' : p.inJail ? 'Preso' : `${p.ownedLotIds.length} ${p.ownedLotIds.length === 1 ? 'lote' : 'lotes'}`}
                </small>
              </span>
              <strong className="money">${p.money}</strong>
            </li>
          );
        })}
      </ul>
      <dl className="game-info">
        <dt>Lotes vendidos</dt>
        <dd>
          {sold} / {totalLots}
        </dd>
        <dt>Jugadores en juego</dt>
        <dd>
          {alive} / {game.players.length}
        </dd>
      </dl>
    </section>
  );
}
