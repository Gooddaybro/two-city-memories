import test from 'node:test';
import assert from 'node:assert/strict';

import { createDefaultState, normalizeState } from '../js/schema.js';
import {
  MOOD_PRESETS,
  SIGNAL_PRESETS,
  SEAL_STYLES,
  RECEIPT_STAMPS,
  isCapsuleUnlocked,
  formatCapsuleCountdown,
  sanitizeCapsuleForClient,
  computeSignalStats,
  buildBarkPushPayload,
  validateClaimPasscode,
  getPartnerMeta
} from '../js/utils/stage3-logic.js';

test('default state includes Stage 3 moods, signals, and time capsules', () => {
  const state = createDefaultState();

  assert.ok(state.moods?.beijing?.label);
  assert.ok(state.moods?.lyg?.label);
  assert.ok(Array.isArray(state.signals) && state.signals.length >= 2);
  assert.ok(Array.isArray(state.capsules) && state.capsules.length >= 2);
  assert.equal(state.couple.passcode, '0808');
});

test('normalizeState preserves Stage 3 moods, signals, and capsules cleanly', () => {
  const normalized = normalizeState({
    moods: {
      beijing: { icon: '🍜', label: '想吃好吃的', note: '想吃连云港海鲜', updatedAt: '2026-11-25T10:00:00Z' }
    },
    signals: [
      { id: 's99', from: 'beijing', presetId: 'miss', note: '想你啦', createdAt: '2026-11-25T10:00:00Z' }
    ],
    capsules: [
      {
        id: 'c99',
        from: 'beijing',
        to: 'lyg',
        title: '跨年信',
        sealStyle: '08·08',
        teaserHint: '跨年零点拆开',
        unlockAt: '2027-01-01T00:00:00+08:00',
        body: '新年快乐！',
        openedAt: null,
        receipt: null
      }
    ]
  });

  assert.equal(normalized.moods.beijing.label, '想吃好吃的');
  assert.equal(normalized.moods.lyg.label.length > 0, true);
  assert.equal(normalized.signals[0].note, '想你啦');
  assert.equal(normalized.capsules[0].title, '跨年信');
});

test('validateClaimPasscode verifies 0808 passcode and partner id strictly', () => {
  assert.equal(validateClaimPasscode('beijing', '0808', '0808').ok, true);
  assert.equal(validateClaimPasscode('lyg', ' 0808 ', '0808').ok, true);
  assert.equal(validateClaimPasscode('beijing', '1234', '0808').ok, false);
  assert.equal(validateClaimPasscode('unknown', '0808', '0808').ok, false);
});

test('isCapsuleUnlocked and sanitizeCapsuleForClient hide body until unlockAt passes', () => {
  const now = new Date('2026-11-25T12:00:00+08:00');
  const locked = {
    id: 'c_future',
    title: '圣诞胶囊',
    teaserHint: '藏着一个小秘密',
    unlockAt: '2026-12-25T00:00:00+08:00',
    body: '这是绝密正文'
  };
  const unlocked = {
    id: 'c_past',
    title: '已解锁胶囊',
    teaserHint: '随时可以拆开',
    unlockAt: '2026-11-20T00:00:00+08:00',
    body: '欢迎拆开这封信'
  };

  assert.equal(isCapsuleUnlocked(locked, now), false);
  assert.equal(isCapsuleUnlocked(unlocked, now), true);

  const safeLocked = sanitizeCapsuleForClient(locked, now);
  assert.equal(safeLocked.isLocked, true);
  assert.equal(safeLocked.body, '');
  assert.equal(safeLocked.teaserHint, '藏着一个小秘密');

  const safeUnlocked = sanitizeCapsuleForClient(unlocked, now);
  assert.equal(safeUnlocked.isLocked, false);
  assert.equal(safeUnlocked.body, '欢迎拆开这封信');
});

test('formatCapsuleCountdown formats remaining days/hours/minutes cleanly', () => {
  const now = new Date('2026-11-25T12:00:00+08:00');
  const inTwoDays = '2026-11-27T15:30:00+08:00';
  const text = formatCapsuleCountdown(inTwoDays, now);
  assert.ok(text.includes('2天') && text.includes('3小时'));

  const past = '2026-11-24T00:00:00+08:00';
  assert.equal(formatCapsuleCountdown(past, now), '已到拆封时间 · 点击火漆开启');
});

test('computeSignalStats counts total and last-7-days signals', () => {
  const now = new Date('2026-11-25T12:00:00+08:00');
  const stats = computeSignalStats(
    [
      { id: 's1', from: 'beijing', createdAt: '2026-11-25T09:00:00+08:00' },
      { id: 's2', from: 'lyg', createdAt: '2026-11-22T09:00:00+08:00' },
      { id: 's3', from: 'beijing', createdAt: '2026-11-01T09:00:00+08:00' }
    ],
    now
  );

  assert.equal(stats.total, 3);
  assert.equal(stats.weekly, 2);
});

test('buildBarkPushPayload builds clean Bark APNs JSON payload targeting the other partner', () => {
  const payload = buildBarkPushPayload({
    sender: 'beijing',
    title: '🐾 许金阳戳了你一下',
    body: '小狗在北京突然很想你！',
    siteUrl: 'https://gooddaybro.github.io/two-city-memories/'
  });

  assert.equal(payload.targetPartner, 'lyg');
  assert.equal(payload.title, '🐾 许金阳戳了你一下');
  assert.equal(payload.group, '双城秘密基地');
  assert.equal(payload.url, 'https://gooddaybro.github.io/two-city-memories/');
  assert.ok(payload.icon.endsWith('/assets/icons/icon-192.png'));

  assert.equal(getPartnerMeta('beijing').emoji, '🐶');
  assert.equal(getPartnerMeta('lyg').emoji, '🐷');
  assert.ok(MOOD_PRESETS.length >= 6);
  assert.ok(SIGNAL_PRESETS.length >= 4);
  assert.ok(SEAL_STYLES.length >= 3);
  assert.ok(RECEIPT_STAMPS.length >= 3);
});
