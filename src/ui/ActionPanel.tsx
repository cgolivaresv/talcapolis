import type { Game } from '../engine/game';
import type { Lot } from '../engine/lots';
import { BARRIO_COLORS } from './BoardView';
import { KIND_LABEL, PLAYER_COLORS } from './colors';
import { Dice } from './Dice';

interface Props {
  game: Game;
  lots: Lot[];
  onRoll: () => void;
  onBuy: (lotId: string) => void;
  onSkip: () => void;
  onAccept: () => void;
  onReject: () => void;
  onOpenTrade: () => void;
  /** Al pasar por un lote ofrecido se muestra su ficha. */
  onPreviewLot: (lot: Lot) => void;
}

/** Controles del turno: tirar, elegir destino, comprar, responder una oferta. Muestra los dados tirados. */
export function ActionPanel({ game, lots, onRoll, onBuy, onSkip, onAccept, onReject, onOpenTrade, onPreviewLot }: Props) {
  const turnOf = game.players[game.current];
  const buyLots = game.buyOptions.map((id) => lots.find((l) => l.id === id)!);
  const lotName = (id: string) => lots.find((l) => l.id === id)?.name.split(',')[0] ?? id;
  const tradeSide = (ids: string[], money: number) => [...ids.map(lotName), ...(money ? [`$${money}`] : [])].join(' + ') || 'nada';

  return (
    <section className="panel action-panel" aria-live="polite" aria-label="Turno">
      <header className="panel-head">
        <h2>
          Turno de <span className="dot" style={{ background: PLAYER_COLORS[game.current] }} /> {turnOf.id}
          {turnOf.inJail ? <small className="tag">preso</small> : null}
        </h2>
      </header>

      {game.dice ? <Dice dice={game.dice} rollKey={game.log.length} /> : null}

      {game.winner !== null ? (
        <p className="winner">
          <strong>¡{game.players[game.winner].id} gana la partida!</strong>
        </p>
      ) : game.trade ? (
        <div className="action-body">
          <p className="hint">
            <strong>{game.players[game.trade.from].id}</strong> propone a <strong>{game.players[game.trade.to].id}</strong>:
          </p>
          <p className="trade-summary">
            <span>Da: {tradeSide(game.trade.giveLots, game.trade.giveMoney)}</span>
            <span>Pide: {tradeSide(game.trade.takeLots, game.trade.takeMoney)}</span>
          </p>
          <div className="btn-row">
            <button type="button" className="btn btn-primary" onClick={onAccept}>
              {game.players[game.trade.to].id} acepta
            </button>
            <button type="button" className="btn btn-secondary" onClick={onReject}>
              Rechazar
            </button>
          </div>
        </div>
      ) : game.buyOptions.length > 0 ? (
        <div className="action-body">
          <p className="hint">Puedes comprar un lote de esta calle:</p>
          <div className="buy-list">
            {buyLots.map((l) => (
              <button key={l.id} type="button" className="buy-option" onClick={() => onBuy(l.id)} onMouseEnter={() => onPreviewLot(l)} onFocus={() => onPreviewLot(l)}>
                <span className="swatch" style={{ background: BARRIO_COLORS[l.barrio] }} />
                <span className="buy-name">{l.kind === 'emblematico' ? l.name : `${KIND_LABEL[l.kind]} · ${l.frontStreetName}`}</span>
                <strong>${l.price}</strong>
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-tertiary" onClick={onSkip}>
            No comprar
          </button>
        </div>
      ) : game.options.length > 0 ? (
        <p className="hint">
          Toca una casilla marcada del tablero para avanzar <em>({game.options.length} destinos)</em>.
        </p>
      ) : (
        <div className="btn-row">
          <button type="button" className="btn btn-primary btn-lg" onClick={onRoll}>
            Tirar dados
          </button>
          <button type="button" className="btn btn-secondary" onClick={onOpenTrade}>
            Intercambio
          </button>
        </div>
      )}
    </section>
  );
}
