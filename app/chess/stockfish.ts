/*!
 * Chess
 * Copyright (c) Cliff Pyles
 * Released under the MIT License: https://opensource.org/license/mit
 * Original: https://codepen.io/editor/cliffpyles/pen/01a19e25-e438-75a3-a372-c9c67de14514
 */

// Intended use: the computer's mind: starts Stockfish once in a worker, keeps its large file in local storage, and answers move, hint and evaluation requests one at a time.
import { config } from "../config.js";
import type { EnginePlay } from "../schemas.js";
import { cachedBlob, resolveImport } from "../lib/utils.js";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
export type Line = { uci: string; cp: number; mate: number | null };
export type Position = { fen: string; moves: string[]; chess960: boolean };
type Listener = (line: string) => void;

// -----------------------------------------------------------------------------
// Worker startup
// -----------------------------------------------------------------------------
const listeners = new Set<Listener>();
let booting: Promise<Worker> | null = null;
let queue: Promise<unknown> = Promise.resolve();

const waitFor = (
  worker: Worker,
  command: string | null,
  done: (line: string) => boolean
): Promise<string[]> =>
  new Promise((resolve) => {
    const lines: string[] = [];
    const listener: Listener = (line) => {
      lines.push(line);
      if (done(line)) {
        listeners.delete(listener);
        resolve(lines);
      }
    };
    listeners.add(listener);
    if (command) worker.postMessage(command);
  });

const boot = async (
  onProgress: (loaded: number, total: number) => void
): Promise<Worker> => {
  const wasmUrl = resolveImport(config.engine.wasm);
  const scriptUrl = `${resolveImport(config.engine.script)}?raw`;
  const [wasm, script] = await Promise.all([
    cachedBlob(wasmUrl, onProgress),
    cachedBlob(scriptUrl)
  ]);
  const wasmLocal = URL.createObjectURL(
    new Blob([wasm], { type: "application/wasm" })
  );
  const scriptLocal = URL.createObjectURL(
    new Blob([script], { type: "text/javascript" })
  );
  const worker = new Worker(`${scriptLocal}#${encodeURIComponent(wasmLocal)}`);
  worker.onmessage = (event: MessageEvent<string>) =>
    [...listeners].forEach((listener) => listener(String(event.data)));
  await waitFor(worker, "uci", (line) => line === "uciok");
  worker.postMessage(`setoption name Hash value ${config.engine.hashMb}`);
  await waitFor(worker, "isready", (line) => line === "readyok");
  return worker;
};

export const startEngine = (
  onProgress: (loaded: number, total: number) => void = () => undefined
): Promise<Worker> => {
  booting ??= boot(onProgress).catch((error: unknown) => {
    booting = null;
    throw error;
  });
  return booting;
};

const inTurn = <T>(task: (worker: Worker) => Promise<T>): Promise<T> => {
  const run = queue.then(async () => task(await startEngine()));
  queue = run.catch(() => undefined);
  return run;
};

// -----------------------------------------------------------------------------
// Searching
// -----------------------------------------------------------------------------
const positionCommand = ({ fen, moves }: Position): string =>
  `position fen ${fen}${moves.length ? ` moves ${moves.join(" ")}` : ""}`;

const prepare = async (
  worker: Worker,
  position: Position,
  strength: string[],
  lines: number
): Promise<void> => {
  [
    `setoption name UCI_Chess960 value ${position.chess960}`,
    `setoption name MultiPV value ${lines}`,
    ...strength,
    positionCommand(position)
  ].forEach((command) => worker.postMessage(command));
  await waitFor(worker, "isready", (line) => line === "readyok");
};

const parseLines = (output: string[]): Line[] => {
  const best = new Map<number, Line>();
  output.forEach((line) => {
    const found = line.match(
      / multipv (\d+) .*score (cp|mate) (-?\d+).* pv (\S+)/
    );
    if (!found) return;
    const isMate = found[2] === "mate";
    const value = Number(found[3]);
    const cp = isMate
      ? Math.sign(value || -1) * (config.engine.mateScore - Math.abs(value))
      : value;
    best.set(Number(found[1]), {
      uci: found[4],
      cp,
      mate: isMate ? value : null
    });
  });
  return [...best.entries()].sort(([a], [b]) => a - b).map(([, line]) => line);
};

const search = async (
  worker: Worker,
  go: string
): Promise<{ lines: Line[]; best: string }> => {
  const output = await waitFor(worker, go, (line) =>
    line.startsWith("bestmove")
  );
  return {
    lines: parseLines(output),
    best: output[output.length - 1].split(" ")[1]
  };
};

const FULL_STRENGTH = [
  "setoption name UCI_LimitStrength value false",
  "setoption name Skill Level value 20"
];

// -----------------------------------------------------------------------------
// Human-feeling mistakes for the lowest ranks
// -----------------------------------------------------------------------------
const chooseHumanly = (
  lines: Line[],
  best: string,
  temper: number,
  blunder: number,
  aggression: number
): string => {
  if (!lines.length) return best;
  if (Math.random() < blunder) return lines[lines.length - 1].uci;
  const top = lines[0].cp;
  const weights = lines.map((line, index) => {
    const loss =
      Math.max(0, top - line.cp) - (index % 2 === 1 ? aggression * 0.2 : 0);
    return Math.exp(-loss / Math.max(temper, 1));
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const roll = Math.random() * total;
  const chosen = weights.reduce<{ at: number; index: number }>(
    (state, weight, index) =>
      state.at > 0 ? { at: state.at - weight, index } : state,
    { at: roll, index: 0 }
  );
  return lines[chosen.index].uci;
};

// -----------------------------------------------------------------------------
// Public requests
// -----------------------------------------------------------------------------
export const chooseMove = (
  position: Position,
  play: EnginePlay
): Promise<string> =>
  inTurn(async (worker) => {
    if (play.kind === "human") {
      await prepare(worker, position, FULL_STRENGTH, play.lines);
      const { lines, best } = await search(worker, `go depth ${play.depth}`);
      return chooseHumanly(
        lines,
        best,
        play.temper,
        play.blunder,
        play.aggression
      );
    }
    if (play.kind === "elo") {
      const limit = [
        "setoption name UCI_LimitStrength value true",
        `setoption name UCI_Elo value ${play.elo}`
      ];
      await prepare(worker, position, limit, 1);
      return (await search(worker, `go movetime ${play.movetime}`)).best;
    }
    await prepare(worker, position, FULL_STRENGTH, 1);
    return (await search(worker, `go movetime ${play.movetime}`)).best;
  });

export const evaluate = (
  position: Position,
  movetime: number
): Promise<Line | null> =>
  inTurn(async (worker) => {
    await prepare(worker, position, FULL_STRENGTH, 1);
    const { lines } = await search(worker, `go movetime ${movetime}`);
    return lines[0] ?? null;
  });
