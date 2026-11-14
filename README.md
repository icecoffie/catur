# Chess

A 3D chess game: climb eight ranks of computer opponents, play casual games under your own house rules, and study strategy on the board.

## Intent

- **Form:** a game, judged on how good a move feels and how much you want one more.
- **Person and context:** anyone from a beginner learning plans to a club player, for a 5 to 30 minute session at a desk or on a phone.
- **Core experience:** a move feels physical and each win visibly moves your pawn up the board.
- **Must keep achieving:** plain animations on every move, entertaining cutscenes after major events, and a different world for each game.

## Design decisions

- **Ranks are the board's own ranks.** Your pawn walks up the e-file past eight opponents standing on the d-file, and promotes at the top. The home screen is that board, so there is no menu page.
- **Animations and cutscenes are separate on purpose.** Animations are plain and always on. Cutscenes are staged scenes after major events; they can be turned off, skipped with a click or key, and they pause the clock.
- **A cutscene's staging comes from the event and the pieces; its look comes from the world.** A rook always crushes, a knight stomps, a bishop cleaves. A victim shatters, melts, bursts into ink, pixelates or collapses according to the world.
- **Grabs prefer a piece that can move,** because pieces overlap in perspective and the king's head sits in front of the e2 pawn.
- **Wrong lesson tries are answered by Stockfish,** so a mistake shows its consequence before the coach explains it. Accepted answers were checked against Stockfish; a line that lost a bishop was replaced for that reason.
- **Low ranks use human mistakes, not random moves:** several engine lines chosen by a temperature, with a blunder chance. UCI_Elo has a floor of 1320, so ranks below it can't use it.
- **Rules:** standard, Chess960 and piece odds. Variants such as Atomic are left out because the only engine for them that was tested, Fairy-Stockfish, needs SharedArrayBuffer and CodePen isn't cross-origin isolated.

## Performance and graphics

All eight worlds use this pipeline. Measured on the target machine, a dual-GPU MacBook. Probe frame gaps, not long tasks: most of this cost never appears on the main thread.

- **Scanned materials and light.** Each world has a real HDRI for reflections and a scanned table. The Club Room uses Poly Haven's CC0 chess set as scanned, and is the quality reference for every other style.
- **Other worlds paint the same set.** Finishes in `recipes.ts` are drawn once into the set's texture layout, keeping its carved normals and crevices (`paintPieces`). Noise alone reads as artificial, so recipes lean on three real sources. `stone` is a clean patch of the Club Room's scanned marble, read as brightness and recolored: inverted it is Carrara, thresholded to gold it is Portoro, and tinted it is jade or ice fractures. `crevice` is the set's own carving, so molten metal, neon and gold follow the sculpture. `engravings.ts` draws the star chart and fretwork with the 2D canvas.
- **Painted rooms.** Where no scan shows the concept (cabinets, furnaces, temple, dome), `backdrops.ts` paints the room into the panorama and pieces reflect that room, with lamps placed above the camera's view for polished surfaces to catch. Render targets read back flipped, so reflections bake their own copy the right way up. `recipe.table` does the same for floors. Paint runs a few pixels past each UV island so mipmaps can't bleed a seam. The scanned board reuses its UV islands, so boards are painted from above and looked up by position instead (`paintBoard`). View-dependent shine can't be baked; `rims` adds it live.
- **The room is pre-rendered.** The camera never moves in play, so the board, table and backdrop are drawn once at full resolution with 4x antialiasing and shown as an image. Only pieces, their live shadows, reflections and contact shadows are drawn each frame. `settleRoom` keeps one image per style, side and size.
- **Cutscenes draw the real room** at half resolution with antialiasing and scale up, since the camera moves. Motion hides the difference. `drawLive` also serves procedural worlds at their pixel budget, so quality can change without resizing the canvas, which would stall a frame.
- **Opaque canvas, no canvas multisampling, high-performance GPU.** Alpha and full-screen multisampling cost about 15 ms at 2x.
- **Never animate many separate meshes.** Each moving mesh costs about 4 ms of GPU time here, because of its own buffer update. All debris sits in four batched meshes for that reason, and a draw bows only the officers. Static meshes cost almost nothing.
- **Debris is the real piece.** `fracture.ts` cuts each mesh along Voronoi cells behind the veil. A chunk keeps the piece's surface and finish, and its cut faces are closed with the whole cross-section trimmed to the cell, then drawn in `brokenStone`. Motion is a few lines of gravity, floor bounce and spin in `fx.ts`, with no physics engine and no collisions between chunks; the whole per-frame update measured 0.19 ms of a 29 ms frame.
- **Glow.** `glow.ts` gathers bright areas at an eighth of the screen and blurs them at two widths. It runs once into the room image and live in cutscenes. A style's `scan.glow` sets bloom, threshold and inlay heat.
- **Only the latest two styles stay in memory.** A style holds about 300 MB of textures; the rest are disposed by `keepRecent`, which held the total near 970 MB across all eight. Coming back to a released style shows the veil again.
- **WebGL 2, not WebGPU.** Starting WebGPU took over 6 s here. TSL runs on either backend.
- **Nothing compiles during play.** Everything is compiled and drawn behind the veil, including a rehearsal of the live path with debris and light, because the screen and the cutscene buffer need separate pipelines. A shader variant compiled mid-scene once cost 840 ms. The veil then waits for the GPU to finish its queue.
- **No panel blur** over the canvas.
- **Stored files are versioned.** Raise `config.assetCache` when a stored file changes, or players keep the old one.

