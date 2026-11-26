// Supabase Edge Function: two-city-api
// 统一网关：双人口令认领与防爆破、鉴权云端同步、心愿/心情/来信/心跳墙双向同步、时光胶囊服务端防偷看、双 iPhone Bark APNs 推送

const ALLOWED_ORIGINS = new Set([
  'https://gooddaybro.github.io',
  'http://127.0.0.1:4173',
  'http://localhost:4173',
  'http://127.0.0.1:3000',
  'http://localhost:3000'
]);

const SITE_URL = Deno.env.get('SITE_URL') || 'https://gooddaybro.github.io/two-city-memories/';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const COUPLE_SECRET = (Deno.env.get('COUPLE_SECRET') || '').trim();
const TOKEN_SECRET = (Deno.env.get('TOKEN_SECRET') || (COUPLE_SECRET ? `two-city-hmac-v2-${COUPLE_SECRET}` : '')).trim();
const CRON_SECRET = (Deno.env.get('CRON_SECRET') || '').trim();
const COUPLE_START_DATE = '2026-08-08';
const PHOTO_BUCKET = 'couple-photos';
const PHOTO_SIGNED_TTL_SEC = 3600; // 1 hour signed view URLs

const TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
const TOKEN_REFRESH_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000; // Silent refresh within last 30 days
const MAX_AUTH_FAILURES = 5;
const AUTH_LOCK_WINDOW_MS = 5 * 60 * 1000; // 5 minutes lock after 5 failed attempts

interface AuthAttemptRecord {
  count: number;
  firstFailedAt: number;
  lockedUntil: number;
}

const authFailures = new Map<string, AuthAttemptRecord>();

function getClientKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for') || '';
  const firstIp = forwarded.split(',')[0]?.trim();
  return (
    req.headers.get('cf-connecting-ip')?.trim() ||
    firstIp ||
    req.headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

function checkAuthRateLimit(clientKey: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const record = authFailures.get(clientKey);
  if (!record) return { allowed: true };

  if (record.lockedUntil > now) {
    return { allowed: false, retryAfterSec: Math.ceil((record.lockedUntil - now) / 1000) };
  }
  if (now - record.firstFailedAt > AUTH_LOCK_WINDOW_MS) {
    authFailures.delete(clientKey);
  }
  return { allowed: true };
}

function recordAuthFailure(clientKey: string) {
  const now = Date.now();
  const existing = authFailures.get(clientKey);
  if (!existing || now - existing.firstFailedAt > AUTH_LOCK_WINDOW_MS) {
    authFailures.set(clientKey, { count: 1, firstFailedAt: now, lockedUntil: 0 });
    return;
  }
  existing.count += 1;
  if (existing.count >= MAX_AUTH_FAILURES) {
    existing.lockedUntil = now + AUTH_LOCK_WINDOW_MS;
  }
  authFailures.set(clientKey, existing);
}

function clearAuthFailures(clientKey: string) {
  authFailures.delete(clientKey);
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const bytesA = enc.encode(a);
  const bytesB = enc.encode(b);
  const maxLen = Math.max(bytesA.length, bytesB.length);
  let diff = bytesA.length ^ bytesB.length;
  for (let i = 0; i < maxLen; i++) {
    diff |= (bytesA[i] ?? 0) ^ (bytesB[i] ?? 0);
  }
  return diff === 0;
}

function getBarkKeys(): Record<string, string> {
  return {
    beijing: (Deno.env.get('BARK_KEY_XJY') || '').trim(),
    lyg: (Deno.env.get('BARK_KEY_JSJ') || '').trim()
  };
}

const PARTNER_NAMES: Record<string, { name: string; nick: string; emoji: string }> = {
  beijing: { name: '许金阳', nick: '小狗', emoji: '🐶' },
  lyg: { name: '渐姝君', nick: '小猪', emoji: '🐷' }
};

function corsHeaders(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://gooddaybro.github.io';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8'
  };
}

function jsonResp(data: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders(origin) });
}

