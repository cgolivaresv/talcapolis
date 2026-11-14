import { useMemo } from 'react';
import type { Board, Intersection, Segment } from '../engine/board';
import { STREET_ALIASES, type PlacedLandmark } from '../engine/landmarks';

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

const S = 84; // distancia entre intersecciones
const LEFT = 118;
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
  onSelect: (segment: Segment | null) => void;
  onSelectLandmark: (landmark: PlacedLandmark) => void;
}

/**
 * Proyección a pantalla:
 *   fila    = índice de calle Oriente/Poniente (2 Poniente arriba, 11 Oriente abajo)
 *   columna = índice de calle Norte/Sur        (2 Sur a la izquierda, 4 Norte a la derecha)
 */
const px = (col: number) => LEFT + col * S;
const py = (row: number) => TOP + row * S;

export function BoardView({ board, landmarks, selectedId, selectedLandmarkId, onSelect, onSelectLandmark }: Props) {
  const rows = board.verticalStreets.length;
  const cols = board.horizontalStreets.length;
  const width = LEFT + (cols - 1) * S + 70;
  const height = TOP + (rows - 1) * S + 70;

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

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Tablero de Talcapolis"
      className="board"
      onClick={() => onSelect(null)}
    >
      <rect x="4" y="4" width={width - 8} height={height - 8} rx="10" fill="#cde6d0" stroke="#111" strokeWidth="4" />
      <rect x="12" y="12" width={width - 24} height={height - 24} rx="6" fill="none" stroke="#111" strokeWidth="1.5" />

      {/* Manzanas */}
      {Array.from({ length: rows - 1 }, (_, r) =>
        Array.from({ length: cols - 1 }, (_, c) => (
          <rect
            key={`b${r}-${c}`}
            x={px(c) + GAP + 6}
            y={py(r) + GAP + 6}
            width={S - 2 * GAP - 12}
            height={S - 2 * GAP - 12}
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
        <text key={s.id} x={px(s.index)} y={TOP - (STREET_ALIASES[s.id] ? 48 : 38)} textAnchor="middle" className="axis-label">
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
            <title>{seg.name}</title>
            <rect x={t.x} y={t.y} width={t.w} height={t.h} fill="#fbf7e8" stroke="#111" strokeWidth="1.5" />
            {/* Franja de color, como en las propiedades del Monopoly */}
            {t.w === TILE ? (
              <rect x={t.x + 1} y={t.y + 1} width={TILE - 2} height={9} fill={GROUP_COLORS[seg.street.group]} stroke="#111" strokeWidth="0.8" />
            ) : (
              <rect x={t.x + 1} y={t.y + 1} width={9} height={TILE - 2} fill={GROUP_COLORS[seg.street.group]} stroke="#111" strokeWidth="0.8" />
            )}
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
          const half = isPlaza ? (S - 2 * GAP - 12) / 2 : 15;
          return (
            <g key={l.id} className="landmark" onClick={landmarkClick(l)}>
              <title>{l.name}</title>
              <rect
                x={cx - half}
                y={cy - half}
                width={half * 2}
                height={half * 2}
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
