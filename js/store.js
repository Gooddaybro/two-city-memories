import {
  createDefaultState,
  normalizeState,
  migrateLegacyStorage,
  migrateBackupPayload
} from './schema.js';

export const STORAGE_KEY_V2 = 'two_city_memories_v2';
export const THEME_KEY = 'bj_lyg_theme';

const LEGACY_KEYS = [
  'bj_lyg_tickets',
  'bj_lyg_wishes',
  'bj_lyg_letters',
  'bj_lyg_next_meet'
];

function createInMemoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key)
  };
}

function safeGet(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage, key, value) {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemove(storage, key) {
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export class MemoryStore {
  constructor(storageAdapter) {
    this.storage = storageAdapter || createInMemoryStorage();
    this.listeners = new Set();
    this.state = this.#loadInitialState();
  }

  #loadInitialState() {
    const rawV2 = safeGet(this.storage, STORAGE_KEY_V2);
    if (rawV2) {
      try {
        const parsed = JSON.parse(rawV2);
        const normalized = normalizeState(parsed);
        return normalized;
      } catch {
        const fallback = createDefaultState();
        this.#persist(fallback);
        return fallback;
      }
    }

    const legacyDump = {};
    let hasLegacy = false;
    for (const key of LEGACY_KEYS) {
      const value = safeGet(this.storage, key);
      if (value !== null && value !== undefined) {
        legacyDump[key] = value;
        hasLegacy = true;
      }
    }

    const initial = hasLegacy ? migrateLegacyStorage(legacyDump) : createDefaultState();
    this.#persist(initial);
    return initial;
  }

  #persist(nextState) {
    safeSet(this.storage, STORAGE_KEY_V2, JSON.stringify(nextState));
  }

  #notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  update(mutator) {
    const draft = JSON.parse(JSON.stringify(this.state));
    const maybeReturned = mutator(draft);
    const candidate = maybeReturned && typeof maybeReturned === 'object' ? maybeReturned : draft;
    candidate.updatedAt = new Date().toISOString();
    this.state = normalizeState(candidate);
    this.#persist(this.state);
    this.#notify();
    return this.state;
  }

  exportPayload() {
    return JSON.stringify(this.state, null, 2);
  }

  importPayload(raw) {
    const migrated = migrateBackupPayload(raw);
    migrated.updatedAt = new Date().toISOString();
    this.state = migrated;
    this.#persist(this.state);
    this.#notify();
    return this.state;
  }

  reset() {
    safeRemove(this.storage, STORAGE_KEY_V2);
    for (const key of LEGACY_KEYS) {
      safeRemove(this.storage, key);
    }
    this.state = createDefaultState();
    this.#persist(this.state);
    this.#notify();
    return this.state;
  }

  clearPrivateCache() {
    const defaults = createDefaultState();
    return this.update((draft) => {
      draft.moods = defaults.moods;
      draft.signals = [];
      draft.capsules = [];
      draft.cloudPhotos = [];
      draft.wishes = defaults.wishes.slice(0, 1);
      draft.letters = defaults.letters;
    });
  }

  getTheme() {
    return safeGet(this.storage, THEME_KEY) === 'light' ? 'light' : 'dark';
  }

  setTheme(theme) {
    const normalized = theme === 'light' ? 'light' : 'dark';
    safeSet(this.storage, THEME_KEY, normalized);
    return normalized;
  }
}

export function createBrowserStore() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const probeKey = '__two_city_probe__';
      window.localStorage.setItem(probeKey, '1');
      window.localStorage.removeItem(probeKey);
      return new MemoryStore(window.localStorage);
    }
  } catch {
    // Fallback to in-memory storage when browser blocks localStorage
  }
  return new MemoryStore(createInMemoryStorage());
}
