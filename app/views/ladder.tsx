/*!
 * Chess
 * Copyright (c) Cliff Pyles
 * Released under the MIT License: https://opensource.org/license/mit
 * Original: https://codepen.io/editor/cliffpyles/pen/01a19e25-e438-75a3-a372-c9c67de14514
 */

// Intended use: the home view: the opponent you face next as the hero of the screen, the eight ranks as a track along the bottom edge, and the ways out at the top.
import { useRef, useState } from "react";
import { ButtonLink } from "../components/controls.js";
import {
  CasualIcon,
  CheckMarkIcon,
  PieceIcon,
  SettingsIcon,
  StudyIcon
} from "../components/icons.js";
import { en } from "../locales/en.js";
import { useStore } from "../state/store.js";
import { useBoardInset } from "./shell.js";

const EngineLine = () => {
  const engine = useStore((state) => state.engine);
  if (engine.state === "failed")
    return (
      <p className="note note-alert" role="status">
        {en.loading.engineFailed}
      </p>
    );
  if (engine.state !== "loading") return null;
  const percent = engine.total
    ? Math.round((engine.loaded / engine.total) * 100)
    : 0;
  return (
    <p className="note" role="status">
      {percent ? en.loading.engine(percent) : en.loading.engineFirst}
    </p>
  );
};

export const LadderView = () => {
  const opponents = useStore((state) => state.opponents);
  const worlds = useStore((state) => state.worlds);
  const { rung, points } = useStore((state) => state.profile);
  const [picked, setPicked] = useState<number | null>(null);
  const ref = useRef<HTMLElement>(null);
  useBoardInset(ref, "left");
  const shownIndex = picked ?? Math.min(rung, opponents.length - 1);
  const shown = opponents[shownIndex];
  const isNext = shownIndex === rung;
  const place = worlds.find((world) => world.id === shown.world);

  return (
    <>
      <nav className="top-nav" aria-label={en.ladder.heading}>
        <ButtonLink kind="plain" icon={<CasualIcon />} to="/casual">
          {en.ladder.casual}
        </ButtonLink>
        <ButtonLink kind="plain" icon={<StudyIcon />} to="/study">
          {en.ladder.study}
        </ButtonLink>
        <ButtonLink kind="plain" icon={<SettingsIcon />} to="/settings">
          {en.ladder.settings}
        </ButtonLink>
      </nav>
      <main className="hero" ref={ref}>
        {rung >= opponents.length && picked === null ? (
          <div className="hero-body" key="champion">
            <p className="kicker">{en.ladder.heading}</p>
            <h1 className="hero-name">{en.ladder.promoted}</h1>
            <p className="hero-style">{en.ladder.championLine}</p>
          </div>
        ) : (
          <div className="hero-body" key={shown.id}>
            <p className="kicker">{en.ladder.rankOf(shownIndex + 1)}</p>
            <h1 className="hero-name">{shown.name}</h1>
            <p className="hero-title">
              {shown.title}
              <span className="hero-rating">{shown.rating}</span>
            </p>
            <p className="hero-style">{shown.style}</p>
            {place ? <p className="hero-place">{place.name}</p> : null}
            {isNext ? (
              <ButtonLink kind="primary" to="/climb">
                {en.ladder.challenge(shown.name.split(" ")[0])}
              </ButtonLink>
            ) : (
              <ButtonLink
                kind="primary"
                to="/casual/$opponentId"
                params={{ opponentId: shown.id }}
                search={{ side: "lots", style: shown.world }}
              >
                {en.ladder.casualWith(shown.name.split(" ")[0])}
              </ButtonLink>
            )}
            {isNext && points > 0 ? (
              <p className="note">{en.ladder.halfPoint}</p>
            ) : null}
            <EngineLine />
          </div>
        )}
      </main>
      <ol className="rank-track" aria-label={en.ladder.heading}>
        {opponents.map((opponent, index) => {
          const state =
            index < rung ? "beaten" : index === rung ? "next" : "ahead";
          return (
            <li
              key={opponent.id}
              className={`rank-stop rank-${state}${index === shownIndex ? " is-shown" : ""}`}
              aria-current={state === "next" ? "step" : undefined}
            >
              <button
                type="button"
                onClick={() => setPicked(index === rung ? null : index)}
              >
                <span className="rank-medal">
                  {state === "beaten" ? (
                    <CheckMarkIcon />
                  ) : (
                    <PieceIcon role={opponent.figure} />
                  )}
                </span>
                <span className="rank-number">{index + 1}</span>
                <span className="rank-name">
                  {opponent.name.split(" ").slice(-1)[0]}
                </span>
                <span className="visually-hidden">
                  {en.ladder[state === "beaten" ? "beaten" : state]}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </>
  );
};
