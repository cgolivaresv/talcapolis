import { useMemo, useState } from 'react';
import { buildBoard } from './engine/board';
import type { Segment } from './engine/board';
import { placeLandmarks, type PlacedLandmark } from './engine/landmarks';
import { baseRentOf, priceOf } from './engine/pricing';
import { BoardView, GROUP_COLORS } from './ui/BoardView';
import './App.css';

export default function App() {
  const board = useMemo(() => buildBoard(), []);
  const landmarks = useMemo(() => placeLandmarks(board), [board]);
  const [selected, setSelected] = useState<Segment | null>(null);
  const [selectedLandmark, setSelectedLandmark] = useState<PlacedLandmark | null>(null);
  const [zoom, setZoom] = useState(0.75);
  const changeZoom = (delta: number) => setZoom((z) => Math.min(1.5, Math.max(0.3, +(z + delta).toFixed(2))));

  const selectSegment = (s: Segment | null) => {
    setSelected(s);
    setSelectedLandmark(null);
  };
  const selectLandmark = (l: PlacedLandmark) => {
    setSelectedLandmark(l);
    setSelected(null);
  };

  return (
    <main className="app">
      <header className="banner">
        <h1>TALCAPOLIS</h1>
        <p>{board.segments.length} calles en venta</p>
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
              selectedId={selected?.id ?? null}
              selectedLandmarkId={selectedLandmark?.id ?? null}
              zoom={zoom}
              onSelect={selectSegment}
              onSelectLandmark={selectLandmark}
            />
          </div>
        </div>

        <aside className="deed" aria-live="polite">
          {selectedLandmark ? (
            <>
              <div className="deed-band landmark-band">
                <span>EDIFICIO EMBLEMÁTICO</span>
                <span className="landmark-icon">{selectedLandmark.icon}</span>
                <strong>{selectedLandmark.name}</strong>
              </div>
              <p className="deed-between">{selectedLandmark.where}</p>
            </>
          ) : selected ? (
            <>
              <div className="deed-band" style={{ background: GROUP_COLORS[selected.street.group] }}>
                <span>TÍTULO DE PROPIEDAD</span>
                <strong>{selected.street.name}</strong>
              </div>
              <p className="deed-between">{selected.name.replace(`${selected.street.name} `, '')}</p>
              <dl>
                <dt>Precio</dt>
                <dd>${priceOf(selected)}</dd>
                <dt>Arriendo</dt>
                <dd>${baseRentOf(selected)}</dd>
              </dl>
            </>
          ) : (
            <p className="deed-empty">Toca una calle o un edificio del tablero para ver su ficha.</p>
          )}
        </aside>
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
