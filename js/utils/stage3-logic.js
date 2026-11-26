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

export function validateClaimPasscode(partnerId, inputCode, expectedCode = '') {
  if (partnerId !== 'beijing' && partnerId !== 'lyg') {
    return { ok: false, error: '请选择有效身份（许金阳或渐姝君）' };
  }
  const normalized = String(inputCode ?? '').trim();
  const target = String(expectedCode ?? '').trim();
  if (!target) {
    return { ok: false, error: '本地模式尚未设置口令，请连接云端或配置本地口令' };
  }
  if (!normalized || normalized !== target) {
    return { ok: false, error: '密码不对哦，请重新输入' };
  }
  return { ok: true, partner: partnerId };
}

export function isPrivateAccessGranted({ cloudConfigured = false, identity = null } = {}) {
  if (!cloudConfigured) return true;
  return Boolean(identity && (identity.partner === 'beijing' || identity.partner === 'lyg') && identity.token);
}

export function computeCloudSyncFingerprint(state) {
  const s = state || {};
  return JSON.stringify({
    nextMeet: s.nextMeet
      ? {
          date: s.nextMeet.date || '',
          city: s.nextMeet.city || '',
          note: s.nextMeet.note || ''
        }
      : null,
    moods: s.moods || null,
    wishes: Array.isArray(s.wishes) ? s.wishes : [],
    signals: Array.isArray(s.signals) ? s.signals : [],
    capsules: Array.isArray(s.capsules) ? s.capsules : [],
    // Exclude rotating signed URL (`path`) so 45s silent polling never re-renders gallery unnecessarily
    cloudPhotos: Array.isArray(s.cloudPhotos)
      ? s.cloudPhotos.map((p) => ({
          id: p.id,
          storagePath: p.storagePath || '',
          city: p.city || '',
          date: p.date || '',
          title: p.title || '',
          caption: p.caption || '',
          uploadedBy: p.uploadedBy || ''
        }))
      : [],
    letters: {
      beijing: {
        text: s.letters?.beijing?.text || '',
        updatedAt: s.letters?.beijing?.updatedAt || '',
        receipt: s.letters?.beijing?.receipt || null
      },
      lyg: {
        text: s.letters?.lyg?.text || '',
        updatedAt: s.letters?.lyg?.updatedAt || '',
        receipt: s.letters?.lyg?.receipt || null
      }
    }
  });
}

export function applyCloudSyncDraft(draft, data) {
  if (!draft || !data) return;
  if (data.nextMeet?.date) {
    draft.nextMeet = {
      date: data.nextMeet.date,
      city: data.nextMeet.city || draft.nextMeet?.city || '下一站待定',
      note: data.nextMeet.note ?? draft.nextMeet?.note ?? ''
    };
  }
  if (data.moods?.beijing) draft.moods.beijing = data.moods.beijing;
  if (data.moods?.lyg) draft.moods.lyg = data.moods.lyg;
  if (Array.isArray(data.wishes)) draft.wishes = data.wishes;
  if (Array.isArray(data.signals)) draft.signals = data.signals;
  if (Array.isArray(data.capsules)) draft.capsules = data.capsules;
  if (Array.isArray(data.cloudPhotos)) draft.cloudPhotos = data.cloudPhotos;
  if (data.letters?.beijing?.text) {
    draft.letters.beijing.text = data.letters.beijing.text;
    draft.letters.beijing.updatedAt = data.letters.beijing.updatedAt || draft.letters.beijing.updatedAt;
    draft.letters.beijing.receipt = data.letters.beijing.receipt ?? null;
  }
  if (data.letters?.lyg?.text) {
    draft.letters.lyg.text = data.letters.lyg.text;
    draft.letters.lyg.updatedAt = data.letters.lyg.updatedAt || draft.letters.lyg.updatedAt;
    draft.letters.lyg.receipt = data.letters.lyg.receipt ?? null;
  }
}

