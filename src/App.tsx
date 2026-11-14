import { useEffect, useMemo, useRef, useState } from 'react';
import { BARRIOS } from './engine/barrios';
import { buildBoard } from './engine/board';
import type { Segment } from './engine/board';
import { cardSquaresOf } from './engine/cards';
import { MAX_PLAYERS, MIN_PLAYERS, acceptTrade, buy, validatePlayerNames, moveTo, newGame, proposeTrade, rejectTrade, roll, skipBuy } from './engine/game';
import { placeLandmarks } from './engine/landmarks';
import { buildLots, lotsOfBarrio, lotsOfManzana, type Lot } from './engine/lots';
import {
  BARRIO_COMPLETE_FACTOR,
  LANDMARK_INFO,
  LANDMARK_KIND_LABEL,
  MANZANA_COMPLETE_FACTOR,
  landmarkRentOf,
  lotRent,
} from './engine/properties';
import { directionOf } from './engine/traffic';
import { BARRIO_COLORS, BoardView } from './ui/BoardView';
import { GLYPH_URL, glyphOfLot } from './ui/glyphs';
import { TradePanel } from './ui/TradePanel';
import './App.css';

const PLAYER_COLORS = ['#e8423a', '#2f7fd6', '#f2b90c', '#2e9e5b', '#8e44ad', '#555555'];

const KIND_LABEL = { casa: 'Casa', local: 'Local comercial', emblematico: 'Edificio emblemático' } as const;

