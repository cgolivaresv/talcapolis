import { mortgageCheck, propertyName, propertyPrice, sellCheck } from '../engine/assets';
import { MIN_RAISE, totalDebt, type Game } from '../engine/game';
import type { Lot } from '../engine/lots';
import { improvementSaleValue, mortgageValue } from '../engine/properties';
import { isServiceId } from '../engine/services';
import { BARRIO_COLORS } from './BoardView';
import { KIND_LABEL, PLAYER_COLORS, SERVICE_COLOR } from './colors';
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
  /** Al pasar por una propiedad ofrecida se muestra su ficha. */
  onPreviewProperty: (id: string) => void;
  onBid: (amount: number) => void;
  onPassBid: () => void;
  onPayDebts: () => void;
  onBankrupt: () => void;
  onMortgage: (id: string) => void;
  onSellImprovement: (id: string) => void;
}

/** Subidas rápidas de la oferta en una subasta. */
const BID_STEPS = [MIN_RAISE, 25, 50];

/** Controles del turno: tirar, elegir destino, comprar, subastar, pagar deudas, responder una oferta. */
export function ActionPanel({
  game,
  lots,
  onRoll,
  onBuy,
  onSkip,
  onAccept,
  onReject,
  onOpenTrade,
  onPreviewProperty,
  onBid,
  onPassBid,
  onPayDebts,
  onBankrupt,
  onMortgage,
  onSellImprovement,
}: Props) {
  const turnOf = game.players[game.current];
  const name = (id: string) => propertyName(id, lots);
  const shortName = (id: string) => name(id).split(',')[0];
  const tradeSide = (ids: string[], money: number) => [...ids.map(shortName), ...(money ? [`$${money}`] : [])].join(' + ') || 'nada';
  const auction = game.auction;
  const debt = totalDebt(game);

  /** Propiedades con las que el jugador en deuda puede juntar plata. */
  const liquidations = game.debts.length
    ? Object.keys(game.owners)
        .filter((id) => game.owners[id] === game.current)
        .map((id) => {
          const lot = lots.find((l) => l.id === id);
          const price = propertyPrice(id, lots);
          if (lot && sellCheck(game, game.current, lot, lots) === null) {
            return { id, label: `Vender mejora · ${shortName(id)}`, value: improvementSaleValue(price), sell: true };
          }
          if (mortgageCheck(game, game.current, id, lots) === null) {
            return { id, label: `Hipotecar · ${shortName(id)}`, value: mortgageValue(price), sell: false };
          }
          return null;
        })
        .filter((x): x is { id: string; label: string; value: number; sell: boolean } => x !== null)
    : [];

  return (
    <section className="panel action-panel" aria-live="polite" aria-label="Turno">
      <header className="panel-head">
        <h2>
          {auction ? 'Subasta' : 'Turno de'} <span className="dot" style={{ background: PLAYER_COLORS[auction ? auction.bidder : game.current] }} />{' '}
          {auction ? game.players[auction.bidder].id : turnOf.id}
          {turnOf.inJail && !auction ? <small className="tag">preso</small> : null}
        </h2>
      </header>

      {game.dice ? <Dice dice={game.dice} rollKey={game.log.length} /> : null}

      {game.winner !== null ? (
        <p className="winner">
          <strong>¡{game.players[game.winner].id} gana la partida!</strong>
        </p>
      ) : auction ? (
        <div className="action-body">
          <p className="hint">
            <strong>{shortName(auction.queue[0])}</strong> (precio ${propertyPrice(auction.queue[0], lots)}).{' '}
            {auction.highBidder === null ? 'Sin ofertas todavía.' : <>Oferta más alta: <strong>${auction.highBid}</strong> de {game.players[auction.highBidder].id}.</>}
          </p>
          <p className="hint hint-soft">Tiene ${game.players[auction.bidder].money}. ¿Cuánto ofrece?</p>
          <div className="btn-row bid-row">
            {BID_STEPS.map((step) => {
              const amount = auction.highBid + step;
              return (
                <button key={step} type="button" className="btn btn-secondary" disabled={amount > game.players[auction.bidder].money} onClick={() => onBid(amount)}>
                  ${amount}
                </button>
              );
            })}
            <button type="button" className="btn btn-tertiary" onClick={onPassBid}>
              Retirarse
            </button>
          </div>
        </div>
      ) : game.debts.length > 0 ? (
        <div className="action-body">
          <p className="hint">
            <strong>{turnOf.id}</strong> debe <strong>${debt}</strong> ({game.debts.map((d) => d.reason).join(', ')}) y tiene ${turnOf.money}.
          </p>
          <div className="buy-list">
            {liquidations.map((l) => (
              <button
                key={l.id + (l.sell ? 's' : 'h')}
                type="button"
                className="buy-option"
                onMouseEnter={() => onPreviewProperty(l.id)}
                onClick={() => (l.sell ? onSellImprovement(l.id) : onMortgage(l.id))}
              >
                <span className="buy-name">{l.label}</span>
                <strong>+${l.value}</strong>
              </button>
            ))}
          </div>
          <div className="btn-row">
            <button type="button" className="btn btn-primary" disabled={turnOf.money < debt} onClick={onPayDebts}>
              Pagar ${debt}
            </button>
            <button type="button" className="btn btn-tertiary" onClick={onBankrupt}>
              Declarar quiebra
            </button>
          </div>
        </div>
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
          <p className="hint">Puedes comprar de esta calle:</p>
          <div className="buy-list">
            {game.buyOptions.map((id) => {
              const lot = lots.find((l) => l.id === id);
              const swatch = isServiceId(id) || !lot ? SERVICE_COLOR : BARRIO_COLORS[lot.barrio];
              return (
                <button key={id} type="button" className="buy-option" onClick={() => onBuy(id)} onMouseEnter={() => onPreviewProperty(id)} onFocus={() => onPreviewProperty(id)}>
                  <span className="swatch" style={{ background: swatch }} />
                  <span className="buy-name">{lot && lot.kind !== 'emblematico' ? `${KIND_LABEL[lot.kind]} · ${lot.frontStreetName}` : name(id)}</span>
                  <strong>${propertyPrice(id, lots)}</strong>
                </button>
              );
            })}
          </div>
          <button type="button" className="btn btn-tertiary" onClick={onSkip}>
            No comprar (se subasta)
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
