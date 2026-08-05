# Fonts

Self-hosted `woff2`, latin subset. No CDN — bible §3.

The semantic split is load-bearing: **display for voice, body for fiction, mono for anything a player counts.** Unit counts, dice totals, scores and the round counter are always mono and tabular-lined.

| File | Family | Role | Token |
| --- | --- | --- | --- |
| `metamorphous-400.woff2` | Metamorphous | Wordmark, headings, buttons | `--font-display` |
| `spectral-400.woff2`, `spectral-400-italic.woff2`, `spectral-600.woff2` | Spectral | Prose, flavour, descriptions | `--font-body` |
| `jetbrains-mono.woff2` | JetBrains Mono | Numbers, stats, labels, eyebrows | `--font-mono` |

`jetbrains-mono.woff2` is a **variable** font — one file covers weights 400–700, which is why there is no separate 700 file.

## Licensing

All three are licensed under the SIL Open Font License 1.1. The licence text is in `OFL.txt`; it is the same body for all three, and the copyright holders are:

- **Metamorphous** — Copyright (c) 2011–2012 Sorkin Type Co (www.sorkintype.com)
- **Spectral** — Copyright 2017 The Spectral Project Authors (https://github.com/productiontype/Spectral)
- **JetBrains Mono** — Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono)

The OFL permits redistribution provided the licence travels with the fonts, which is why `OFL.txt` lives here rather than being referenced by link.

## Replacing or adding a face

Fetch the latin subset from Google Fonts with a modern browser UA (the API serves `woff2` only to browsers that support it), then add a matching `@font-face` block at the top of `css/style.css`. Keep the latin subset unless a real need appears — the full set is several times the size for glyphs this game never renders.
