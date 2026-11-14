/*!
 * Chess
 * Copyright (c) Cliff Pyles
 * Released under the MIT License: https://opensource.org/license/mit
 * Original: https://codepen.io/editor/cliffpyles/pen/01a19e25-e438-75a3-a372-c9c67de14514
 */

// Intended use: the controls the game repeats: command buttons, segmented choices, steppers for long option lists, and switches.
import { createLink } from "@tanstack/react-router";
import type { ReactNode, Ref } from "react";
import { en } from "../locales/en.js";
import { NextIcon, BackIcon } from "./icons.js";

type ButtonProps = {
  kind?: "primary" | "quiet" | "plain";
  icon?: ReactNode;
  children?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  label?: string;
};

export const Button = ({
  kind = "quiet",
  icon,
  children,
  onClick,
  disabled,
  label
}: ButtonProps) => (
  <button
    type="button"
    className={`button button-${kind}`}
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    data-tip={label}
  >
    {icon}
    {children ? <span>{children}</span> : null}
  </button>
);

type AnchorProps = {
  kind?: ButtonProps["kind"];
  icon?: ReactNode;
  children?: ReactNode;
  ref?: Ref<HTMLAnchorElement>;
} & Record<string, unknown>;

const Anchor = ({
  kind = "quiet",
  icon,
  children,
  ref,
  ...rest
}: AnchorProps) => (
  <a ref={ref} className={`button button-${kind}`} {...rest}>
    {icon}
    {children ? <span>{children}</span> : null}
  </a>
);

export const ButtonLink = createLink(Anchor);

type Option<T extends string> = { value: T; label: string };

// A few short options, all visible at once.
export const Choice = <T extends string>({
  legend,
  value,
  options,
  onChange
}: {
  legend: string;
  value: T;
  options: Option<T>[];
  onChange: (next: T) => void;
}) => (
  <fieldset className="choice">
    <legend>{legend}</legend>
    <div className="segments">
      {options.map((option) => (
        <label
          key={option.value}
          className={option.value === value ? "segment is-on" : "segment"}
        >
          <input
            type="radio"
            name={legend}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  </fieldset>
);

// A setting with many values, stepped through in place, as game menus do.
export const Stepper = <T extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (next: T) => void;
}) => {
  const index = options.findIndex((option) => option.value === value);
  const step = (by: number) =>
    onChange(options[(index + by + options.length) % options.length].value);
  return (
    <div className="row" role="group" aria-label={label}>
      <span className="row-label">{label}</span>
      <span className="stepper">
        <button
          type="button"
          aria-label={en.controls.previous(label)}
          onClick={() => step(-1)}
        >
          <BackIcon />
        </button>
        <output aria-live="polite">{options[index]?.label}</output>
        <button
          type="button"
          aria-label={en.controls.next(label)}
          onClick={() => step(1)}
        >
          <NextIcon />
        </button>
      </span>
    </div>
  );
};

export const Toggle = ({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) => (
  <label className="row row-switch">
    <span className="row-label">{label}</span>
    <input
      type="checkbox"
      role="switch"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
    />
    <span className="switch" aria-hidden="true" />
  </label>
);

// A view's opening: what it is, in large type, with the way back above it.
export const ScreenHead = ({
  title,
  lead,
  back
}: {
  title: string;
  lead?: string;
  back?: ReactNode;
}) => (
  <header className="screen-head">
    {back}
    <h1>{title}</h1>
    {lead ? <p className="lead">{lead}</p> : null}
  </header>
);
