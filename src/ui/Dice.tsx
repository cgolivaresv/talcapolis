/** Posiciones de los puntos de cada cara (cuadrícula de 3 × 3, de izquierda a derecha y de arriba abajo). */
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** Los dos dados tirados. Cada tirada (`rollKey`) reproduce la animación de giro con el resultado que entregó el juego. */
export function Dice({ dice, rollKey }: { dice: [number, number]; rollKey: number }) {
  return (
    <div className="dice" key={rollKey} role="img" aria-label={`Dados: ${dice[0]} y ${dice[1]}, suman ${dice[0] + dice[1]}`}>
      {dice.map((v, i) => (
        <span className="die" key={i} style={{ animationDelay: `${i * 70}ms` }}>
          {Array.from({ length: 9 }, (_, p) => (
            <i key={p} className={PIPS[v].includes(p) ? 'on' : undefined} />
          ))}
        </span>
      ))}
      <em className="dice-total">= {dice[0] + dice[1]} tramos</em>
    </div>
  );
}
