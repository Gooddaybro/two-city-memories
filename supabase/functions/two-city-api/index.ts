// Supabase Edge Function: two-city-api
// 统一网关：双人 0808 口令认领、心愿/心情/来信/心跳墙双向同步、时光胶囊服务端防偷看、双 iPhone Bark APNs 推送

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
const COUPLE_SECRET = Deno.env.get('COUPLE_SECRET') || '0808';
const TOKEN_SECRET = Deno.env.get('TOKEN_SECRET') || `two-city-hmac-${COUPLE_SECRET}`;

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
  const body = btoa(JSON.stringify({ partner, iat: Date.now() }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const sig = await hmacSign(body);
  return `${body}.${sig}`;
}

async function verifyToken(req: Request): Promise<'beijing' | 'lyg' | null> {
  const auth = req.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = await hmacSign(body);
  if (sig !== expected) return null;
  try {
    const padded = body.replace(/-/g, '+').replace(/_/g, '/');
    const parsed = JSON.parse(atob(padded));
    return parsed?.partner === 'beijing' || parsed?.partner === 'lyg' ? parsed.partner : null;
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

async function pushBarkToPartner(
  sender: 'beijing' | 'lyg',
  title: string,
  body: string,
  sound = 'bell'
) {
  const target = sender === 'beijing' ? 'lyg' : 'beijing';
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
          barkConfigured: Boolean(keys.beijing && keys.lyg),
          bark: { beijing: Boolean(keys.beijing), lyg: Boolean(keys.lyg) }
        },
        200,
        origin
      );
    }

    if (req.method === 'POST' && route === '/auth/claim') {
      const { partner, passcode } = await req.json();
      if (partner !== 'beijing' && partner !== 'lyg') {
        return jsonResp({ error: '无效的身份选项' }, 400, origin);
      }
      if (String(passcode ?? '').trim() !== COUPLE_SECRET) {
        return jsonResp({ error: '密码不对哦，请重试' }, 401, origin);
      }
      const token = await createToken(partner);
      return jsonResp({ ok: true, partner, token }, 200, origin);
    }

    if (req.method === 'GET' && route === '/sync') {
      const [moodRows, wishRows, signalRows, capsuleRows, letterRows] = await Promise.all([
        dbFetch('couple_moods?select=*'),
        dbFetch('wishes_sync?select=*&order=pinned.desc,updated_at.asc'),
        dbFetch('love_signals?select=*&order=created_at.desc&limit=25'),
        dbFetch('capsule_letters?select=*&order=created_at.desc&limit=30'),
        dbFetch('dual_letters?select=*')
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

      return jsonResp({ ok: true, moods, wishes: wishRows || [], signals, capsules, letters }, 200, origin);
    }

    // All write endpoints require valid HMAC identity token
    const partner = await verifyToken(req);
    if (!partner) {
      return jsonResp({ error: '请先输入口令认领你的身份（小狗 / 小猪）' }, 401, origin);
    }
    const sender = PARTNER_NAMES[partner];

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
      // 10s cooldown check
      const latest = await dbFetch(`love_signals?from_partner=eq.${partner}&order=created_at.desc&limit=1`);
      if (latest?.[0]?.created_at && Date.now() - Date.parse(latest[0].created_at) < 10_000) {
        return jsonResp({ error: '电波发射太快啦，休息 10 秒再戳~' }, 429, origin);
      }

      const { id, presetId, icon, label, note, sound } = await req.json();
      const row = {
        id: String(id || `sig_${Date.now()}`),
        from_partner: partner,
        preset_id: String(presetId || 'miss'),
        icon: String(icon || '🐾').slice(0, 8),
        label: String(label || '突然想你').slice(0, 20),
        note: String(note || '').slice(0, 40),
        hugged_back: false,
        created_at: new Date().toISOString()
      };
      await dbFetch('love_signals', { method: 'POST', body: JSON.stringify(row) });
      const push = await pushBarkToPartner(
        partner,
        `${row.icon} ${sender.name}（${sender.nick}）发来「${row.label}」`,
        row.note || '点开双城纪念册给 TA 回一个抱抱吧~',
        String(sound || 'bell')
      );
      return jsonResp({ ok: true, push }, 200, origin);
    }

    if (req.method === 'POST' && route === '/signals/hug') {
      const { id } = await req.json();
      await dbFetch(`love_signals?id=eq.${encodeURIComponent(String(id))}`, {
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
      await dbFetch(`capsule_letters?id=eq.${encodeURIComponent(String(id))}`, {
        method: 'PATCH',
        body: JSON.stringify({ opened_at: new Date().toISOString() })
      });
      return jsonResp({ ok: true }, 200, origin);
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
      const { author, text } = await req.json();
      const authorId = author === 'lyg' ? 'lyg' : 'beijing';
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
      return jsonResp({ ok: true }, 200, origin);
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
