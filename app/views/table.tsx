/*!
 * Chess
 * Copyright (c) Cliff Pyles
 * Released under the MIT License: https://opensource.org/license/mit
 * Original: https://codepen.io/editor/cliffpyles/pen/01a19e25-e438-75a3-a372-c9c67de14514
 */

// Intended use: the table during play: player plates and clocks, the scoresheet, commands, coach, cutscene caption, result slip, promotion choice and the keyboard board.
import gsap from "gsap";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type RefObject
} from "react";
import { Button, ButtonLink } from "../components/controls.js";
import {
  BackIcon,
  HintIcon,
  PieceIcon,
  ResignIcon,
  ScoresheetIcon,
  SkipIcon,
  StyleIcon,
  TakeBackIcon
} from "../components/icons.js";
import { Stack } from "../components/layout.js";
import {
  opposite,
  parseTyped,
  pieceAt,
  squareName,
  turnOf,
  type MoveFacts,
  type Role,
  type Side
} from "../chess/game.js";
import { en } from "../locales/en.js";
import { cheats } from "../state/cheats.js";
import { formatClock, prefersReducedMotion } from "../lib/utils.js";
import {
  askHint,
  cheatBestMove,
  cheatEnd,
  choosePromotion,
  focusSquare,
  lessonNext,
  lessonPlayOut,
  lessonRetry,
  playTyped,
  rematch,
  resign,
  retryEngine,
  skipScene,
  startClimb,
  takeBack,
  tapSquare,
  updateGameStyle,
  useStore,
  type Session
} from "../state/store.js";
import { config } from "../config.js";
import { stageHandle } from "../scene/board-canvas.js";
import { StylePicker } from "./style-panel.js";

// -----------------------------------------------------------------------------
// Plates: who is sitting where, what they've taken, and whose move it is
// -----------------------------------------------------------------------------
const pieceValue: Record<Role, number> = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: 0
};

const takenBy = (history: MoveFacts[], side: Side): Role[] =>
  history
    .filter((facts) => facts.color === side && facts.captured)
    .map((facts) => (facts.captured as { role: Role }).role)
    .sort((a, b) => pieceValue[b] - pieceValue[a]);

const worth = (roles: Role[]): number =>
  roles.reduce((sum, role) => sum + pieceValue[role], 0);

const Plate = ({
  name,
  detail,
  role,
  seconds,
  active,
  line,
  place,
  taken,
  lead
}: {
  name: string;
  detail: string;
  role: Role;
  seconds: number | null;
  active: boolean;
  line: string;
  place: string;
  taken: Role[];
  lead: number;
}) => (
  <div className={`corner ${place} plate${active ? " is-active" : ""}`}>
    <span className="plate-medal" aria-hidden="true">
      <PieceIcon role={role} size={20} />
    </span>
    <span className="plate-text">
      <span className="plate-name">{name}</span>
      <span className="plate-detail">{detail}</span>
      {taken.length ? (
        <span className="plate-taken" aria-label={en.table.taken}>
          {taken.map((piece, index) => (
            <PieceIcon key={index} role={piece} size={12} />
          ))}
          {lead > 0 ? <span className="plate-lead">+{lead}</span> : null}
        </span>
      ) : null}
      <span className="plate-line" role="status">
        {line}
      </span>
    </span>
    {seconds !== null ? (
      <span className={seconds < 30 ? "plate-clock is-low" : "plate-clock"}>
        {formatClock(seconds)}
      </span>
    ) : null}
  </div>
);

// -----------------------------------------------------------------------------
// Scoresheet
// -----------------------------------------------------------------------------
const Scoresheet = ({ history }: { history: MoveFacts[] }) => {
  const end = useRef<HTMLOListElement>(null);
  useEffect(() => {
    if (end.current) end.current.scrollTop = end.current.scrollHeight;
  }, [history.length]);
  const blackFirst = history[0]?.color === "black";
  const paired = blackFirst ? [null, ...history] : history;
  const rows = paired.flatMap((_, i) =>
    i % 2 === 0 ? [[paired[i], paired[i + 1]]] : []
  );
  if (!history.length) return <p className="note">{en.table.noMoves}</p>;
  return (
    <ol className="scoresheet" ref={end} aria-label={en.table.scoresheet}>
      {rows.map(([white, black], i) => (
        <li key={i} className="score-row">
          <span className="score-number">{i + 1}</span>
          <span className="score-move">{white?.san ?? "…"}</span>
          <span className="score-move">{black?.san ?? ""}</span>
        </li>
      ))}
    </ol>
  );
};

