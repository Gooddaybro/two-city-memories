# 双城约会纪念册 · 第三阶段（强互动与云端秘密基地）实施计划

**Goal:** Deliver Stage 3 ("天天玩" interactive secret base): 0808 passcode identity claiming, live mood stickers, dual-city poke/signal launcher + heartbeat wall, wax-seal time capsules with shake-to-peek hints & sticker receipts, cloud-synced wishes/letters, and a turnkey Supabase Edge Function + dual-iPhone Bark push backend.

**Architecture:** Pure domain logic in `js/utils/stage3-logic.js` (TDD tested with `node --test`), Schema v2 extended backwards-compatibly in `data/defaults.js` and `js/schema.js`, native `fetch` cloud client in `js/cloud.js` (with graceful local-mode fallback when `apiBaseUrl` is empty), Supabase SQL + Edge Function in `supabase/`, and modular UI controllers `js/modules/signals.js` and `js/modules/capsules.js`.

**Tech Stack:** Vanilla ES Modules, CSS 3D/keyframe micro-animations, Supabase Postgres + Deno Edge Functions, Bark APNs Push API, Node.js `node --test`.

---

## Tasks
1. **Task 1 (TDD):** Write failing tests in `tests/stage3.test.mjs` → implement `js/utils/stage3-logic.js` + extend `data/defaults.js` & `js/schema.js` (`moods`, `signals`, `capsules`) → verify GREEN.
2. **Task 2:** Build Supabase backend (`supabase/schema.sql`, `supabase/functions/two-city-api/index.ts`), `data/cloud-config.js`, `js/cloud.js`, and 5-minute setup guide `docs/stage3-cloud-setup.md`.
3. **Task 3:** Build `js/modules/signals.js` (0808 identity claim modal, mood sticker editor, signal launcher with pulse animation, heartbeat wall + 1-click hug back) and integrate mood stickers into `js/modules/couple.js`.
4. **Task 4:** Build `js/modules/capsules.js` (wax-seal time capsule mailbox, locked shake-to-peek teaser, unlocked crack-open letter animation, sticker receipt stamp + note, compose new capsule modal) and upgrade `js/modules/wishlist.js` with author badges & cloud sync hooks.
5. **Task 5:** Wire Stage 3 CSS animations, HTML sections/modals, `js/app.js`, and `sw.js`.
6. **Task 6:** Run full verification (`node --test`, DOM ID check, JS syntax check, local HTTP subpath probe), commit cleanly, and push to `origin main`.
