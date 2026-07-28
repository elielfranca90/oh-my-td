# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is a single game project ("Oh My TD"), but **all real code lives in the `tower-defense-2d/` subdirectory**. The repo root only holds a proxy `package.json`, Vercel config, and docs. Root npm scripts just `cd tower-defense-2d` and re-run there, so for day-to-day work `cd tower-defense-2d` first and run commands from inside it.

- `tower-defense-2d/` — the Vite + TypeScript + HTML5 Canvas game (this is where you work)
- `docs/` — `ARCHITECTURE_CANVAS.md`, `PRD.md`, `TECH_SPEC.md`
- `scripts/generate-asset.ts` — standalone asset-generation CLI, run from root via `npm run generate-asset -- --prompt "..." --style icon` (uses `npx tsx`, not part of the build)

## Commands

Run these from `tower-defense-2d/`:

```bash
npm run dev        # Vite dev server
npm run build      # tsc (typecheck) THEN vite build — the typecheck must pass to build
npm run preview    # preview the production build
npm run test       # vitest run (single pass, not watch)
```

There is **no ESLint or Prettier**. Type safety is the lint gate: `tsconfig.json` enables `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `erasableSyntaxOnly`, and `verbatimModuleSyntax`, and `npm run build` runs `tsc` first — so unused variables/params or non-erasable TS syntax will fail the build. To typecheck without building: `npx tsc` (the config is `noEmit`).

Testing (Vitest + `happy-dom`):
```bash
npx vitest run tests/tower.test.ts          # a single test file
npx vitest run -t "cycle targeting"         # tests matching a name
npx vitest                                  # watch mode
```

## Architecture

Native HTML5 Canvas 2D engine — no game framework. Entry point `src/main.ts` constructs `Game2D` and calls `.run()`.

**`Game2D` (`src/engine/Game.ts`) is the central orchestrator.** It creates the canvas, owns every manager, runs the single `requestAnimationFrame` loop, and handles all mouse/touch input. Understand this file first.

- **Fixed internal resolution: 840×600, grid 14 cols × 10 rows, 60px tiles.** CSS scales the canvas element; `getCanvasMousePosition()` converts client coords back to the fixed internal space, so always reason in the 840×600 grid, never in screen pixels.
- **Speed multiplier (1x/2x/4x) is implemented by sub-stepping**, not by scaling delta time: the loop runs the fixed update block `N` times per rendered frame (`Game.run()`, the `for (step…)` loop). Rendering happens once per frame regardless.
- **Render order in the loop is deliberate and layered**: map → particles → ghost placement → towers → enemies → projectiles → spell targeting → FX → achievement toasts → pause overlay. Screen-shake is applied via a `ctx.translate` wrapping the whole scene.

**Manager pattern with positional constructor DI.** Each subsystem is a `*Manager` class in `src/engine/`. They are instantiated and wired together in `Game.initGame()` by passing dependencies positionally into constructors (there is no DI container). `initGame()` is re-run on start, map change, challenge-mode change, and restart — it tears down and recreates all managers. **To add a cross-manager dependency, thread it through the constructor call in `initGame()`** (later params are often optional with `setX()` fallback setters, e.g. `TowerManager2D`).

**`EventBus` (`src/engine/EventBus.ts`) is a global singleton pub/sub** (`EventBus.getInstance()`). `GameState` emits string-keyed events (`gold:change`, `hp:change`, `wave:change`, `status:change`, `pause:change`) that the UI subscribes to. Gameplay managers mostly talk via direct references; the EventBus is primarily the GameState→UI channel.

**`UIManager` (`src/ui/UIManager.ts`, ~1400 lines) is the DOM overlay**, rendered into `#ui-container` while the canvas lives in `#game-area` (both in `tower-defense-2d/index.html`). Its `.update()` is called every frame from the game loop. It handles the responsive/mobile layout (tab bar, zero-scroll `100dvh`, safe-area insets).

**`SpriteManager` (`src/engine/SpriteManager.ts`) is a singleton that procedurally generates all sprites and biome tile atlases into offscreen canvases at construction** — most in-game art is drawn in code, not loaded from image files (the SVGs in `public/assets/` are mainly toolbar icons). `MapManager2D` stores the 3 maps as hardcoded 2D `TileType` grids with per-map waypoint paths (MAP_2 has dual spawn paths).

**Audio** (`AudioManager`) is synthesized live via the Web Audio API. Browsers block audio until a user gesture, so `Game.setupListeners()` installs one-shot `click`/`keydown`/`touchstart` unlock handlers — keep that unlock path intact when touching audio.

## Persistence & backend (local-first)

The game is fully playable offline; the backend is optional and additive.

- **localStorage is the source of truth.** Keys: `td2d_stars_v1`, `td2d_talents_v1` (TalentManager), `td2d_sync_queue_v1` (the sync outbox), plus the high score in `AnalyticsManager`.
- **`DatabaseManager` (`src/engine/DatabaseManager.ts`) wraps Supabase and degrades gracefully.** If `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are missing (see `.env.example`; `.env` is gitignored), `client` is `null` and everything runs in "local-offline mode". It uses **anonymous auth** and an **outbox/queue pattern**: writes are queued into localStorage and flushed to Supabase in the background (`flushSyncQueue`), targeting the `player_state`, `player_achievements`, and `runs` tables. The leaderboard reads the `top_20_leaderboard` view.
- **Managers that persist to the backend dual-write**: they save to localStorage and enqueue a sync. On startup they merge remote vs local with a per-field `Math.max` (see `TalentManager.syncWithRemote`), then re-queue if local was ahead. Preserve this merge semantics when adding new synced state.
- **`supabase/schema.sql`** is the full Postgres schema (tables + RLS policies + `handle_new_user` trigger + leaderboard view). Update it alongside any change to `DatabaseManager`'s table/column expectations.

## Deployment

Vercel (`vercel.json`): build command `cd tower-defense-2d && npm run build`, output `tower-defense-2d/dist`. `VITE_SUPABASE_*` env vars must be set in the Vercel project for the backend to activate in production.

## Conventions

- **Comments, docstrings, git commit messages, and the docs are in Brazilian Portuguese.** Code identifiers (managers, enemy/tower/challenge-mode constants like `STANDARD`, `SOLAR_PRISM`, `MORTE_CERTA`) are in English. Match this when editing.
- Shared types live in `src/types.ts` (`EnemyType`, `TowerType`, `ChallengeMode`, entity interfaces). Add new gameplay entity shapes there.
- Manager/entity classes carrying the 2D engine identity are suffixed `2D` (`Game2D`, `MapManager2D`, `EnemyManager2D`, `Tower2D`) — a leftover distinction from the earlier Three.js MVP.
