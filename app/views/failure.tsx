/*!
 * Chess
 * Copyright (c) Cliff Pyles
 * Released under the MIT License: https://opensource.org/license/mit
 * Original: https://codepen.io/editor/cliffpyles/pen/01a19e25-e438-75a3-a372-c9c67de14514
 */

// Intended use: the one failure sheet, shown by the status boundary and by the router when a view can't render.
import { Button } from "../components/controls.js";
import { en } from "../locales/en.js";

export const Failure = ({
  error,
  reset
}: {
  error: Error;
  reset: () => void;
}) => (
  <div className="sheet failure" role="alert">
    <h1>{en.errors.title}</h1>
    <p className="note">{error.message}</p>
    <Button kind="primary" onClick={reset}>
      {en.errors.retry}
    </Button>
  </div>
);
