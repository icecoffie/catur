/*!
 * Chess
 * Copyright (c) Cliff Pyles
 * Released under the MIT License: https://opensource.org/license/mit
 * Original: https://codepen.io/editor/cliffpyles/pen/01a19e25-e438-75a3-a372-c9c67de14514
 */

// Intended use: Strings, the shape of all user-facing text, so a missing label fails at compile time.
import type { CutsceneKind } from "../chess/events.js";
import type { Ending, Role } from "../chess/game.js";
import type { Rules, Settings } from "../schemas.js";

export type Strings = {
  pageTitle: string;
  loading: {
    preparing: (place: string) => string;
    board: string;
    engine: (percent: number) => string;
    engineFirst: string;
    engineReady: string;
    engineFailed: string;
  };
  controls: {
    previous: (label: string) => string;
    next: (label: string) => string;
  };
  errors: { title: string; retry: string };
  ladder: {
    heading: string;
    rankWord: string;
    rankOf: (rank: number) => string;
    casualWith: (name: string) => string;
    challenge: (name: string) => string;
    promoted: string;
    championLine: string;
    casual: string;
    study: string;
    settings: string;
    halfPoint: string;
    beaten: string;
    next: string;
    ahead: string;
  };
  setup: {
    heading: string;
    opponent: string;
    side: string;
    sides: Record<"white" | "lots" | "black", string>;
    style: string;
    shuffle: string;
    start: string;
    back: string;
  };
  style: {
    heading: string;
    note: string;
    match: string;
    pick: string;
  };
  rules: {
    heading: string;
    start: { label: string; options: Record<Rules["start"], string> };
    odds: { label: string; options: Record<Rules["odds"], string> };
    clock: { label: string; none: string };
    takebacks: string;
    hints: string;
    repetition: { label: string; options: Record<Rules["repetition"], string> };
    moveLimit: { label: string; options: Record<Rules["moveLimit"], string> };
    promotion: { label: string; options: Record<Rules["promotion"], string> };
    climbNote: string;
  };
  settings: {
    heading: string;
    cutscenes: {
      label: string;
      note: string;
      options: Record<Settings["cutscenes"], string>;
    };
    coordinates: string;
    moveHints: string;
    progress: string;
    reset: string;
    resetConfirm: string;
    resetCancel: string;
    resetDone: string;
    on: string;
    off: string;
  };
  study: {
    heading: string;
    intro: string;
    done: string;
    progress: (done: number, total: number) => string;
    moves: (count: number) => string;
  };
  table: {
    you: string;
    thinking: (name: string) => string;
    taken: string;
    yourMove: string;
    openingMove: string;
    scoresheet: string;
    noMoves: string;
    hint: string;
    takeBack: string;
    resign: string;
    style: string;
    styleNote: string;
    findingHint: string;
    coachThinking: string;
    resignConfirm: string;
    resignNote: string;
    keepPlaying: string;
    leave: string;
    typeMove: string;
    typePlaceholder: string;
    typeRejected: (text: string) => string;
    skip: string;
    promote: string;
    cancel: string;
    boardLabel: string;
    empty: string;
    pieceName: (color: string, role: Role) => string;
    roles: Record<Role, string>;
  };
  coach: {
    kicker: string;
    next: string;
    finish: string;
    retry: string;
    playOut: string;
    allLessons: string;
    stepOf: (step: number, total: number) => string;
  };
  routes: { lost: string; lostNote: string; home: string };
  cheats: {
    notice: (labels: string) => string;
    rejected: (tokens: string) => string;
    panel: string;
    best: string;
    win: string;
    lose: string;
    draw: string;
  };
  scenes: Record<
    Exclude<CutsceneKind, "none">,
    (attacker: string, victim: string) => string
  >;
  result: {
    won: string;
    lost: string;
    drawn: string;
    how: Record<Ending["kind"], string>;
    advanced: (rank: number) => string;
    promotedAll: string;
    halfNote: string;
    nextOpponent: string;
    rematch: string;
    ladder: string;
    another: string;
    chartTitle: string;
    chartSummary: (turn: string) => string;
    chartFlat: string;
    white: string;
    black: string;
  };
};
