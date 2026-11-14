import { useMemo } from 'react';
import type { Board, Intersection, Segment } from '../engine/board';

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
  selectedId: string | null;
  onSelect: (segment: Segment | null) => void;
}

/**
 * Proyección a pantalla:
 *   fila    = índice de calle Oriente/Poniente (2 Poniente arriba, 11 Oriente abajo)
 *   columna = índice de calle Norte/Sur        (2 Sur a la izquierda, 4 Norte a la derecha)
 */
const px = (col: number) => LEFT + col * S;
const py = (row: number) => TOP + row * S;

export function BoardView({ board, selectedId, onSelect }: Props) {
  const rows = board.verticalStreets.length;
  const cols = board.horizontalStreets.length;
  const width = LEFT + (cols - 1) * S + 70;
  const height = TOP + (rows - 1) * S + 70;

  const byId = useMemo(() => new Map(board.intersections.map((i) => [i.id, i])), [board]);

  const corners: Record<string, string[]> = {
    [`0,0`]: ['SALIDA', '→'],
    [`0,${cols - 1}`]: ['CÁRCEL', '⛓'],
    [`${rows - 1},0`]: ['LIBRE', '🅿'],
    [`${rows - 1},${cols - 1}`]: ['A LA', 'CÁRCEL'],
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
        <text key={s.id} x={LEFT - 38} y={py(s.index) + 4} textAnchor="end" className="axis-label">
          {s.name}
        </text>
      ))}
      {board.horizontalStreets.map((s) => (
        <text key={s.id} x={px(s.index)} y={TOP - 38} textAnchor="middle" className="axis-label">
          {s.name}
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
        const cx = px(n.y);
        const cy = py(n.x);
        const size = corner ? CORNER : NODE;
        return (
          <g key={n.id} pointerEvents="none">
            <rect x={cx - size / 2} y={cy - size / 2} width={size} height={size} fill={corner ? '#fff6d6' : '#fffdf2'} stroke="#111" strokeWidth={corner ? 2.5 : 1.5} />
            {corner ? (
              <>
                <text x={cx} y={cy - 4} textAnchor="middle" className="corner-text">{corner[0]}</text>
                <text x={cx} y={cy + 12} textAnchor="middle" className="corner-text">{corner[1]}</text>
              </>
            ) : (
              <circle cx={cx} cy={cy} r="3" fill="#111" />
            )}
          </g>
        );
      })}
    </svg>
  );
}
