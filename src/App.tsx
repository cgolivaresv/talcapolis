import { Fragment, useMemo, useState } from 'react';
import { BARRIOS } from './engine/barrios';
import { buildBoard } from './engine/board';
import type { Segment } from './engine/board';
import { placeLandmarks } from './engine/landmarks';
import { buildLots, lotsOfBarrio, type Lot } from './engine/lots';
import {
  BUILDING_LEVEL_NAME,
  LANDMARK_INFO,
  LANDMARK_KIND_LABEL,
  MAX_BUILDING_LEVEL,
  baseRentOfManzana,
  buildCostOf,
  landmarkRentOf,
  manzanaRentAtLevel,
} from './engine/properties';
import { directionOf } from './engine/traffic';
import { BARRIO_COLORS, BoardView } from './ui/BoardView';
import './App.css';

export default function App() {
  const board = useMemo(() => buildBoard(), []);
  const landmarks = useMemo(() => placeLandmarks(board), [board]);
  const lots = useMemo(() => buildLots(board, landmarks), [board, landmarks]);
  const [street, setStreet] = useState<Segment | null>(null);
  const [lot, setLot] = useState<Lot | null>(null);
  const [zoom, setZoom] = useState(0.75);
  const changeZoom = (delta: number) => setZoom((z) => Math.min(1.5, Math.max(0.3, +(z + delta).toFixed(2))));

  const selectStreet = (s: Segment | null) => {
    setStreet(s);
    setLot(null);
  };
  const selectLot = (l: Lot) => {
    setLot(l);
    setStreet(null);
  };

  const barrio = lot ? BARRIOS[lot.barrio] : null;
  const barrioLots = lot ? lotsOfBarrio(lots, lot.barrio) : [];

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
              zoom={zoom}
              onSelect={selectStreet}
              onSelectLot={selectLot}
            />
          </div>
        </div>

        <div className="side">
          <aside className="deed" aria-live="polite">
            {lot && barrio ? (
              <>
                <div className="deed-band" style={{ background: BARRIO_COLORS[lot.barrio] }}>
                  <span>
                    {lot.kind === 'emblematico'
                      ? `EDIFICIO EMBLEMÁTICO · ${LANDMARK_KIND_LABEL[LANDMARK_INFO[lot.landmarkId!].kind].toUpperCase()}`
                      : 'TÍTULO DE PROPIEDAD'}
                  </span>
                  <strong>{lot.kind === 'emblematico' ? lot.name : 'Casas'}</strong>
                </div>
                <p className="deed-between">
                  {lot.kind === 'emblematico'
                    ? landmarks.find((l) => l.id === lot.landmarkId)?.where
                    : lot.name.replace('Casas de ', '')}
                </p>
                <p className="deed-barrio">
                  <span className="swatch" style={{ background: BARRIO_COLORS[lot.barrio] }} /> {barrio.name} ·{' '}
                  {barrioLots.length} lotes
                </p>
                <dl>
                  <dt>Precio</dt>
                  <dd>${lot.price}</dd>
                  {lot.kind === 'manzana' ? (
                    <>
                      <dt>Arriendo</dt>
                      <dd>${baseRentOfManzana(lot.price)}</dd>
                      <dt>Con todo el barrio</dt>
                      <dd>${manzanaRentAtLevel(lot.price, 0, true)}</dd>
                      {Array.from({ length: MAX_BUILDING_LEVEL }, (_, i) => i + 1).map((level) => (
                        <Fragment key={level}>
                          <dt>{BUILDING_LEVEL_NAME[level]}</dt>
                          <dd>${manzanaRentAtLevel(lot.price, level)}</dd>
                        </Fragment>
                      ))}
                      <dt>Construir (c/u)</dt>
                      <dd>${buildCostOf(lot.barrio)}</dd>
                    </>
                  ) : (
                    <>
                      <dt>Arriendo</dt>
                      <dd>${landmarkRentOf(lot.landmarkId!, 1)}</dd>
                      <dt>Con otro de la misma clase</dt>
                      <dd>${landmarkRentOf(lot.landmarkId!, 2)}</dd>
                    </>
                  )}
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
                  tablero: se avanza por ella y se compran las manzanas y edificios de alrededor.
                </p>
              </>
            ) : (
              <p className="deed-empty">Toca una manzana, un edificio o una calle del tablero para ver su ficha.</p>
            )}
          </aside>

          <section className="barrios" aria-label="Barrios">
            <h2>Barrios</h2>
            <ul>
              {BARRIOS.map((b) => (
                <li key={b.id}>
                  <span className="swatch" style={{ background: BARRIO_COLORS[b.id] }} />
                  {b.name}
                  <em>{lotsOfBarrio(lots, b.id).length} lotes</em>
                </li>
              ))}
            </ul>
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
