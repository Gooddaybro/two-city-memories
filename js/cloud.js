import { CLOUD_CONFIG } from '../data/cloud-config.js';
import { validateClaimPasscode } from './utils/stage3-logic.js';

const IDENTITY_KEY = 'two_city_identity_v1';
const CUSTOM_API_KEY = 'two_city_cloud_api_override_v1';

export class CloudBridge {
  constructor(store) {
    this.store = store;
    this.identity = this.#loadIdentity();
    this.syncListeners = new Set();
    this.lastSyncAt = null;
    this.online = false;
  }

  getApiBaseUrl() {
    let override = '';
    try {
      override = window.localStorage.getItem(CUSTOM_API_KEY) || '';
    } catch {
      override = '';
    }
    const raw = (override || CLOUD_CONFIG.apiBaseUrl || '').trim();
    return raw.replace(/\/+$/, '');
  }

  isCloudConfigured() {
    return Boolean(this.getApiBaseUrl());
  }

  getIdentity() {
    return this.identity;
  }

  #loadIdentity() {
    try {
      const raw = window.localStorage.getItem(IDENTITY_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.partner === 'beijing' || parsed.partner === 'lyg')) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  #saveIdentity(identity) {
    this.identity = identity;
    try {
      if (identity) {
        window.localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
      } else {
        window.localStorage.removeItem(IDENTITY_KEY);
      }
    } catch {
      // Ignore private-mode storage error
    }
    this.#notifyStatus();
  }

  logout() {
    this.#saveIdentity(null);
  }

  onStatusChange(fn) {
    this.syncListeners.add(fn);
    return () => this.syncListeners.delete(fn);
  }

  #notifyStatus() {
    const status = {
      identity: this.identity,
      cloudConfigured: this.isCloudConfigured(),
      online: this.online,
      lastSyncAt: this.lastSyncAt
    };
    for (const fn of this.syncListeners) fn(status);
  }

  async #request(path, options = {}) {
    const base = this.getApiBaseUrl();
    if (!base) throw new Error('Cloud API not configured');
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (this.identity?.token) {
      headers.Authorization = `Bearer ${this.identity.token}`;
    }
    const resp = await fetch(`${base}${path}`, { ...options, headers });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(data?.error || `云端请求失败 (${resp.status})`);
    }
    return data;
  }

  async claimIdentity(partner, passcode) {
    const expected = this.store.getState().couple.passcode || '0808';
    if (!this.isCloudConfigured()) {
      const check = validateClaimPasscode(partner, passcode, expected);
      if (!check.ok) throw new Error(check.error);
      this.#saveIdentity({ partner, token: '', mode: 'local', claimedAt: new Date().toISOString() });
      return { ok: true, mode: 'local', partner };
    }

    const res = await this.#request('/auth/claim', {
      method: 'POST',
      body: JSON.stringify({ partner, passcode })
    });
    this.#saveIdentity({ partner: res.partner, token: res.token, mode: 'cloud', claimedAt: new Date().toISOString() });
    this.online = true;
    this.#notifyStatus();
    return { ok: true, mode: 'cloud', partner: res.partner };
  }

  async syncFromCloud() {
    if (!this.isCloudConfigured()) {
      this.#notifyStatus();
      return false;
    }
    try {
      const data = await this.#request('/sync', { method: 'GET' });
      this.store.update((draft) => {
        if (data.moods?.beijing) draft.moods.beijing = data.moods.beijing;
        if (data.moods?.lyg) draft.moods.lyg = data.moods.lyg;
        if (Array.isArray(data.wishes) && data.wishes.length) draft.wishes = data.wishes;
        if (Array.isArray(data.signals) && data.signals.length) draft.signals = data.signals;
        if (Array.isArray(data.capsules) && data.capsules.length) draft.capsules = data.capsules;
        if (data.letters?.beijing?.text) {
          draft.letters.beijing.text = data.letters.beijing.text;
          draft.letters.beijing.updatedAt = data.letters.beijing.updatedAt || draft.letters.beijing.updatedAt;
          draft.letters.beijing.receipt = data.letters.beijing.receipt || draft.letters.beijing.receipt;
        }
        if (data.letters?.lyg?.text) {
          draft.letters.lyg.text = data.letters.lyg.text;
          draft.letters.lyg.updatedAt = data.letters.lyg.updatedAt || draft.letters.lyg.updatedAt;
          draft.letters.lyg.receipt = data.letters.lyg.receipt || draft.letters.lyg.receipt;
        }
      });
      this.online = true;
      this.lastSyncAt = new Date().toISOString();
      this.#notifyStatus();
      return true;
    } catch {
      this.online = false;
      this.#notifyStatus();
      return false;
    }
  }

  async pushMood(moodPayload) {
    if (!this.isCloudConfigured() || !this.identity?.token) return { localOnly: true };
    return this.#request('/mood', { method: 'POST', body: JSON.stringify(moodPayload) });
  }

  async pushSignal(signalPayload) {
    if (!this.isCloudConfigured() || !this.identity?.token) return { localOnly: true };
    return this.#request('/signals', { method: 'POST', body: JSON.stringify(signalPayload) });
  }

  async pushHugBack(id) {
    if (!this.isCloudConfigured() || !this.identity?.token) return { localOnly: true };
    return this.#request('/signals/hug', { method: 'POST', body: JSON.stringify({ id }) });
  }

  async pushWishAdd(wish) {
    if (!this.isCloudConfigured() || !this.identity?.token) return { localOnly: true };
    return this.#request('/wishes', { method: 'POST', body: JSON.stringify(wish) });
  }

  async pushWishToggle(wish) {
    if (!this.isCloudConfigured() || !this.identity?.token) return { localOnly: true };
    return this.#request('/wishes/toggle', { method: 'POST', body: JSON.stringify(wish) });
  }

  async pushWishDelete(id) {
    if (!this.isCloudConfigured() || !this.identity?.token) return { localOnly: true };
    return this.#request(`/wishes/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  async pushCapsuleCreate(capsule) {
    if (!this.isCloudConfigured() || !this.identity?.token) return { localOnly: true };
    return this.#request('/capsules', { method: 'POST', body: JSON.stringify(capsule) });
  }

  async pushCapsuleOpen(id) {
    if (!this.isCloudConfigured() || !this.identity?.token) return { localOnly: true };
    return this.#request('/capsules/open', { method: 'POST', body: JSON.stringify({ id }) });
  }

  async pushCapsuleReceipt(payload) {
    if (!this.isCloudConfigured() || !this.identity?.token) return { localOnly: true };
    return this.#request('/capsules/receipt', { method: 'POST', body: JSON.stringify(payload) });
  }

  async pushLetterUpdate(author, text) {
    if (!this.isCloudConfigured() || !this.identity?.token) return { localOnly: true };
    return this.#request('/letters/update', { method: 'POST', body: JSON.stringify({ author, text }) });
  }

  async pushLetterReceipt(payload) {
    if (!this.isCloudConfigured() || !this.identity?.token) return { localOnly: true };
    return this.#request('/letters/receipt', { method: 'POST', body: JSON.stringify(payload) });
  }
}
