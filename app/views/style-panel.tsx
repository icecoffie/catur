/*!
 * Chess
 * Copyright (c) Cliff Pyles
 * Released under the MIT License: https://opensource.org/license/mit
 * Original: https://codepen.io/editor/cliffpyles/pen/01a19e25-e438-75a3-a372-c9c67de14514
 */

// Intended use: the style chooser: one choice that sets the board, the pieces and the room together, shown as tiles of the materials themselves. Shared by the settings view, the casual setup and the table.
import { Stack } from "../components/layout.js";
import { en } from "../locales/en.js";
import { MATCH_GAME } from "../schemas.js";
import { updateStyle, useStore } from "../state/store.js";

const Tile = ({
  name,
  on,
  onPick,
  swatch
}: {
  name: string;
  on: boolean;
  onPick: () => void;
  swatch?: { light: string; dark: string; frame: string };
}) => (
  <button
    type="button"
    className={on ? "style-tile is-on" : "style-tile"}
    aria-pressed={on}
    onClick={onPick}
  >
    <span
      className={swatch ? "style-swatch" : "style-swatch is-open"}
      aria-hidden="true"
      style={
        swatch
          ? {
              background: `conic-gradient(${swatch.dark} 25%, ${swatch.light} 0 50%, ${swatch.dark} 0 75%, ${swatch.light} 0) 0 0 / 50% 50%`,
              borderColor: swatch.frame
            }
          : undefined
      }
    />
    <span className="style-name">{name}</span>
  </button>
);

export const StylePicker = ({
  value,
  onChange,
  lead
}: {
  value: string;
  onChange: (id: string) => void;
  lead?: { value: string; label: string };
}) => {
  const worlds = useStore((state) => state.worlds);
  const concept = worlds.find((world) => world.id === value)?.tagline;
  return (
    <Stack gap="line">
      <div className="style-grid">
        {lead ? (
          <Tile
            name={lead.label}
            on={value === lead.value}
            onPick={() => onChange(lead.value)}
          />
        ) : null}
        {worlds.map((world) => (
          <Tile
            key={world.id}
            name={world.name.replace(/^The /, "")}
            on={value === world.id}
            swatch={world.swatch}
            onPick={() => onChange(world.id)}
          />
        ))}
      </div>
      <p className="style-concept" aria-live="polite">
        {concept ?? en.style.note}
      </p>
    </Stack>
  );
};

export const StylePanel = () => {
  const style = useStore((state) => state.profile.style);
  return (
    <Stack as="section" gap="line">
      <h2 className="section-title">{en.style.heading}</h2>
      <StylePicker
        value={style}
        lead={{ value: MATCH_GAME, label: en.style.match }}
        onChange={updateStyle}
      />
    </Stack>
  );
};
