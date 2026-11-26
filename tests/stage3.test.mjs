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
  isPrivateAccessGranted,
  computeCloudSyncFingerprint,
  applyCloudSyncDraft,
  computeBirthdayCountdown,
  evaluateDailyReminders,
  getPartnerMeta
} from '../js/utils/stage3-logic.js';
import { computeScaledDimensions, formatFileSize } from '../js/utils/image-compressor.js';

test('default state includes Stage 3 moods, signals, and time capsules without plaintext passcode', () => {
  const state = createDefaultState();

  assert.ok(state.moods?.beijing?.label);
  assert.ok(state.moods?.lyg?.label);
  assert.ok(Array.isArray(state.signals) && state.signals.length >= 2);
  assert.ok(Array.isArray(state.capsules) && state.capsules.length >= 2);
  assert.equal(state.couple.passcode, '');
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

test('validateClaimPasscode verifies passcode and partner id strictly without hardcoded default', () => {
  assert.equal(validateClaimPasscode('beijing', 'secret99', 'secret99').ok, true);
  assert.equal(validateClaimPasscode('lyg', ' secret99 ', 'secret99').ok, true);
  assert.equal(validateClaimPasscode('beijing', 'wrong', 'secret99').ok, false);
  assert.equal(validateClaimPasscode('unknown', 'secret99', 'secret99').ok, false);
  assert.equal(validateClaimPasscode('beijing', '0808', '').ok, false);
});

test('isPrivateAccessGranted locks cloud private sections for guests and unlocks with valid token', () => {
  assert.equal(isPrivateAccessGranted({ cloudConfigured: false, identity: null }), true);
  assert.equal(isPrivateAccessGranted({ cloudConfigured: true, identity: null }), false);
  assert.equal(isPrivateAccessGranted({ cloudConfigured: true, identity: { partner: 'beijing', token: '' } }), false);
  assert.equal(
    isPrivateAccessGranted({ cloudConfigured: true, identity: { partner: 'lyg', token: 'abc.sig' } }),
    true
  );
  assert.equal(
    isPrivateAccessGranted({ cloudConfigured: true, identity: { partner: 'guest', token: 'abc.sig' } }),
    false
  );
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

test('computeCloudSyncFingerprint detects changes accurately and skips no-op re-renders', () => {
  const base = createDefaultState();
  const clone = createDefaultState();

  assert.equal(computeCloudSyncFingerprint(base), computeCloudSyncFingerprint(clone));

  clone.couple.partners.beijing.role = '本地自定义备注';
  // Unrelated local-only field does not trigger cloud fingerprint mismatch
  assert.equal(computeCloudSyncFingerprint(base), computeCloudSyncFingerprint(clone));

  // nextMeet is now cloud-synced and updates the fingerprint
  clone.nextMeet.city = '青岛';
  assert.notEqual(computeCloudSyncFingerprint(base), computeCloudSyncFingerprint(clone));

  clone.nextMeet.city = base.nextMeet.city;
  clone.signals.unshift({ id: 'sig_new', from: 'beijing', note: '新消息', createdAt: '2026-11-26T12:00:00Z' });
  assert.notEqual(computeCloudSyncFingerprint(base), computeCloudSyncFingerprint(clone));
});

test('applyCloudSyncDraft clears local lists when cloud returns empty arrays and syncs nextMeet', () => {
  const draft = createDefaultState();
  assert.ok(draft.wishes.length > 0);
  assert.ok(draft.signals.length > 0);
  assert.ok(draft.capsules.length > 0);

  applyCloudSyncDraft(draft, {
    nextMeet: { date: '2027-01-15', city: '南京', note: '寒假见' },
    wishes: [],
    signals: [],
    capsules: [],
    moods: { beijing: { icon: '🌙', label: '准备睡啦', note: '晚安', updatedAt: '2026-11-26T22:00:00Z' } }
  });

  assert.equal(draft.nextMeet.date, '2027-01-15');
  assert.equal(draft.nextMeet.city, '南京');
  assert.deepEqual(draft.wishes, []);
  assert.deepEqual(draft.signals, []);
  assert.deepEqual(draft.capsules, []);
  assert.equal(draft.moods.beijing.label, '准备睡啦');
});

test('computeBirthdayCountdown handles same day, upcoming, next-year wrap, and Chinese format', () => {
  const today = new Date(2026, 6, 31); // 2026-07-31
  const bj = computeBirthdayCountdown('07-31', today);
  assert.equal(bj.isToday, true);
  assert.equal(bj.daysUntil, 0);
  assert.equal(bj.label, '07月31日');

  const lyg = computeBirthdayCountdown('4月9日', new Date(2026, 3, 6)); // 2026-04-06
  assert.equal(lyg.isToday, false);
  assert.equal(lyg.daysUntil, 3);
  assert.equal(lyg.label, '04月09日');

  const wrapped = computeBirthdayCountdown('04-09', new Date(2026, 10, 26)); // 2026-11-26
  assert.equal(wrapped.isToday, false);
  assert.ok(wrapped.daysUntil > 120 && wrapped.daysUntil < 140);
});

test('evaluateDailyReminders triggers monthly 8th, anniversary, partner birthdays (pre-3 & today), and reunion', () => {
  // Normal day -> no reminders
  assert.deepEqual(
    evaluateDailyReminders({ todayStr: '2026-11-26', nextMeet: { date: '2026-12-25', city: '淄博' } }),
    []
  );

  // Monthly 8th (4 months together)
  const monthly = evaluateDailyReminders({ todayStr: '2026-12-08' });
  assert.equal(monthly.length, 2);
  assert.ok(monthly.every((r) => r.type === 'monthly_anniversary' && r.title.includes('4 个月')));

  // Yearly anniversary (1 year)
  const yearly = evaluateDailyReminders({ todayStr: '2027-08-08' });
  assert.equal(yearly.length, 2);
  assert.ok(yearly.every((r) => r.type === 'anniversary' && r.title.includes('1 周年')));

  // 渐姝君 birthday pre-3 (04-06 -> notifies beijing) & day-of (04-09 -> notifies both)
  const lygPre3 = evaluateDailyReminders({ todayStr: '2027-04-06' });
  assert.equal(lygPre3.length, 1);
  assert.equal(lygPre3[0].target, 'beijing');
  assert.equal(lygPre3[0].type, 'birthday_pre3');

  const lygDay = evaluateDailyReminders({ todayStr: '2027-04-09' });
  assert.equal(lygDay.length, 2);
  assert.ok(lygDay.some((r) => r.target === 'lyg' && r.type === 'birthday_today'));
  assert.ok(lygDay.some((r) => r.target === 'beijing' && r.type === 'birthday_today_partner'));

  // 许金阳 birthday pre-3 (07-28 -> notifies lyg) & day-of (07-31 -> notifies both)
  const bjPre3 = evaluateDailyReminders({ todayStr: '2027-07-28' });
  assert.equal(bjPre3.length, 1);
  assert.equal(bjPre3[0].target, 'lyg');

  const bjDay = evaluateDailyReminders({ todayStr: '2027-07-31' });
  assert.equal(bjDay.length, 2);
  assert.ok(bjDay.some((r) => r.target === 'beijing' && r.type === 'birthday_today'));

  // Reunion pre-3 & day-of
  const meetPre3 = evaluateDailyReminders({
    todayStr: '2026-12-22',
    nextMeet: { date: '2026-12-25', city: '淄博' }
  });
  assert.equal(meetPre3.length, 2);
  assert.ok(meetPre3.every((r) => r.type === 'meet_pre3' && r.title.includes('淄博')));

  const meetToday = evaluateDailyReminders({
    todayStr: '2026-12-25',
    nextMeet: { date: '2026-12-25', city: '淄博' }
  });
  assert.equal(meetToday.length, 2);
  assert.ok(meetToday.every((r) => r.type === 'meet_today'));
});

test('image compressor dimension scaling and file size formatting work accurately', () => {
  assert.deepEqual(computeScaledDimensions(1200, 900, 1600), { width: 1200, height: 900 });
  assert.deepEqual(computeScaledDimensions(4000, 3000, 1600), { width: 1600, height: 1200 });
  assert.deepEqual(computeScaledDimensions(2400, 3200, 1600), { width: 1200, height: 1600 });

  assert.equal(formatFileSize(512), '512 B');
  assert.equal(formatFileSize(220 * 1024), '220 KB');
  assert.equal(formatFileSize(3.5 * 1024 * 1024), '3.50 MB');
});

test('computeCloudSyncFingerprint ignores rotating signed photo URLs while detecting metadata changes', () => {
  const s1 = createDefaultState();
  const s2 = createDefaultState();

  s1.cloudPhotos = [
    {
      id: 'cp_1',
      storagePath: 'beijing/cp_1.webp',
      city: '连云港',
      date: '2026.11.26',
      title: '海边合影',
      caption: '很开心',
      uploadedBy: 'beijing',
      path: 'https://example.supabase.co/storage/v1/object/sign/couple-photos/beijing/cp_1.webp?token=aaa'
    }
  ];
  s2.cloudPhotos = [
    {
      ...s1.cloudPhotos[0],
      path: 'https://example.supabase.co/storage/v1/object/sign/couple-photos/beijing/cp_1.webp?token=bbb'
    }
  ];

  // Different signed URL token should NOT trigger unnecessary re-render
  assert.equal(computeCloudSyncFingerprint(s1), computeCloudSyncFingerprint(s2));

  // Metadata change or added photo SHOULD trigger sync update
  s2.cloudPhotos[0].title = '海边橘子海';
  assert.notEqual(computeCloudSyncFingerprint(s1), computeCloudSyncFingerprint(s2));
});
