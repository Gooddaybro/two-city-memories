import test from 'node:test';
import assert from 'node:assert/strict';

import { STORAGE_KEY_V2, MemoryStore } from '../js/store.js';
import { CORE_WISH_TEXT } from '../js/schema.js';

function createFakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
    _dump() {
      return Object.fromEntries(map.entries());
    }
  };
}

test('MemoryStore initializes defaults on empty storage and persists to v2 key', () => {
  const storage = createFakeStorage();
  const store = new MemoryStore(storage);

  const state = store.getState();
  assert.equal(state.couple.partners.beijing.name, '许金阳');
  assert.equal(state.couple.partners.lyg.name, '渐姝君');
  assert.ok(storage.getItem(STORAGE_KEY_V2));
});

test('MemoryStore automatically migrates legacy bj_lyg_* keys into v2 storage', () => {
  const storage = createFakeStorage({
    bj_lyg_wishes: JSON.stringify([{ id: 'old1', text: '旧心愿', done: true }]),
    bj_lyg_next_meet: JSON.stringify({ date: '2027-02-14', city: '连云港' })
  });

  const store = new MemoryStore(storage);
  const state = store.getState();

  assert.equal(state.wishes[0].text, CORE_WISH_TEXT);
  assert.equal(state.wishes[1].text, '旧心愿');
  assert.equal(state.nextMeet.city, '连云港');
  assert.ok(storage.getItem(STORAGE_KEY_V2));
});

test('MemoryStore recovers gracefully when stored JSON is corrupted', () => {
  const storage = createFakeStorage({
    [STORAGE_KEY_V2]: '{not valid json'
  });

  const store = new MemoryStore(storage);
  assert.equal(store.getState().couple.startDate, '2026-08-08T00:00:00');
});

test('MemoryStore update persists changes and notifies subscribers', () => {
  const storage = createFakeStorage();
  const store = new MemoryStore(storage);
  let notifications = 0;
  let lastCity = '';

  const unsubscribe = store.subscribe((next) => {
    notifications += 1;
    lastCity = next.nextMeet.city;
  });

  store.update((draft) => {
    draft.nextMeet.city = '青岛';
  });

  assert.equal(notifications, 1);
  assert.equal(lastCity, '青岛');
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY_V2)).nextMeet.city, '青岛');

  unsubscribe();
  store.update((draft) => {
    draft.nextMeet.city = '杭州';
  });
  assert.equal(notifications, 1);
});

test('MemoryStore exportPayload and importPayload round-trip cleanly and reject bad JSON safely', () => {
  const storage = createFakeStorage();
  const store = new MemoryStore(storage);

  store.update((draft) => {
    draft.couple.partners.beijing.birthday = '01-15';
  });

  const exported = store.exportPayload();

  const secondStore = new MemoryStore(createFakeStorage());
  secondStore.importPayload(exported);
  assert.equal(secondStore.getState().couple.partners.beijing.birthday, '01-15');

  assert.throws(() => secondStore.importPayload('{"bad": true}'), /无效/);
  assert.equal(secondStore.getState().couple.partners.beijing.birthday, '01-15');
});

test('MemoryStore reset restores defaults and clears custom mutations', () => {
  const storage = createFakeStorage();
  const store = new MemoryStore(storage);

  store.update((draft) => {
    draft.nextMeet.city = '临时城市';
    draft.settings.lockOnOpen = true;
  });

  store.reset();
  assert.equal(store.getState().nextMeet.city, '淄博 / 待定');
  assert.equal(store.getState().settings.lockOnOpen, false);
});
