import cardBack from '../assets/premium/cardback-luck.svg';
import { GLYPH_URL } from './glyphs';
import type { DrawnCardInfo } from './hooks';

/**
 * Tarjeta que acaba de sacar un jugador al caer en una casilla "?". El texto y el efecto son los
 * que registró el juego; la animación solo da vuelta la carta.
 */
export function DrawnCard({ card, onDismiss }: { card: DrawnCardInfo | null; onDismiss: () => void }) {
  if (!card) {
    return (
      <div className="panel drawn drawn-empty" aria-label="Tarjetas">
        <img src={cardBack} alt="" />
        <p>
          Las tarjetas que se saquen en las casillas <strong>?</strong> aparecen aquí.
        </p>
      </div>
    );
  }
  return (
    <div className="panel drawn" aria-live="polite" aria-label="Tarjeta sacada">
      <div className="flip" key={card.key}>
        <div className="flip-inner">
          <img className="flip-face flip-back" src={cardBack} alt="" />
          <article className="flip-face flip-front">
            <img src={GLYPH_URL.luck} alt="" className="card-star" />
            <p className="card-who">{card.player}</p>
            <p className="card-text">{card.text}</p>
            <p className="card-effect">{card.effect}</p>
          </article>
        </div>
      </div>
      <button type="button" className="sheet-close" onClick={onDismiss} aria-label="Cerrar tarjeta">
        ✕
      </button>
    </div>
  );
}
