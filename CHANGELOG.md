# Changelog

All notable changes to Island Pillagers are documented here.

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
