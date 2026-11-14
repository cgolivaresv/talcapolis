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
        <BoardView
          board={board}
          landmarks={landmarks}
          selectedId={selected?.id ?? null}
          selectedLandmarkId={selectedLandmark?.id ?? null}
          onSelect={selectSegment}
          onSelectLandmark={selectLandmark}
        />

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
    </main>
  );
}
