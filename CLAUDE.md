# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Island Pillaging is a browser-based two-player land-grabbing strategy game with a pirate theme, inspired by the iOS game "Strategery." Players take turns attacking adjacent islands and rebuilding forces on a 4x4 grid.

## Running the Game

No build system, package manager, or server required. Open `index.html` directly in a browser:

```
open index.html
```

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