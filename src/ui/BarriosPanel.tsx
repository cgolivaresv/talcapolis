import { BARRIOS } from '../engine/barrios';
import { lotsOfBarrio, type Lot } from '../engine/lots';
import { BARRIO_COLORS } from './BoardView';

/** Leyenda de barrios con su cantidad de lotes. */
export function BarriosPanel({ lots, onClose }: { lots: Lot[]; onClose?: () => void }) {
  return (
    <section className="panel barrios-panel" aria-label="Barrios">
      <header className="panel-head">
        <h2>Barrios · lotes</h2>
        <button type="button" className="sheet-close" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>
      </header>
      <ul className="barrio-list">
        {BARRIOS.map((b) => (
          <li key={b.id} title={`Definido por: ${b.anchorName}`}>
            <span className="swatch" style={{ background: BARRIO_COLORS[b.id] }} />
            {b.name.replace('Barrio ', '')} <em>{lotsOfBarrio(lots, b.id).length}</em>
          </li>
        ))}
      </ul>
      <p className="note">
        Límites aproximados. Distancias medidas sobre datos de{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          © colaboradores de OpenStreetMap
        </a>{' '}
        (ODbL).
      </p>
    </section>
  );
}
