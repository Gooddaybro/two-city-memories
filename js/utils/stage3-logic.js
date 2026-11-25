export const MOOD_PRESETS = [
  { id: 'lab', icon: '🔬', label: '实验室搬砖', defaultNote: '在认真做实验，抽空想你一下' },
  { id: 'sea', icon: '🌊', label: '看海吹风', defaultNote: '海风很温柔，好想和你一起走' },
  { id: 'food', icon: '🍜', label: '想吃好吃的', defaultNote: '下次见面第一顿必须吃顿好的' },
  { id: 'miss', icon: '💓', label: '超级想你', defaultNote: '突然好想瞬移到你身边' },
  { id: 'study', icon: '📚', label: '认真写论文', defaultNote: '研途冲刺中，一起加油' },
  { id: 'sleep', icon: '🌙', label: '准备睡啦', defaultNote: '今天辛苦啦，梦里见' }
];

export const SIGNAL_PRESETS = [
  { id: 'miss', icon: '🐾', label: '突然想你', defaultNote: '隔着 740 公里突然很想你！', sound: 'bell' },
  { id: 'eat', icon: '🍜', label: '催你干饭', defaultNote: '再忙也要按时好好吃饭哦！', sound: 'glass' },
  { id: 'hug', icon: '🫂', label: '远程充能', defaultNote: '发来一个跨越山海的大大抱抱！', sound: 'minuet' },
  { id: 'night', icon: '🌙', label: '晚安信号', defaultNote: '早点休息别熬夜，晚安好梦~', sound: 'silence' }
];

export const SEAL_STYLES = [
  { id: '08·08', label: '08·08', desc: '纪念日鎏金印' },
  { id: '🐶×🐷', label: '🐶×🐷', desc: '小狗小猪专属印' },
  { id: '🚄', label: '🚄', desc: '山海奔赴专列印' }
];

export const RECEIPT_STAMPS = [
  { id: 'heart', icon: '💓', label: '已读心动' },
  { id: 'hug', icon: '🫂', label: '收到抱抱' },
  { id: 'touched', icon: '🥹', label: '看哭了' }
];

export function getPartnerMeta(partnerId) {
  if (partnerId === 'lyg') {
    return { id: 'lyg', name: '渐姝君', nickname: '小猪', city: '连云港', emoji: '🐷' };
  }
  return { id: 'beijing', name: '许金阳', nickname: '小狗', city: '北京', emoji: '🐶' };
}

export function validateClaimPasscode(partnerId, inputCode, expectedCode = '0808') {
  if (partnerId !== 'beijing' && partnerId !== 'lyg') {
    return { ok: false, error: '请选择有效身份（许金阳或渐姝君）' };
  }
  const normalized = String(inputCode ?? '').trim();
  const target = String(expectedCode ?? '0808').trim();
  if (!normalized || normalized !== target) {
    return { ok: false, error: '口令不对哦，提示：纪念日 4 位数字' };
  }
  return { ok: true, partner: partnerId };
}

export function isCapsuleUnlocked(capsule, now = new Date()) {
  if (!capsule?.unlockAt) return true;
  const unlockMs = Date.parse(capsule.unlockAt);
  if (Number.isNaN(unlockMs)) return true;
  return now.getTime() >= unlockMs;
}

export function formatCapsuleCountdown(unlockAt, now = new Date()) {
  if (!unlockAt) return '随时可拆封';
  const unlockMs = Date.parse(unlockAt);
  if (Number.isNaN(unlockMs)) return '随时可拆封';
  const diffMs = unlockMs - now.getTime();
  if (diffMs <= 0) return '已到拆封时间 · 点击火漆开启';

  const totalMins = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMins / (60 * 24));
  const hours = Math.floor((totalMins % (60 * 24)) / 60);
  const mins = totalMins % 60;

  if (days > 0) return `距离拆封还有 ${days}天 ${hours}小时 ${mins}分`;
  if (hours > 0) return `距离拆封还有 ${hours}小时 ${mins}分`;
  return `距离拆封还有 ${Math.max(1, mins)}分钟`;
}

export function sanitizeCapsuleForClient(capsule, now = new Date()) {
  const unlocked = isCapsuleUnlocked(capsule, now);
  return {
    ...capsule,
    isLocked: !unlocked,
    body: unlocked ? String(capsule?.body ?? '') : ''
  };
}

export function computeSignalStats(signals, now = new Date()) {
  const list = Array.isArray(signals) ? signals : [];
  const weekCutoff = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  let weekly = 0;

  for (const s of list) {
    const ts = Date.parse(s?.createdAt || '');
    if (!Number.isNaN(ts) && ts >= weekCutoff) {
      weekly += 1;
    }
  }

  return {
    total: list.length,
    weekly
  };
}

export function buildBarkPushPayload({
  sender = 'beijing',
  title = '双城秘密基地提醒',
  body = '',
  sound = 'bell',
  siteUrl = 'https://gooddaybro.github.io/two-city-memories/'
}) {
  const cleanUrl = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`;
  return {
    targetPartner: sender === 'beijing' ? 'lyg' : 'beijing',
    title: String(title).slice(0, 64),
    body: String(body).slice(0, 200),
    group: '双城秘密基地',
    sound,
    icon: `${cleanUrl}assets/icons/icon-192.png`,
    url: cleanUrl
  };
}
