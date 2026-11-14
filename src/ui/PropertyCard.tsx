import { buildCheck, mortgageCheck, sellCheck, unmortgageCheck } from '../engine/assets';
import { BARRIOS } from '../engine/barrios';
import type { Segment } from '../engine/board';
import { rentOf } from '../engine/economy';
import type { Game } from '../engine/game';
import type { PlacedLandmark } from '../engine/landmarks';
import { lotsOfBarrio, lotsOfManzana, type Lot } from '../engine/lots';
import {
  BARRIO_COMPLETE_FACTOR,
  LANDMARK_INFO,
  LANDMARK_KIND_LABEL,
  LEVEL_RENT,
  MANZANA_COMPLETE_FACTOR,
  MAX_LEVEL,
  improvementCost,
  improvementSaleValue,
  landmarkRentOf,
  lotRent,
  mortgageValue,
  unmortgageCost,
} from '../engine/properties';
import { SERVICES, SERVICE_RENT_BOTH, SERVICE_RENT_ONE, serviceById } from '../engine/services';
import { directionOf } from '../engine/traffic';
import { BARRIO_COLORS } from './BoardView';
import { EMBLEM_COLOR, KIND_LABEL, PLAYER_COLORS, SERVICE_COLOR, STREET_COLOR, cardTheme } from './colors';
import { DistrictBanner } from './DistrictBanner';
import { GLYPH_URL, glyphOfLot } from './glyphs';
import { LANDMARK_ART } from './landmarkArt';

interface Props {
  lot: Lot | null;
  serviceId: string | null;
  street: Segment | null;
  lots: Lot[];
  landmarks: PlacedLandmark[];
  game: Game;
  onClose?: () => void;
  onMortgage: (id: string) => void;
  onUnmortgage: (id: string) => void;
  onBuild: (id: string) => void;
  onSellImprovement: (id: string) => void;
}

