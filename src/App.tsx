import { useMemo, useState } from 'react';
import { buildBoard } from './engine/board';
import type { Segment } from './engine/board';
import { baseRentOf, priceOf } from './engine/pricing';
import { BoardView, GROUP_COLORS } from './ui/BoardView';
import './App.css';

export default function App() {
  const board = useMemo(() => buildBoard(), []);
  const [selected, setSelected] = useState<Segment | null>(null);

  return (
    <main className="app">
      <header className="banner">
        <h1>TALCAPOLIS</h1>
        <p>{board.segments.length} calles en venta</p>
      </header>

      <div className="layout">
        <BoardView board={board} selectedId={selected?.id ?? null} onSelect={setSelected} />

        <aside className="deed" aria-live="polite">
          {selected ? (
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
            <p className="deed-empty">Toca una calle del tablero para ver su título de propiedad.</p>
          )}
        </aside>
      </div>
    </main>
  );
}
