import { useMemo } from 'react';
import type { Board, Intersection, Segment, Street } from '../engine/board';
import { STREET_ALIASES, type PlacedLandmark } from '../engine/landmarks';
import { directionOf } from '../engine/traffic';

/** Colores de los grupos, como en el Monopoly clásico. */
export const GROUP_COLORS = [
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
  selectedId: string | null;
  selectedLandmarkId: string | null;
  /** Factor de zoom sobre el tamaño natural del tablero (1 = 1 px por unidad del dibujo). */
  zoom: number;
  onSelect: (segment: Segment | null) => void;
  onSelectLandmark: (landmark: PlacedLandmark) => void;
}

/**
 * Proyección a pantalla:
 *   fila    = índice de calle Oriente/Poniente (2 Poniente arriba, 11 Oriente abajo)
 *   columna = índice de calle Norte/Sur        (2 Sur a la izquierda, 4 Norte a la derecha)
 */
/** Posición en metros de una coordenada de grilla (posible fraccionaria), interpolando entre calles. */
function lerpM(streets: Street[], f: number): number {
  const i = Math.min(Math.floor(f), streets.length - 1);
  const t = f - i;
  const a = streets[i].positionM;
  const b = streets[Math.min(i + 1, streets.length - 1)].positionM;
  return a + (b - a) * t;
}

export function BoardView({ board, landmarks, selectedId, selectedLandmarkId, zoom, onSelect, onSelectLandmark }: Props) {
  const rows = board.verticalStreets.length;
  const cols = board.horizontalStreets.length;
  // Las distancias entre calles son las reales (geometry.ts), a escala K px/m.
  const px = (col: number) => LEFT + K * lerpM(board.horizontalStreets, col);
  const py = (row: number) => TOP + K * lerpM(board.verticalStreets, row);
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
  const landmarkClick = (l: PlacedLandmark) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectLandmark(l);
  };

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

      {/* Manzanas: entre calles enteras consecutivas; las calles parciales cruzan por encima */}
      {fullRows.slice(0, -1).map((r, i) =>
        fullCols.slice(0, -1).map((c, j) => (
          <rect
            key={`b${r.index}-${c.index}`}
            x={px(c.index) + GAP + 6}
            y={py(r.index) + GAP + 6}
            width={px(fullCols[j + 1].index) - px(c.index) - 2 * GAP - 12}
            height={py(fullRows[i + 1].index) - py(r.index) - 2 * GAP - 12}
            rx="3"
            fill="#e9f4e4"
            stroke="#b7d3b9"
          />
        )),
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
            {/* Franja de color, como en las propiedades del Monopoly */}
            {t.w === TILE ? (
              <rect x={t.x + 1} y={t.y + 1} width={TILE - 2} height={9} fill={GROUP_COLORS[seg.street.group]} stroke="#111" strokeWidth="0.8" />
            ) : (
              <rect x={t.x + 1} y={t.y + 1} width={9} height={TILE - 2} fill={GROUP_COLORS[seg.street.group]} stroke="#111" strokeWidth="0.8" />
            )}
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
        return (
          <g
            key={n.id}
            pointerEvents={lm ? 'auto' : 'none'}
            className={lm ? 'landmark' : undefined}
            onClick={lm ? landmarkClick(lm) : undefined}
          >
            {lm && <title>{lm.name}</title>}
            <rect x={cx - size / 2} y={cy - size / 2} width={size} height={size} fill={corner ? '#fff6d6' : '#fffdf2'} stroke="#111" strokeWidth={corner ? 2.5 : 1.5} />
            {lm && lm.id === selectedLandmarkId && (
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

      {/* Edificios en manzanas y junto a tramos de calle */}
      {landmarks
        .filter((l) => !Number.isInteger(l.row) || !Number.isInteger(l.col))
        .map((l) => {
          const cx = px(l.col);
          const cy = py(l.row);
          const isPlaza = l.id === 'plaza-de-armas';
          const halfW = isPlaza ? (px(l.col + 0.5) - px(l.col - 0.5)) / 2 - GAP - 6 : 15;
          const halfH = isPlaza ? (py(l.row + 0.5) - py(l.row - 0.5)) / 2 - GAP - 6 : 15;
          return (
            <g key={l.id} className="landmark" onClick={landmarkClick(l)}>
              <title>{l.name}</title>
              <rect
                x={cx - halfW}
                y={cy - halfH}
                width={halfW * 2}
                height={halfH * 2}
                rx={isPlaza ? 3 : 4}
                fill={isPlaza ? '#7ec27e' : '#fff6d6'}
                stroke="#111"
                strokeWidth={l.id === selectedLandmarkId ? 3 : 1.5}
                className={l.id === selectedLandmarkId ? 'landmark-selected' : undefined}
              />
              <text x={cx} y={cy + (isPlaza ? 9 : 7)} textAnchor="middle" className={isPlaza ? 'icon-text icon-big' : 'icon-text'}>
                {l.icon}
              </text>
            </g>
          );
        })}
    </svg>
  );
}
