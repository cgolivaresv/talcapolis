import { useState } from 'react';
import { GLYPH_URL, type Glyph } from './glyphs';
import { Modal } from './Modal';

const KEY = 'talcapolis:tutorial-seen';

/** ¿Ya se mostró el tutorial en este navegador? */
export function tutorialSeen(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function markTutorialSeen() {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* sin almacenamiento: se volverá a mostrar */
  }
}

const STEPS: { glyph: Glyph; title: string; body: string }[] = [
  {
    glyph: 'train',
    title: 'Tira y elige adónde ir',
    body: 'En tu turno tira los dados y avanza esa cantidad de casillas. El tablero marca con dorado todos los destinos posibles; toca el que quieras. Debes respetar el sentido de las calles (las flechas).',
  },
  {
    glyph: 'house',
    title: 'Las calles: aquí se compra',
    body: 'Al caer en un tramo de calle puedes comprar las casas, locales o edificios que dan a ella (hasta 2, uno de cada lado). Si el lote ya tiene dueño, le pagas arriendo: el del sitio más caro del tramo.',
  },
  {
    glyph: 'luck',
    title: 'Las esquinas: acciones',
    body: 'Las intersecciones no se compran. Las casillas "?" sacan una tarjeta; las que tienen un rombo de cobre disparan un evento de la ciudad (cobrar, pagar, perder turno, tirar de nuevo…). Las esquinas del tablero tienen su propio efecto.',
  },
  {
    glyph: 'bank',
    title: 'Barrios e intercambios',
    body: 'Con los 4 sitios de una manzana el arriendo sube ×1,5, y con todos los lotes de un barrio ×2. Antes de tirar puedes proponer intercambios de lotes y dinero. Gana el último jugador que no quiebre.',
  },
];

/** Guía breve de cómo se juega. Se muestra sola la primera vez y desde el menú. */
export function Tutorial({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  const close = () => {
    markTutorialSeen();
    setStep(0);
    onClose();
  };
  return (
    <Modal open={open} title="Cómo se juega" onClose={close}>
      <div className="tutorial" key={step}>
        <img className="tutorial-glyph" src={GLYPH_URL[s.glyph]} alt="" />
        <h3>{s.title}</h3>
        <p>{s.body}</p>
      </div>
      <div className="tutorial-dots" aria-hidden="true">
        {STEPS.map((_, k) => (
          <i key={k} className={k === step ? 'on' : undefined} />
        ))}
      </div>
      <div className="btn-row tutorial-actions">
        {step > 0 ? (
          <button type="button" className="btn btn-secondary" onClick={() => setStep(step - 1)}>
            Atrás
          </button>
        ) : (
          <button type="button" className="btn btn-tertiary" onClick={close}>
            Saltar
          </button>
        )}
        <button type="button" className="btn btn-primary" onClick={() => (last ? close() : setStep(step + 1))}>
          {last ? '¡A jugar!' : 'Siguiente'}
        </button>
      </div>
    </Modal>
  );
}
