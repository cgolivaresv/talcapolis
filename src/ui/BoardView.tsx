import { useMemo } from 'react';
import { lerpPositionM, type Board, type Intersection, type Segment } from '../engine/board';
import { STREET_ALIASES, type PlacedLandmark } from '../engine/landmarks';
import type { Lot, Side } from '../engine/lots';
import { directionOf } from '../engine/traffic';

/** Color de cada barrio (índice = id del barrio), como en el Monopoly clásico. */
export const BARRIO_COLORS = [
  '#955436', // café
  '#aae0fa', // celeste
  '#d93a96', // rosado
  '#f7941d', // naranja
  '#ed1b24', // rojo
  '#fef200', // amarillo
  '#1fb25a', // verde
  '#0072bb', // azul
] as const;

const K = 1.1; // píxeles por metro real (las calles intermedias están a ~65 m)
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
  tokens?: { id: string; at: string; color: string; active: boolean }[];
  /** Intersecciones a las que puede llegar el jugador en turno. */
  options?: Set<string>;
  onPickNode?: (nodeId: string) => void;
  /** Factor de zoom sobre el tamaño natural del tablero (1 = 1 px por unidad del dibujo). */
  zoom: number;
  onSelect: (segment: Segment | null) => void;
  onSelectLot: (lot: Lot) => void;
}

/**
 * Proyección a pantalla:
 *   fila    = índice de calle Oriente/Poniente (2 Poniente arriba, 11 Oriente abajo)
 *   columna = índice de calle Norte/Sur        (2 Sur a la izquierda, 4 Norte a la derecha)
 */
