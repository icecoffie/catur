/*!
 * Chess
 * Copyright (c) Cliff Pyles
 * Released under the MIT License: https://opensource.org/license/mit
 * Original: https://codepen.io/editor/cliffpyles/pen/01a19e25-e438-75a3-a372-c9c67de14514
 */

// Intended use: the house rules form, shared by the casual setup and the settings view.
import { Stepper, Toggle } from "../components/controls.js";
import { Stack } from "../components/layout.js";
import { config } from "../config.js";
import { en } from "../locales/en.js";
import type { Rules } from "../schemas.js";
import { updateRules, useStore } from "../state/store.js";

const entries = <T extends string>(
  options: Record<T, string>
): { value: T; label: string }[] =>
  (Object.keys(options) as T[]).map((value) => ({
    value,
    label: options[value]
  }));

export const RulesPanel = ({ forClimb = false }: { forClimb?: boolean }) => {
  const rules = useStore((state) => state.profile.rules);
  const clockOptions: { value: Rules["clock"]; label: string }[] = [
    { value: "none", label: en.rules.clock.none },
    ...(Object.keys(config.clocks) as (keyof typeof config.clocks)[]).map(
      (value) => ({ value, label: value })
    )
  ];
  return (
    <Stack as="section" gap="tight" className="rules">
      <h2 className="section-title">{en.rules.heading}</h2>
      {forClimb ? <p className="note">{en.rules.climbNote}</p> : null}
      <div className="rows">
        <Stepper
          label={en.rules.clock.label}
          value={rules.clock}
          options={clockOptions}
          onChange={(clock) => updateRules({ clock })}
        />
        <Stepper
          label={en.rules.start.label}
          value={rules.start}
          options={entries(en.rules.start.options)}
          onChange={(start) => updateRules({ start })}
        />
        <Stepper
          label={en.rules.odds.label}
          value={rules.odds}
          options={entries(en.rules.odds.options)}
          onChange={(odds) => updateRules({ odds })}
        />
        <Stepper
          label={en.rules.promotion.label}
          value={rules.promotion}
          options={entries(en.rules.promotion.options)}
          onChange={(promotion) => updateRules({ promotion })}
        />
        <Stepper
          label={en.rules.repetition.label}
          value={rules.repetition}
          options={entries(en.rules.repetition.options)}
          onChange={(repetition) => updateRules({ repetition })}
        />
        <Stepper
          label={en.rules.moveLimit.label}
          value={rules.moveLimit}
          options={entries(en.rules.moveLimit.options)}
          onChange={(moveLimit) => updateRules({ moveLimit })}
        />
        <Toggle
          label={en.rules.takebacks}
          checked={rules.takebacks}
          onChange={(takebacks) => updateRules({ takebacks })}
        />
        <Toggle
          label={en.rules.hints}
          checked={rules.hints}
          onChange={(hints) => updateRules({ hints })}
        />
      </div>
    </Stack>
  );
};