async function hmacSign(payload: string): Promise<string> {
  if (!TOKEN_SECRET) throw new Error('Server secret not configured');
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(TOKEN_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function createToken(partner: 'beijing' | 'lyg'): Promise<string> {
  const now = Date.now();
  const body = btoa(JSON.stringify({ partner, iat: now, exp: now + TOKEN_TTL_MS }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const sig = await hmacSign(body);
  return `${body}.${sig}`;
}

interface VerifiedAuth {
  partner: 'beijing' | 'lyg';
  shouldRefresh: boolean;
}

async function verifyToken(req: Request): Promise<VerifiedAuth | null> {
  if (!TOKEN_SECRET) return null;
  const auth = req.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = await hmacSign(body);
  if (!timingSafeEqualStr(sig, expected)) return null;
  try {
    const padded = body.replace(/-/g, '+').replace(/_/g, '/');
    const parsed = JSON.parse(atob(padded));
    if (parsed?.partner !== 'beijing' && parsed?.partner !== 'lyg') return null;
    const now = Date.now();
    const exp = Number(parsed?.exp || 0);
    if (exp && now > exp) return null;
    const shouldRefresh = !exp || exp - now < TOKEN_REFRESH_THRESHOLD_MS;
    return { partner: parsed.partner, shouldRefresh };
  } catch {
    return null;
  }
}

async function dbFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('apikey', SERVICE_ROLE_KEY);
  headers.set('Authorization', `Bearer ${SERVICE_ROLE_KEY}`);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`DB ${resp.status}: ${txt}`);
  }
  const text = await resp.text();
  return text ? JSON.parse(text) : null;
}

async function storageFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('apikey', SERVICE_ROLE_KEY);
  headers.set('Authorization', `Bearer ${SERVICE_ROLE_KEY}`);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  const resp = await fetch(`${SUPABASE_URL}/storage/v1/${path}`, { ...init, headers });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Storage ${resp.status}: ${txt}`);
  }
  const text = await resp.text();
  return text ? JSON.parse(text) : null;
}

function toFullStorageUrl(relativeOrAbs: string): string {
  const raw = String(relativeOrAbs || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const cleanBase = SUPABASE_URL.replace(/\/+$/, '');
  if (raw.startsWith('/storage/v1/')) return `${cleanBase}${raw}`;
  if (raw.startsWith('/')) return `${cleanBase}/storage/v1${raw}`;
  return `${cleanBase}/storage/v1/${raw}`;
}

async function batchSignPhotoUrls(paths: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const cleanPaths = paths.filter((p) => typeof p === 'string' && p.trim().length > 0);
  if (!cleanPaths.length) return map;

  const signedList = await storageFetch(`object/sign/${PHOTO_BUCKET}`, {
    method: 'POST',
    body: JSON.stringify({ expiresIn: PHOTO_SIGNED_TTL_SEC, paths: cleanPaths })
  }).catch(() => []);

  if (Array.isArray(signedList)) {
    for (let i = 0; i < signedList.length; i++) {
      const item = signedList[i];
      const key = String(item?.path || cleanPaths[i] || '');
      const url = toFullStorageUrl(item?.signedURL || item?.signedUrl || '');
      if (key && url) map.set(key, url);
    }
  }
  return map;
}

async function pushBarkToTarget(
  target: 'beijing' | 'lyg',
  title: string,
  body: string,
  sound = 'bell'
) {
  const deviceKey = getBarkKeys()[target];
  if (!deviceKey) return { sent: false, reason: 'missing_bark_key' };

  const cleanUrl = SITE_URL.endsWith('/') ? SITE_URL : `${SITE_URL}/`;
  try {
    const resp = await fetch('https://api.day.app/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        device_key: deviceKey,
        title: title.slice(0, 64),
        body: body.slice(0, 200),
        group: '双城秘密基地',
        sound,
        icon: `${cleanUrl}assets/icons/icon-192.png`,
        url: cleanUrl
      })
    });
    const resJson = await resp.json().catch(() => ({}));
    const ok = resp.ok && (resJson?.code === 200 || resJson?.code === undefined);
    return { sent: ok, status: resp.status, reason: ok ? undefined : String(resJson?.message || 'bark_rejected') };
  } catch {
    return { sent: false, reason: 'network_error' };
  }
}

async function pushBarkToPartner(
  sender: 'beijing' | 'lyg',
  title: string,
  body: string,
  sound = 'bell'
) {
  const target: 'beijing' | 'lyg' = sender === 'beijing' ? 'lyg' : 'beijing';
  return pushBarkToTarget(target, title, body, sound);
}

function getBeijingTodayStr(now = new Date()): string {
  const bjMs = now.getTime() + 8 * 60 * 60 * 1000;
  return new Date(bjMs).toISOString().slice(0, 10);
}

function parseYmdUtc(dateStr: string) {
  const m = String(dateStr || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    utcMs: Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  };
}

function parseMonthDay(raw: string) {
  const str = String(raw || '').trim();
  const ymd = str.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
  if (ymd) return { month: Number(ymd[2]), day: Number(ymd[3]) };
  const md = str.match(/^(\d{1,2})[-./月](\d{1,2})日?$/);
  if (md) return { month: Number(md[1]), day: Number(md[2]) };
  return null;
}

interface ReminderTask {
  key: string;
  type: string;
  target: 'beijing' | 'lyg';
  title: string;
  body: string;
  sound: string;
}

function computeDueReminders(params: {
  todayStr: string;
  birthdays: { beijing: string; lyg: string };
  nextMeet: { date: string; city: string } | null;
}): ReminderTask[] {
  const today = parseYmdUtc(params.todayStr);
  const start = parseYmdUtc(COUPLE_START_DATE);
  if (!today || !start) return [];

  const dayMs = 24 * 60 * 60 * 1000;
  const tasks: ReminderTask[] = [];
  const daysTogether = Math.floor((today.utcMs - start.utcMs) / dayMs) + 1;

  // 1. Monthly 8th anniversary & yearly anniversary
  if (today.utcMs > start.utcMs && today.day === start.day) {
    const monthsTogether = (today.year - start.year) * 12 + (today.month - start.month);
    if (monthsTogether > 0 && monthsTogether % 12 === 0) {
      const years = monthsTogether / 12;
      for (const target of ['beijing', 'lyg'] as const) {
        tasks.push({
          key: `${params.todayStr}:anniversary_${years}y:${target}`,
          type: 'anniversary',
          target,
          title: `💖 许金阳 ⇄ 渐姝君 · 相爱 ${years} 周年快乐！`,
          body: `从 2026.08.08 枣庄初遇至今已携手走过 ${daysTogether} 天，愿山海奔赴终成朝夕相伴 ✨`,
          sound: 'bell'
        });
      }
    } else if (monthsTogether > 0) {
      for (const target of ['beijing', 'lyg'] as const) {
        tasks.push({
          key: `${params.todayStr}:monthly_${monthsTogether}m:${target}`,
          type: 'monthly_anniversary',
          target,
          title: `✨ 8号纪念日 · 小狗与小猪相爱满 ${monthsTogether} 个月啦`,
          body: `在一起的第 ${daysTogether} 天，隔着 740 公里也要记得给对方发一个大抱抱 🐾`,
          sound: 'minuet'
        });
      }
    }
  }

  // 2. Partner birthdays (day-of + 3-day advance notice for partner)
  const pad = (n: number) => String(n).padStart(2, '0');
  for (const partnerId of ['beijing', 'lyg'] as const) {
    const parsed = parseMonthDay(params.birthdays[partnerId]);
    if (!parsed) continue;
    let nextUtc = Date.UTC(today.year, parsed.month - 1, parsed.day);
    if (nextUtc < today.utcMs) {
      nextUtc = Date.UTC(today.year + 1, parsed.month - 1, parsed.day);
    }
    const daysUntil = Math.round((nextUtc - today.utcMs) / dayMs);
    const owner = PARTNER_NAMES[partnerId];
    const otherId: 'beijing' | 'lyg' = partnerId === 'beijing' ? 'lyg' : 'beijing';
    const other = PARTNER_NAMES[otherId];
    const city = partnerId === 'beijing' ? '连云港' : '北京';

    if (daysUntil === 0) {
      tasks.push({
        key: `${params.todayStr}:birthday_self_${partnerId}:${partnerId}`,
        type: 'birthday_today',
        target: partnerId,
        title: `🎂 ${owner.emoji} ${owner.name}（${owner.nick}），生日快乐！`,
        body: `今天是你的专属日！${other.name}（${other.nick}）在${city}把满屏星光和偏爱都送给你 💛`,
        sound: 'bell'
      });
      tasks.push({
        key: `${params.todayStr}:birthday_partner_${partnerId}:${otherId}`,
        type: 'birthday_today_partner',
        target: otherId,
        title: `🎉 今天是${owner.name}（${owner.nick}）的生日！`,
        body: `快打开双城纪念册给${owner.nick}发一条生日悄悄话或封存胶囊吧 🎂`,
        sound: 'bell'
      });
    } else if (daysUntil === 3) {
      tasks.push({
        key: `${params.todayStr}:birthday_pre3_${partnerId}:${otherId}`,
        type: 'birthday_pre3',
        target: otherId,
        title: `🎁 距离${owner.name}（${owner.nick}）生日还有 3 天`,
        body: `${pad(parsed.month)}月${pad(parsed.day)}日就是${owner.nick}的生日啦，可以悄悄准备小惊喜或写一封定时火漆胶囊 💌`,
        sound: 'minuet'
      });
    }
  }

  // 3. Next reunion countdown (3 days before & day of)
  const meet = params.nextMeet?.date ? parseYmdUtc(params.nextMeet.date) : null;
  if (meet) {
    const diffDays = Math.round((meet.utcMs - today.utcMs) / dayMs);
    const cityLabel = String(params.nextMeet?.city || '下一站').trim();
    if (diffDays === 3) {
      for (const target of ['beijing', 'lyg'] as const) {
        tasks.push({
          key: `${params.todayStr}:meet_pre3_${params.nextMeet?.date}:${target}`,
          type: 'meet_pre3',
          target,
          title: `🚄 距离「${cityLabel}」重逢还有 3 天！`,
          body: `倒计时进入最后 3 天啦，记得查好双城天气、确认高铁车票和行李清单 ✨`,
          sound: 'glass'
        });
      }
    } else if (diffDays === 0) {
      for (const target of ['beijing', 'lyg'] as const) {
        tasks.push({
          key: `${params.todayStr}:meet_today_${params.nextMeet?.date}:${target}`,
          type: 'meet_today',
          target,
          title: `💓 今天终于要见面啦 · 奔赴「${cityLabel}」！`,
          body: `跨越 740 公里山海，今天不用隔着屏幕想念了，一路顺风，见面先抱一个 🫂`,
          sound: 'bell'
        });
      }
    }
  }

  return tasks;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  const url = new URL(req.url);
  // Support both /two-city-api/<route> and /<route>
  const route = url.pathname.replace(/^\/(functions\/v1\/)?two-city-api/, '') || '/';

  try {
    if (req.method === 'GET' && route === '/health') {
      const keys = getBarkKeys();
      return jsonResp(
        {
          ok: true,
          service: 'two-city-api',
          authRequiredForSync: true,
          secretConfigured: Boolean(COUPLE_SECRET),
          barkConfigured: Boolean(keys.beijing && keys.lyg),
          bark: { beijing: Boolean(keys.beijing), lyg: Boolean(keys.lyg) }
        },
        200,
        origin
      );
    }

    if (req.method === 'POST' && (route === '/auth/claim' || route === '/auth/verify')) {
      if (!COUPLE_SECRET) {
        return jsonResp({ error: '服务端尚未配置 COUPLE_SECRET 环境变量' }, 503, origin);
      }

      const clientKey = getClientKey(req);
      const rate = checkAuthRateLimit(clientKey);
      if (!rate.allowed) {
        return jsonResp(
          { error: `密码尝试次数过多，请 ${Math.max(1, Math.ceil((rate.retryAfterSec || 60) / 60))} 分钟后再试` },
          429,
          origin
        );
      }

      const body = await req.json().catch(() => ({}));
      const inputCode = String(body?.passcode ?? '').trim();

      if (route === '/auth/claim') {
        const partner = body?.partner;
        if (partner !== 'beijing' && partner !== 'lyg') {
          return jsonResp({ error: '无效的身份选项' }, 400, origin);
        }
        if (!inputCode || !timingSafeEqualStr(inputCode, COUPLE_SECRET)) {
          recordAuthFailure(clientKey);
          return jsonResp({ error: '密码不对哦，请重试' }, 401, origin);
        }
        clearAuthFailures(clientKey);
        const token = await createToken(partner);
        return jsonResp({ ok: true, partner, token }, 200, origin);
      }

      // POST /auth/verify (used by lock screen)
      if (!inputCode || !timingSafeEqualStr(inputCode, COUPLE_SECRET)) {
        recordAuthFailure(clientKey);
        return jsonResp({ error: '密码错误，请重试' }, 401, origin);
      }
      clearAuthFailures(clientKey);
      return jsonResp({ ok: true }, 200, origin);
    }

    // Scheduled daily anniversary / birthday / reunion reminders (called by GitHub Actions Cron)
    if (req.method === 'POST' && route === '/cron/reminders') {
      if (!CRON_SECRET) {
        return jsonResp({ error: '服务端尚未配置 CRON_SECRET 环境变量' }, 503, origin);
      }
      const headerSecret =
        req.headers.get('X-Cron-Secret')?.trim() ||
        (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
      if (!headerSecret || !timingSafeEqualStr(headerSecret, CRON_SECRET)) {
        return jsonResp({ error: 'Cron 密钥无效' }, 401, origin);
      }

      const body = await req.json().catch(() => ({}));
      const todayStr =
        typeof body?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date.trim())
          ? body.date.trim()
          : getBeijingTodayStr();
      const dryRun = Boolean(body?.dryRun);

      const settingsRows = await dbFetch('couple_settings?id=eq.default&limit=1').catch(() => []);
      const cfg = settingsRows?.[0] || {};
      const birthdays = {
        beijing: String(cfg.beijing_birthday || '07-31'),
        lyg: String(cfg.lyg_birthday || '04-09')
      };
      const nextMeet = cfg.next_meet_date
        ? { date: String(cfg.next_meet_date), city: String(cfg.next_meet_city || '下一站') }
        : { date: '2026-12-25', city: '淄博 / 待定' };

      const tasks = computeDueReminders({ todayStr, birthdays, nextMeet });
      if (!tasks.length) {
        return jsonResp({ ok: true, today: todayStr, dryRun, evaluated: 0, sent: 0, skipped: 0, items: [] }, 200, origin);
      }

      const existingLogs = await dbFetch(
        `reminder_logs?sent_date=eq.${encodeURIComponent(todayStr)}&select=reminder_key`
      ).catch(() => []);
      const sentSet = new Set((existingLogs || []).map((r: Record<string, unknown>) => String(r.reminder_key)));

      let sent = 0;
      let skipped = 0;
      const items: Array<Record<string, unknown>> = [];

      for (const task of tasks) {
        if (sentSet.has(task.key)) {
          skipped += 1;
          items.push({ key: task.key, target: task.target, status: 'skipped_duplicate' });
          continue;
        }
        if (dryRun) {
          items.push({ key: task.key, target: task.target, title: task.title, body: task.body, status: 'dry_run' });
          continue;
        }

        const pushRes = await pushBarkToTarget(task.target, task.title, task.body, task.sound);
        if (pushRes.sent) {
          sent += 1;
          await dbFetch('reminder_logs?on_conflict=reminder_key', {
            method: 'POST',
            headers: { Prefer: 'resolution=merge-duplicates' },
            body: JSON.stringify({
              reminder_key: task.key,
              sent_date: todayStr,
              reminder_type: task.type,
              target_partner: task.target,
              title: task.title
            })
          }).catch(() => null);
        }
        items.push({ key: task.key, target: task.target, title: task.title, push: pushRes });
      }

      return jsonResp(
        { ok: true, today: todayStr, dryRun, evaluated: tasks.length, sent, skipped, items },
        200,
        origin
      );
    }

    // All private read (/sync) and write endpoints require a valid HMAC identity token
    const auth = await verifyToken(req);
    if (!auth) {
      return jsonResp({ error: '请先输入口令认领你的身份（小狗 / 小猪）' }, 401, origin);
    }
    const partner = auth.partner;
    const sender = PARTNER_NAMES[partner];

    if (req.method === 'GET' && route === '/sync') {
      const [moodRows, wishRows, signalRows, capsuleRows, letterRows, settingsRows, photoRows] = await Promise.all([
        dbFetch('couple_moods?select=*'),
        dbFetch('wishes_sync?select=*&order=pinned.desc,updated_at.asc'),
        dbFetch('love_signals?select=*&order=created_at.desc&limit=25'),
        dbFetch('capsule_letters?select=*&order=created_at.desc&limit=30'),
        dbFetch('dual_letters?select=*'),
        dbFetch('couple_settings?id=eq.default&limit=1').catch(() => []),
        dbFetch('couple_photos?select=*&order=created_at.desc&limit=60').catch(() => [])
      ]);

      const nowMs = Date.now();
      const moods: Record<string, unknown> = {};
      for (const row of moodRows || []) {
        moods[row.partner_id] = {
          icon: row.icon,
          label: row.label,
          note: row.note,
          updatedAt: row.updated_at
        };
      }

      const capsules = (capsuleRows || []).map((row: Record<string, unknown>) => {
        const unlockMs = Date.parse(String(row.unlock_at || ''));
        const unlocked = Number.isNaN(unlockMs) || nowMs >= unlockMs;
        return {
          id: row.id,
          from: row.from_partner,
          to: row.to_partner,
          title: row.title,
          sealStyle: row.seal_style,
          teaserHint: row.teaser_hint,
          unlockAt: row.unlock_at,
          body: unlocked ? row.body : '',
          isLocked: !unlocked,
          createdAt: row.created_at,
          openedAt: row.opened_at,
          receipt: row.receipt
        };
      });

      const signals = (signalRows || []).map((row: Record<string, unknown>) => ({
        id: row.id,
        from: row.from_partner,
        presetId: row.preset_id,
        icon: row.icon,
        label: row.label,
        note: row.note,
        huggedBack: Boolean(row.hugged_back),
        createdAt: row.created_at
      }));

      const letters: Record<string, unknown> = {};
      for (const row of letterRows || []) {
        letters[row.author_id] = {
          text: row.text,
          updatedAt: row.updated_at,
          receipt: row.receipt
        };
      }

      const cfg = settingsRows?.[0];
      const nextMeet = cfg?.next_meet_date
        ? {
            date: String(cfg.next_meet_date),
            city: String(cfg.next_meet_city || '下一站待定'),
            note: String(cfg.next_meet_note || '')
          }
        : undefined;

      const rawPhotos = Array.isArray(photoRows) ? photoRows : [];
      const signedMap = await batchSignPhotoUrls(
        rawPhotos.map((r: Record<string, unknown>) => String(r.storage_path || ''))
      );
      const cloudPhotos = rawPhotos
        .map((row: Record<string, unknown>) => {
          const storagePath = String(row.storage_path || '');
          const signedUrl = signedMap.get(storagePath) || '';
          const city = String(row.city || '双城');
          return {
            id: String(row.id),
            storagePath,
            city,
            date: String(row.photo_date || ''),
            title: String(row.title || '双城合影'),
            caption: String(row.caption || row.title || ''),
            uploadedBy: row.uploaded_by === 'lyg' ? 'lyg' : 'beijing',
            createdAt: String(row.created_at || ''),
            path: signedUrl,
            isCloud: true,
            tags: [city]
          };
        })
        .filter((p) => Boolean(p.path));

      const refreshedToken = auth.shouldRefresh ? await createToken(partner) : undefined;
      return jsonResp(
        {
          ok: true,
          partner,
          refreshedToken,
          nextMeet,
          moods,
          wishes: wishRows || [],
          signals,
          capsules,
          letters,
          cloudPhotos
        },
        200,
        origin
      );
    }

    if (req.method === 'POST' && route === '/photos/upload-url') {
      const body = await req.json().catch(() => ({}));
      const mimeType = String(body?.mimeType || 'image/webp').toLowerCase();
      const allowedExt: Record<string, string> = {
        'image/webp': 'webp',
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png'
      };
      const ext = allowedExt[mimeType];
      if (!ext) {
        return jsonResp({ error: '仅支持 WebP / JPG / PNG 格式图片' }, 400, origin);
      }

      const randBytes = new Uint8Array(4);
      crypto.getRandomValues(randBytes);
      const randHex = Array.from(randBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const id = `cp_${Date.now()}_${randHex}`;
      const storagePath = `${partner}/${id}.${ext}`;

      const signed = await storageFetch(`object/upload/sign/${PHOTO_BUCKET}/${storagePath}`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      const uploadUrl = toFullStorageUrl(signed?.url || '');
      if (!uploadUrl) {
        return jsonResp({ error: '签发云端上传地址失败，请确认已建好 couple-photos 私有桶' }, 500, origin);
      }

      return jsonResp(
        {
          ok: true,
          id,
          storagePath,
          uploadUrl,
          token: signed?.token || '',
          contentType: mimeType === 'image/jpg' ? 'image/jpeg' : mimeType
        },
        200,
        origin
      );
    }

    if (req.method === 'POST' && route === '/photos') {
      const { id, storagePath, city, date, title, caption } = await req.json();
      const cleanPath = String(storagePath || '').trim();
      if (!cleanPath || cleanPath.includes('..') || !cleanPath.startsWith(`${partner}/`)) {
        return jsonResp({ error: '无效的照片存储路径' }, 400, origin);
      }
      const cleanTitle = String(title || '').trim().slice(0, 40) || '双城新合影';
      const cleanCity = String(city || '双城').trim().slice(0, 16) || '双城';
      const cleanDate = String(date || new Date().toISOString().slice(0, 10).replace(/-/g, '.')).trim().slice(0, 20);
      const cleanCaption = String(caption || cleanTitle).trim().slice(0, 140);
      const cleanId = String(id || `cp_${Date.now()}`).trim().slice(0, 48);

      const row = {
        id: cleanId,
        storage_path: cleanPath,
        city: cleanCity,
        photo_date: cleanDate,
        title: cleanTitle,
        caption: cleanCaption,
        uploaded_by: partner,
        created_at: new Date().toISOString()
      };

      await dbFetch('couple_photos?on_conflict=id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify(row)
      });

      const signedMap = await batchSignPhotoUrls([cleanPath]);
      const signedUrl = signedMap.get(cleanPath) || '';

      await pushBarkToPartner(
        partner,
        `📸 ${sender.emoji} ${sender.name}上传了一张新合影`,
        `${cleanCity} · 《${cleanTitle}》${cleanCaption && cleanCaption !== cleanTitle ? ` · ${cleanCaption}` : ''}`,
        'minuet'
      );

      return jsonResp(
        {
          ok: true,
          photo: {
            id: row.id,
            storagePath: row.storage_path,
            city: row.city,
            date: row.photo_date,
            title: row.title,
            caption: row.caption,
            uploadedBy: row.uploaded_by,
            createdAt: row.created_at,
            path: signedUrl,
            isCloud: true,
            tags: [row.city]
          }
        },
        200,
        origin
      );
    }

    if (req.method === 'DELETE' && route.startsWith('/photos/')) {
      const id = decodeURIComponent(route.replace('/photos/', ''));
      const targetId = encodeURIComponent(id);
      const rows = await dbFetch(`couple_photos?id=eq.${targetId}&select=id,storage_path&limit=1`);
      const row = rows?.[0];
      if (!row) {
        return jsonResp({ error: '未找到该张云端照片' }, 404, origin);
      }
      if (row.storage_path) {
        await storageFetch(`object/${PHOTO_BUCKET}`, {
          method: 'DELETE',
          body: JSON.stringify({ prefixes: [String(row.storage_path)] })
        }).catch(() => null);
      }
      await dbFetch(`couple_photos?id=eq.${targetId}`, { method: 'DELETE' });
      return jsonResp({ ok: true, id }, 200, origin);
    }

    if (req.method === 'POST' && route === '/settings/next-meet') {
      const { date, city, note } = await req.json();
      const cleanDate = String(date || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
        return jsonResp({ error: '请选择有效的见面日期 (YYYY-MM-DD)' }, 400, origin);
      }
      const cleanCity = String(city || '下一站待定').trim().slice(0, 40);
      const cleanNote = String(note || '').trim().slice(0, 80);

      await dbFetch('couple_settings?on_conflict=id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({
          id: 'default',
          next_meet_date: cleanDate,
          next_meet_city: cleanCity,
          next_meet_note: cleanNote,
          updated_by: partner,
          updated_at: new Date().toISOString()
        })
      });
      await pushBarkToPartner(
        partner,
        `🗓️ ${sender.emoji} ${sender.name}更新了下一次见面计划`,
        `${cleanDate} · 下一站「${cleanCity}」，期待重逢 🚄`,
        'minuet'
      );
      return jsonResp({ ok: true, nextMeet: { date: cleanDate, city: cleanCity, note: cleanNote } }, 200, origin);
    }

    if (req.method === 'POST' && route === '/mood') {
      const { icon, label, note } = await req.json();
      await dbFetch('couple_moods?on_conflict=partner_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({
          partner_id: partner,
          icon: String(icon || '✨').slice(0, 8),
          label: String(label || '心情不错').slice(0, 20),
          note: String(note || '').slice(0, 40),
          updated_at: new Date().toISOString()
        })
      });
      await pushBarkToPartner(
        partner,
        `${sender.emoji} ${sender.name}更新了今日心情`,
        `${icon || '✨'} ${label}${note ? ` · ${note}` : ''}`,
        'minuet'
      );
      return jsonResp({ ok: true }, 200, origin);
    }

    if (req.method === 'POST' && route === '/signals') {
      // 5s cooldown check (aligned with frontend)
      const latest = await dbFetch(`love_signals?from_partner=eq.${partner}&order=created_at.desc&limit=1`);
      if (latest?.[0]?.created_at && Date.now() - Date.parse(latest[0].created_at) < 5_000) {
        return jsonResp({ error: '电波发射太快啦，休息 5 秒再戳~' }, 429, origin);
      }

      const { id, presetId, icon, label, note, sound } = await req.json();
      const isCustom = String(presetId || '') === 'custom';
      const row = {
        id: String(id || `sig_${Date.now()}`),
        from_partner: partner,
        preset_id: String(presetId || 'miss'),
        icon: String(icon || (isCustom ? '💬' : '🐾')).slice(0, 8),
        label: String(label || (isCustom ? '悄悄话' : '突然想你')).slice(0, 20),
        note: String(note || '').slice(0, 80),
        hugged_back: false,
        created_at: new Date().toISOString()
      };
      await dbFetch('love_signals', { method: 'POST', body: JSON.stringify(row) });
      const pushTitle = isCustom
        ? `${sender.emoji} ${sender.name}（${sender.nick}）发来一条消息`
        : `${row.icon} ${sender.name}（${sender.nick}）发来「${row.label}」`;
      const push = await pushBarkToPartner(
        partner,
        pushTitle,
        row.note || '点开双城纪念册给 TA 回一个抱抱吧~',
        String(sound || 'bell')
      );
      return jsonResp({ ok: true, push }, 200, origin);
    }

    if (req.method === 'POST' && route === '/signals/hug') {
      const { id } = await req.json();
      const targetId = encodeURIComponent(String(id || ''));
      const existing = await dbFetch(`love_signals?id=eq.${targetId}&select=id,from_partner,hugged_back&limit=1`);
      if (!existing?.[0]) {
        return jsonResp({ error: '未找到对应的心动电波' }, 404, origin);
      }
      if (existing[0].from_partner === partner) {
        return jsonResp({ error: '不能回抱自己发出的消息哦~' }, 400, origin);
      }
      await dbFetch(`love_signals?id=eq.${targetId}`, {
        method: 'PATCH',
        body: JSON.stringify({ hugged_back: true })
      });
      await pushBarkToPartner(
        partner,
        `🫂 ${sender.name}（${sender.nick}）回抱了你！`,
        '跨越 740 公里的双向奔赴已送达 💓',
        'glass'
      );
      return jsonResp({ ok: true }, 200, origin);
    }

    if (req.method === 'POST' && route === '/wishes') {
      const { id, text, pinned, tags } = await req.json();
      const row = {
        id: String(id || `w_${Date.now()}`),
        text: String(text || '').trim().slice(0, 120),
        done: false,
        pinned: Boolean(pinned),
        author: partner,
        created_at: new Date().toISOString().slice(0, 10),
        done_at: null,
        tags: Array.isArray(tags) ? tags : ['心愿'],
        updated_at: new Date().toISOString()
      };
      await dbFetch('wishes_sync?on_conflict=id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify(row)
      });
      await pushBarkToPartner(
        partner,
        `⭐ ${sender.emoji} ${sender.name}许下了一个新心愿`,
        row.text,
        'bell'
      );
      return jsonResp({ ok: true }, 200, origin);
    }

    if (req.method === 'POST' && route === '/wishes/toggle') {
      const { id, done, text } = await req.json();
      await dbFetch(`wishes_sync?id=eq.${encodeURIComponent(String(id))}`, {
        method: 'PATCH',
        body: JSON.stringify({
          done: Boolean(done),
          done_at: done ? new Date().toISOString().slice(0, 10) : null,
          updated_at: new Date().toISOString()
        })
      });
      if (done) {
        await pushBarkToPartner(
          partner,
          `✨ ${sender.emoji} ${sender.name}点亮了一个双城心愿！`,
          String(text || '快打开纪念册看看我们的新进度~'),
          'glass'
        );
      }
      return jsonResp({ ok: true }, 200, origin);
    }

    if (req.method === 'DELETE' && route.startsWith('/wishes/')) {
      const id = decodeURIComponent(route.replace('/wishes/', ''));
      await dbFetch(`wishes_sync?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return jsonResp({ ok: true }, 200, origin);
    }

    if (req.method === 'POST' && route === '/capsules') {
      const { id, title, sealStyle, teaserHint, unlockAt, body } = await req.json();
      const target = partner === 'beijing' ? 'lyg' : 'beijing';
      const row = {
        id: String(id || `cap_${Date.now()}`),
        from_partner: partner,
        to_partner: target,
        title: String(title || '一封时光胶囊').slice(0, 60),
        seal_style: String(sealStyle || '08·08').slice(0, 12),
        teaser_hint: String(teaserHint || '').slice(0, 80),
        unlock_at: unlockAt || new Date().toISOString(),
        body: String(body || '').slice(0, 4000),
        created_at: new Date().toISOString()
      };
      await dbFetch('capsule_letters', { method: 'POST', body: JSON.stringify(row) });
      await pushBarkToPartner(
        partner,
        `💌 ${sender.emoji} ${sender.name}寄来一封火漆时光胶囊`,
        `《${row.title}》 · 暗号：${row.teaser_hint || '到期揭晓'}`,
        'minuet'
      );
      return jsonResp({ ok: true }, 200, origin);
    }

    if (req.method === 'POST' && route === '/capsules/open') {
      const { id } = await req.json();
      const targetId = encodeURIComponent(String(id || ''));
      const rows = await dbFetch(`capsule_letters?id=eq.${targetId}&select=*&limit=1`);
      const row = rows?.[0];
      if (!row) {
        return jsonResp({ error: '未找到这封时光胶囊' }, 404, origin);
      }
      const unlockMs = Date.parse(String(row.unlock_at || ''));
      if (!Number.isNaN(unlockMs) && Date.now() < unlockMs) {
        return jsonResp({ error: '还没到拆封时间哦，再耐心等等吧~' }, 403, origin);
      }
      const openedAt = row.opened_at || new Date().toISOString();
      if (!row.opened_at) {
        await dbFetch(`capsule_letters?id=eq.${targetId}`, {
          method: 'PATCH',
          body: JSON.stringify({ opened_at: openedAt })
        });
      }
      return jsonResp({ ok: true, id: row.id, openedAt, body: row.body || '' }, 200, origin);
    }

    if (req.method === 'POST' && route === '/capsules/receipt') {
      const { id, icon, label, note, title } = await req.json();
      const receipt = {
        icon: String(icon || '💓'),
        label: String(label || '已读心动'),
        note: String(note || '').slice(0, 60),
        by: partner,
        at: new Date().toISOString()
      };
      await dbFetch(`capsule_letters?id=eq.${encodeURIComponent(String(id))}`, {
        method: 'PATCH',
        body: JSON.stringify({ receipt })
      });
      await pushBarkToPartner(
        partner,
        `${receipt.icon} ${sender.name}给你的胶囊盖了「${receipt.label}」`,
        receipt.note || `已拆阅《${title || '时光胶囊'}》`,
        'glass'
      );
      return jsonResp({ ok: true }, 200, origin);
    }

    if (req.method === 'POST' && route === '/letters/update') {
      const { text } = await req.json();
      // Always bind letter authorship to the authenticated partner to prevent accidental overwrites
      const authorId = partner;
      await dbFetch('dual_letters?on_conflict=author_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({
          author_id: authorId,
          text: String(text || '').slice(0, 5000),
          updated_at: new Date().toISOString().slice(0, 10)
        })
      });
      await pushBarkToPartner(
        partner,
        `✍️ ${sender.emoji} ${sender.name}更新了双城来信`,
        '快打开纪念册读一读最新回信吧~',
        'minuet'
      );
      return jsonResp({ ok: true, author: authorId }, 200, origin);
    }

    if (req.method === 'POST' && route === '/letters/receipt') {
      const { author, icon, label, note } = await req.json();
      const authorId = author === 'lyg' ? 'lyg' : 'beijing';
      const receipt = {
        icon: String(icon || '💓'),
        label: String(label || '已读心动'),
        note: String(note || '').slice(0, 60),
        by: partner,
        at: new Date().toISOString()
      };
      await dbFetch(`dual_letters?author_id=eq.${authorId}`, {
        method: 'PATCH',
        body: JSON.stringify({ receipt })
      });
      await pushBarkToPartner(
        partner,
        `${receipt.icon} ${sender.name}给你的长信盖了「${receipt.label}」`,
        receipt.note || '信件已被温柔珍藏 💌',
        'glass'
      );
      return jsonResp({ ok: true }, 200, origin);
    }

    return jsonResp({ error: 'Not Found' }, 404, origin);
  } catch (err) {
    return jsonResp({ error: err instanceof Error ? err.message : 'Internal Error' }, 500, origin);
  }
});
