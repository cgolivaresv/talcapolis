import { useMemo, useState } from 'react';
import { BARRIOS } from './engine/barrios';
import { buildBoard } from './engine/board';
import type { Segment } from './engine/board';
import { applyCard, cardSquaresOf, createDeck, drawCard, type Card, type PlayerState } from './engine/cards';
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
import './App.css';

/** Jugadores de prueba, hasta que exista la partida: sirven para ver el efecto de las tarjetas. */
const DEMO_PLAYERS: PlayerState[] = [
  { id: 'Tú', money: 1500, at: '11-oriente/2-sur', inJail: false, freeJailCards: 0, ownedLotIds: [] },
  { id: 'Jugador 2', money: 1500, at: '11-oriente/2-sur', inJail: false, freeJailCards: 0, ownedLotIds: [] },
  { id: 'Jugador 3', money: 1500, at: '11-oriente/2-sur', inJail: false, freeJailCards: 0, ownedLotIds: [] },
];

const KIND_LABEL = { casa: 'Casa', local: 'Local comercial', emblematico: 'Edificio emblemático' } as const;

export default function App() {
  const board = useMemo(() => buildBoard(), []);
  const landmarks = useMemo(() => placeLandmarks(board), [board]);
  const lots = useMemo(() => buildLots(board, landmarks), [board, landmarks]);
  const cardSquares = useMemo(() => cardSquaresOf(board, landmarks), [board, landmarks]);

  const [street, setStreet] = useState<Segment | null>(null);
  const [lot, setLot] = useState<Lot | null>(null);
  const [zoom, setZoom] = useState(0.75);
  const changeZoom = (delta: number) => setZoom((z) => Math.min(1.5, Math.max(0.3, +(z + delta).toFixed(2))));

  const [deck, setDeck] = useState(() => createDeck(2026));
  const [players, setPlayers] = useState(DEMO_PLAYERS);
  const [drawn, setDrawn] = useState<{ card: Card; summary: string } | null>(null);

  const clearSelection = () => {
    setStreet(null);
    setLot(null);
    setDrawn(null);
  };
  const selectStreet = (s: Segment | null) => {
    clearSelection();
    setStreet(s);
  };
  const selectLot = (l: Lot) => {
    clearSelection();
    setLot(l);
  };
  /** Cae en una casilla "?": el jugador de prueba saca la siguiente tarjeta y se ejecuta. */
  const drawFromSquare = (nodeId: string) => {
    const { card, deck: next } = drawCard(deck);
    const [me, ...others] = players;
    const result = applyCard(card, { ...me, at: nodeId }, others, { board, landmarks });
    setDeck(next);
    setPlayers([result.player, ...result.others]);
    clearSelection();
    setDrawn({ card, summary: result.summary });
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
      </header>

      <div className="layout">
        <div className="board-panel">
          <div className="zoom-bar" role="group" aria-label="Zoom del tablero">
            <button type="button" onClick={() => changeZoom(-0.1)} aria-label="Alejar">−</button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => changeZoom(0.1)} aria-label="Acercar">+</button>
          </div>
          <div className="board-scroll">
            <BoardView
              board={board}
              landmarks={landmarks}
              lots={lots}
              selectedId={street?.id ?? null}
              selectedLotId={lot?.id ?? null}
              cardSquares={cardSquares}
              onCardSquare={drawFromSquare}
              zoom={zoom}
              onSelect={selectStreet}
              onSelectLot={selectLot}
            />
          </div>
        </div>

        <div className="side">
          <aside className="deed" aria-live="polite">
            {drawn ? (
              <>
                <div className="deed-band card-band">
                  <span>TARJETA</span>
                  <strong className="card-q">?</strong>
                </div>
                <p className="deed-between">{drawn.card.text}</p>
                <p className="deed-barrio">{drawn.summary}</p>
                <dl>
                  {players.map((p) => (
                    <div key={p.id} className="player-row">
                      <dt>{p.id}</dt>
                      <dd>${p.money}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : lot && barrio ? (
              <>
                <div className="deed-band" style={{ background: BARRIO_COLORS[lot.barrio] }}>
                  <span>
                    {lot.kind === 'emblematico' && lm
                      ? `EDIFICIO EMBLEMÁTICO · ${LANDMARK_KIND_LABEL[LANDMARK_INFO[lm.id].kind].toUpperCase()}`
                      : 'TÍTULO DE PROPIEDAD'}
                  </span>
                  <strong>{lot.kind === 'emblematico' ? lot.name : KIND_LABEL[lot.kind]}</strong>
                </div>
                <p className="deed-between">{lot.kind === 'emblematico' ? lm?.where : lot.name.split(', ').slice(1).join(', ')}</p>
                <p className="deed-between">Da a: <strong>{lot.frontStreetName}</strong></p>
                <p className="deed-barrio">
                  <span className="swatch" style={{ background: BARRIO_COLORS[lot.barrio] }} /> {barrio.name}
                </p>
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
            <h2>Barrios</h2>
            <ul>
              {BARRIOS.map((b) => (
                <li key={b.id} title={`Definido por: ${b.anchorName}`}>
                  <span className="swatch" style={{ background: BARRIO_COLORS[b.id] }} />
                  {b.name}
                  <em>{lotsOfBarrio(lots, b.id).length} lotes</em>
                </li>
              ))}
            </ul>
            <p className="barrios-note">Cada barrio se define por un lugar real de Talca; sus límites son aproximados.</p>
          </section>
        </div>
      </div>

      <footer className="credits">
        Distancias entre calles medidas sobre datos de{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          © colaboradores de OpenStreetMap
        </a>{' '}
        (ODbL).
      </footer>
    </main>
  );
}
