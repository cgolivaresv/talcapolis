import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { BARRIOS } from './engine/barrios';
import { buildBoard } from './engine/board';
import type { Segment } from './engine/board';
import { cardSquaresOf } from './engine/cards';
import { acceptTrade, buy, moveTo, newGame, proposeTrade, rejectTrade, roll, skipBuy } from './engine/game';
import { placeLandmarks } from './engine/landmarks';
import { buildLots, type Lot } from './engine/lots';
import { ActionPanel } from './ui/ActionPanel';
import { BarriosPanel } from './ui/BarriosPanel';
import { BoardView } from './ui/BoardView';
import { PLAYER_COLORS } from './ui/colors';
import { DrawnCard } from './ui/DrawnCard';
import { useDrawnCard, useElementSize, useExit, useMediaQuery, useToasts } from './ui/hooks';
import { LogPanel } from './ui/LogPanel';
import { Modal } from './ui/Modal';
import { PlayersPanel } from './ui/PlayersPanel';
import { PropertyCard } from './ui/PropertyCard';
import { SetupScreen } from './ui/SetupScreen';
import { Toasts } from './ui/Toasts';
import { TopBar } from './ui/TopBar';
import { TradePanel } from './ui/TradePanel';

type SheetName = 'players' | 'property' | 'barrios' | 'log';

/** Margen del marco ornamental alrededor del tablero (px), a cada lado. */
const FRAME = 12;