The play camera sits steep enough that same-colored pieces rarely stand in front of each other, and every piece darkens toward its foot, so the head of one stands clear of the foot behind it. Coordinates run along the near and left edges only. Every style follows one value ladder, because a set only reads if its parts differ: dark pieces are the darkest thing on the table, dark squares are mid-tone, and the frame and floor sit between and never match a piece. Gloss stays moderate: painted sets use soft clearcoat, and bloom is barely there. Judge every style at the play view with the interface on screen, next to the Club Room. A style fails if it has glare, washed-out pieces, a dead or busy floor, or anything that glows without a reason. Coordinates are inlay: a lit plane in the style's own material (`scan.label`), not an overlay.

Scanned maps live in `pens/chess/assets/`, outside `src/`, and reach CodePen through Asset Hosting (`pen.json`'s `hosting` block and `config.assets.hosted`). Off localhost, nothing loads until that is set, because no procedural fallback remains.

## Design system

Tokens live at the top of `app/styles.css`: type (Fraunces for names, IBM Plex Mono for notation, IBM Plex Sans for text), spacing, sheet shape and timing. The interface draws from tournament paper: slips, rules and scoresheets. Colors are `--world-*` properties set at run time from each world's `palette` in `data/worlds.json`, so structure stays fixed and character changes. Add a shared value in `styles.css`; add a world color in the palette schema.

## Data visualization

**How the game turned**, on the result slip. Audience: the player, right after the game. Data: engine evaluation by ply. Insight: where the game changed hands. Goal: find the turning point. A single line about an even baseline with the biggest swing marked, capped at ±6 pawns so one mate score can't flatten the game. Its text equivalent names the move.

## Usage

- **Move:** drag a piece, tap it and then a square, or type a move such as `Nf3`.
- **Keyboard:** Tab to the board, arrow keys move between squares, Enter picks up and places. Moves are announced to screen readers.
- **Camera:** fixed. Players can't rotate, drag or zoom the view; only cutscenes move it.
- **At the table:** the board fills the screen. Seats sit in the left corners and a quiet icon rail on the right opens the scoresheet, typed moves, style, hint, takeback and resignation. Esc closes a panel.
- **Cutscenes:** click the board, press any key, or use Skip.

## Style

There is one choice: a style sets the board, the pieces, the room, the lighting, how pieces die and the interface colors together, because each is designed as a whole. Settings can pin one, the casual setup picks one for that game, and the rail changes it during a game for that game only. Left on Match the game, every game brings its own. A save from when board, world and pieces were chosen apart loads with the one style it pinned.

## Routes

Hash URLs through TanStack Router, because CodePen serves a pen from one fixed path and a path-based route would 404 on reload.

- `#/`: the ranks.
- `#/climb`: the next ladder game.
- `#/casual`: casual game setup.
- `#/casual/$opponentId?side=white|black|lots&style=<style id>|shuffle`: a casual game.
- `#/settings`: settings and house rules.
- `#/study`: the lesson list.
- `#/study/$lessonId`: a lesson.

A table route starts its game on arrival and ends it on leaving. Games aren't saved, so reloading a table starts that game over.

## Cheats

For testing. Add `?cheat=` to the page URL or the hash URL, with comma-separated tokens: `#/climb?cheat=fresh,rank:5,speed:4`. Tokens are read once at startup.

- `panel`: only show the test panel (Best move, Win, Lose, Draw). Any other cheat shows it too.
- `fresh`: start from default progress, ignoring what's saved.
- `rank:1-9`: start the climb at a rank; 9 means already promoted.
- `style:<id>`: force every game into one style, such as `style:courtyard`.
- `fen:<position>`: start climb and casual games from a position, with `_` for spaces.
- `hotseat`: you move both sides and the engine never replies.
- `pushover`: the engine plays random legal moves.
- `speed:<0.05-20>`: scale every animation, cutscene and debris.
- `clock:<seconds>`: start both clocks at this time, to test flag falls.
- `cutscenes:off|big|captures`: override the setting.
- `gpu:low|high`: choose a GPU on a dual-GPU machine.

While any token is present, an orange notice shows and progress stays in memory, so testing can never change real saved data. Unknown or invalid tokens are named in the notice and ignored. Example, a cutscene test: `#/casual/pip?side=white&world=foundry&cheat=hotseat,speed:0.2,fen:4k3/8/8/3n4/8/8/3R4/4K3_w_-_-_0_1`.

## Architecture

- `index.html`: document shell, fonts, explicit importmap, startup error message.
- `package.json`: pinned dependencies, in step with the importmap.
- `app/main.tsx`: entry point and error reporting.
- `app/routes.tsx`: every URL, and the table routes that start games.
- `app/config.ts`: engine pacing, storage keys, board proportions, camera, timing, default rules.
- `app/schemas.ts`: every runtime shape and readable failure messages.
- `app/styles.css`: tokens and component styles.
- `app/api/`: TanStack Query client and one query per resource.
- `app/chess/game.ts`: rules, as glue around chessops.
- `app/chess/events.ts`: which cutscene a move earns.
- `app/chess/stockfish.ts`: the engine worker, its local storage and strength settings.
- `app/state/store.ts`: every action, the turn loop, clocks and ladder results.
- `app/state/cheats.ts`: reads and validates the `?cheat=` parameter.
- `app/scene/board-canvas.tsx`: react-three-fiber canvas, renderer and resolution control.
- `app/scene/stage.ts`: board, pieces, stepped scene preparation, camera, input, plain animation.
- `app/scene/cutscenes.ts`: the staged scenes and endings.
- `app/scene/fracture.ts`: cuts a piece mesh into closed chunks.
- `app/scene/fx.ts`: batched debris and its motion, sparks, pools, rings.
- `app/scene/glow.ts`: the small bloom used by the room image and cutscenes.
- `app/scene/scanned.ts`: loads scanned maps and HDRIs; scanned materials and the backdrop.
- `app/scene/materials.ts`: TSL finish recipes, painting into the set, and effect materials.
- `app/views/`: shell, ladder, setup, settings, study, table, the shared rules and style panels and the failure sheet.
- `app/components/`: Stack, buttons and choosers, icons, boundaries.
- `app/lib/utils.ts`: importmap resolving, Cache API downloads, saved values, helpers.
- `app/locales/`: all text.
- `data/worlds.json`, `data/opponents.json`, `data/lessons.json`: the catalog.
- `data/art/staunton.glb`: twelve piece meshes with UVs, and the scanned board.
- `pens/chess/assets/<world>/`: each world's HDRI and table maps, about 42 MB in all, outside the pen. `club-room/` also holds the set's scanned maps, which every world's carving uses.

react-three-fiber hosts the canvas and frame loop; the scene itself is imperative, in `stage.ts`, because a turn is a sequence of timed scenes that the store awaits. The canvas lives in the root route, so it survives navigation. On localhost only, `window.__chess` exposes the stage and store for testing.

## How data flows

`schemas.ts` defines a shape, `api/queries.ts` fetches and parses it, and `views/shell.tsx` reads it with `useSuspenseQuery` and hands it to the store. Saved progress passes through the same schema. A malformed resource fails like this: `./data/worlds.json [3] light.keyPower: Invalid input: expected number, received string, got "bright" (string)`.

## Errors

- **Before the app starts:** an inline script writes the failure into `#startup-status`.
- **After it starts:** everything reaches `reportError` in `main.tsx`.
- **On screen:** a boundary shows "The board was knocked over" with a way to set it up again. A failed engine load shows its own message and retry button.

## Customizing

- **Add a world:** an entry in `data/worlds.json` with its `scan` block, its HDRI and table maps in `pens/chess/assets/<world>/`, and a recipe in `materials.ts` if it needs a new finish.
- **Add an opponent:** an entry in `data/opponents.json`. `play.kind` is `human` (mistake-prone), `elo` or `full`.
- **Add a lesson:** an entry in `data/lessons.json`. Check `accept` and `reply` moves are legal, and check the line against Stockfish.
- **Change what earns a cutscene:** `app/chess/events.ts`.
- **Change a kill:** `strikes` and `demise` in `app/scene/cutscenes.ts`.

## Dependencies

A package whose version carries a `?deps=` suffix also needs a plain entry in `devDependencies`, or CodePen's type check can't see its types and the build fails with "no exported member".

All load from esm.sh, are listed in the importmap and pinned in `package.json`.

- `react` and `react-dom` 19.3.1: the interface.
- `three` 0.187.0: rendering and TSL, on the WebGL 2 backend.
- `@react-three/fiber` 9.8.2: canvas and frame loop.
- `chessops` 0.15.1: rules, SAN and Chess960. GPL-3.0-or-later.
- `stockfish` 19.0.1: the single-threaded lite build, because CodePen can't run threads. Its WebAssembly file is kept in the Cache API after the first load. GPL-3.0. The npm package is 205 MB unpacked and CodePen's build installs declared packages, so a push may fail there.
- `gsap` 3.15.0: every timeline.
- `@tanstack/react-query` 5.105.2: resource loading.
- `@tanstack/react-router` 1.170.46: routes.
- `@tabler/icons-react` 3.50.0: icons.
- `zod` 4.6.7: schemas.

## Accessibility and devices

Desktop first, with deliberate iPad and phone layouts: at narrow widths the board sits above the slip. Reduced motion makes moves instant and turns cutscenes off. Touch targets are at least 44px except where noted by the design tokens, and input text is 16px to prevent iOS zoom.

## Guardrails

- Never ship an object that looks amateur. Cut it instead.
- Shaders stay in TSL.
- Every external dependency goes through esm.sh and the importmap.
- A cutscene must always end with the board matching the real position; `syncBoard` enforces it.
- The camera stays fixed for players.
- During play, nothing may compile a shader or resize the canvas while something is moving.
- The board stays the focus at the table; everything else keeps to the edges.
- Cheats must never write to saved progress.
- Lesson answers must hold up against Stockfish.

## Credits

- Chess pieces and board: [Chess Set](https://polyhaven.com/a/chess_set) by Riley Queen, Poly Haven, CC0. Reduced to one mesh per piece type and color.
- Rooms and tables, all from Poly Haven, CC0:
  - Club Room: [Wooden Lounge](https://polyhaven.com/a/wooden_lounge), [Dark Wood](https://polyhaven.com/a/dark_wood).
  - Ink Garden: [Symmetrical Garden 02](https://polyhaven.com/a/symmetrical_garden_02), [Tatami Mat](https://polyhaven.com/a/tatami_mat).
  - Glacier: [Snowy Field](https://polyhaven.com/a/snowy_field).
  - Courtyard: [Symmetrical Garden 02](https://polyhaven.com/a/symmetrical_garden_02), [Marble 01](https://polyhaven.com/a/marble_01).
  - Arcade: [Neon Photostudio](https://polyhaven.com/a/neon_photostudio).
  - Jade Temple: [Thatch Chapel](https://polyhaven.com/a/thatch_chapel).
  - Observatory: [Satara Night No Lamps](https://polyhaven.com/a/satara_night_no_lamps).
  - Grand Hall: [Ballroom](https://polyhaven.com/a/ballroom).
- Engine: [Stockfish](https://stockfishchess.org) via [stockfish.js](https://github.com/nmrugg/stockfish.js), GPL-3.0.
- Rules: [chessops](https://github.com/niklasf/chessops), GPL-3.0-or-later.
