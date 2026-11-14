import { useState } from 'react';
import { tradeIsValid, type Game, type Trade } from '../engine/game';
import type { Lot } from '../engine/lots';

interface Props {
  game: Game;
  lots: Lot[];
  colors: string[];
  onPropose: (trade: Trade) => void;
  onCancel: () => void;
}

const lotLabel = (l: Lot) =>
  l.kind === 'emblematico' ? l.name : `${l.kind === 'casa' ? 'Casa' : 'Local'} · ${l.frontStreetName} (${l.name.split(', ').slice(1).join(', ')})`;

/** Formulario para armar una oferta de intercambio del jugador en turno. */
export function TradePanel({ game, lots, colors, onPropose, onCancel }: Props) {
  const from = game.current;
  const rivals = game.players.map((_, k) => k).filter((k) => k !== from && !game.bankrupt[k]);
  const [to, setTo] = useState(rivals[0] ?? 0);
  const [giveLots, setGiveLots] = useState<string[]>([]);
  const [takeLots, setTakeLots] = useState<string[]>([]);
  const [giveMoney, setGiveMoney] = useState(0);
  const [takeMoney, setTakeMoney] = useState(0);

  const lotsOf = (k: number) => lots.filter((l) => game.owners[l.id] === k);
  const toggle = (list: string[], set: (v: string[]) => void, id: string) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const trade: Trade = { from, to, giveLots, giveMoney, takeLots, takeMoney };
  const valid = tradeIsValid(game, trade);

  const picker = (k: number, selected: string[], set: (v: string[]) => void) => (
    <ul className="trade-lots">
      {lotsOf(k).length === 0 && <li className="trade-none">Sin lotes</li>}
      {lotsOf(k).map((l) => (
        <li key={l.id}>
          <label>
            <input type="checkbox" checked={selected.includes(l.id)} onChange={() => toggle(selected, set, l.id)} />
            {lotLabel(l)} <strong>${l.price}</strong>
          </label>
        </li>
      ))}
    </ul>
  );

  const money = (value: number, max: number, set: (v: number) => void) => (
    <label className="trade-money">
      Dinero $
      <input type="number" min={0} max={max} value={value} onChange={(e) => set(Math.max(0, Math.floor(Number(e.target.value) || 0)))} />
    </label>
  );

  return (
    <div className="trade-form">
      <label className="trade-to">
        Intercambiar con{' '}
        <select
          value={to}
          onChange={(e) => {
            setTo(Number(e.target.value));
            setTakeLots([]);
          }}
        >
          {rivals.map((k) => (
            <option key={k} value={k}>
              {game.players[k].id}
            </option>
          ))}
        </select>
      </label>

      <h3>
        <span style={{ color: colors[from] }}>●</span> Ofreces
      </h3>
      {picker(from, giveLots, setGiveLots)}
      {money(giveMoney, game.players[from].money, setGiveMoney)}

      <h3>
        <span style={{ color: colors[to] }}>●</span> Pides
      </h3>
      {picker(to, takeLots, setTakeLots)}
      {money(takeMoney, game.players[to].money, setTakeMoney)}

      <div className="trade-actions">
        <button type="button" className="roll-btn" disabled={!valid} onClick={() => onPropose(trade)}>
          Proponer
        </button>
        <button type="button" className="skip-btn" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