function Match({ names, seed, onExit }: { names: string[]; seed: number; onExit: () => void }) {
  const board = useMemo(() => buildBoard(), []);
  const landmarks = useMemo(() => placeLandmarks(board), [board]);
  const lots = useMemo(() => buildLots(board, landmarks), [board, landmarks]);
  const cardSquares = useMemo(() => cardSquaresOf(board, landmarks), [board, landmarks]);

  const [street, setStreet] = useState<Segment | null>(null);
  const [lot, setLot] = useState<Lot | null>(null);
  // Zoom: por defecto el tablero se ajusta solo al espacio que deja el resto de la pantalla (sin scroll).
  // Con zoom manual el tablero se desplaza dentro de su marco, que conserva el tamaño ajustado.
  const [manualZoom, setManualZoom] = useState<number | null>(null);
  const [fit, setFit] = useState({ zoom: 0.5, w: 0, h: 0 });
  const zoom = manualZoom ?? fit.zoom;
  const changeZoom = (delta: number) => setManualZoom(Math.min(1.5, Math.max(0.2, +(zoom + delta).toFixed(2))));
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const compute = () => {
      const vb = scrollRef.current?.querySelector('svg')?.viewBox.baseVal;
      if (!vb || !vb.width) return;
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const stacked = window.innerWidth < 900; // pantallas angostas: el tablero va arriba y se ajusta al ancho
      const bannerH = document.querySelector('.banner')?.getBoundingClientRect().height ?? 40;
      // Reserva: columna derecha (22rem), panel de turno bajo el tablero (14rem) y barra de zoom (2.4rem).
      const availW = window.innerWidth - 24 - 12 - (stacked ? 0 : 22 * rem);
      const availH = window.innerHeight - 16 - bannerH - 8 - 12 - 2.4 * rem - 14 * rem;
      const z = stacked ? availW / vb.width : Math.min(availW / vb.width, availH / vb.height);
      const zoom = Math.max(0.15, Math.floor(z * 1000) / 1000);
      setFit({ zoom, w: Math.floor(vb.width * zoom), h: Math.floor(vb.height * zoom) });
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  const [game, setGame] = useState(() => newGame(names, seed));
  const ctx = useMemo(() => ({ board, landmarks, lots, cardSquares }), [board, landmarks, lots, cardSquares]);
  const options = useMemo(() => new Set(game.options.map((d) => d.node)), [game.options]);
  const turnOf = game.players[game.current];
  const ownerColors = useMemo(
    () => Object.fromEntries(Object.entries(game.owners).map(([id, o]) => [id, PLAYER_COLORS[o]])),
    [game.owners],
  );
  const [trading, setTrading] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const lotName = (id: string) => lots.find((l) => l.id === id)?.name.split(',')[0] ?? id;
  const tradeSide = (ids: string[], money: number) =>
    [...ids.map(lotName), ...(money ? [`$${money}`] : [])].join(' + ') || 'nada';
  const buyLots = game.buyOptions.map((id) => lots.find((l) => l.id === id)!);

  // Con zoom manual el tablero puede desbordar: se lleva la vista hasta la ficha del jugador en turno.
  useEffect(() => {
    if (manualZoom === null) return;
    document.querySelector('[data-active-token]')?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
  }, [manualZoom, game.current, game.players]);

  const clearSelection = () => {
    setStreet(null);
    setLot(null);
  };
  const selectStreet = (s: Segment | null) => {
    clearSelection();
    setStreet(s);
  };
  const selectLot = (l: Lot) => {
    clearSelection();
    setLot(l);
  };

    const barrio = lot ? BARRIOS[lot.barrio] : null;
  const barrioLots = lot ? lotsOfBarrio(lots, lot.barrio) : [];
  const manzanaLots = lot ? lotsOfManzana(lots, lot.manzanaId) : [];
  const lm = lot?.landmarkId ? landmarks.find((l) => l.id === lot.landmarkId) : undefined;

  return (
    <main className="app">
      <header className="banner">
        <h1>TALCAPOLIS</h1>
        <p>
          {lots.length} lotes en venta en {BARRIOS.length} barrios · las calles no se compran
        </p>
        <button type="button" className="new-game" onClick={() => (confirmExit ? onExit() : setConfirmExit(true))} onBlur={() => setConfirmExit(false)}>
          {confirmExit ? '¿Seguro? Se pierde la partida' : 'Nueva partida'}
        </button>
      </header>

      <div className="layout">
        <div className="board-panel">
          <div className="zoom-bar" role="group" aria-label="Zoom del tablero">
            <button type="button" onClick={() => changeZoom(-0.1)} aria-label="Alejar">−</button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => changeZoom(0.1)} aria-label="Acercar">+</button>
            <button type="button" className="fit-btn" onClick={() => setManualZoom(null)} disabled={manualZoom === null}>
              Ajustar
            </button>
          </div>
          <div className={manualZoom === null ? 'board-scroll' : 'board-scroll manual'} ref={scrollRef} style={fit.w ? { width: fit.w, height: fit.h } : undefined}>
            <BoardView
              board={board}
              landmarks={landmarks}
              lots={lots}
              selectedId={street?.id ?? null}
              selectedLotId={lot?.id ?? null}
              cardSquares={cardSquares}
              tokens={game.players.map((p, k) => ({ id: p.id, label: p.id.trim().charAt(0).toUpperCase(), at: p.at, color: PLAYER_COLORS[k], active: k === game.current }))}
              options={options}
              ownerColors={ownerColors}
              onPickNode={(node) => setGame((g) => moveTo(g, node, ctx))}
              zoom={zoom}
              onSelect={selectStreet}
              onSelectLot={selectLot}
            />
          </div>
        </div>

        <div className="side">
          <section className="turn" aria-live="polite">
            <div className="turn-main">
            <h2>
              Turno de <span style={{ color: PLAYER_COLORS[game.current] }}>●</span> {turnOf.id}
              {turnOf.inJail ? ' (preso)' : ''}
            </h2>
            {game.dice ? (
              <p className="dice">
                <span>{game.dice[0]}</span>
                <span>{game.dice[1]}</span>
                <em>= {game.dice[0] + game.dice[1]} tramos</em>
              </p>
            ) : null}
            {game.winner !== null ? (
              <p className="turn-hint">
                <strong>¡{game.players[game.winner].id} gana la partida!</strong>
              </p>
            ) : game.trade ? (
              <div className="buy">
                <p className="turn-hint">
                  <strong>{game.players[game.trade.from].id}</strong> propone a <strong>{game.players[game.trade.to].id}</strong>:
                </p>
                <p className="trade-summary">
                  Da: {tradeSide(game.trade.giveLots, game.trade.giveMoney)}
                  <br />
                  Pide: {tradeSide(game.trade.takeLots, game.trade.takeMoney)}
                </p>
                <button type="button" className="roll-btn" onClick={() => setGame((g) => acceptTrade(g))}>
                  {game.players[game.trade.to].id} acepta
                </button>
                <button type="button" className="skip-btn" onClick={() => setGame((g) => rejectTrade(g))}>
                  Rechazar
                </button>
              </div>
            ) : game.buyOptions.length > 0 ? (
              <div className="buy">
                <p className="turn-hint">Puedes comprar un lote de aquí:</p>
                {buyLots.map((l) => (
                  <button key={l.id} type="button" className="buy-btn" onClick={() => setGame((g) => buy(g, l.id, lots))} onMouseEnter={() => selectLot(l)}>
                    <span className="swatch" style={{ background: BARRIO_COLORS[l.barrio] }} />
                    {l.kind === 'emblematico' ? l.name : `${KIND_LABEL[l.kind]} · ${l.frontStreetName}`}
                    <strong>${l.price}</strong>
                  </button>
                ))}
                <button type="button" className="skip-btn" onClick={() => setGame((g) => skipBuy(g))}>
                  No comprar
                </button>
              </div>
            ) : game.options.length > 0 ? (
              <p className="turn-hint">Toca una intersección marcada para avanzar ({game.options.length} destinos).</p>
            ) : (
              <>
                <button type="button" className="roll-btn" onClick={() => setGame((g) => roll(g, board))}>
                  Tirar dados
                </button>
                <button type="button" className="skip-btn trade-open" onClick={() => setTrading(true)}>
                  Proponer intercambio
                </button>
              </>
            )}
            </div>
            <ul className="players">
              {game.players.map((p, k) => (
                <li key={p.id} className={k === game.current ? 'active' : undefined}>
                  <span style={{ color: PLAYER_COLORS[k] }}>●</span> {p.id}
                  {game.bankrupt[k] ? ' (quebró)' : ''} <small>{p.ownedLotIds.length} lotes</small>
                  <strong>${p.money}</strong>
                </li>
              ))}
            </ul>
            <ol className="log" reversed>
              {game.log.slice(-5).reverse().map((l, k) => (
                <li key={game.log.length - k}>{l}</li>
              ))}
            </ol>
          </section>

          <aside className="deed" aria-live="polite">
            {lot && barrio ? (
              <>
                <div className="deed-band">
                  <img className="deed-glyph" src={GLYPH_URL[glyphOfLot(lot)]} alt="" />
                  <span>
                    {lot.kind === 'emblematico' && lm
                      ? `EDIFICIO EMBLEMÁTICO · ${LANDMARK_KIND_LABEL[LANDMARK_INFO[lm.id].kind].toUpperCase()}`
                      : 'TÍTULO DE PROPIEDAD'}
                  </span>
                  <strong>{lot.kind === 'emblematico' ? lot.name : KIND_LABEL[lot.kind]}</strong>
                </div>
                <div className="deed-stripe" style={{ background: BARRIO_COLORS[lot.barrio] }} />
                <p className="deed-between">{lot.kind === 'emblematico' ? lm?.where : lot.name.split(', ').slice(1).join(', ')}</p>
                <p className="deed-between">Da a: <strong>{lot.frontStreetName}</strong></p>
                <p className="deed-barrio">
                  <span className="swatch" style={{ background: BARRIO_COLORS[lot.barrio] }} /> {barrio.name}
                </p>
                {game.owners[lot.id] !== undefined && (
                  <p className="deed-barrio">Dueño: <span style={{ color: PLAYER_COLORS[game.owners[lot.id]] }}>●</span> {game.players[game.owners[lot.id]].id}</p>
                )}
                <dl>
                  <dt>Precio</dt>
                  <dd>${lot.price}</dd>
                  <dt>Arriendo</dt>
                  <dd>${lot.kind === 'emblematico' ? landmarkRentOf(lot.landmarkId!, 1) : lotRent(lot.price)}</dd>
                  {lot.kind === 'emblematico' ? (
                    <>
                      <dt>Con otro de la misma clase</dt>
                      <dd>${landmarkRentOf(lot.landmarkId!, 2)}</dd>
                    </>
                  ) : (
                    <>
                      <dt>Con la manzana completa (×{MANZANA_COMPLETE_FACTOR})</dt>
                      <dd>${lotRent(lot.price, { ownsManzana: true })}</dd>
                      <dt>Con todo el barrio (×{BARRIO_COMPLETE_FACTOR})</dt>
                      <dd>${lotRent(lot.price, { ownsBarrio: true })}</dd>
                    </>
                  )}
                  <dt>Sitios en la manzana</dt>
                  <dd>{manzanaLots.length}</dd>
                  <dt>Lotes del barrio</dt>
                  <dd>{barrioLots.length}</dd>
                </dl>
                <div className="deed-tag">EDICIÓN TALCA</div>
              </>
            ) : street ? (
              <>
                <div className="deed-band street-band">
                  <span>CALLE · NO SE COMPRA</span>
                  <strong>{street.street.name}</strong>
                </div>
                <p className="deed-between">{street.name.replace(`${street.street.name} `, '')}</p>
                <p className="deed-between">
                  {directionOf(street) === 'both' ? 'Doble sentido' : 'Sentido único'}. Es parte del recorrido del
                  tablero: se avanza por ella y se compran los sitios de las manzanas que la rodean.
                </p>
              </>
            ) : (
              <p className="deed-empty">
                Toca un sitio, un edificio, una calle o una casilla naranja <strong>?</strong> del tablero.
              </p>
            )}
          </aside>

          <section className="barrios" aria-label="Barrios">
            <h2>Barrios · lotes</h2>
            <ul>
              {BARRIOS.map((b) => (
                <li key={b.id} title={`Definido por: ${b.anchorName}`}>
                  <span className="swatch" style={{ background: BARRIO_COLORS[b.id] }} />
                  {b.name.replace('Barrio ', '')} <em>{lotsOfBarrio(lots, b.id).length}</em>
                </li>
              ))}
            </ul>
            <p className="barrios-note">
              Límites aproximados. Distancias medidas sobre datos de{' '}
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
                © colaboradores de OpenStreetMap
              </a>{' '}
              (ODbL).
            </p>
          </section>

        </div>
      </div>

      {trading && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Proponer intercambio" onClick={() => setTrading(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Proponer intercambio</h2>
            <TradePanel
              game={game}
              lots={lots}
              colors={PLAYER_COLORS}
              onPropose={(t) => {
                setGame((g) => proposeTrade(g, t));
                setTrading(false);
              }}
              onCancel={() => setTrading(false)}
            />
          </div>
        </div>
      )}
    </main>
  );
}

