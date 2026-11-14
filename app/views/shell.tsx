/*!
 * Chess
 * Copyright (c) Cliff Pyles
 * Released under the MIT License: https://opensource.org/license/mit
 * Original: https://codepen.io/editor/cliffpyles/pen/01a19e25-e438-75a3-a372-c9c67de14514
 */

// Intended use: composes the canvas and whichever view is open, loads the catalog, and applies the current world's palette to the interface.
import { useSuspenseQuery } from "@tanstack/react-query";
import { Outlet } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { lessonsQuery, opponentsQuery, worldsQuery } from "../api/queries.js";
import { en } from "../locales/en.js";
import { BoardCanvas, stageHandle } from "../scene/board-canvas.js";
import { cheats } from "../state/cheats.js";
import {
  homeWorld,
  setCatalog,
  useStore,
  warmEngine,
  worldById
} from "../state/store.js";

// -----------------------------------------------------------------------------
// Telling the camera how much of the screen the interface covers
// -----------------------------------------------------------------------------
export const useBoardInset = (
  ref: RefObject<HTMLElement | null>,
  side: "left" | "right" | "bottom"
): void => {
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const measure = () => {
      const narrow = window.innerWidth < 860;
      const box = element.getBoundingClientRect();
      const insets = { left: 0, right: 0, bottom: 0, top: 0 };
      if (narrow)
        insets.bottom = Math.min(box.height + 12, window.innerHeight * 0.5);
      else insets[side === "bottom" ? "right" : side] = box.width + 24;
      stageHandle.current?.setInsets(insets);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    const retry = setInterval(measure, 600);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      clearInterval(retry);
      window.removeEventListener("resize", measure);
    };
  }, [ref, side]);
};

// -----------------------------------------------------------------------------
// The veil over the board while a scene is prepared
// -----------------------------------------------------------------------------
const BoardVeil = () => {
  const { busy, label, done, total } = useStore((state) => state.stage);
  const worlds = useStore((state) => state.worlds);
  const percent = total ? Math.round((done / total) * 100) : 0;
  // The words stay put while the veil fades away, rather than flicking back to the default.
  const lastLabel = useRef("");
  if (label) lastLabel.current = label;
  const world = worlds.find((entry) => entry.name === lastLabel.current);
  const text = lastLabel.current
    ? en.loading.preparing(lastLabel.current)
    : en.loading.board;
  return (
    <div className={busy ? "veil is-up" : "veil"} aria-hidden={!busy}>
      <div className="veil-card" role="status" aria-busy={busy}>
        <p className="veil-title">{lastLabel.current || en.pageTitle}</p>
        {world ? <p className="veil-tagline">{world.tagline}</p> : null}
        <div
          className={total ? "veil-track" : "veil-track is-waiting"}
          role="progressbar"
          aria-label={text}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={total ? percent : undefined}
        >
          <span
            className="veil-fill"
            style={{ transform: `scaleX(${percent / 100})` }}
          />
        </div>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// Cheat notice
// -----------------------------------------------------------------------------
const CheatNotice = () => {
  const worlds = useStore((state) => state.worlds);
  if (!cheats.active) return null;
  const unknown =
    cheats.style && !worlds.some((world) => world.id === cheats.style)
      ? [`style:${cheats.style}`]
      : [];
  const rejected = [...cheats.rejected, ...unknown];
  return (
    <p className="cheat-notice" role="status">
      {en.cheats.notice(cheats.labels.join(", "))}
      {rejected.length ? (
        <strong>{en.cheats.rejected(rejected.join(", "))}</strong>
      ) : null}
    </p>
  );
};

// -----------------------------------------------------------------------------
// Shell
// -----------------------------------------------------------------------------
export const Shell = () => {
  const { data: worlds } = useSuspenseQuery(worldsQuery);
  const { data: opponents } = useSuspenseQuery(opponentsQuery);
  const { data: lessons } = useSuspenseQuery(lessonsQuery);
  setCatalog(worlds, opponents, lessons);

  const sessionWorld = useStore((state) => state.session?.world.id ?? null);
  // Reading the profile keeps the palette in step when the rank or a pinned style changes.
  useStore((state) => state.profile);
  const worldId = sessionWorld ?? homeWorld().id;

  useLayoutEffect(() => {
    const { palette } = worldById(worldId);
    const root = document.documentElement;
    Object.entries(palette).forEach(([name, value]) =>
      root.style.setProperty(`--world-${name}`, value)
    );
    root.style.colorScheme = worldId === "ink-garden" ? "light" : "dark";
  }, [worldId]);

  useEffect(() => warmEngine(), []);

  return (
    <>
      <BoardCanvas />
      <div className="vignette" aria-hidden="true" />
      <BoardVeil />
      <Outlet />
      <CheatNotice />
    </>
  );
};