export function BoardView({ board, landmarks, lots, selectedId, selectedLotId, cardSquares, onCardSquare, tokens = [], options, onPickNode, zoom, onSelect, onSelectLot }: Props) {
  const rows = board.verticalStreets.length;
  const cols = board.horizontalStreets.length;
  // Las distancias entre calles son las reales (geometry.ts), a escala K px/m.
  const px = (col: number) => LEFT + K * lerpPositionM(board.horizontalStreets, col);
  const py = (row: number) => TOP + K * lerpPositionM(board.verticalStreets, row);
  const width = px(cols - 1) + 70;
  const height = py(rows - 1) + 70;
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

  const tile = (seg: Segment) => {
    const a = byId.get(seg.from) as Intersection;
    const b = byId.get(seg.to) as Intersection;
    // a.x / b.x = fila, a.y / b.y = columna
    const x1 = px(a.y);
    const y1 = py(a.x);
    const x2 = px(b.y);
    const y2 = py(b.x);
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
    let ux = px(b.y) - px(a.y);
    let uy = py(b.x) - py(a.x);
    const l = Math.hypot(ux, uy) || 1;
    ux /= l;
    uy /= l;
    const vertical = t.w === TILE; // la franja de color ocupa los primeros 10 px del tramo
    const cx = vertical ? t.x + TILE / 2 : t.x + 10 + (t.w - 10) / 2;
    const cy = vertical ? t.y + 10 + (t.h - 10) / 2 : t.y + TILE / 2;
    const len = Math.max(8, Math.min(16, (vertical ? t.h : t.w) - 10 - 8));
    if (dir === 'both') {
      const ox = vertical ? 4.5 : 0;
      const oy = vertical ? 0 : 4.5;
      return (
        <g pointerEvents="none">
          {arrow(cx - ox, cy - oy, ux, uy, len * 0.75, 6, '#8a8a8a')}
          {arrow(cx + ox, cy + oy, -ux, -uy, len * 0.75, 6, '#8a8a8a')}
        </g>
      );
    }
    const s = dir === 'forward' ? 1 : -1;
    return <g pointerEvents="none">{arrow(cx, cy, ux * s, uy * s, len, 11, '#111')}</g>;
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
      <rect x="4" y="4" width={width - 8} height={height - 8} rx="10" fill="#cde6d0" stroke="#111" strokeWidth="4" />
      <rect x="12" y="12" width={width - 24} height={height - 24} rx="6" fill="none" stroke="#111" strokeWidth="1.5" />

      {/* Manzanas en venta: entre calles enteras consecutivas, con el color de su barrio.
          Las calles parciales (1½ Norte, etc.) cruzan por encima. */}
      {fullRows.slice(0, -1).map((r, ri) =>
        fullCols.slice(0, -1).map((c, ci) => {
          // Los 4 sitios de la manzana: uno por lado, mirando a la calle que lo rodea.
          const sites = lots.filter((l) => l.cell.row === ri && l.cell.col === ci);
          const x = px(c.index) + GAP + 6;
          const y = py(r.index) + GAP + 6;
          const w = px(fullCols[ci + 1].index) - px(c.index) - 2 * GAP - 12;
          const h = py(fullRows[ri + 1].index) - py(r.index) - 2 * GAP - 12;
          const cx = x + w / 2;
          const cy = y + h / 2;
          // Cada sitio es un triángulo con la base sobre su calle y la punta en el centro.
          const shape: Record<Side, { pts: string; edge: [number, number, number, number]; mid: [number, number] }> = {
            N: { pts: `${x},${y} ${x + w},${y} ${cx},${cy}`, edge: [x, y, x + w, y], mid: [cx, y] },
            E: { pts: `${x + w},${y} ${x + w},${y + h} ${cx},${cy}`, edge: [x + w, y, x + w, y + h], mid: [x + w, cy] },
            S: { pts: `${x},${y + h} ${x + w},${y + h} ${cx},${cy}`, edge: [x, y + h, x + w, y + h], mid: [cx, y + h] },
            W: { pts: `${x},${y} ${x},${y + h} ${cx},${cy}`, edge: [x, y, x, y + h], mid: [x, cy] },
          };
          return (
            <g key={`mz${ri}-${ci}`}>
              <rect x={x} y={y} width={w} height={h} rx="3" fill="#f3f8ee" stroke="#111" strokeWidth="1" />
              {sites.map((lot) => {
                const sh = shape[lot.side];
                const selected = lot.id === selectedLotId;
                const lm = lot.landmarkId ? landmarks.find((m) => m.id === lot.landmarkId) : undefined;
                const icon = lm ? lm.icon : lot.kind === 'local' ? '🏪' : '🏠';
                const ix = (sh.mid[0] * 2 + cx) / 3;
                const iy = (sh.mid[1] * 2 + cy) / 3;
                return (
                  <g
                    key={lot.id}
                    className="lot"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectLot(lot);
                    }}
                  >
                    <title>{lot.name}</title>
                    <polygon
                      points={sh.pts}
                      fill={lm?.id === 'plaza-de-armas' ? '#7ec27e' : lm ? '#fff6d6' : lot.kind === 'local' ? '#fdf1d4' : '#f3f8ee'}
                      stroke="#111"
                      strokeWidth="1"
                    />
                    <line x1={sh.edge[0]} y1={sh.edge[1]} x2={sh.edge[2]} y2={sh.edge[3]} stroke={BARRIO_COLORS[lot.barrio]} strokeWidth="7" />
                    <text x={ix} y={iy + 5} textAnchor="middle" className="icon-text lot-house">{icon}</text>
                    {selected && <polygon points={sh.pts} fill="none" stroke="#c4161c" strokeWidth="3" />}
                  </g>
                );
              })}
            </g>
          );
        }),
      )}

      {/* Rótulos de calles */}
      {board.verticalStreets.map((s) => (
        <text key={s.id} x={LEFT - 38} y={py(s.index) + (STREET_ALIASES[s.id] ? 0 : 4)} textAnchor="end" className="axis-label">
          {s.name}
          {STREET_ALIASES[s.id] && (
            <tspan x={LEFT - 38} dy="10" className="axis-alias">{STREET_ALIASES[s.id]}</tspan>
          )}
        </text>
      ))}
      {board.horizontalStreets.map((s) => (
        <text key={s.id} x={px(s.index)} y={TOP - (STREET_ALIASES[s.id] ? 48 : s.spanM ? 24 : 38)} textAnchor="middle" className="axis-label">
          {s.name}
          {STREET_ALIASES[s.id] && (
            <tspan x={px(s.index)} dy="10" className="axis-alias">{STREET_ALIASES[s.id]}</tspan>
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
            <rect x={t.x} y={t.y} width={t.w} height={t.h} fill="#fbf7e8" stroke="#111" strokeWidth="1.5" />
            {trafficMarker(seg, t)}
            {selected && (
              <rect x={t.x - 2} y={t.y - 2} width={t.w + 4} height={t.h + 4} fill="none" stroke="#c4161c" strokeWidth="3" />
            )}
          </g>
        );
      })}

      {/* Intersecciones y esquinas */}
      {board.intersections.map((n) => {
        const key = `${n.x},${n.y}`;
        const corner = corners[key];
        const lm = landmarkAtNode(n.x, n.y);
        const cx = px(n.y);
        const cy = py(n.x);
        const size = corner ? CORNER : NODE;
        const line2 = corner ? corner[1] || lm?.icon || '' : '';
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
              <rect x={cx - size / 2} y={cy - size / 2} width={size} height={size} rx="4" fill="#f7941d" stroke="#111" strokeWidth="2" />
              <text x={cx} y={cy + 8} textAnchor="middle" className="card-mark">?</text>
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
            <rect x={cx - size / 2} y={cy - size / 2} width={size} height={size} fill={corner ? '#fff6d6' : '#fffdf2'} stroke="#111" strokeWidth={corner ? 2.5 : 1.5} />
            {lm && !corner && (
              <rect x={cx - size / 2} y={cy - size / 2} width={size} height="6" fill={barrioColorOf(lm)} stroke="#111" strokeWidth="1" />
            )}
            {lm && landmarkLotId(lm) === selectedLotId && (
              <rect x={cx - size / 2 - 2} y={cy - size / 2 - 2} width={size + 4} height={size + 4} fill="none" stroke="#c4161c" strokeWidth="3" />
            )}
            {corner ? (
              <>
                <text x={cx} y={cy - 4} textAnchor="middle" className="corner-text">{corner[0]}</text>
                <text x={cx} y={cy + 13} textAnchor="middle" className={line2.length <= 2 ? 'icon-text' : 'corner-text'}>{line2}</text>
              </>
            ) : lm ? (
              <text x={cx} y={cy + 7} textAnchor="middle" className="icon-text">{lm.icon}</text>
            ) : (
              <circle cx={cx} cy={cy} r="3" fill="#111" />
            )}
          </g>
        );
      })}

      {/* Edificios que ocupan una manzana entera, o que están junto a un tramo de calle */}
      {landmarks
        .filter((l) => l.anchor.type === 'segment')
        .map((l) => {
          const cx = px(l.col);
          const cy = py(l.row);
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
                fill={l.id === 'plaza-de-armas' ? '#7ec27e' : '#fff6d6'}
                stroke="#111"
                strokeWidth={selected ? 3 : 1.5}
              />
              <rect x={cx - halfW} y={cy - halfH} width={halfW * 2} height={wholeBlock ? 11 : 6} fill={barrioColorOf(l)} stroke="#111" strokeWidth="1" />
              <text x={cx} y={cy + (wholeBlock ? 12 : 8)} textAnchor="middle" className={wholeBlock ? 'icon-text icon-big' : 'icon-text'}>
                {l.icon}
              </text>
              {selected && (
                <rect x={cx - halfW - 2} y={cy - halfH - 2} width={halfW * 2 + 4} height={halfH * 2 + 4} rx="5" fill="none" stroke="#c4161c" strokeWidth="3" />
              )}
            </g>
          );
        })}

      {/* Destinos posibles del jugador en turno */}
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
              <circle cx={px(n.y)} cy={py(n.x)} r="17" fill="rgba(254,242,0,0.35)" stroke="#c4161c" strokeWidth="3" strokeDasharray="5 3" />
            </g>
          ))}

      {/* Fichas: si hay varias en una intersección se reparten alrededor */}
      {tokens.map((t, k) => {
        const n = byId.get(t.at);
        if (!n) return null;
        const mates = tokens.filter((o) => o.at === t.at);
        const slot = mates.findIndex((o) => o.id === t.id);
        const ang = (slot / Math.max(mates.length, 1)) * Math.PI * 2 - Math.PI / 2;
        const off = mates.length > 1 ? 8 : 0;
        const x = px(n.y) + Math.cos(ang) * off;
        const y = py(n.x) + Math.sin(ang) * off;
        return (
          <g key={`tok-${k}`} pointerEvents="none" data-active-token={t.active ? '' : undefined}>
            <circle cx={x} cy={y} r={t.active ? 9 : 7.5} fill={t.color} stroke={t.active ? '#c4161c' : '#111'} strokeWidth={t.active ? 3 : 2} />
            <text x={x} y={y + 3.5} textAnchor="middle" className="token-text">{t.id.slice(-1)}</text>
          </g>
        );
      })}
    </svg>
  );
}
