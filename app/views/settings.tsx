/*!
 * Chess
 * Copyright (c) Cliff Pyles
 * Released under the MIT License: https://opensource.org/license/mit
 * Original: https://codepen.io/editor/cliffpyles/pen/01a19e25-e438-75a3-a372-c9c67de14514
 */

// Intended use: the settings view: how the game plays, the style, house rules, and the one destructive action, restarting the climb, behind a confirmation.
import { useRef, useState } from "react";
import {
  Button,
  ButtonLink,
  Choice,
  ScreenHead,
  Toggle
} from "../components/controls.js";
import { BackIcon } from "../components/icons.js";
import { Stack } from "../components/layout.js";
import { en } from "../locales/en.js";
import { resetLadder, updateSettings, useStore } from "../state/store.js";
import type { Settings } from "../schemas.js";
import { RulesPanel } from "./rules-panel.js";
import { StylePanel } from "./style-panel.js";
import { useBoardInset } from "./shell.js";

const levels: Settings["cutscenes"][] = ["off", "big", "captures"];

export const SettingsView = () => {
  const settings = useStore((state) => state.profile.settings);
  const rung = useStore((state) => state.profile.rung);
  const [resetting, setResetting] = useState<"idle" | "asking" | "done">(
    "idle"
  );
  const ref = useRef<HTMLElement>(null);
  useBoardInset(ref, "left");
  return (
    <main className="screen" ref={ref}>
      <div className="screen-scroll">
        <ScreenHead
          title={en.settings.heading}
          back={
            <ButtonLink kind="plain" icon={<BackIcon />} to="/">
              {en.setup.back}
            </ButtonLink>
          }
        />
        <Stack as="section" gap="tight">
          <Choice
            legend={en.settings.cutscenes.label}
            value={settings.cutscenes}
            options={levels.map((value) => ({
              value,
              label: en.settings.cutscenes.options[value]
            }))}
            onChange={(cutscenes) => updateSettings({ cutscenes })}
          />
          <p className="note">{en.settings.cutscenes.note}</p>
          <div className="rows">
            <Toggle
              label={en.settings.coordinates}
              checked={settings.coordinates}
              onChange={(coordinates) => updateSettings({ coordinates })}
            />
            <Toggle
              label={en.settings.moveHints}
              checked={settings.moveHints}
              onChange={(moveHints) => updateSettings({ moveHints })}
            />
          </div>
        </Stack>
        <StylePanel />
        <RulesPanel forClimb />
        {rung > 0 || resetting === "done" ? (
          <Stack as="section" gap="tight">
            <h2 className="section-title">{en.settings.progress}</h2>
            {resetting === "done" ? (
              <p className="note" role="status">
                {en.settings.resetDone}
              </p>
            ) : null}
            {resetting === "idle" ? (
              <Button onClick={() => setResetting("asking")}>
                {en.settings.reset}
              </Button>
            ) : null}
            {resetting === "asking" ? (
              <Stack direction="row" gap="tight" wrap>
                <Button
                  onClick={() => {
                    resetLadder();
                    setResetting("done");
                  }}
                >
                  {en.settings.resetConfirm}
                </Button>
                <Button kind="plain" onClick={() => setResetting("idle")}>
                  {en.settings.resetCancel}
                </Button>
              </Stack>
            ) : null}
          </Stack>
        ) : null}
      </div>
    </main>
  );
};
