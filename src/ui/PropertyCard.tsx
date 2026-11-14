import { BARRIOS } from '../engine/barrios';
import type { Segment } from '../engine/board';
import type { Game } from '../engine/game';
import type { PlacedLandmark } from '../engine/landmarks';
import { lotsOfBarrio, lotsOfManzana, type Lot } from '../engine/lots';
import {
  BARRIO_COMPLETE_FACTOR,
  LANDMARK_INFO,
  LANDMARK_KIND_LABEL,
  MANZANA_COMPLETE_FACTOR,
  landmarkRentOf,
  lotRent,
} from '../engine/properties';
import { directionOf } from '../engine/traffic';
import { BARRIO_COLORS } from './BoardView';
import { EMBLEM_COLOR, KIND_LABEL, PLAYER_COLORS, STREET_COLOR, cardTheme } from './colors';
import { DistrictBanner } from './DistrictBanner';
import { GLYPH_URL, glyphOfLot } from './glyphs';
import { LANDMARK_ART } from './landmarkArt';

interface Props {
  lot: Lot | null;
  street: Segment | null;
  lots: Lot[];
  landmarks: PlacedLandmark[];
  game: Game;
  onClose?: () => void;
}

/** Panel contextual: ficha del lote o de la calle seleccionados en el tablero. */
export function PropertyCard({ lot, street, lots, landmarks, game, onClose }: Props) {
  const barrio = lot ? BARRIOS[lot.barrio] : null;
  const lm = lot?.landmarkId ? landmarks.find((l) => l.id === lot.landmarkId) : undefined;
  const theme = lot ? cardTheme(lot.kind === 'emblematico' ? EMBLEM_COLOR : BARRIO_COLORS[lot.barrio]) : street ? cardTheme(STREET_COLOR) : undefined;
  const art = lot?.landmarkId ? LANDMARK_ART[lot.landmarkId] : undefined;
  const owner = lot ? game.owners[lot.id] : undefined;

  return (
    <aside className="panel deed" aria-live="polite" aria-label="Ficha seleccionada" style={theme} key={lot?.id ?? street?.id ?? 'vacio'}>
      <button type="button" className="sheet-close" onClick={onClose} aria-label="Cerrar">
        ✕
      </button>
      {lot && barrio ? (
        <>
          <div className="deed-band">
            {art ? (
              <img className="deed-art" src={art} alt="" />
            ) : (
              <img className="deed-glyph" src={GLYPH_URL[glyphOfLot(lot)]} alt="" />
            )}
            <span>
              {lot.kind === 'emblematico' && lm
                ? `EDIFICIO EMBLEMÁTICO · ${LANDMARK_KIND_LABEL[LANDMARK_INFO[lm.id].kind].toUpperCase()}`
                : 'TÍTULO DE PROPIEDAD'}
            </span>
            <strong>{lot.kind === 'emblematico' ? lot.name : KIND_LABEL[lot.kind]}</strong>
          </div>
          <DistrictBanner name={barrio.name} color={BARRIO_COLORS[lot.barrio]} />
          <p className="deed-line">{lot.kind === 'emblematico' ? lm?.where : lot.name.split(', ').slice(1).join(', ')}</p>
          <p className="deed-line">
            Da a: <strong>{lot.frontStreetName}</strong>
          </p>
          {owner !== undefined && (
            <p className="deed-owner">
              Dueño: <span className="dot" style={{ background: PLAYER_COLORS[owner] }} /> {game.players[owner].id}
            </p>
          )}
          <dl className="deed-rows">
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
            <dd>{lotsOfManzana(lots, lot.manzanaId).length}</dd>
            <dt>Lotes del barrio</dt>
            <dd>{lotsOfBarrio(lots, lot.barrio).length}</dd>
          </dl>
          <div className="deed-tag">EDICIÓN TALCA</div>
        </>
      ) : street ? (
        <>
          <div className="deed-band">
            <span>CALLE · NO SE COMPRA</span>
            <strong>{street.street.name}</strong>
          </div>
          <p className="deed-line">{street.name.replace(`${street.street.name} `, '')}</p>
          <p className="deed-line">
            {directionOf(street) === 'both' ? 'Doble sentido' : 'Sentido único'}. Es parte del recorrido del tablero: se avanza por ella y se
            compran los sitios de las manzanas que la rodean.
          </p>
        </>
      ) : (
        <p className="deed-empty">
          Toca un sitio, un edificio, una calle o una casilla <strong>?</strong> del tablero para ver su ficha.
        </p>
      )}
    </aside>
  );
}
