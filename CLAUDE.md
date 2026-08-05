# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository.

This is a living architecture document, per franchise bible §6. It records not
just what the code does but **why it does it that way**, including the
alternatives that were rejected. If you change a decision recorded here, change
the entry too — a stale rationale is worse than none, because it gets trusted.

## Project overview

GerdQuest: Isle Raid is a browser-based land-grabbing strategy game with a
pirate theme, inspired by the iOS game *Strategery*. Players take turns raiding
adjacent islands and rebuilding their crews.

- **2–4 players**, any of which except player 1 can be a bot
- **Bots** at Off / Easy / Medium / Hard, set per player
- **Board sizes** 4×4, 5×5, 6×6
- **Board shapes** square, hexagon, triangle — each with its own adjacency rule
- **Island modes** Open (unclaimed islands start empty) or Fortified (1–6 defenders)

Every one of those is chosen from the setup strip above the board, and
**changing any of them restarts the game**. There is no mid-game
reconfiguration: migrating a live board across a shape or size change is a
feature nobody asked for, and the restart keeps `Game` free of migration code.

## Running the game

No build system, package manager, or server. Open the file:

```
open index.html
```

That property is load-bearing — see the stack exception below. Everything the
game needs is in the repo: fonts are self-hosted, sweetalert2 is vendored in
`js/vendor/`. Nothing but the (unwired) online module reaches the network.

## Franchise standard

This is a GerdQuest title and follows the franchise bible:
https://github.com/NerdyToddGerdy/notequest_browser/blob/fix/runid-desync-and-rename/docs/franchise-bible.md

There is deliberately **no local copy** in this repo — a copy plus a link means
the copy gets read and the link gets updated. Read the canonical document before
changing visual identity, player-facing copy, naming, or versioning.

(The canonical file currently lives on a feature branch. Retarget this link to
`main` once that branch merges.)

### Digest — the rules that bite on every change

Inlined so an agent working offline still follows them. The bible is still the
authority; this is the part that comes up constantly.

