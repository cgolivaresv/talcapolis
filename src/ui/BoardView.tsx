import { useMemo } from 'react';
import { type Board, type Intersection, type Segment } from '../engine/board';
import { STREET_ALIASES, type PlacedLandmark } from '../engine/landmarks';
import type { Lot, Side } from '../engine/lots';
import { directionOf } from '../engine/traffic';
import { GLYPH_URL, glyphOfLandmark, glyphOfLot, type Glyph } from './glyphs';

/** Color de cada barrio (índice = id del barrio), según los grupos de la guía de estilo Esmeralda y Cobre. */
export const BARRIO_COLORS = [
  '#8a5a3c', // marrón / cobre oscuro
  '#7fa8c4', // celeste / acero
  '#d9a38f', // rosa / cobre claro
  '#c8693a', // naranjo / terracota
  '#8e2a35', // rojo / burdeos
  '#d4af37', // amarillo / oro
  '#1e7b5a', // verde esmeralda
  '#1f3a6e', // azul profundo
] as const;

/** Paleta base del tablero. */
const INK = '#222629'; // pizarra carbón
const COPPER = '#c68b66'; // cobre cepillado
const CREAM = '#f5f1e8'; // crema alabastro
const LANDMARK_FILL = '#eadfc4';
const PLAZA_FILL = '#7fa592';
const GOLD = '#d4af37'; // oro champagne

/** Dibuja un gráfico de la biblioteca SVG; no captura clics (los recibe el elemento que lo contiene). */
function GlyphImage({ glyph, x, y, size }: { glyph: Glyph; x: number; y: number; size: number }) {
  return <image href={GLYPH_URL[glyph]} x={x} y={y} width={size} height={size} pointerEvents="none" />;
}

/** Separación entre calles consecutivas: todas las cuadras miden lo mismo (no se respetan las distancias reales). */
const SPACING = 124;
const LEFT = 136;
const TOP = 70;
const TILE = 26; // grosor de la ficha
const GAP = 19; // espacio reservado a la intersección
const NODE = 36;
const CORNER = 52;

interface Props {
  board: Board;
  landmarks: PlacedLandmark[];
  lots: Lot[];
  /** Tramo de calle seleccionado (las calles no se compran, solo se consultan). */
  selectedId: string | null;
  selectedLotId: string | null;
  /** Intersecciones que son casillas "?". */
  cardSquares: Set<string>;
  onCardSquare?: (nodeId: string) => void;
  /** Fichas de los jugadores. */
  tokens?: { id: string; label: string; at: string; color: string; active: boolean }[];
  /** Intersecciones a las que puede llegar el jugador en turno. */
  options?: Set<string>;
  onPickNode?: (nodeId: string) => void;
  /** Color del dueño de cada lote comprado. */
  ownerColors?: Record<string, string>;
  /** Factor de zoom sobre el tamaño natural del tablero (1 = 1 px por unidad del dibujo). */
  zoom: number;
  onSelect: (segment: Segment | null) => void;
  onSelectLot: (lot: Lot) => void;
}

/**
 * Proyección a pantalla (tablero horizontal, el mapa real girado 180°: el sur queda arriba):
 *   y = calles Norte/Sur        (2 Sur arriba, 4 Norte abajo)
 *   x = calles Oriente/Poniente (11 Oriente a la izquierda, 2 Poniente a la derecha)
 * Con MIRROR_COLUMNS en false las columnas van de 2 Poniente (izquierda) a 11 Oriente (derecha).
 */
export const MIRROR_COLUMNS = true;