// -----------------------------------------------------------------------------
// Typed moves
// -----------------------------------------------------------------------------
const TypedMove = ({ session }: { session: Session }) => {
  const [text, setText] = useState("");
  const [rejected, setRejected] = useState<string | null>(null);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const uci = parseTyped(session.game, text);
    if (uci && playTyped(uci)) {
      setText("");
      setRejected(null);
    } else if (text.trim()) {
      setRejected(en.table.typeRejected(text.trim()));
    }
  };
  return (
    <form className="typed" onSubmit={submit}>
      <label>
        <span>{en.table.typeMove}</span>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={en.table.typePlaceholder}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      </label>
      {rejected ? (
        <p className="note note-alert" role="alert">
          {rejected}
        </p>
      ) : null}
    </form>
  );
};

// -----------------------------------------------------------------------------
// Keyboard board
// -----------------------------------------------------------------------------
const KeyboardBoard = ({ session }: { session: Session }) => {
  const [cursor, setCursor] = useState(session.you === "white" ? 4 : 60);
  const refs = useRef(new Map<number, HTMLButtonElement>());
  const rankOrder =
    session.you === "white"
      ? [7, 6, 5, 4, 3, 2, 1, 0]
      : [0, 1, 2, 3, 4, 5, 6, 7];
  const fileOrder =
    session.you === "white"
      ? [0, 1, 2, 3, 4, 5, 6, 7]
      : [7, 6, 5, 4, 3, 2, 1, 0];
  const onKey = (event: KeyboardEvent, square: number) => {
    const sign = session.you === "white" ? 1 : -1;
    const delta: Record<string, number> = {
      ArrowUp: 8 * sign,
      ArrowDown: -8 * sign,
      ArrowLeft: -1 * sign,
      ArrowRight: 1 * sign
    };
    const step = delta[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = square + step;
    const sameRow =
      Math.abs(step) !== 1 || Math.floor(next / 8) === Math.floor(square / 8);
    if (next >= 0 && next < 64 && sameRow) {
      setCursor(next);
      refs.current.get(next)?.focus();
    }
  };
  const describe = (square: number): string => {
    const piece = pieceAt(session.game, square);
    return `${squareName(square)}, ${
      piece
        ? en.table.pieceName(piece.color, en.table.roles[piece.role] as Role)
        : en.table.empty
    }`;
  };
  return (
    <div
      className="keyboard-board"
      role="grid"
      aria-label={en.table.boardLabel}
    >
      {rankOrder.map((rank) => (
        <div role="row" key={rank}>
          {fileOrder.map((file) => {
            const square = rank * 8 + file;
            return (
              <span role="gridcell" key={square}>
                <button
                  type="button"
                  ref={(element) => {
                    if (element) refs.current.set(square, element);
                  }}
                  tabIndex={square === cursor ? 0 : -1}
                  aria-label={describe(square)}
                  aria-pressed={session.selected === square}
                  onFocus={() => {
                    setCursor(square);
                    focusSquare(square);
                  }}
                  onBlur={() => focusSquare(null)}
                  onClick={() => tapSquare(square)}
                  onKeyDown={(event) => onKey(event, square)}
                />
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// -----------------------------------------------------------------------------
// Promotion
// -----------------------------------------------------------------------------
const promotions: Role[] = ["queen", "rook", "bishop", "knight"];

const PromotionChoice = () => (
  <div className="dialog-scrim">
    <div className="dialog" role="dialog" aria-label={en.table.promote}>
      <h2 className="dialog-title">{en.table.promote}</h2>
      <div className="promotion-pieces">
        {promotions.map((role) => (
          <button
            key={role}
            type="button"
            className="promotion-piece"
            onClick={() => choosePromotion(role)}
          >
            <PieceIcon role={role} size={34} />
            <span>{en.table.roles[role]}</span>
          </button>
        ))}
      </div>
      <Button kind="plain" onClick={() => choosePromotion(null)}>
        {en.table.cancel}
      </Button>
    </div>
  </div>
);

// -----------------------------------------------------------------------------
// Cutscene caption
// -----------------------------------------------------------------------------
const Caption = ({ session }: { session: Session }) => {
  const ref = useRef<HTMLDivElement>(null);
  const last = session.game.history[session.game.history.length - 1];
  const { scene } = session;
  useLayoutEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;
    gsap.fromTo(
      ref.current,
      { y: 14, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.3, ease: "power2.out" }
    );
  }, [scene]);
  useEffect(() => {
    if (scene === "none") return undefined;
    const onKey = () => skipScene();
    const onPointer = (event: PointerEvent) => {
      if (event.target instanceof HTMLCanvasElement) skipScene();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [scene]);
  if (scene === "none" || !last) return null;
  const attacker = en.table.roles[last.role];
  const victim = last.captured ? en.table.roles[last.captured.role] : "";
  return (
    <>
      <div className="letterbox letterbox-top" aria-hidden="true" />
      <div className="letterbox letterbox-bottom" aria-hidden="true" />
      <div className="caption" ref={ref}>
        <p>{en.scenes[scene](attacker, victim)}</p>
        <Button kind="plain" icon={<SkipIcon />} onClick={skipScene}>
          {en.table.skip}
        </Button>
      </div>
    </>
  );
};

// -----------------------------------------------------------------------------
// Coach
// -----------------------------------------------------------------------------
const Coach = ({ session }: { session: Session }) => {
  const { lesson, phase, stepIndex, coachLine } = session;
  if (!lesson) return null;
  const isLast = stepIndex + 1 >= lesson.steps.length;
  return (
    <Stack as="section" className="coach" gap="tight" aria-live="polite">
      <span className="coach-kicker">
        {en.coach.kicker} ·{" "}
        {en.coach.stepOf(
          Math.min(stepIndex + 1, lesson.steps.length),
          lesson.steps.length
        )}
      </span>
      <h2 className="coach-title">{lesson.title}</h2>
      <p
        className={
          phase === "coach-wrong" ? "coach-line is-wrong" : "coach-line"
        }
      >
        {coachLine}
      </p>
      {phase === "coach-right" ? (
        <Button kind="primary" onClick={() => void lessonNext()}>
          {isLast ? en.coach.finish : en.coach.next}
        </Button>
      ) : null}
      {phase === "coach-wrong" ? (
        <Button kind="primary" icon={<TakeBackIcon />} onClick={lessonRetry}>
          {en.coach.retry}
        </Button>
      ) : null}
      {phase === "coach-done" ? (
        <Stack direction="row" gap="tight" wrap>
          <Button kind="primary" onClick={lessonPlayOut}>
            {en.coach.playOut}
          </Button>
          <ButtonLink to="/study">{en.coach.allLessons}</ButtonLink>
        </Stack>
      ) : null}
    </Stack>
  );
};

// -----------------------------------------------------------------------------
// Result slip with the evaluation line
// -----------------------------------------------------------------------------
const CHART = { width: 300, height: 76, cap: 600 };

const EvalChart = ({ session }: { session: Session }) => {
  const evals = session.evals.flatMap((value, ply) =>
    typeof value === "number" ? [{ value, ply }] : []
  );
  if (evals.length < 2) return null;
  const last = session.game.history.length - 1;
  const x = (ply: number) => (ply / Math.max(1, last)) * CHART.width;
  const y = (value: number) =>
    CHART.height / 2 -
    (Math.max(-CHART.cap, Math.min(CHART.cap, value)) / CHART.cap) *
      (CHART.height / 2 - 3);
  const line = evals
    .map(({ value, ply }) => `${x(ply).toFixed(1)},${y(value).toFixed(1)}`)
    .join(" ");
  const swings = evals.slice(1).map((entry, i) => ({
    ...entry,
    swing: Math.abs(entry.value - evals[i].value)
  }));
  const biggest = swings.reduce(
    (best, entry) => (entry.swing > best.swing ? entry : best),
    swings[0]
  );
  const flat = biggest.swing < 120;
  const facts = session.game.history[biggest.ply];
  const moveLabel = facts
    ? `${Math.floor(biggest.ply / 2) + 1}${
        facts.color === "white" ? "." : "…"
      } ${facts.san}`
    : "";
  const summary = flat
    ? en.result.chartFlat
    : en.result.chartSummary(moveLabel);
  return (
    <figure className="eval">
      <figcaption>{en.result.chartTitle}</figcaption>
      <svg
        viewBox={`0 0 ${CHART.width} ${CHART.height}`}
        role="img"
        aria-label={summary}
      >
        <line
          className="eval-zero"
          x1="0"
          x2={CHART.width}
          y1={CHART.height / 2}
          y2={CHART.height / 2}
        />
        <polyline className="eval-line" points={line} />
        {flat ? null : (
          <circle
            className="eval-mark"
            cx={x(biggest.ply)}
            cy={y(biggest.value)}
            r="3.5"
          />
        )}
      </svg>
      <p className="note">{summary}</p>
    </figure>
  );
};

const RematchLink = ({ session }: { session: Session }) =>
  session.mode === "casual" && session.opponent ? (
    <ButtonLink
      kind="primary"
      to="/casual/$opponentId"
      params={{ opponentId: session.opponent.id }}
      search={{ side: opposite(session.you), style: "shuffle" }}
    >
      {en.result.rematch}
    </ButtonLink>
  ) : (
    <Button kind="primary" onClick={rematch}>
      {en.result.rematch}
    </Button>
  );

const ResultSlip = ({ session }: { session: Session }) => {
  const { outcome, ending, mode, opponent, promoted } = session;
  const rung = useStore((state) => state.profile.rung);
  const points = useStore((state) => state.profile.points);
  if (!ending || !outcome) return null;
  const heading = en.result[outcome];
  const quote = opponent
    ? outcome === "won"
      ? opponent.onLoss
      : outcome === "lost"
        ? opponent.onWin
        : null
    : null;
  return (
    <Stack as="section" className="result" gap="line" aria-live="polite">
      <h2 className="result-title">{heading}</h2>
      <p className="result-how">{en.result.how[ending.kind]}</p>
      {quote && opponent ? (
        <blockquote className="result-quote">
          “{quote}”<cite>{opponent.name}</cite>
        </blockquote>
      ) : null}
      {mode === "climb" && promoted ? (
        <p className="result-rank">
          {rung >= 8 ? en.result.promotedAll : en.result.advanced(rung + 1)}
        </p>
      ) : null}
      {mode === "climb" && !promoted && points > 0 ? (
        <p className="note">{en.result.halfNote}</p>
      ) : null}
      <EvalChart session={session} />
      <Stack direction="row" gap="tight" wrap>
        {mode === "climb" && promoted && rung < 8 ? (
          <Button kind="primary" onClick={startClimb}>
            {en.result.nextOpponent}
          </Button>
        ) : (
          <RematchLink session={session} />
        )}
        <ButtonLink to="/">{en.result.ladder}</ButtonLink>
      </Stack>
    </Stack>
  );
};

// -----------------------------------------------------------------------------
// Test panel, shown only while the ?cheat= parameter is in use
// -----------------------------------------------------------------------------
const CheatPanel = ({ session }: { session: Session }) => {
  const over = session.phase === "over" || session.ending !== null;
  return (
    <Stack
      as="section"
      className="cheat-panel"
      gap="hair"
      aria-label={en.cheats.panel}
    >
      <span className="coach-kicker">{en.cheats.panel}</span>
      <Stack direction="row" gap="hair" wrap>
        <Button
          disabled={session.phase !== "yours"}
          onClick={() => void cheatBestMove()}
        >
          {en.cheats.best}
        </Button>
        <Button disabled={over} onClick={() => cheatEnd("win")}>
          {en.cheats.win}
        </Button>
        <Button disabled={over} onClick={() => cheatEnd("lose")}>
          {en.cheats.lose}
        </Button>
        <Button disabled={over} onClick={() => cheatEnd("draw")}>
          {en.cheats.draw}
        </Button>
      </Stack>
    </Stack>
  );
};

// -----------------------------------------------------------------------------
// The table
// -----------------------------------------------------------------------------
const statusLine = (session: Session): string => {
  if (session.hintPending) return en.table.findingHint;
  if (session.phase === "yours")
    return session.game.history.length
      ? en.table.yourMove
      : en.table.openingMove;
  return "";
};

const clockFor = (session: Session, side: Side): number | null =>
  session.clocks?.[side] ?? null;

// -----------------------------------------------------------------------------
// Keeping the board clear of whatever is on screen
// -----------------------------------------------------------------------------
const useTableInsets = (
  card: RefObject<HTMLElement | null>,
  hasCard: boolean
): void => {
  useEffect(() => {
    const measure = () => {
      const narrow = window.innerWidth < config.layout.narrow;
      const height = card.current?.getBoundingClientRect().height ?? 0;
      const width = card.current?.getBoundingClientRect().width ?? 0;
      const roomy = window.innerWidth >= config.layout.roomy;
      stageHandle.current?.setInsets({
        top: narrow ? config.layout.phoneTop : 0,
        bottom: narrow ? config.layout.phoneBottom + (hasCard ? height : 0) : 0,
        left: !narrow && hasCard && !roomy ? width + config.layout.cardGap : 0,
        right: 0
      });
    };
    measure();
    const retry = setInterval(measure, 500);
    window.addEventListener("resize", measure);
    return () => {
      clearInterval(retry);
      window.removeEventListener("resize", measure);
    };
  }, [card, hasCard]);
};

// -----------------------------------------------------------------------------
// The table: the board fills the room, and everything else keeps to the edges
// -----------------------------------------------------------------------------
type Panel = "scoresheet" | "style" | "resign" | null;

const lastMoveText = (history: MoveFacts[]): string => {
  const last = history[history.length - 1];
  if (!last) return "";
  const number = Math.ceil(history.length / 2);
  return last.color === "white"
    ? `${number}. ${last.san}`
    : `${number}… ${last.san}`;
};

export const TableView = () => {
  const session = useStore((state) => state.session);
  // A route starts its game just after mounting, and the table needs that game to draw.
  return session ? <Table session={session} /> : null;
};

const Table = ({ session }: { session: Session }) => {
  const engine = useStore((state) => state.engine);
  const stageBusy = useStore((state) => state.stage.busy);
  const [panel, setPanel] = useState<Panel>(null);
  const card = useRef<HTMLElement>(null);
  const { opponent, you, game, phase, mode, rules } = session;
  const them: Side = you === "white" ? "black" : "white";
  const turn = turnOf(game);
  const inScene = session.scene !== "none";
  const playing = mode !== "lesson" && phase !== "over" && !session.ending;
  const hasCard = mode === "lesson" || phase === "over";
  useTableInsets(card, hasCard);
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setPanel(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const toggle = (next: Panel) => setPanel(panel === next ? null : next);
  const percent = engine.total
    ? Math.round((engine.loaded / engine.total) * 100)
    : 0;
  const engineLine =
    engine.state === "loading" && percent < 100
      ? en.loading.engine(percent)
      : "";
  const theirLine =
    engineLine ||
    (phase === "thinking" && opponent
      ? en.table.thinking(opponent.name.split(" ")[0])
      : game.history.length === 0 && opponent
        ? `“${opponent.greeting}”`
        : "");
  const theyTook = takenBy(game.history, them);
  const youTook = takenBy(game.history, you);
  const lead = worth(youTook) - worth(theyTook);

  return (
    <>
      <div className={inScene ? "perimeter is-scene" : "perimeter"}>
        {opponent ? (
          <Plate
            place="corner-top-left"
            name={opponent.name}
            detail={`${opponent.title} · ${opponent.rating}`}
            role={opponent.figure}
            seconds={clockFor(session, them)}
            active={turn === them && phase !== "over"}
            line={theirLine}
            taken={theyTook}
            lead={-lead}
          />
        ) : null}
        {opponent ? (
          <Plate
            place="corner-bottom-left"
            name={en.table.you}
            detail={session.world.name}
            role="king"
            seconds={clockFor(session, you)}
            active={turn === you && phase !== "over"}
            line={statusLine(session)}
            taken={youTook}
            lead={lead}
          />
        ) : null}
        {hasCard ? (
          <Stack
            as="section"
            ref={card}
            className="side-card"
            gap="line"
            pad="block"
          >
            {session.coachThinking ? (
              <p className="seat-line" role="status">
                {en.table.coachThinking}
              </p>
            ) : null}
            {phase === "over" ? <ResultSlip session={session} /> : null}
            <Coach session={session} />
          </Stack>
        ) : null}
        <nav className="rail" aria-label={en.table.scoresheet}>
          {mode !== "lesson" ? (
            <Button
              icon={<ScoresheetIcon />}
              label={en.table.scoresheet}
              onClick={() => toggle("scoresheet")}
            />
          ) : null}
          <Button
            icon={<StyleIcon />}
            label={en.table.style}
            disabled={stageBusy}
            onClick={() => toggle("style")}
          />
          {playing && rules.hints ? (
            <Button
              icon={<HintIcon />}
              label={en.table.hint}
              disabled={phase !== "yours" || session.hintPending}
              onClick={() => void askHint()}
            />
          ) : null}
          {playing && rules.takebacks ? (
            <Button
              icon={<TakeBackIcon />}
              label={en.table.takeBack}
              disabled={phase !== "yours" || game.history.length < 2}
              onClick={takeBack}
            />
          ) : null}
          {playing ? (
            <Button
              icon={<ResignIcon />}
              label={en.table.resign}
              onClick={() => toggle("resign")}
            />
          ) : null}
          {mode === "lesson" ? (
            <ButtonLink
              icon={<BackIcon />}
              to="/study"
              aria-label={en.table.leave}
              title={en.table.leave}
            />
          ) : null}
        </nav>
        {panel === "scoresheet" ? (
          <Stack
            as="aside"
            className="drawer"
            gap="line"
            pad="line"
            aria-label={en.table.scoresheet}
          >
            <h2 className="section-title">{en.table.scoresheet}</h2>
            <Scoresheet history={game.history} />
            {playing ? <TypedMove session={session} /> : null}
          </Stack>
        ) : null}
        {panel === "style" ? (
          <Stack
            as="aside"
            className="drawer"
            gap="line"
            pad="line"
            aria-label={en.table.style}
          >
            <h2 className="section-title">{en.table.style}</h2>
            <p className="note">{en.table.styleNote}</p>
            <StylePicker value={session.world.id} onChange={updateGameStyle} />
          </Stack>
        ) : null}
        <div className="corner corner-bottom-right edge-notes">
          {engine.state === "failed" ? (
            <Stack gap="hair" align="flex-end">
              <p className="note note-alert" role="alert">
                {en.loading.engineFailed}
              </p>
              <Button onClick={retryEngine}>{en.errors.retry}</Button>
            </Stack>
          ) : null}
          {cheats.active ? <CheatPanel session={session} /> : null}
          {mode !== "lesson" && game.history.length ? (
            <button
              type="button"
              className="last-move"
              onClick={() => toggle("scoresheet")}
            >
              {lastMoveText(game.history)}
            </button>
          ) : null}
        </div>
      </div>
      {panel === "resign" && playing ? (
        <div className="dialog-scrim">
          <div className="dialog" role="dialog" aria-label={en.table.resign}>
            <h2 className="dialog-title">{en.table.resignConfirm}</h2>
            <p className="note">{en.table.resignNote}</p>
            <Stack gap="tight">
              <Button
                kind="primary"
                onClick={() => {
                  setPanel(null);
                  resign();
                }}
              >
                {en.table.resign}
              </Button>
              <Button onClick={() => setPanel(null)}>
                {en.table.keepPlaying}
              </Button>
            </Stack>
          </div>
        </div>
      ) : null}
      {phase === "promoting" ? <PromotionChoice /> : null}
      {inScene ? <Caption session={session} /> : null}
      <KeyboardBoard session={session} />
      <p className="visually-hidden" aria-live="polite">
        {session.announcement}
      </p>
    </>
  );
};
