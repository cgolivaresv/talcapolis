import { useEffect, useRef, useState } from 'react';
import tokenBase from '../assets/premium/token-base.svg';
import type { Game } from '../engine/game';
import { PLAYER_COLORS } from './colors';
import { useExit } from './hooks';

interface Props {
  game: Game;
  totalLots: number;
  barrios: number;
  onNewGame: () => void;
}

/** Barra superior: identidad, jugador en turno y menú de la partida. */
export function TopBar({ game, totalLots, barrios, onNewGame }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const menu = useExit(menuOpen);
  const root = useRef<HTMLDivElement>(null);
  const turnOf = game.players[game.current];

  useEffect(() => {
    if (!menuOpen) {
      setConfirm(false);
      return;
    }
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [menuOpen]);

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" style={{ backgroundImage: `url(${tokenBase})` }} aria-hidden="true">
          T
        </span>
        <div className="brand-text">
          <h1>TALCAPOLIS</h1>
          <p>
            {totalLots} lotes · {barrios} barrios · las calles no se compran
          </p>
        </div>
      </div>

      <div className="turn-chip" aria-live="polite">
        {game.winner !== null ? (
          <strong>¡{game.players[game.winner].id} gana!</strong>
        ) : (
          <>
            <span className="dot halo" style={{ background: PLAYER_COLORS[game.current] }} />
            <span className="chip-label">Turno de</span> <strong>{turnOf.id}</strong>
            <span className="chip-money">${turnOf.money}</span>
          </>
        )}
      </div>

      <div className="menu" ref={root}>
        <button type="button" className="btn btn-secondary btn-sm" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
          Menú <span aria-hidden="true">▾</span>
        </button>
        {menu.mounted && (
          <div className="menu-list" role="menu" data-open={menu.open}>
            <button type="button" role="menuitem" className={confirm ? 'danger' : undefined} onClick={() => (confirm ? onNewGame() : setConfirm(true))}>
              {confirm ? '¿Seguro? Se pierde la partida' : 'Nueva partida'}
            </button>
            <a role="menuitem" href="https://github.com/cgolivaresv/talcapolis" target="_blank" rel="noreferrer">
              Código en GitHub
            </a>
            <a role="menuitem" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
              Datos © OpenStreetMap
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
