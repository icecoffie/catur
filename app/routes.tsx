/*!
 * Chess
 * Copyright (c) Cliff Pyles
 * Released under the MIT License: https://opensource.org/license/mit
 * Original: https://codepen.io/editor/cliffpyles/pen/01a19e25-e438-75a3-a372-c9c67de14514
 */

// Intended use: every URL in the game, as a TanStack Router tree on hash history. Table routes start their game on arrival and end it on leaving, and every link keeps the cheat parameter.
import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  retainSearchParams
} from "@tanstack/react-router";
import { useEffect } from "react";
import { ButtonLink } from "./components/controls.js";
import { en } from "./locales/en.js";
import { casualSearchSchema, rootSearchSchema } from "./schemas.js";
import {
  leaveTable,
  startCasual,
  startClimb,
  startLesson,
  useStore
} from "./state/store.js";
import { Failure } from "./views/failure.js";
import { LadderView } from "./views/ladder.js";
import { SettingsView } from "./views/settings.js";
import { SetupView } from "./views/setup.js";
import { Shell } from "./views/shell.js";
import { StudyView } from "./views/study.js";
import { TableView } from "./views/table.js";

// -----------------------------------------------------------------------------
// Shared pieces
// -----------------------------------------------------------------------------
const NoSuchTable = () => (
  <div className="sheet failure" role="alert">
    <h1>{en.routes.lost}</h1>
    <p className="note">{en.routes.lostNote}</p>
    <ButtonLink kind="primary" to="/">
      {en.routes.home}
    </ButtonLink>
  </div>
);

const useLeaveOnExit = (): void => {
  useEffect(() => leaveTable, []);
};

// -----------------------------------------------------------------------------
// Tables: routes that start a game
// -----------------------------------------------------------------------------
const ClimbTable = () => {
  useEffect(() => startClimb(), []);
  useLeaveOnExit();
  return <TableView />;
};

const CasualTable = () => {
  const { opponentId } = casualRoute.useParams();
  const { side, style } = casualRoute.useSearch();
  const opponent = useStore((state) =>
    state.opponents.find((entry) => entry.id === opponentId)
  );
  useEffect(() => {
    if (opponent) startCasual(opponent, side, style);
  }, [opponent, side, style]);
  useLeaveOnExit();
  return opponent ? <TableView /> : <NoSuchTable />;
};

const LessonTable = () => {
  const { lessonId } = lessonRoute.useParams();
  const lesson = useStore((state) =>
    state.lessons.find((entry) => entry.id === lessonId)
  );
  useEffect(() => {
    if (lesson) startLesson(lesson);
  }, [lesson]);
  useLeaveOnExit();
  return lesson ? <TableView /> : <NoSuchTable />;
};

// -----------------------------------------------------------------------------
// Route tree
// -----------------------------------------------------------------------------
const rootRoute = createRootRoute({
  component: Shell,
  validateSearch: rootSearchSchema,
  search: { middlewares: [retainSearchParams(["cheat"])] },
  notFoundComponent: NoSuchTable
});

const ladderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LadderView
});
const climbRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/climb",
  component: ClimbTable
});
const setupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/casual",
  component: SetupView
});
const casualRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/casual/$opponentId",
  validateSearch: casualSearchSchema,
  component: CasualTable
});
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsView
});
const studyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/study",
  component: StudyView
});
const lessonRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/study/$lessonId",
  component: LessonTable
});

export const router = createRouter({
  routeTree: rootRoute.addChildren([
    ladderRoute,
    climbRoute,
    setupRoute,
    casualRoute,
    settingsRoute,
    studyRoute,
    lessonRoute
  ]),
  // CodePen serves a pen from one fixed path, so a path-based route would 404 on reload.
  history: createHashHistory(),
  defaultErrorComponent: ({ error, reset }) => (
    <Failure
      error={error instanceof Error ? error : new Error(String(error))}
      reset={reset}
    />
  )
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
