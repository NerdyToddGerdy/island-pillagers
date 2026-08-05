# Changelog

All notable changes to GerdQuest: Isle Raid are documented here.

## [1.8.1] - 2026-08-05

### Changed
- Sidebar widened from 240px to 310px (260px below 1100px wide). The rules panel and dice readout were setting in narrow, ragged lines
- The board is unaffected at every size checked: it is limited by the height left after the chrome, not by width, so the sidebar took the empty space beside it rather than any of the board

## [1.8.0] - 2026-08-05

### Changed
- The game fits one screen. `.container` is a three-column grid — wordmark and setup strip across the top, board and sidebar below, footer at the foot — and the body no longer scrolls above 680px wide
- The board is square and sized from whichever dimension of its cell is smaller, using container query units, so it fills the height available rather than sitting at a fixed 700px. No resize listener and no hardcoded guess at how tall the chrome is
- Island numbers scale with the board, so a 6×6 on a laptop still reads
- The sidebar scrolls inside itself on short screens instead of pushing the page down
- Under 680px the one-screen layout is dropped on purpose: the layout stacks and the page scrolls, which is the right shape for a phone

### Fixed
- Hex and triangle cells are pixel-sized in JS, so they went stale whenever the window changed. They are now recomputed in place on resize — the game keeps its state, the board just refits

## [1.7.0] - 2026-08-05

### Changed
- Every player-facing string rewritten to the franchise voice — plain, present tense, no exclamation marks, never cute (#38)
- Terminology settled: the board holds **islands**, and the pieces on them are **crew**. Previously the same things were called spaces, soldiers, pirates, mateys, seadogs and units, sometimes in the same sentence
- The Attack Phase panel now states the combat rule outright: each side rolls one die per crew and the higher total takes the island. Bible §4 asks that the real odds be told when it costs nothing, and this was never explained anywhere
- Combat outcomes read as statements rather than cheers — "The island changes hands." / "The island holds."
- Victory text no longer congratulates; it reports

### Fixed
- Red is reserved for harm again: only a *failed* raid shows the danger colour. Both outcomes previously rendered red

## [1.6.0] - 2026-08-04

### Changed
- Wordmark restructured to the GerdQuest series format — one `<h1>` with the series prefix small, uppercase and letter-spaced above the installment name (#33)
- Typography replaced with the franchise faces: Metamorphous (display), Spectral (body), JetBrains Mono (numbers) (#36)
- Numbers a player counts — island unit counts, dice totals, scores, round counter, version badge — are now mono and tabular-lined, so columns stop shifting as values change
- Flag image is now decorative (`alt=""`), keeping the accessible name of the heading to the title itself

### Added
- `fonts/` — five self-hosted woff2 faces (latin subset, 105 KB total) with `OFL.txt` and a README recording each family's licence and role
- `js/vendor/` — sweetalert2 6.4.4, now served locally, **including its stylesheet, which was never loaded before**

### Removed
- Google Fonts CDN link (Cinzel Decorative, IM Fell English SC)
- jsDelivr CDN script tag for sweetalert2

## [1.5.0] - 2026-08-04

### Changed
- Adopted the GerdQuest franchise palette for all chrome — body, sidebar, setup strip, buttons, warning, dice panel and release-notes modal now use the shared torchlight tokens (#34)
- Text on the parchment panels switched to ink tones. The round counter, dice readout and modal heading were previously pale-on-pale and hard to read

### Added
- Visible focus ring on every interactive element, per bible §3

### Removed
- Light/dark theme toggle and the `[data-theme="light"]` palette — a GerdQuest game ships committed dark (#35)

### Kept as a documented exception
- The ocean-gradient map, island colours and per-player colours. The board is Isle Raid's own identity; only the chrome is franchise-standard. Recorded in `CLAUDE.md`

## [1.4.0] - 2026-08-04

### Changed
- Renamed from "Island Pillaging" to **GerdQuest: Isle Raid**, adopting the GerdQuest series prefix
- Page title, in-game heading, README and CHANGELOG updated to the new name
- README live-site link corrected — it pointed at a domain this game has never deployed to

## [1.3.0] - 2026-03-05

### Added
- Light/dark mode toggle with system preference detection and localStorage persistence (#13)

### Changed
- All colors refactored to CSS custom properties for clean theme switching (#12)

## [1.2.0] - 2026-03-05

### Added
- Fortified Islands mode: unclaimed spaces start with 1–6 random defenders (#24)

## [1.1.1] - 2026-03-04

### Changed
- Scores and score bar now based on total units owned, not island count
- Removed unclaimed segment from score bar (units are always player-owned)

## [1.1.0] - 2026-03-04

### Added
- Proportional island score bar spanning the full game width
- Bar segments colored per player (matching island colors) plus an unclaimed segment
- Segments animate smoothly on width changes; unused player slots hidden automatically

## [1.0.3] - 2026-03-04

### Changed
- Setup strip grouped into labeled sections (Map Size, Players, Shape, Bots)
- Bot difficulty controls laid out as per-player rows with color-coded labels
- End Phase button upgraded: semantic `<button>` element, hover glow, phase-aware label (⚔ End Attack / ⚓ End Rebuild)

## [1.0.2] - 2026-03-04

### Changed
- Custom parchment-styled release notes modal replaces broken Swal.fire() call
- Version badge in footer enlarged and styled with gold border

## [1.0.1] - 2026-03-04

### Changed
- Inline warning replaces bottom-of-screen sweetalert2 modal for attack errors
- Warning uses parchment texture, muted burgundy text, blinking border, auto-dismisses after 2.5s

## [1.0.0] - 2026-03-04

### Added
- Initial two-player pirate land-grabbing game with attack and hire phases
- Dice-based combat with sweetalert2 modals for invalid moves and win detection
- Configurable map size: 4×4, 5×5, 6×6
- Three grid shapes: Square, Hexagon, Triangle (each with correct adjacency logic)
- 2–4 player support with per-player elimination tracking
- Bot opponent with Off / Easy / Medium / Hard difficulty levels
- Round counter and dice result panel in the sidebar
- Fully responsive layout across mobile, tablet, and desktop
- Pirate theme: ocean gradient map, Cinzel Decorative font, skull/flag imagery
