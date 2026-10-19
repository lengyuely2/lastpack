# Save and session audit — 2026-10-19

All fixtures used temporary profiles and isolated servers. No live save was edited or credited.

- 227 unit/integration tests passed, including recovery, duplicate settlement/forge protection, elite loot, reward estimates and late four-client reconnects.
- Browser checks passed: direct camp navigation, bilingual menus, mobile overflow, real paid forge, backpack, inspection pause, automatic backup, file export/import, corrupt-file rejection, complete server-data-loss recovery, active-run restore guard.
- Accelerated fresh-profile campaigns: seed 17 balanced solo won at 20:33; seed 42 sustain solo won at 20:53; seed 77 four-player balanced won at 21:08. Seed 99 arcane preference lost at 10:17; it did not stall. These are sample runs, not a win-rate estimate.
- A separate four-player diagnostic fixture with deliberately boosted health tested the complete late session and won at 20:42. It is a load fixture, not balance evidence.
- The largest sampled authoritative snapshot was about 53 KB. The simulation bounded enemies, experience piles, effects, inventory and reserve weapons and verified finite player state.
- A real headless Edge browser additionally rendered a synthetic maximum-load scene (160 enemies, 500 XP piles, 320 effects) in all three quality modes. Timings vary with hardware and contention; they are drawing-cost measurements, not a promise of 60 FPS. Low quality omits ordinary rank labels; crowded scenes bound friendly decorative effects. Enemy projectiles and danger outlines remain fully rendered.

Reproduce from the repository root:

```powershell
node --test tests/*.test.mjs
node tests/long-session.mjs
$env:PLAYWRIGHT_MODULE='C:/Users/99479/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
node tests/ui-save-recovery.mjs
node tests/ui-camp-panels.mjs
node tests/ui-localization.mjs
node tests/ui-experience.mjs
node tests/ui-camp.mjs
node tests/ui-long-render.mjs
```

The Playwright module path is this workstation's bundled runtime; another workstation can point it to its Playwright installation. JSON metrics and screenshots are generated in ignored `docs/` files.

Local backups contain legacy, discoveries, currencies and transaction ledgers. They do not contain an active battle. An existing server profile takes precedence over an older file. Clearing browser storage removes its backup; an exported file remains portable. The server validates file shape, limits, known game keys and a corruption checksum. Portable offline saves are not evidence of a competitive score.
