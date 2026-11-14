/** Historial reciente de la partida. */
export function LogPanel({ log, onClose }: { log: string[]; onClose?: () => void }) {
  return (
    <section className="panel log-panel" aria-label="Historial">
      <header className="panel-head">
        <h2>Historial</h2>
        <button type="button" className="sheet-close" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>
      </header>
      <ol className="log">
        {log
          .slice(-8)
          .reverse()
          .map((line, k) => (
            <li key={log.length - k}>{line}</li>
          ))}
      </ol>
    </section>
  );
}
