/*!
 * Chess
 * Copyright (c) Cliff Pyles
 * Released under the MIT License: https://opensource.org/license/mit
 * Original: https://codepen.io/editor/cliffpyles/pen/01a19e25-e438-75a3-a372-c9c67de14514
 */

// Intended use: the casual game setup: who you face, which side you take, the style, and the house rules tucked away until wanted.
import { useEffect, useRef, useState } from "react";
import { ButtonLink, Choice, ScreenHead } from "../components/controls.js";
import { BackIcon, PieceIcon } from "../components/icons.js";
import { Stack } from "../components/layout.js";
import type { Side } from "../chess/game.js";
import { en } from "../locales/en.js";
import { MATCH_GAME } from "../schemas.js";
import { previewStyle, useStore } from "../state/store.js";
import { RulesPanel } from "./rules-panel.js";
import { StylePicker } from "./style-panel.js";
import { useBoardInset } from "./shell.js";

export const SetupView = () => {
  const opponents = useStore((state) => state.opponents);
  const saved = useStore((state) => state.profile.style);
  const [opponentId, setOpponentId] = useState(opponents[2].id);
  const [side, setSide] = useState<Side | "lots">("lots");
  const [style, setStyle] = useState(saved === MATCH_GAME ? "shuffle" : saved);
  const ref = useRef<HTMLElement>(null);
  useBoardInset(ref, "left");
  useEffect(() => () => previewStyle(null), []);
  const opponent =
    opponents.find((entry) => entry.id === opponentId) ?? opponents[0];
  const pickStyle = (id: string) => {
    setStyle(id);
    previewStyle(id === "shuffle" ? null : id);
  };

  return (
    <main className="screen" ref={ref}>
      <div className="screen-scroll">
        <ScreenHead
          title={en.setup.heading}
          back={
            <ButtonLink kind="plain" icon={<BackIcon />} to="/">
              {en.setup.back}
            </ButtonLink>
          }
        />
        <Stack as="section" gap="tight">
          <h2 className="section-title">{en.setup.opponent}</h2>
          <div className="opponent-list" role="radiogroup">
            {opponents.map((entry) => (
              <label
                key={entry.id}
                className={
                  entry.id === opponentId
                    ? "opponent-row is-on"
                    : "opponent-row"
                }
              >
                <input
                  type="radio"
                  name={en.setup.opponent}
                  checked={entry.id === opponentId}
                  onChange={() => setOpponentId(entry.id)}
                />
                <PieceIcon role={entry.figure} />
                <span className="opponent-name">{entry.name}</span>
                <span className="opponent-rating">{entry.rating}</span>
              </label>
            ))}
          </div>
          <p className="style-concept">{opponent.style}</p>
        </Stack>
        <Choice
          legend={en.setup.side}
          value={side}
          options={(["white", "lots", "black"] as const).map((value) => ({
            value,
            label: en.setup.sides[value]
          }))}
          onChange={setSide}
        />
        <Stack as="section" gap="line">
          <h2 className="section-title">{en.setup.style}</h2>
          <StylePicker
            value={style}
            lead={{ value: "shuffle", label: en.setup.shuffle }}
            onChange={pickStyle}
          />
        </Stack>
        <details className="more">
          <summary>{en.rules.heading}</summary>
          <RulesPanel />
        </details>
      </div>
      <div className="screen-foot">
        <ButtonLink
          kind="primary"
          to="/casual/$opponentId"
          params={{ opponentId }}
          search={{ side, style }}
        >
          {en.setup.start}
        </ButtonLink>
      </div>
    </main>
  );
};