export function parseMonthDay(raw) {
  const str = String(raw || '').trim();
  if (!str) return null;
  // Match YYYY-MM-DD / YYYY.MM.DD / MM-DD / MM.DD / M月D日
  const ymd = str.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
  if (ymd) {
    const month = Number(ymd[2]);
    const day = Number(ymd[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return { month, day };
  }
  const md = str.match(/^(\d{1,2})[-./月](\d{1,2})日?$/);
  if (md) {
    const month = Number(md[1]);
    const day = Number(md[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return { month, day };
  }
  return null;
}

export function computeBirthdayCountdown(birthdayStr, now = new Date()) {
  const parsed = parseMonthDay(birthdayStr);
  if (!parsed) return null;

  const pad = (n) => String(n).padStart(2, '0');
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  let nextUtc = Date.UTC(now.getFullYear(), parsed.month - 1, parsed.day);
  if (nextUtc < todayUtc) {
    nextUtc = Date.UTC(now.getFullYear() + 1, parsed.month - 1, parsed.day);
  }
  const daysUntil = Math.round((nextUtc - todayUtc) / (24 * 60 * 60 * 1000));
  return {
    month: parsed.month,
    day: parsed.day,
    label: `${pad(parsed.month)}月${pad(parsed.day)}日`,
    daysUntil,
    isToday: daysUntil === 0
  };
}

function parseYmdUtc(dateStr) {
  const m = String(dateStr || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    utcMs: Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  };
}

export function evaluateDailyReminders({
  todayStr,
  startDate = '2026-08-08',
  birthdays = { beijing: '07-31', lyg: '04-09' },
  nextMeet = null
}) {
  const today = parseYmdUtc(todayStr);
  if (!today) return [];
  const start = parseYmdUtc(startDate) || parseYmdUtc('2026-08-08');
  const dayMs = 24 * 60 * 60 * 1000;
  const reminders = [];

  // 1. Anniversary & monthly 8th day milestone
  const daysTogether = Math.floor((today.utcMs - start.utcMs) / dayMs) + 1;
  if (today.utcMs > start.utcMs && today.day === start.day) {
    const monthsTogether = (today.year - start.year) * 12 + (today.month - start.month);
    if (monthsTogether > 0 && monthsTogether % 12 === 0) {
      const years = monthsTogether / 12;
      for (const target of ['beijing', 'lyg']) {
        reminders.push({
          key: `${todayStr}:anniversary_${years}y:${target}`,
          type: 'anniversary',
          target,
          title: `💖 许金阳 ⇄ 渐姝君 · 相爱 ${years} 周年快乐！`,
          body: `从 2026.08.08 枣庄初遇至今已携手走过 ${daysTogether} 天，愿山海奔赴终成朝夕相伴 ✨`,
          sound: 'bell'
        });
      }
    } else if (monthsTogether > 0) {
      for (const target of ['beijing', 'lyg']) {
        reminders.push({
          key: `${todayStr}:monthly_${monthsTogether}m:${target}`,
          type: 'monthly_anniversary',
          target,
          title: `✨ 8号纪念日 · 小狗与小猪相爱满 ${monthsTogether} 个月啦`,
          body: `在一起的第 ${daysTogether} 天，隔着 740 公里也要记得给对方发一个大抱抱 🐾`,
          sound: 'minuet'
        });
      }
    }
  }

  // 2. Partner birthdays (day-of for both + 3-day advance reminder for the other partner)
  const todayRef = new Date(today.year, today.month - 1, today.day);
  for (const partnerId of ['beijing', 'lyg']) {
    const bday = computeBirthdayCountdown(birthdays?.[partnerId], todayRef);
    if (!bday) continue;
    const owner = getPartnerMeta(partnerId);
    const otherId = partnerId === 'beijing' ? 'lyg' : 'beijing';
    const other = getPartnerMeta(otherId);

    if (bday.daysUntil === 0) {
      reminders.push({
        key: `${todayStr}:birthday_self_${partnerId}:${partnerId}`,
        type: 'birthday_today',
        target: partnerId,
        title: `🎂 ${owner.emoji} ${owner.name}（${owner.nickname}），生日快乐！`,
        body: `今天是你的专属日！${other.name}（${other.nickname}）在${other.city}把满屏星光和偏爱都送给你 💛`,
        sound: 'bell'
      });
      reminders.push({
        key: `${todayStr}:birthday_partner_${partnerId}:${otherId}`,
        type: 'birthday_today_partner',
        target: otherId,
        title: `🎉 今天是${owner.name}（${owner.nickname}）的生日！`,
        body: `快打开双城纪念册给${owner.nickname}发一条生日悄悄话或封存胶囊吧 🎂`,
        sound: 'bell'
      });
    } else if (bday.daysUntil === 3) {
      reminders.push({
        key: `${todayStr}:birthday_pre3_${partnerId}:${otherId}`,
        type: 'birthday_pre3',
        target: otherId,
        title: `🎁 距离${owner.name}（${owner.nickname}）生日还有 3 天`,
        body: `${bday.label}就是${owner.nickname}的生日啦，可以悄悄准备小惊喜或写一封定时火漆胶囊 💌`,
        sound: 'minuet'
      });
    }
  }

  // 3. Next reunion countdown (3 days before & day of)
  const meet = nextMeet?.date ? parseYmdUtc(nextMeet.date) : null;
  if (meet) {
    const diffDays = Math.round((meet.utcMs - today.utcMs) / dayMs);
    const cityLabel = String(nextMeet.city || '下一站').trim();
    if (diffDays === 3) {
      for (const target of ['beijing', 'lyg']) {
        reminders.push({
          key: `${todayStr}:meet_pre3_${nextMeet.date}:${target}`,
          type: 'meet_pre3',
          target,
          title: `🚄 距离「${cityLabel}」重逢还有 3 天！`,
          body: `倒计时进入最后 3 天啦，记得查好双城天气、确认高铁车票和行李清单 ✨`,
          sound: 'glass'
        });
      }
    } else if (diffDays === 0) {
      for (const target of ['beijing', 'lyg']) {
        reminders.push({
          key: `${todayStr}:meet_today_${nextMeet.date}:${target}`,
          type: 'meet_today',
          target,
          title: `💓 今天终于要见面啦 · 奔赴「${cityLabel}」！`,
          body: `跨越 740 公里山海，今天不用隔着屏幕想念了，一路顺风，见面先抱一个 🫂`,
          sound: 'bell'
        });
      }
    }
  }

  return reminders;
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
