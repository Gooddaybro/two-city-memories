import { CLOUD_CONFIG } from '../data/cloud-config.js';
import {
  validateClaimPasscode,
  isPrivateAccessGranted,
  computeCloudSyncFingerprint,
  applyCloudSyncDraft
} from './utils/stage3-logic.js';
import { normalizeState } from './schema.js';

const IDENTITY_KEY = 'two_city_identity_v1';
const CUSTOM_API_KEY = 'two_city_cloud_api_override_v1';
const DEFAULT_POLL_INTERVAL_MS = 45_000;

export class CloudBridge {
  constructor(store) {
    this.store = store;
    this.identity = this.#loadIdentity();
    this.syncListeners = new Set();
    this.lastSyncAt = null;
    this.online = false;
    this.authExpired = false;
    this._syncPromise = null;
    this._pollTimer = null;
    this._pollIntervalMs = DEFAULT_POLL_INTERVAL_MS;
    this._lifecycleBound = false;
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

  isPrivateUnlocked() {
    return isPrivateAccessGranted({
      cloudConfigured: this.isCloudConfigured(),
      identity: this.identity
    });
  }

  #loadIdentity() {
    try {
      const raw = window.localStorage.getItem(IDENTITY_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || (parsed.partner !== 'beijing' && parsed.partner !== 'lyg')) {
        return null;
      }
      // If cloud sync is now enabled, discard stale local-only identity that lacks an HMAC token
      if (this.isCloudConfigured() && !parsed.token) {
        window.localStorage.removeItem(IDENTITY_KEY);
        return null;
      }
      return parsed;
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

  logout({ clearPrivate = true, expired = false } = {}) {
    this.online = false;
    this.lastSyncAt = null;
    this.authExpired = Boolean(expired);
    if (clearPrivate && this.isCloudConfigured()) {
      this.store.clearPrivateCache?.();
    }
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
      privateUnlocked: this.isPrivateUnlocked(),
      online: this.online,
      lastSyncAt: this.lastSyncAt,
      authExpired: this.authExpired
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
      const isAuthEndpoint = path === '/auth/claim' || path === '/auth/verify';
      if (resp.status === 401 && !isAuthEndpoint && this.identity?.token) {
        this.logout({ clearPrivate: true, expired: true });
      }
      throw new Error(data?.error || `云端请求失败 (${resp.status})`);
    }
    return data;
  }

  async verifyPasscode(passcode) {
    const code = String(passcode ?? '').trim();
    if (!code) throw new Error('请输入密码');
    if (!this.isCloudConfigured()) {
      const expected = String(this.store.getState().couple.passcode || '').trim();
      if (!expected || code !== expected) {
        throw new Error('密码错误，请重试');
      }
      return { ok: true, mode: 'local' };
    }

    await this.#request('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ passcode: code })
    });
    return { ok: true, mode: 'cloud' };
  }

  async claimIdentity(partner, passcode) {
    const expected = this.store.getState().couple.passcode || '';
    if (!this.isCloudConfigured()) {
      const check = validateClaimPasscode(partner, passcode, expected);
      if (!check.ok) throw new Error(check.error);
      this.authExpired = false;
      this.#saveIdentity({ partner, token: '', mode: 'local', claimedAt: new Date().toISOString() });
      return { ok: true, mode: 'local', partner };
    }

    const res = await this.#request('/auth/claim', {
      method: 'POST',
      body: JSON.stringify({ partner, passcode })
    });
    this.authExpired = false;
    this.online = true;
    this.#saveIdentity({
      partner: res.partner,
      token: res.token,
      mode: 'cloud',
      claimedAt: new Date().toISOString()
    });
    return { ok: true, mode: 'cloud', partner: res.partner };
  }

  async syncFromCloud() {
    if (!this.isCloudConfigured()) {
      this.#notifyStatus();
      return false;
    }
    if (!this.identity?.token) {
      this.online = false;
      this.#notifyStatus();
      return false;
    }
    if (this._syncPromise) {
      return this._syncPromise;
    }

    this._syncPromise = (async () => {
      try {
        const data = await this.#request('/sync', { method: 'GET' });
        if (data.refreshedToken && this.identity) {
          this.#saveIdentity({
            ...this.identity,
            token: data.refreshedToken,
            refreshedAt: new Date().toISOString()
          });
        }

        const currentState = this.store.getState();
        const candidateDraft = JSON.parse(JSON.stringify(currentState));
        applyCloudSyncDraft(candidateDraft, data);
        const normalizedCandidate = normalizeState(candidateDraft);

        const changed =
          computeCloudSyncFingerprint(currentState) !==
          computeCloudSyncFingerprint(normalizedCandidate);

        if (changed) {
          this.store.update((draft) => {
            applyCloudSyncDraft(draft, data);
          });
        }

        const wasOnline = this.online;
        this.online = true;
        this.authExpired = false;
        this.lastSyncAt = new Date().toISOString();
        if (!wasOnline || changed) {
          this.#notifyStatus();
        }
        return true;
      } catch {
        const wasOnline = this.online;
        this.online = false;
        if (wasOnline) {
          this.#notifyStatus();
        }
        return false;
      } finally {
        this._syncPromise = null;
      }
    })();

    return this._syncPromise;
  }

  startAutoSync(intervalMs = DEFAULT_POLL_INTERVAL_MS) {
    if (!this.isCloudConfigured()) return;
    this._pollIntervalMs = Math.max(15_000, Number(intervalMs) || DEFAULT_POLL_INTERVAL_MS);

    const scheduleTimer = () => {
      this.stopAutoSync();
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      this._pollTimer = window.setInterval(() => {
        if (
          document.visibilityState === 'visible' &&
          navigator.onLine !== false &&
          this.isPrivateUnlocked()
        ) {
          this.syncFromCloud();
        }
      }, this._pollIntervalMs);
    };

    if (this.isPrivateUnlocked()) {
      this.syncFromCloud();
    }
    scheduleTimer();

    if (!this._lifecycleBound && typeof document !== 'undefined') {
      this._lifecycleBound = true;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          if (this.isPrivateUnlocked()) {
            this.syncFromCloud();
          }
          scheduleTimer();
        } else {
          this.stopAutoSync();
        }
      });
      window.addEventListener('online', () => {
        if (document.visibilityState === 'visible' && this.isPrivateUnlocked()) {
          this.syncFromCloud();
        }
      });
    }
  }

  stopAutoSync() {
    if (this._pollTimer) {
      window.clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  }

  async pushNextMeet(nextMeet) {
    if (!this.isCloudConfigured() || !this.identity?.token) return { localOnly: true };
    return this.#request('/settings/next-meet', { method: 'POST', body: JSON.stringify(nextMeet) });
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

  async uploadCloudPhoto({ blob, mimeType, city, date, title, caption }) {
    if (!this.isCloudConfigured() || !this.identity?.token) return { localOnly: true };

    const signed = await this.#request('/photos/upload-url', {
      method: 'POST',
      body: JSON.stringify({ mimeType })
    });

    const uploadResp = await fetch(signed.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': signed.contentType || mimeType || 'image/webp',
        'x-upsert': 'false'
      },
      body: blob
    });
    if (!uploadResp.ok) {
      throw new Error(`云端照片上传失败 (${uploadResp.status})`);
    }

    return this.#request('/photos', {
      method: 'POST',
      body: JSON.stringify({
        id: signed.id,
        storagePath: signed.storagePath,
        city,
        date,
        title,
        caption
      })
    });
  }

  async deleteCloudPhoto(id) {
    if (!this.isCloudConfigured() || !this.identity?.token) return { localOnly: true };
    return this.#request(`/photos/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }
}
