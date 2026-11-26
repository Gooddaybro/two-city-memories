import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SCHEMA_VERSION,
  CORE_WISH_TEXT,
  createDefaultState,
  normalizeState,
  migrateLegacyStorage,
  migrateBackupPayload,
  getUnlockedCities
} from '../js/schema.js';

test('createDefaultState contains accurate couple info, 2026-08-08 start date, no hardcoded passcode, and pinned core wish', () => {
  const state = createDefaultState();

  assert.equal(state.schemaVersion, SCHEMA_VERSION);
  assert.equal(state.schemaVersion, 2);
  assert.equal(state.couple.startDate, '2026-08-08T00:00:00');
  assert.equal(state.couple.passcode, '');
  assert.equal(state.settings.lockOnOpen, false);

  assert.equal(state.couple.partners.beijing.name, '许金阳');
  assert.equal(state.couple.partners.beijing.nickname, '小狗');
  assert.equal(state.couple.partners.beijing.city, '北京');
  assert.equal(state.couple.partners.beijing.birthday, '07-31');

  assert.equal(state.couple.partners.lyg.name, '渐姝君');
  assert.equal(state.couple.partners.lyg.nickname, '小猪');
  assert.equal(state.couple.partners.lyg.city, '连云港');
  assert.equal(state.couple.partners.lyg.birthday, '04-09');

  assert.equal(state.wishes[0].text, CORE_WISH_TEXT);
  assert.equal(state.wishes[0].pinned, true);
  assert.equal(state.tickets[0].date, '2026.08.08 – 08.09');
  assert.equal(state.photos.length, 7);
  assert.equal(state.photos[0].city, '枣庄');
  assert.equal(state.photos[0].date, '2026.08.08');
  assert.equal(state.photos[0].path, './images/01_zaozhuang_twin_towers.webp');
  assert.equal(state.milestones.length >= 4, true);
  assert.equal(state.letters.beijing.authorName, '许金阳');
  assert.equal(state.letters.lyg.authorName, '渐姝君');
});

test('normalizeState upgrades legacy placeholder-only photos and corrects Zaozhuang twin towers photo', () => {
  const upgraded = normalizeState({
    photos: [
      { id: 'p1', city: '枣庄', title: '旧占位', path: './images/01_zaozhuang_0808.webp' },
      { id: 'p2', city: '济南', title: '旧占位', path: './images/02_jinan_09.webp' }
    ]
  });
  assert.equal(upgraded.photos.length, 7);
  assert.equal(upgraded.photos[0].path, './images/01_zaozhuang_twin_towers.webp');

  const fixed = normalizeState({
    photos: [
      { id: 'p6', city: '徐州', title: '夜色长桥 · 彭城', path: './images/06_xuzhou_night_bridge.webp' }
    ]
  });
  assert.equal(fixed.photos[0].city, '枣庄');
  assert.equal(fixed.photos[0].date, '2026.08.08');
  assert.equal(fixed.photos[0].path, './images/01_zaozhuang_twin_towers.webp');
});

test('createDefaultState returns deep clones so mutations do not leak across calls', () => {
  const first = createDefaultState();
  first.wishes.push({ id: 'extra', text: 'temp', done: false });
  first.couple.partners.beijing.name = 'changed';

  const second = createDefaultState();
  assert.equal(second.couple.partners.beijing.name, '许金阳');
  assert.equal(second.wishes.some((w) => w.id === 'extra'), false);
});

test('normalizeState fills missing fields and preserves custom values', () => {
  const normalized = normalizeState({
    couple: {
      partners: {
        beijing: { birthday: '05-20', tags: ['科研', '摄影'] }
      }
    },
    settings: { lockOnOpen: true },
    tickets: [
      { id: 't99', date: '2027.02', code: 'ZBO', route: '北京 → 淄博', subtitle: '烧烤之旅', desc: '出发', status: '已检票' }
    ]
  });

  assert.equal(normalized.schemaVersion, 2);
  assert.equal(normalized.couple.partners.beijing.name, '许金阳');
  assert.equal(normalized.couple.partners.beijing.birthday, '05-20');
  assert.deepEqual(normalized.couple.partners.beijing.tags, ['科研', '摄影']);
  assert.equal(normalized.settings.lockOnOpen, true);
  assert.equal(normalized.tickets.length, 1);
  assert.equal(normalized.tickets[0].toCity, '淄博');
  assert.ok(Array.isArray(normalized.tickets[0].tags));
});

test('migrateLegacyStorage upgrades old bj_lyg_* entries and prepends pinned core wish if missing', () => {
  const migrated = migrateLegacyStorage({
    bj_lyg_tickets: JSON.stringify([
      { id: 't1', date: '2026.08.07 – 08.09', code: 'ZZG', route: '北京 / 连云港 → 枣庄', subtitle: '初遇', desc: '开始', status: '已检票' }
    ]),
    bj_lyg_wishes: JSON.stringify([
      { id: 'w1', text: '去海边看日落', done: true }
    ]),
    bj_lyg_letters: JSON.stringify({
      beijing: { title: '旧标题', meta: '北京', text: '自定义来信内容' }
    }),
    bj_lyg_next_meet: JSON.stringify({ date: '2027-01-01', city: '北京' })
  });

  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.tickets.length, 1);
  assert.equal(migrated.tickets[0].toCity, '枣庄');
  assert.equal(migrated.wishes[0].text, CORE_WISH_TEXT);
  assert.equal(migrated.wishes[0].pinned, true);
  assert.equal(migrated.wishes[1].text, '去海边看日落');
  assert.equal(migrated.letters.beijing.text, '自定义来信内容');
  assert.equal(migrated.letters.beijing.authorName, '许金阳');
  assert.equal(migrated.letters.lyg.authorName, '渐姝君');
  assert.equal(migrated.nextMeet.city, '北京');
});

test('migrateBackupPayload accepts both legacy v1 and v2 JSON and rejects invalid payloads', () => {
  const v1 = migrateBackupPayload({
    tickets: [{ id: 't1', route: '北京 → 济南', code: 'TNA', date: '2026.09', subtitle: '泉城', desc: '重逢', status: '已检票' }],
    wishes: [{ id: 'w1', text: '一起看雪', done: false }],
    nextMeet: { date: '2026-12-31', city: '淄博' }
  });
  assert.equal(v1.schemaVersion, 2);
  assert.equal(v1.tickets[0].toCity, '济南');
  assert.equal(v1.wishes[0].text, CORE_WISH_TEXT);

  const v2Input = createDefaultState();
  v2Input.nextMeet.city = '青岛';
  const v2 = migrateBackupPayload(v2Input);
  assert.equal(v2.nextMeet.city, '青岛');

  assert.throws(() => migrateBackupPayload(null), /无效/);
  assert.throws(() => migrateBackupPayload({ foo: 'bar' }), /无效/);
});

test('getUnlockedCities dynamically extracts unique destination cities from checked-in tickets', () => {
  const cities = getUnlockedCities([
    { route: '北京 / 连云港 → 枣庄', toCity: '枣庄', status: '已检票' },
    { route: '双城专列 → 济南', toCity: '济南', status: '已检票' },
    { route: '北京 → 济南', toCity: '济南', status: '已检票' },
    { route: '双城 → 淄博', toCity: '淄博', status: '待出票' }
  ]);
  assert.deepEqual(cities, ['枣庄', '济南']);
});