**§1 — Naming.** The title is always **"GerdQuest: Isle Raid"**, never "Isle
Raid" alone. A live Google Play island-conquest game called *Island Raid: Merge
Tactics* owns the short name; the series prefix is what makes this title
distinctive. Treat a bare "Isle Raid" in any user-facing text or metadata as a
bug (#43).

**§1 — No NoteQuest content.** Only *Realm of Depths* adapts NoteQuest. This
title adapts nothing, so it carries no NoteQuest credit either — crediting a
source you didn't use implies a relationship that doesn't exist.

**§3 — Palette.** Tokens are defined at the top of `css/style.css` under the
franchise names: `--bg-0`, `--bg-1`, `--torch-core`, `--torch-mid`, `--ember`,
`--gold`, `--gold-bright`, `--parchment`, `--parchment-2`, `--parchment-3`,
`--ink`, `--ink-soft`, `--danger`, `--focus`. Use them; don't introduce new hex
values in the chrome. **Red is reserved for harm** — a failed raid, a warning —
never for a neutral or good outcome. The focus ring is always visible and never
removed. Committed dark, no light mode. (The board is exempt; see below.)

**§4 — Voice.** Wry, plain, honest about the odds. Never epic, never cute.
Second person, present tense. **No exclamation marks.** State the mechanic — a
line should double as a spec. Don't soften a loss. Em dashes for the turn, not
ellipses. Tell the player the real odds when it costs nothing.

**§6 — Versioning.** A player-facing change bumps `VERSION` in `js/app.js`,
adds a dated `CHANGELOG.md` section, adds a matching entry to the inline
`CHANGELOG` string in `js/app.js`, and gets a `vX.Y.Z` tag. All four, together.
(Scope exception below.)

## Documented exceptions

§6 permits a title to differ "unless a title has a real reason to differ".
These are the reasons, recorded so they aren't rediscovered as oversights.

### The stack (bible §6)

**The bible's §6 stack conventions — React + TypeScript + Vite, strict TS,
`npm run build` typechecking, Vitest, Playwright — are deliberately not followed
here.**

**Why.** Those conventions are inherited from *Realm of Depths*, which needs
them: it is a large React/TS application where a build step buys real safety.
Isle Raid is a single `Game` class of DOM code, and its zero-toolchain property
is a genuine feature rather than an accident — `open index.html` runs the
current game, on any machine, with no install step, forever. Adopting the
franchise stack would mean rewriting a working, deployed game for no
player-visible benefit and no gameplay change.

**What this costs, honestly.** No typechecking. No test suite. `rollDice()`
calls `Math.random()` directly, so combat logic cannot be exercised
deterministically without patching globals. The `Die` component (§3) is React in
the flagship repo and needs a vanilla port here regardless of this decision.

**What would reverse it.** Any of: extracting the shared `Die`/tokens/fonts
package that §8.4 anticipates; the engine growing to where untested combat logic
becomes a real liability; or a backend landing (§6 Backends) with
state-serialisation logic worth testing. If the stack is revisited, generating
the release-notes modal from `CHANGELOG.md` at build time becomes possible too.

**Not excused by this exception:** an injectable RNG. Making `rollDice()` take a
seedable `() => number` is small, needs no build step, and is the single change
that would make every future combat change testable. It remains worth doing.

### The board keeps the sea (bible §3)

§3's palette is adopted for **everything around the board** — body, sidebar,
setup strip, buttons, panels, warning, dice readout, release-notes modal.

**The map is exempt.** The ocean gradient (`--map-bg`), the island gradients and
the per-player colours stay as they are. §3's house look is "a character sheet
lit by torchlight in a dark stone room"; Isle Raid's subject is an open sea in
daylight, and the board is the one place where that reads as identity rather
than inconsistency. Framing the sea in franchise chrome makes it look
deliberate — recolouring it to torchlight would leave an island game with no
visible water.

Practically: **franchise tokens dress the chrome; the sea and the islands are
Isle Raid's own.** If you are adding UI, use the tokens. If you are touching the
board, leave the palette alone.

**No light mode.** §3 is committed dark and that part is followed exactly:
`color-scheme: dark`, no toggle, no `[data-theme="light"]` block. The v1.3.0
toggle (#12, #13) was removed in v1.5.0 for this reason. A stale `theme` key may
remain in some players' `localStorage`; nothing reads it, so it is inert rather
than migrated.

### Versioning scope (bible §6)

§6 requires "every push to `main`" to carry a version bump, a dated changelog
section, and a tag. Here that applies to **changes that affect the game**, not to
repo hygiene — documentation, `CLAUDE.md`, CI, or tooling commits are not
releases.

The reason is specific to this title: `CHANGELOG.md` is mirrored into a
**player-facing** release-notes modal (click the version badge). A player
reading "documented a stack exception" has been shown noise, not a release note.
Everything that changes what a player sees or does still follows §6 exactly.

## Architecture

### Files

| Path | What it is |
| --- | --- |
| `index.html` | The whole document: wordmark, setup strip, score bar, board, sidebar, footer, release-notes modal |
| `js/app.js` | The entire game — bootstrap, one `Game` class, setup-strip listeners |
| `js/online.js` | Firebase room/sync helpers. **Not wired up**; see Online below |
| `js/firebase-config.js` | Gitignored. Absent on a fresh clone, by design |
| `js/vendor/` | sweetalert2 6.4.4, JS and CSS, served locally |
| `css/style.css` | Everything visual: franchise tokens, layout grid, three board geometries |
| `fonts/` | Five self-hosted woff2 faces, latin subset, with licence and roles recorded |
| `CHANGELOG.md` | Mirrored by hand into the `CHANGELOG` string in `js/app.js` |

### How the page loads

`app.js` is a **classic script**, not `type="module"` — everything lives inside
one `DOMContentLoaded` handler, so nothing leaks to `window`. Issue #10 proposes
switching to a module; nothing currently requires it.

The one dynamic `import()` is in `syncOnline()`, and it is deliberate: a static
`import` of `./online.js` would pull in `./firebase-config.js`, which is
gitignored and therefore **missing on a fresh clone**. A static import would
break the game on load for anyone who cloned the repo. Behind a dynamic import
guarded by `if (!this.onlineMode) return;`, local play never touches it, and the
Firebase CDN is never contacted.

`CHANGELOG` is a template string inside `app.js` rather than being read from
`CHANGELOG.md`, because the game is meant to be opened as a local file and
`fetch()` on `file://` is blocked. The duplication is the price of the
zero-toolchain property; keep the two in sync by hand.

### Module-level state (inside `DOMContentLoaded`)

`currentCols`, `currentNumPlayers`, `currentShape`, `currentIslandMode`,
`currentBotDiffs`, and `activeGame`. These hold the *setup strip's* state, which
outlives any single game — that is why they sit outside `Game`. `startGame()`
reads them, builds a new `Game`, and calls `init()`.

`startGame()` does two non-obvious things:

- **Cancels the outgoing bot.** `activeGame.botActive = false` before the new
  game is built. The bot drives itself with chained `setTimeout`s; without the
  flag, a dead game's pending timers would fire and act on the new board.
  Rejected the alternative — tracking and clearing timeout IDs — as more
  bookkeeping for the same result.
- **Clones `.map` and the End Phase button.** `Game.init()` attaches listeners to
  both, and a new `Game` is constructed on every settings change. Replacing the
  nodes with clones drops every stale listener at once, with no
  `removeEventListener` bookkeeping.

### `Game` state

| Field | Meaning |
| --- | --- |
| `playerKeys` | `['player1'…]` sliced to `numPlayers` — every player who started |
| `activePlayers` | Shrinks as players are eliminated; the turn cycle walks this |
| `currentPlayerIndex` | Index **into `activePlayers`**, not into `playerKeys` |
| `currentPlayer` | Derived from the two above at the top of each attack phase |
| `currentPhase` | `'attack'` or `'hire'` |
| `gameRound` | Increments when the turn index wraps to 0 |
| `clickedIndex1` / `clickedUnits1` | The selected attacking island; `-1` when nothing is selected |
| `clickedIndex2` / `clickedUnits2` | The target island |
| `newSoldiers` | Crew left to place this rebuild phase |
| `botDiffs` | Per-player difficulty map, so a table can mix humans and bots |
| `botActive` | Cleared on reset to cancel the bot's pending timeouts |
| `onlineMode` / `localPlayer` / `roomCode` | All falsy in local play |

There is no `toggle` and no `otherPlayer`. Both were two-player assumptions:
`toggle` was a boolean turn flag, and `otherPlayer` named "the opponent" as
though there were only one. With 2–4 players the turn is an index into
`activePlayers` and the opponent is "any player key that isn't the current one" —
see `pickBotHireTarget()`.

**Unit counts live in the DOM**, not in a parallel array: each `.space` holds an
`<h2>` with its number, and ownership is a `.player1`–`.player4` class. Reads go
through `parseInt(el.textContent)`. This is unusual and worth knowing before you
"fix" it — it means there is exactly one source of truth for the board, and no
render step that can disagree with it. The cost is that combat logic can't be
tested without a DOM, which the stack exception already accepts.

### Game flow

1. `init()` → `buildGrid()` → `startAttackPhase()`
2. Click an owned island holding ≥2 crew → selected, adjacent enemy islands highlighted
3. Click a highlighted island → `attackPhase()` → `claimLand()` if it is empty, otherwise `rollDice()`
4. Click **End Attack** → `hirePhase()` — the player gains one crew per island held
5. Place crew, click **End Rebuild** → `endOfRound()` → next player's `startAttackPhase()`

Combat: each side rolls one die per crew; the higher total takes the island. A
winning attacker moves `ceil(units / 2)` and leaves the rest; a failed raid drops
the attacker to 1. Attacking an *empty* island skips the dice entirely —
there is nothing to roll against.

### Event handling

**One delegated listener on `.map`, one stable listener on the End Phase
button.** The button listener reads `this.currentPhase` to decide whether to end
the attack or the rebuild phase.

This is the fix for a whole class of bug, not a style preference. The original
jQuery version attached and detached per-element handlers as phases changed, and
called `.off()` unconditionally — so clicking a 1-unit island (a no-op that
should change nothing) tore down handlers and corrupted the click state. With
delegation there is nothing to detach, so there is nothing to detach wrongly.

### Adjacency

`getAdjacentIndices()` dispatches on `this.shape` to one of three functions.
All three compute from row/column bounds rather than hardcoded per-index cases:
the original had if/else chains written for one 4×4 square board, and three
shapes × three sizes would have multiplied them beyond maintaining.

- **Square** — up/down/left/right, guarded by row and column bounds so nothing
  wraps at an edge.
- **Hex** — odd-r offset coordinates (odd rows shifted right). Left and right in
  the same row, plus two diagonals per side whose column offsets differ between
  even and odd rows.
- **Triangle** — left and right in the same row, plus exactly one vertical
  neighbour: an UP triangle shares its base with the cell below, a DOWN triangle
  with the cell above. Three neighbours, not four.

### Triangle click hit-testing

Triangles are `clip-path`'d rectangles positioned every `W/2`, so **their
bounding boxes overlap by half a triangle** and `e.target` names whichever box
is on top rather than the shape actually clicked. `getTriangleCellFromClick()`
converts the click to wrapper-relative coordinates, estimates a row and column,
and runs a cross-product point-in-triangle test over the neighbours until one
contains the point.

Rejected: rendering the board as SVG polygons, which would give correct hit
testing for free but means rewriting all three geometries and their styling.

### Layout — one screen, no page scroll

`.container` is a three-column grid: wordmark | setup+score-bar across the top,
board | sidebar below, footer across the foot. The footer lives *inside* the
container so the grid owns the full viewport height.

The board is square and sized `min(100cqw, 100cqh)` inside a
`container-type: size` cell — it takes whichever of its cell's two dimensions is
smaller. That is the whole trick: it fills the height left over after the chrome
**without any resize listener and without hardcoding how tall that chrome is**,
so adding a setup control or a sidebar panel just makes the board smaller on its
own. Island numbers scale from the same units.

Overflow goes where it belongs: the sidebar scrolls inside itself on a short
screen rather than pushing the page down.

**Below 680px this is abandoned on purpose.** The layout stacks and the page
scrolls, because cramming a board plus a sidebar into a phone screen makes both
unusable. That is a decision, not an oversight — don't "restore" one-screen
behaviour there.

Hex and triangle cells are pixel-sized in JS (`applyShapeMetrics()`), so a
viewport-sized board means they go stale on resize. A debounced `resize`
listener recomputes them **in place**; rebuilding would reset the game.

### Scores

Scores count **total crew, not islands held**. Island count answers "who covers
more ground", which is the less interesting question — a player spread over 12
islands at 1 crew each is losing badly to one holding 4 islands at 6. Crew is
what can actually take ground, so that is what the sidebar and the proportional
score bar report. The bar has no "unclaimed" segment, because crew is always
owned by someone (v1.1.1).

### Bots

`isBotTurn()` is true for any player other than player 1 whose difficulty isn't
`off`. Player 1 is always human.

The bot drives itself with chained `setTimeout`s (`BOT_DELAY` 700ms,
`BOT_HIRE_DELAY` 400ms) and briefly highlights its attacker before striking.
The delays exist so a human can follow what happened; a bot that resolved
instantly would just present a changed board.

| Difficulty | Attack | Rebuild |
| --- | --- | --- |
| Easy | Random legal attack; 30% chance to stop early each turn | Random owned island |
| Medium | Prefers empty islands, then any favourable attack, else random | Random frontline island |
| Hard | Best empty island from its strongest island, else the largest favourable margin, else **stops attacking** | Weakest frontline island |

Two deliberate choices in Hard: it *declines* unfavourable attacks rather than
spending crew on a coin flip, and it reinforces the **weakest frontline** island
rather than its strongest or its largest. Reinforcing the interior wastes crew
on islands nobody can reach; the weakest frontline island is where the board is
actually going to be attacked.

### Online — groundwork, not a feature

`js/online.js` has room codes, room lifecycle, state push and subscribe, and
`serializeState()`. `Game` has `onlineMode`, `localPlayer`, `roomCode`,
`syncOnline()` and `applyRemoteState()`. **None of it is reachable from the
UI** — there is no Play Online button, and `onlineMode` is never set true, so
`syncOnline()` returns immediately everywhere it is called.

Treat it as groundwork. Issues #7–#11 cover wiring it up; #42 asks whether it
should be local-first per §6 (Backends) before any of that happens.

### CSS notes

- Player colour on the sidebar uses a data attribute, not a class:
  `.turns[data-player="player1"]` and friends set the inset box-shadow.
- `.space` carries `.player1`–`.player4` for ownership, `.clicked-space` for the
  selected attacker, `.new-space` for a valid target (attack phase) or a legal
  placement (rebuild phase).
- Hex and triangle boards style `.space` through `.hex-mode` / `.tri-mode` on
  `.map`, and read their dimensions from the custom properties `applyShapeMetrics()`
  sets.

## Known costs

Recorded so they're chosen, not stumbled into:

- **No tests and no typechecking** (stack exception). The mitigation is an
  injectable RNG, which is not done.
- **`CHANGELOG.md` is duplicated by hand** into `app.js` (`file://` can't fetch).
- **Board state lives in the DOM**, so nothing about combat is unit-testable.
- **No persistence** — a reload is a new game, and the win modal reloads
  deliberately as the simplest possible reset. Issue #39 covers making conquest
  outlive the session.
- **The online module is dead code** until #7–#11 or #42 resolve.