function Match({ names, seed, onExit }: { names: string[]; seed: number; onExit: () => void }) {
  const board = useMemo(() => buildBoard(), []);
  const landmarks = useMemo(() => placeLandmarks(board), [board]);
  const lots = useMemo(() => buildLots(board, landmarks), [board, landmarks]);
  const cardSquares = useMemo(() => cardSquaresOf(board, landmarks), [board, landmarks]);

  const [street, setStreet] = useState<Segment | null>(null);
  const [lot, setLot] = useState<Lot | null>(null);
  const [game, setGame] = useState(() => newGame(names, seed));
  const ctx = useMemo(() => ({ board, landmarks, lots, cardSquares }), [board, landmarks, lots, cardSquares]);
  const options = useMemo(() => new Set(game.options.map((d) => d.node)), [game.options]);
  const ownerColors = useMemo(
    () => Object.fromEntries(Object.entries(game.owners).map(([id, o]) => [id, PLAYER_COLORS[o]])),
    [game.owners],
  );
  const [trading, setTrading] = useState(false);

  // --- Presentación: pantalla, paneles desplegables, avisos y tarjeta sacada ---
  const compact = useMediaQuery('(max-width: 899px)');
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const backdrop = useExit(sheet !== null);
  const { toasts, dismiss } = useToasts(game.log);
  const drawn = useDrawnCard(game.log);
  const [dismissedCard, setDismissedCard] = useState<number | null>(null);

  // Tamaño natural del dibujo del tablero y espacio disponible para él.
  const [stageRef, stage] = useElementSize<HTMLDivElement>();
  const [vb, setVb] = useState({ w: 1694, h: 884 });
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const box = scrollEl?.querySelector('svg')?.viewBox.baseVal;
    if (box && box.width) setVb({ w: box.width, h: box.height });
  }, [scrollEl]);

  // Zoom: el tablero se ajusta solo al espacio libre. En móvil parte más cerca (se desplaza dentro de su marco).
  const [manualZoom, setManualZoom] = useState<number | null>(null);
  const fitZoom = stage.w ? Math.min((stage.w - 2 * FRAME) / vb.w, (stage.h - 2 * FRAME) / vb.h) : 0.5;
  const heightZoom = stage.h ? (stage.h - 2 * FRAME) / vb.h : 0.5;
  const autoZoom = compact ? Math.min(1, Math.max(fitZoom, 0.5, heightZoom)) : fitZoom;
  const zoom = Math.max(0.15, manualZoom ?? autoZoom);
  const changeZoom = (delta: number) => setManualZoom(Math.min(1.5, Math.max(0.2, +(zoom + delta).toFixed(2))));
  const boxW = Math.floor(Math.min(vb.w * zoom, stage.w - 2 * FRAME));
  const boxH = Math.floor(Math.min(vb.h * zoom, stage.h - 2 * FRAME));

  // Si el tablero no cabe entero, la vista sigue a la ficha del jugador en turno.
  const activeAt = game.players[game.current].at;
  useEffect(() => {
    const el = scrollEl;
    if (!el || (el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1)) return;
    const tok = el.querySelector('[data-active-token]');
    if (!tok) return;
    const t = tok.getBoundingClientRect();
    const c = el.getBoundingClientRect();
    el.scrollBy({ left: t.left - c.left - c.width / 2 + t.width / 2, top: t.top - c.top - c.height / 2 + t.height / 2, behavior: 'smooth' });
  }, [scrollEl, game.current, activeAt, zoom]);

  const clearSelection = () => {
    setStreet(null);
    setLot(null);
  };
  const selectStreet = (s: Segment | null) => {
    clearSelection();
    setStreet(s);
    if (s && compact) setSheet('property');
  };
  const selectLot = (l: Lot) => {
    clearSelection();
    setLot(l);
    if (compact) setSheet('property');
  };
  /** Al recorrer los lotes ofrecidos se muestra su ficha sin tapar los controles. */
  const previewLot = (l: Lot) => {
    clearSelection();
    setLot(l);
  };

  const closeSheet = useCallback(() => setSheet(null), []);
  const sheetProps = (name: SheetName) => ({ className: 'sheet', 'data-sheet': name, 'data-open': sheet === name });
  const cardShown = drawn && dismissedCard !== drawn.key;

  return (
    <div className="app">
      <TopBar game={game} totalLots={lots.length} barrios={BARRIOS.length} onNewGame={onExit} />
      <Toasts toasts={toasts} onDismiss={dismiss} />

      <main className="workspace">
        <div {...sheetProps('players')}>
          <PlayersPanel game={game} totalLots={lots.length} onClose={closeSheet} />
        </div>

        <div className="stage" ref={stageRef}>
          <div className="board-frame">
            <div className="board-scroll" ref={setScrollEl} style={stage.w ? { width: boxW, height: boxH } : undefined}>
              <BoardView
                board={board}
                landmarks={landmarks}
                lots={lots}
                selectedId={street?.id ?? null}
                selectedLotId={lot?.id ?? null}
                cardSquares={cardSquares}
                tokens={game.players.map((p, k) => ({
                  id: p.id,
                  label: p.id.trim().charAt(0).toUpperCase(),
                  at: p.at,
                  color: PLAYER_COLORS[k],
                  active: k === game.current,
                }))}
                options={options}
                ownerColors={ownerColors}
                onPickNode={(node) => setGame((g) => moveTo(g, node, ctx))}
                zoom={zoom}
                onSelect={selectStreet}
                onSelectLot={selectLot}
              />
            </div>
          </div>
          <div className="zoom" role="group" aria-label="Zoom del tablero">
            <button type="button" onClick={() => changeZoom(-0.1)} aria-label="Alejar">
              −
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => changeZoom(0.1)} aria-label="Acercar">
              +
            </button>
            <button type="button" className="zoom-fit" onClick={() => setManualZoom(null)} disabled={manualZoom === null}>
              Ajustar
            </button>
          </div>
        </div>

        <div className="area-side">
          <div {...sheetProps('property')}>
            <PropertyCard lot={lot} street={street} lots={lots} landmarks={landmarks} game={game} onClose={closeSheet} />
          </div>
          <div {...sheetProps('barrios')}>
            <BarriosPanel lots={lots} onClose={closeSheet} />
          </div>
        </div>

        <div className="dock">
          <ActionPanel
            game={game}
            lots={lots}
            onRoll={() => setGame((g) => roll(g, board))}
            onBuy={(id) => setGame((g) => buy(g, id, lots))}
            onSkip={() => setGame((g) => skipBuy(g))}
            onAccept={() => setGame((g) => acceptTrade(g))}
            onReject={() => setGame((g) => rejectTrade(g))}
            onOpenTrade={() => setTrading(true)}
            onPreviewLot={previewLot}
          />
          <div className={cardShown || !compact ? 'drawn-slot' : 'drawn-slot is-hidden'}>
            <DrawnCard card={drawn} onDismiss={() => drawn && setDismissedCard(drawn.key)} />
          </div>
          <div {...sheetProps('log')}>
            <LogPanel log={game.log} onClose={closeSheet} />
          </div>
          <nav className="tabbar" aria-label="Paneles">
            {(
              [
                ['players', 'Jugadores'],
                ['property', 'Ficha'],
                ['barrios', 'Barrios'],
                ['log', 'Historial'],
              ] as const
            ).map(([name, label]) => (
              <button key={name} type="button" aria-pressed={sheet === name} onClick={() => setSheet(sheet === name ? null : name)}>
                {label}
              </button>
            ))}
          </nav>
        </div>
      </main>

      {backdrop.mounted && <div className="sheet-backdrop" data-open={backdrop.open} onClick={closeSheet} />}

      <Modal open={trading} title="Proponer intercambio" onClose={() => setTrading(false)}>
        <TradePanel
          game={game}
          lots={lots}
          colors={PLAYER_COLORS}
          onPropose={(t) => {
            setGame((g) => proposeTrade(g, t));
            setTrading(false);
          }}
          onCancel={() => setTrading(false)}
        />
      </Modal>
    </div>
  );
}

export default function App() {
  const [match, setMatch] = useState<{ names: string[]; seed: number } | null>(null);
  if (!match) return <SetupScreen onStart={(names) => setMatch({ names, seed: Math.floor(Math.random() * 2 ** 31) })} />;
  return <Match key={match.seed} names={match.names} seed={match.seed} onExit={() => setMatch(null)} />;
}
