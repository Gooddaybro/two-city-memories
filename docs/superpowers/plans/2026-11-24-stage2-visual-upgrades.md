# 双城约会纪念册 · 第二阶段（拉颜值）实施计划

**Goal:** Deliver the 5 high-impact visual and interactive upgrades (dual-city live weather bar, SVG animated route map + mileage count-up + date picker card, authentic Fuxing rail tickets with stamp animation, mini spinning vinyl player, and restrained reveal/wish-confetti motion) on top of Stage 1 ESM architecture.

**Architecture:** Extract all pure calculations (weather parsing, geo projection, stats aggregation, ticket defaults, date-idea picking) into `js/utils/stage2-logic.js` with TDD coverage in `tests/stage2.test.mjs`, then wire modular UI controllers (`weather.js`, `map.js`, `vinyl.js`, `effects.js`, upgraded `tickets.js` & `wishlist.js`) into `index.html` and `js/app.js`.

**Tech Stack:** Vanilla ES Modules, inline SVG, Open-Meteo REST API, Web Audio API, Canvas 2D (micro confetti), CSS animations, Node.js `node --test`.

---

## Tasks
1. **Task 1 (TDD):** Write failing tests in `tests/stage2.test.mjs` → implement `js/utils/stage2-logic.js` + extend `data/defaults.js` & `js/schema.js` (`trainNo`, `seat`, `ticketTheme`, `gate`) → verify GREEN.
2. **Task 2:** Implement `js/modules/weather.js` (Open-Meteo live Beijing & Lianyungang weather bar, 15m cache, witty tip, sky glow mood).
3. **Task 3:** Implement `js/modules/map.js` (Eastern China SVG map, animated glowing rail arcs, clickable city popover with tickets & photos, count-up mileage stats, interactive date-idea scratch/draw card).
4. **Task 4:** Upgrade `js/modules/tickets.js` & `assets/css/main.css` (Fuxing blue/pink magnetic ticket layout, inline deterministic QR SVG, stamp-slam animation on check-in).
5. **Task 5:** Implement `js/modules/vinyl.js` (mini vinyl player with Web Audio gentle music-box loop + `assets/audio/README.md`) and `js/modules/effects.js` (scroll reveal + wish-complete golden confetti).
6. **Task 6:** Wire all Stage 2 sections/modals into `index.html`, `js/app.js`, `sw.js`, and verify via `node --test` + syntax/DOM/HTTP subpath smoke script + commit & push to `origin main`.