/** Pantalla inicial: cantidad de jugadores y nombres. */
function Setup({ onStart }: { onStart: (names: string[]) => void }) {
  const [count, setCount] = useState(3);
  const [names, setNames] = useState(() => Array.from({ length: MAX_PLAYERS }, (_, k) => `Jugador ${k + 1}`));
  const chosen = names.slice(0, count).map((n) => n.trim());
  const problem = validatePlayerNames(chosen);

  return (
    <main className="app">
      <header className="banner">
        <h1>TALCAPOLIS</h1>
        <p>El juego de comprar y vender Talca</p>
      </header>
      <form
        className="setup"
        onSubmit={(e) => {
          e.preventDefault();
          if (!problem) onStart(chosen);
        }}
      >
        <h2>Nueva partida</h2>
        <div className="setup-count" role="group" aria-label="Cantidad de jugadores">
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
              <span style={{ color: PLAYER_COLORS[k] }}>●</span>
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
        <button type="submit" className="roll-btn" disabled={!!problem}>
          Empezar
        </button>
      </form>
    </main>
  );
}

export default function App() {
  const [match, setMatch] = useState<{ names: string[]; seed: number } | null>(null);
  if (!match) return <Setup onStart={(names) => setMatch({ names, seed: Math.floor(Math.random() * 2 ** 31) })} />;
  return <Match key={match.seed} names={match.names} seed={match.seed} onExit={() => setMatch(null)} />;
}