/** Panel contextual: ficha del lote, servicio o calle seleccionados en el tablero, con las acciones del dueño. */
export function PropertyCard({ lot, serviceId, street, lots, landmarks, game, onClose, onMortgage, onUnmortgage, onBuild, onSellImprovement }: Props) {
  const service = serviceId ? serviceById(serviceId) : undefined;
  const barrio = lot ? BARRIOS[lot.barrio] : null;
  const lm = lot?.landmarkId ? landmarks.find((l) => l.id === lot.landmarkId) : undefined;
  const theme = service
    ? cardTheme(SERVICE_COLOR)
    : lot
      ? cardTheme(lot.kind === 'emblematico' ? EMBLEM_COLOR : BARRIO_COLORS[lot.barrio])
      : street
        ? cardTheme(STREET_COLOR)
        : undefined;
  const art = lot?.landmarkId ? LANDMARK_ART[lot.landmarkId] : undefined;
  const id = service?.id ?? lot?.id;
  const owner = id ? game.owners[id] : undefined;
  const level = lot ? (game.levels[lot.id] ?? 0) : 0;
  const isMortgaged = id ? !!game.mortgaged[id] : false;
  const holdings = { owners: game.owners, mortgaged: game.mortgaged, levels: game.levels };

  // Acciones del dueño: solo el jugador en turno, y no en pleno movimiento.
  const idle = game.winner === null && !game.trade && !game.auction && game.options.length === 0;
  const me = game.current;
  const money = game.players[me].money;
  const mine = id !== undefined && owner === me && idle;
  const why = (reason: string | null) => reason ?? undefined;
  const mortgageReason = mine && id ? mortgageCheck(game, me, id, lots) : 'x';
  const unmortgageReason = mine && id ? unmortgageCheck(game, me, money, id, lots) : 'x';
  const buildReason = mine && lot ? buildCheck(game, me, money, lot, lots) : 'x';
  const sellReason = mine && lot ? sellCheck(game, me, lot, lots) : 'x';
  const price = service?.price ?? lot?.price ?? 0;

  return (
    <aside className="panel deed" aria-live="polite" aria-label="Ficha seleccionada" style={theme} key={id ?? street?.id ?? 'vacio'}>
      <button type="button" className="sheet-close" onClick={onClose} aria-label="Cerrar">
        ✕
      </button>
      {service ? (
        <>
          <div className="deed-band">
            <img className="deed-glyph" src={GLYPH_URL[service.icon]} alt="" />
            <span>SERVICIO</span>
            <strong>{service.name}</strong>
          </div>
          <p className="deed-line">Se ofrece a quien cae en su tramo de calle.</p>
          <dl className="deed-rows">
            <dt>Precio</dt>
            <dd>${service.price}</dd>
            <dt>Arriendo con 1 servicio</dt>
            <dd>{SERVICE_RENT_ONE} × dados</dd>
            <dt>Arriendo con los {SERVICES.length}</dt>
            <dd>{SERVICE_RENT_BOTH} × dados</dd>
            <dt>Hipoteca</dt>
            <dd>${mortgageValue(service.price)}</dd>
          </dl>
        </>
      ) : lot && barrio ? (
        <>
          <div className="deed-band">
            {art ? <img className="deed-art" src={art} alt="" /> : <img className="deed-glyph" src={GLYPH_URL[glyphOfLot(lot)]} alt="" />}
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
                <dt>Mejora (cuesta ${improvementCost(lot.price)}, máx. {MAX_LEVEL})</dt>
                <dd>×{LEVEL_RENT[1]} / ×{LEVEL_RENT[2]} / ×{LEVEL_RENT[3]}</dd>
              </>
            )}
            <dt>Hipoteca</dt>
            <dd>${mortgageValue(lot.price)}</dd>
            <dt>Sitios en la manzana</dt>
            <dd>{lotsOfManzana(lots, lot.manzanaId).length}</dd>
            <dt>Lotes del barrio</dt>
            <dd>{lotsOfBarrio(lots, lot.barrio).length}</dd>
          </dl>
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
          Toca un sitio, un edificio, un servicio, una calle o una casilla <strong>?</strong> del tablero para ver su ficha.
        </p>
      )}

      {id && owner !== undefined && (
        <div className="deed-owner-box">
          <p className="deed-owner">
            Dueño: <span className="dot" style={{ background: PLAYER_COLORS[owner] }} /> {game.players[owner].id}
            {isMortgaged ? <small className="tag">hipotecada</small> : null}
            {level > 0 ? <small className="tag tag-gold">mejoras {level}/{MAX_LEVEL}</small> : null}
          </p>
          {lot && !isMortgaged && (
            <p className="deed-line">
              Arriendo actual: <strong>${rentOf(lot, owner, holdings, lots)}</strong>
            </p>
          )}
          {mine && (
            <div className="deed-actions">
              {lot && lot.kind !== 'emblematico' && (
                <>
                  <button type="button" className="btn btn-secondary btn-sm" disabled={buildReason !== null} title={why(buildReason)} onClick={() => onBuild(lot.id)}>
                    Construir (${improvementCost(lot.price)})
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" disabled={sellReason !== null} title={why(sellReason)} onClick={() => onSellImprovement(lot.id)}>
                    Vender mejora (+${improvementSaleValue(lot.price)})
                  </button>
                </>
              )}
              {isMortgaged ? (
                <button type="button" className="btn btn-secondary btn-sm" disabled={unmortgageReason !== null} title={why(unmortgageReason)} onClick={() => id && onUnmortgage(id)}>
                  Levantar hipoteca (${unmortgageCost(price)})
                </button>
              ) : (
                <button type="button" className="btn btn-secondary btn-sm" disabled={mortgageReason !== null} title={why(mortgageReason)} onClick={() => id && onMortgage(id)}>
                  Hipotecar (+${mortgageValue(price)})
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {(lot || service) && <div className="deed-tag">EDICIÓN TALCA</div>}
    </aside>
  );
}
