# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GerdQuest: Isle Raid is a browser-based two-player land-grabbing strategy game with a pirate theme, inspired by the iOS game "Strategery." Players take turns attacking adjacent islands and rebuilding forces on a 4x4 grid.

## Running the Game

No build system, package manager, or server required. Open `index.html` directly in a browser:

```
open index.html
```

## Franchise standard

This is a GerdQuest title and follows the franchise bible:
https://github.com/NerdyToddGerdy/notequest_browser/blob/fix/runid-desync-and-rename/docs/franchise-bible.md

There is deliberately **no local copy** in this repo — a copy plus a link means the copy gets read and the link gets updated. Read the canonical document before changing visual identity, player-facing copy, naming, or versioning.

Two rules that bite constantly, repeated here so they apply even without fetching the bible:

- **The title is always "GerdQuest: Isle Raid", never "Isle Raid" alone.** A live Google Play island-conquest game called *Island Raid: Merge Tactics* owns the short name; the series prefix is what makes this title distinctive. Treat a bare "Isle Raid" in any user-facing text or metadata as a bug. (Issue #43.)
- **No NoteQuest-derived content belongs in this repo.** Only *Realm of Depths* adapts NoteQuest. This title adapts nothing, so it carries no NoteQuest credit either — crediting a source you didn't use implies a relationship that doesn't exist. (Bible §1.)

### Documented exception: the stack (bible §6)

**The bible's §6 stack conventions — React + TypeScript + Vite, strict TS, `npm run build` typechecking, Vitest, Playwright — are deliberately not followed here.** §6 permits this "unless a title has a real reason to differ"; this is the reason, recorded so it isn't rediscovered as an oversight.

**Why.** Those conventions are inherited from *Realm of Depths*, which needs them: it is a large React/TS application where a build step buys real safety. Isle Raid is a single `Game` class of DOM code with no dependencies, and its zero-toolchain property is a genuine feature rather than an accident — `open index.html` runs the current game, on any machine, with no install step, forever. Adopting the franchise stack would mean rewriting a working, deployed game for no player-visible benefit and no gameplay change.

**What this costs, honestly.** No typechecking. No test suite. `rollDice()` calls `Math.random()` directly, so combat logic cannot be exercised deterministically without patching globals. The `Die` component (§3) is React in the flagship repo and needs a vanilla port here regardless of this decision.

**What would reverse it.** Any of: extracting the shared `Die`/tokens/fonts package that §8.4 anticipates; the engine growing to where untested combat logic becomes a real liability; or a backend landing (§6 Backends) with state-serialisation logic worth testing. If the stack is revisited, generating the in-app release-notes modal from `CHANGELOG.md` at build time becomes possible too — see below.

**Not excused by this exception:** an injectable RNG. Making `rollDice()` take a seedable `() => number` is small, needs no build step, and is the single change that would make every future combat change testable. It remains worth doing.

### Documented exception: the board keeps the sea (bible §3)

§3's palette is adopted for **everything around the board** — body, sidebar, setup strip, buttons, panels, warning, dice readout, release-notes modal. Tokens are defined at the top of `css/style.css` with the franchise names (`--bg-0`, `--gold`, `--parchment`, `--ink`, `--danger`, `--focus`, …) and the canonical values.

**The map is exempt.** The ocean gradient (`--map-bg`), the island gradients and the per-player colours stay as they are. §3's house look is "a character sheet lit by torchlight in a dark stone room"; Isle Raid's subject is an open sea in daylight, and the board is the one place where that reads as identity rather than inconsistency. Framing the sea in franchise chrome makes it look deliberate — recolouring it to torchlight would leave an island game with no visible water.

Practically: **franchise tokens dress the chrome; the sea and the islands are Isle Raid's own.** If you are adding UI, use the tokens. If you are touching the board, leave the palette alone.

**No light mode.** §3 is committed dark, and that part is followed exactly — `color-scheme: dark`, no toggle, no `[data-theme="light"]` block. The v1.3.0 toggle (#12, #13) was removed in v1.5.0 for this reason. A stale `theme` key may remain in some players' `localStorage`; nothing reads it, so it is inert rather than migrated.

### Documented exception: versioning scope (bible §6)

§6 requires "every push to `main`" to carry a version bump, a dated `CHANGELOG.md` section, and a `vX.Y.Z` tag. Here that applies to **changes that affect the game**, not to repo hygiene — documentation, `CLAUDE.md`, CI, or tooling commits are not releases.

The reason is specific to this title: `CHANGELOG.md` is mirrored into a **player-facing** release-notes modal (click the version badge). A player reading "documented a stack exception" has been shown noise, not a release note. Everything that changes what a player sees or does still follows §6 exactly.

## Architecture

The entire game logic lives in `js/app.js` as a single ES module (`<script type="module">`). No jQuery, no globals — all state is encapsulated in a `Game` class.

### File Structure

- `index.html` — 4x4 grid of `.space` divs (`#space-0` to `#space-15`), sidebar with button/turns/dice panel/scores/rules
- `js/app.js` — Single ES module; one `Game` class + `game.init()` call at the bottom
- `css/style.css` — All styles including data-attribute player color rules

### Game Class (`js/app.js`)

**State (constructor):**
- `this.toggle` — `true` = player1's turn, `false` = player2's turn
- `this.currentPlayer` / `this.otherPlayer` — `'player1'` or `'player2'`
- `this.currentPhase` — `'attack'` or `'hire'`
- `this.gameRound` — increments at the start of each player1 turn
- `this.clickedIndex1` / `this.clickedUnits1` — selected attacking space
- `this.clickedIndex2` / `this.clickedUnits2` — selected target space
- `this.newSoldiers` — remaining soldiers to place during rebuild phase

**Event handling pattern:**
- One delegated listener on `.map` routes all space clicks through `handleSpaceClick(el)`
- One stable listener on `.button` reads `this.currentPhase` to call `hirePhase()` or `endOfRound()`
- No per-element listeners, no `.removeEventListener` needed

**Game flow:**
1. `init()` → `startAttackPhase()`
2. Player clicks own space with ≥2 units → `handleAttackClick()` selects it, highlights adjacent targets
3. Player clicks a highlighted target → `attackPhase()` → `rollDice()` or `claimLand()`
4. Player clicks "End Phase" → `hirePhase()` (rebuild)
5. Player distributes soldiers → clicks "End Phase" → `endOfRound()` → `startAttackPhase()` for next player

**Adjacency (`getAdjacentIndices`):**
- 4×4 grid; index math with boundary guards (no wrapping at edges)
- Up: `-4`, Down: `+4`, Left: `-1`, Right: `+1` — only added when row/col bounds allow

### CSS Classes on `.space` Divs

- `.player1` / `.player2` — ownership
- `.clicked-space` — currently selected attacking space
- `.new-space` — valid attack/rebuild target (highlighted with white border)

### Player color in sidebar

`.turns` uses `data-player="player1|player2"` attribute; CSS selectors style the box-shadow color:
```css
.turns[data-player="player1"] { box-shadow: inset 0 0 0 10px slategrey; }
.turns[data-player="player2"] { box-shadow: inset 0 0 0 10px #673131; }
```

### External Dependencies (CDN only)

- sweetalert2 6.4.4 — used for invalid-attack warning and win-condition modal
- Google Fonts: Cinzel Decorative, IM Fell English SC