export function BoardView({ board, landmarks, lots, selectedId, selectedLotId, cardSquares, onCardSquare, tokens = [], options, onPickNode, ownerColors = {}, zoom, onSelect, onSelectLot }: Props) {
  const rows = board.verticalStreets.length;
  const cols = board.horizontalStreets.length;
  // Calles equiespaciadas. sx recibe el índice de una calle Oriente/Poniente y sy el de una calle
  // Norte/Sur (pueden ser fraccionarios, para ubicar edificios entre dos calles).
  const sx = (v: number) => LEFT + SPACING * (MIRROR_COLUMNS ? rows - 1 - v : v);
  const sy = (h: number) => TOP + SPACING * h;
  const width = LEFT + SPACING * (rows - 1) + 70;
  const height = sy(cols - 1) + 70;
  const fullRows = board.verticalStreets.filter((s) => !s.spanM);
  const fullCols = board.horizontalStreets.filter((s) => !s.spanM);

  const byId = useMemo(() => new Map(board.intersections.map((i) => [i.id, i])), [board]);

  // Esquinas especiales (fila,columna). Estación = SALIDA; Corte de Apelaciones = CÁRCEL.
  const corners: Record<string, string[]> = {
    [`0,0`]: ['LIBRE', '🅿'],
    [`0,${cols - 1}`]: ['CÁRCEL', ''],
    [`${rows - 1},0`]: ['SALIDA', ''],
    [`${rows - 1},${cols - 1}`]: ['A LA', 'CÁRCEL'],
  };

  const landmarkAtNode = (row: number, col: number) =>
    landmarks.find((l) => l.row === row && l.col === col);
  const lotByLandmark = useMemo(() => new Map(lots.filter((l) => l.landmarkId).map((l) => [l.landmarkId, l])), [lots]);
  const landmarkClick = (l: PlacedLandmark) => (e: React.MouseEvent) => {
    e.stopPropagation();
    const lot = lotByLandmark.get(l.id);
    if (lot) onSelectLot(lot);
  };
  const landmarkLotId = (l: PlacedLandmark) => `em:${l.id}`;
  const barrioColorOf = (l: PlacedLandmark) => BARRIO_COLORS[lotByLandmark.get(l.id)?.barrio ?? 0];

  const segById = useMemo(() => new Map(board.segments.map((s) => [s.id, s])), [board]);
  /** Centro en pantalla de una casilla del recorrido: una intersección o un tramo de calle. */
  const squareCenter = (id: string): { x: number; y: number } | null => {
    const n = byId.get(id);
    if (n) return { x: sx(n.x), y: sy(n.y) };
    const s = segById.get(id);
    if (!s) return null;
    const a = byId.get(s.from) as Intersection;
    const c = byId.get(s.to) as Intersection;
    return { x: (sx(a.x) + sx(c.x)) / 2, y: (sy(a.y) + sy(c.y)) / 2 };
  };

  const tile = (seg: Segment) => {
    const a = byId.get(seg.from) as Intersection;
    const b = byId.get(seg.to) as Intersection;
    // a.x / b.x = índice de calle Oriente/Poniente, a.y / b.y = índice de calle Norte/Sur
    const x1 = sx(a.x);
    const y1 = sy(a.y);
    const x2 = sx(b.x);
    const y2 = sy(b.y);
    if (x1 === x2) {
      return { x: x1 - TILE / 2, y: Math.min(y1, y2) + GAP, w: TILE, h: Math.abs(y2 - y1) - 2 * GAP };
    }
    return { x: Math.min(x1, x2) + GAP, y: y1 - TILE / 2, w: Math.abs(x2 - x1) - 2 * GAP, h: TILE };
  };

  /** Flecha apuntando hacia (ux,uy), centrada en (cx,cy). */
  const arrow = (cx: number, cy: number, ux: number, uy: number, len: number, wid: number, fill: string) => {
    const px_ = -uy;
    const py_ = ux;
    const tip = [cx + (ux * len) / 2, cy + (uy * len) / 2];
    const bx = cx - (ux * len) / 2;
    const by = cy - (uy * len) / 2;
    const pts = `${tip[0]},${tip[1]} ${bx + (px_ * wid) / 2},${by + (py_ * wid) / 2} ${bx - (px_ * wid) / 2},${by - (py_ * wid) / 2}`;
    return <polygon points={pts} fill={fill} />;
  };

  /** Sentido del tránsito: flecha negra = sentido único; dos flechas grises = doble sentido. */
  const trafficMarker = (seg: Segment, t: { x: number; y: number; w: number; h: number }) => {
    const dir = directionOf(seg);
    const a = byId.get(seg.from) as Intersection;
    const b = byId.get(seg.to) as Intersection;
    let ux = sx(b.x) - sx(a.x);
    let uy = sy(b.y) - sy(a.y);
    const l = Math.hypot(ux, uy) || 1;
    ux /= l;
    uy /= l;
    const vertical = t.w === TILE;
    const cx = t.x + t.w / 2;
    const cy = t.y + t.h / 2;
    const len = Math.max(8, Math.min(16, (vertical ? t.h : t.w) - 8));
    if (dir === 'both') {
      const ox = vertical ? 4.5 : 0;
      const oy = vertical ? 0 : 4.5;
      return (
        <g pointerEvents="none">
          {arrow(cx - ox, cy - oy, ux, uy, len * 0.75, 6, '#7d8a86')}
          {arrow(cx + ox, cy + oy, -ux, -uy, len * 0.75, 6, '#7d8a86')}
        </g>
      );
    }
    const s = dir === 'forward' ? 1 : -1;
    return <g pointerEvents="none">{arrow(cx, cy, ux * s, uy * s, len, 11, INK)}</g>;
  };

  /** Texto del tooltip: "sentido único hacia 3 Oriente" / "doble sentido". */
  const trafficLabel = (seg: Segment) => {
    const dir = directionOf(seg);
    if (dir === 'both') return 'doble sentido';
    const target = byId.get(dir === 'forward' ? seg.to : seg.from) as Intersection;
    const cross = seg.street.orientation === 'horizontal' ? target.vertical : target.horizontal;
    return `sentido único hacia ${cross.name}`;
  };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Tablero de Talcapolis"
      className="board"
      style={{ width: width * zoom }}
      onClick={() => onSelect(null)}
    >
      <rect x="4" y="4" width={width - 8} height={height - 8} rx="10" fill="#dbe5da" stroke="#144e3a" strokeWidth="5" />
      <rect x="12" y="12" width={width - 24} height={height - 24} rx="6" fill="none" stroke={COPPER} strokeWidth="2" />

      {/* Manzanas en venta: entre calles enteras consecutivas, con el color de su barrio. */}
      {fullRows.slice(0, -1).map((r, ri) =>
        fullCols.slice(0, -1).map((c, ci) => {
          // Cada manzana está entre dos calles Oriente/Poniente (r, r+1) y dos calles Norte/Sur (c, c+1).
          const sites = lots.filter((l) => l.cell.row === ri && l.cell.col === ci);
          const xPon = sx(r.index);
          const xOri = sx(fullRows[ri + 1].index);
          const ySur = sy(c.index);
          const yNor = sy(fullCols[ci + 1].index);
          const x = Math.min(xPon, xOri) + GAP + 6;
          const y = Math.min(ySur, yNor) + GAP + 6;
          const w = Math.abs(xOri - xPon) - 2 * GAP - 12;
          const h = Math.abs(yNor - ySur) - 2 * GAP - 12;
          const cx = x + w / 2;
          const cy = y + h / 2;
          // Cada sitio es un triángulo con la base sobre su calle y la punta en el centro.
          const edge = {
            left: { pts: `${x},${y} ${x},${y + h} ${cx},${cy}`, edge: [x, y, x, y + h], mid: [x, cy] },
            right: { pts: `${x + w},${y} ${x + w},${y + h} ${cx},${cy}`, edge: [x + w, y, x + w, y + h], mid: [x + w, cy] },
            top: { pts: `${x},${y} ${x + w},${y} ${cx},${cy}`, edge: [x, y, x + w, y], mid: [cx, y] },
            bottom: { pts: `${x},${y + h} ${x + w},${y + h} ${cx},${cy}`, edge: [x, y + h, x + w, y + h], mid: [cx, y + h] },
          } as const;
          const ponLeft = xPon < xOri;
          const surTop = ySur < yNor;
          const shape: Record<Side, { pts: string; edge: readonly number[]; mid: readonly number[] }> = {
            poniente: ponLeft ? edge.left : edge.right,
            oriente: ponLeft ? edge.right : edge.left,
            sur: surTop ? edge.top : edge.bottom,
            norte: surTop ? edge.bottom : edge.top,
          };
          return (
            <g key={`mz${ri}-${ci}`}>
              <rect x={x} y={y} width={w} height={h} rx="3" fill="#f5f1e8" stroke={INK} strokeWidth="1" />
              {sites.map((lot) => {
                const sh = shape[lot.side];
                const selected = lot.id === selectedLotId;
                const lm = lot.landmarkId ? landmarks.find((m) => m.id === lot.landmarkId) : undefined;
                const ix = (sh.mid[0] * 2 + cx) / 3;
                const iy = (sh.mid[1] * 2 + cy) / 3;
                return (
                  <g
                    key={lot.id}
                    className={selected ? 'lot is-selected' : 'lot'}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectLot(lot);
                    }}
                  >
                    <title>{lot.name}</title>
                    <polygon
                      points={sh.pts}
                      fill={lm?.id === 'plaza-de-armas' ? PLAZA_FILL : lm ? LANDMARK_FILL : lot.kind === 'local' ? '#eadfc4' : '#f5f1e8'}
                      stroke={INK}
                      strokeWidth="1"
                    />
                    <line x1={sh.edge[0]} y1={sh.edge[1]} x2={sh.edge[2]} y2={sh.edge[3]} stroke={BARRIO_COLORS[lot.barrio]} strokeWidth="7" />
                    {ownerColors[lot.id] && (
                      <circle cx={ix + 13} cy={iy - 11} r="5" fill={ownerColors[lot.id]} stroke={INK} strokeWidth="1.5" />
                    )}
                    <GlyphImage glyph={glyphOfLot(lot)} x={ix - 12} y={iy - 11} size={25} />
                    {selected && <polygon points={sh.pts} fill="none" stroke={GOLD} strokeWidth="3.5" />}
                  </g>
                );
              })}
            </g>
          );
        }),
      )}

      {/* Rótulos de calles: Norte/Sur a la izquierda, Oriente/Poniente arriba */}
      {board.horizontalStreets.map((s) => (
        <text key={s.id} x={LEFT - 38} y={sy(s.index) + (STREET_ALIASES[s.id] ? 0 : 4)} textAnchor="end" className="axis-label">
          {s.name}
          {STREET_ALIASES[s.id] && (
            <tspan x={LEFT - 38} dy="10" className="axis-alias">{STREET_ALIASES[s.id]}</tspan>
          )}
        </text>
      ))}
      {board.verticalStreets.map((s) => (
        <text key={s.id} x={sx(s.index)} y={TOP - (STREET_ALIASES[s.id] ? 48 : 38)} textAnchor="middle" className="axis-label">
          {s.name}
          {STREET_ALIASES[s.id] && (
            <tspan x={sx(s.index)} dy="10" className="axis-alias">{STREET_ALIASES[s.id]}</tspan>
          )}
        </text>
      ))}

      {/* Fichas de calle */}
      {board.segments.map((seg) => {
        const t = tile(seg);
        const selected = seg.id === selectedId;
        return (
          <g
            key={seg.id}
            className="tile"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(seg);
            }}
          >
            <title>{`${seg.name} (${trafficLabel(seg)})`}</title>
            <rect x={t.x} y={t.y} width={t.w} height={t.h} fill={CREAM} stroke={INK} strokeWidth="1.5" />
            {trafficMarker(seg, t)}
            {selected && (
              <rect x={t.x - 2} y={t.y - 2} width={t.w + 4} height={t.h + 4} fill="none" stroke={GOLD} strokeWidth="3.5" />
            )}
          </g>
        );
      })}

      {/* Intersecciones y esquinas */}
      {board.intersections.map((n) => {
        const key = `${n.x},${n.y}`;
        const corner = corners[key];
        const lm = landmarkAtNode(n.x, n.y);
        const cx = sx(n.x);
        const cy = sy(n.y);
        const size = corner ? CORNER : NODE;
        const line2 = corner ? corner[1] : '';
        if (cardSquares.has(n.id)) {
          return (
            <g
              key={n.id}
              className="card-square"
              onClick={(e) => {
                e.stopPropagation();
                onCardSquare?.(n.id);
              }}
            >
              <title>Tarjeta ?</title>
              <rect x={cx - size / 2} y={cy - size / 2} width={size} height={size} rx="4" fill={INK} stroke={COPPER} strokeWidth="2.5" />
              <GlyphImage glyph="luck" x={cx - size / 2 + 3} y={cy - size / 2 + 3} size={size - 6} />
            </g>
          );
        }
        return (
          <g
            key={n.id}
            pointerEvents={lm ? 'auto' : 'none'}
            className={lm ? 'landmark' : undefined}
            onClick={lm ? landmarkClick(lm) : undefined}
          >
            {lm && <title>{lm.name}</title>}
            <rect x={cx - size / 2} y={cy - size / 2} width={size} height={size} fill={corner ? LANDMARK_FILL : '#f5f1e8'} stroke={INK} strokeWidth={corner ? 2.5 : 1.5} />
            {lm && !corner && (
              <rect x={cx - size / 2} y={cy - size / 2} width={size} height="6" fill={barrioColorOf(lm)} stroke={INK} strokeWidth="1" />
            )}
            {lm && landmarkLotId(lm) === selectedLotId && (
              <rect x={cx - size / 2 - 2} y={cy - size / 2 - 2} width={size + 4} height={size + 4} fill="none" stroke={GOLD} strokeWidth="3.5" />
            )}
            {corner ? (
              <>
                <text x={cx} y={cy - 4} textAnchor="middle" className="corner-text">{corner[0]}</text>
                {lm ? (
                  <GlyphImage glyph={glyphOfLandmark(lm.id)} x={cx - 11} y={cy + 1} size={24} />
                ) : (
                  <text x={cx} y={cy + 13} textAnchor="middle" className={line2.length <= 2 ? 'icon-text' : 'corner-text'}>{line2}</text>
                )}
              </>
            ) : lm ? (
              <GlyphImage glyph={glyphOfLandmark(lm.id)} x={cx - 11} y={cy - 9} size={22} />
            ) : (
              <path className="action-mark" d={`M${cx} ${cy - 6.5}L${cx + 6.5} ${cy}L${cx} ${cy + 6.5}L${cx - 6.5} ${cy}Z`} fill={COPPER} stroke={INK} strokeWidth="1" />
            )}
          </g>
        );
      })}

      {/* Edificios que ocupan una manzana entera, o que están junto a un tramo de calle */}
      {landmarks
        .filter((l) => l.anchor.type === 'segment')
        .map((l) => {
          const cx = sx(l.row);
          const cy = sy(l.col);
          const wholeBlock = false;
          const halfW = 15;
          const halfH = 15;
          const selected = landmarkLotId(l) === selectedLotId;
          return (
            <g key={l.id} className="landmark" onClick={landmarkClick(l)}>
              <title>{l.name}</title>
              <rect
                x={cx - halfW}
                y={cy - halfH}
                width={halfW * 2}
                height={halfH * 2}
                rx={wholeBlock ? 3 : 4}
                fill={l.id === 'plaza-de-armas' ? '#7fa592' : LANDMARK_FILL}
                stroke={INK}
                strokeWidth={selected ? 3 : 1.5}
              />
              <rect x={cx - halfW} y={cy - halfH} width={halfW * 2} height={wholeBlock ? 11 : 6} fill={barrioColorOf(l)} stroke={INK} strokeWidth="1" />
              <GlyphImage glyph={glyphOfLandmark(l.id)} x={cx - 12} y={cy - 9} size={24} />
              {selected && (
                <rect x={cx - halfW - 2} y={cy - halfH - 2} width={halfW * 2 + 4} height={halfH * 2 + 4} rx="5" fill="none" stroke={GOLD} strokeWidth="3.5" />
              )}
            </g>
          );
        })}

      {/* Destinos posibles del jugador en turno: tramos de calle e intersecciones */}
      {options &&
        board.segments
          .filter((s) => options.has(s.id))
          .map((s) => {
            const t = tile(s);
            return (
              <g
                key={`opt-${s.id}`}
                className="move-option move-option-tile"
                onClick={(e) => {
                  e.stopPropagation();
                  onPickNode?.(s.id);
                }}
              >
                <title>Avanzar hasta aquí</title>
                <rect x={t.x - 2} y={t.y - 2} width={t.w + 4} height={t.h + 4} rx="4" fill="rgba(212,175,55,0.4)" stroke={GOLD} strokeWidth="3" strokeDasharray="5 3" />
              </g>
            );
          })}
      {options &&
        board.intersections
          .filter((n) => options.has(n.id))
          .map((n) => (
            <g
              key={`opt-${n.id}`}
              className="move-option"
              onClick={(e) => {
                e.stopPropagation();
                onPickNode?.(n.id);
              }}
            >
              <title>Avanzar hasta aquí</title>
              <circle cx={sx(n.x)} cy={sy(n.y)} r="17" fill="rgba(212,175,55,0.4)" stroke={GOLD} strokeWidth="3.5" strokeDasharray="5 3" />
            </g>
          ))}

      {/* Fichas: si hay varias en una misma casilla se reparten alrededor */}
      {tokens.map((t, k) => {
        const center = squareCenter(t.at);
        if (!center) return null;
        const mates = tokens.filter((o) => o.at === t.at);
        const slot = mates.findIndex((o) => o.id === t.id);
        const ang = (slot / Math.max(mates.length, 1)) * Math.PI * 2 - Math.PI / 2;
        const off = mates.length > 1 ? 8 : 0;
        const x = center.x + Math.cos(ang) * off;
        const y = center.y + Math.sin(ang) * off;
        return (
          <g
            key={`tok-${k}`}
            className={t.active ? 'token is-active' : 'token'}
            style={{ transform: `translate(${x}px, ${y}px)` }}
            pointerEvents="none"
            data-active-token={t.active ? '' : undefined}
          >
            {t.active && <circle className="token-halo" r="13" fill="none" stroke={GOLD} strokeWidth="2" />}
            <circle r={t.active ? 9 : 7.5} fill={t.color} stroke={t.active ? GOLD : INK} strokeWidth={t.active ? 3 : 2} />
            <text y="3.5" textAnchor="middle" className="token-text">{t.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
