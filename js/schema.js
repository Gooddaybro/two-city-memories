import {
  SCHEMA_VERSION,
  CORE_WISH_TEXT,
  CITY_COORDS,
  DEFAULT_STATE
} from '../data/defaults.js';

export { SCHEMA_VERSION, CORE_WISH_TEXT };

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseJsonSafe(raw) {
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function inferToCity(route, fallbackCity = '') {
  if (typeof route === 'string' && route.trim()) {
    const parts = route.split(/→|->|⇄|↔/);
    const last = parts[parts.length - 1]?.trim();
    if (last && last !== '下一站') return last;
  }
  return fallbackCity;
}

function inferFromCity(route, fallbackCity = '北京') {
  if (typeof route === 'string' && route.trim()) {
    const parts = route.split(/→|->|⇄|↔/);
    const first = parts[0]?.trim();
    if (first) {
      for (const city of Object.keys(CITY_COORDS)) {
        if (first.includes(city)) return city;
      }
    }
  }
  return fallbackCity;
}

function normalizeStringArray(arr, fallback = []) {
  if (!Array.isArray(arr)) return [...fallback];
  return arr
    .map((item) => String(item ?? '').trim())
    .filter(Boolean);
}

function normalizePartner(input, fallback) {
  const src = isPlainObject(input) ? input : {};
  const coords =
    Array.isArray(src.coords) && src.coords.length === 2
      ? [Number(src.coords[0]) || fallback.coords[0], Number(src.coords[1]) || fallback.coords[1]]
      : [...fallback.coords];

  return {
    id: fallback.id,
    name: typeof src.name === 'string' && src.name.trim() ? src.name.trim() : fallback.name,
    nickname: typeof src.nickname === 'string' && src.nickname.trim() ? src.nickname.trim() : fallback.nickname,
    city: typeof src.city === 'string' && src.city.trim() ? src.city.trim() : fallback.city,
    coords,
    role: typeof src.role === 'string' && src.role.trim() ? src.role.trim() : fallback.role,
    birthday: typeof src.birthday === 'string' ? src.birthday.trim() : fallback.birthday,
    avatar: typeof src.avatar === 'string' && src.avatar.trim() ? src.avatar.trim() : fallback.avatar,
    tags: normalizeStringArray(src.tags, fallback.tags),
    motto: typeof src.motto === 'string' && src.motto.trim() ? src.motto.trim() : fallback.motto
  };
}

function normalizeTicket(item, idx) {
  const src = isPlainObject(item) ? item : {};
  const route = typeof src.route === 'string' && src.route.trim() ? src.route.trim() : '双城专列';
  const toCity =
    typeof src.toCity === 'string' && src.toCity.trim()
      ? src.toCity.trim()
      : inferToCity(route, '');
  const fromCity =
    typeof src.fromCity === 'string' && src.fromCity.trim()
      ? src.fromCity.trim()
      : inferFromCity(route, '北京');
  const coords =
    Array.isArray(src.coords) && src.coords.length === 2
      ? [Number(src.coords[0]) || 0, Number(src.coords[1]) || 0]
      : CITY_COORDS[toCity]
        ? [...CITY_COORDS[toCity]]
        : null;

  return {
    id: typeof src.id === 'string' && src.id.trim() ? src.id.trim() : `t_${idx + 1}`,
    date: typeof src.date === 'string' && src.date.trim() ? src.date.trim() : '待定',
    code: typeof src.code === 'string' && src.code.trim() ? src.code.trim().toUpperCase() : 'MEM',
    route,
    fromCity,
    toCity,
    coords,
    distanceKm: Number.isFinite(Number(src.distanceKm)) ? Number(src.distanceKm) : 0,
    subtitle: typeof src.subtitle === 'string' && src.subtitle.trim() ? src.subtitle.trim() : '双城重逢',
    desc: typeof src.desc === 'string' ? src.desc.trim() : '',
    status: src.status === '已检票' ? '已检票' : '待出票',
    tags: normalizeStringArray(src.tags, toCity ? [toCity] : [])
  };
}

function normalizeMilestone(item, idx) {
  const src = isPlainObject(item) ? item : {};
  return {
    id: typeof src.id === 'string' && src.id.trim() ? src.id.trim() : `m_${idx + 1}`,
    date: typeof src.date === 'string' && src.date.trim() ? src.date.trim() : '未定日期',
    city: typeof src.city === 'string' && src.city.trim() ? src.city.trim() : '双城',
    title: typeof src.title === 'string' && src.title.trim() ? src.title.trim() : '新纪念日',
    note: typeof src.note === 'string' ? src.note.trim() : '',
    tags: normalizeStringArray(src.tags, [])
  };
}

function normalizePhoto(item, idx) {
  const src = isPlainObject(item) ? item : {};
  const city = typeof src.city === 'string' && src.city.trim() ? src.city.trim() : '双城';
  const title = typeof src.title === 'string' && src.title.trim() ? src.title.trim() : `回忆片段 #${idx + 1}`;
  return {
    id: typeof src.id === 'string' && src.id.trim() ? src.id.trim() : `p_${idx + 1}`,
    city,
    date: typeof src.date === 'string' && src.date.trim() ? src.date.trim() : '',
    title,
    path: typeof src.path === 'string' ? src.path.trim() : '',
    caption: typeof src.caption === 'string' && src.caption.trim() ? src.caption.trim() : title,
    tags: normalizeStringArray(src.tags, [city]),
    gradient:
      typeof src.gradient === 'string' && src.gradient.trim()
        ? src.gradient.trim()
        : 'linear-gradient(135deg, #1f2937, #111827)',
    presetMeta:
      typeof src.presetMeta === 'string' && src.presetMeta.trim()
        ? src.presetMeta.trim()
        : `35mm · Archive · ${city}`
  };
}

function normalizeWish(item, idx) {
  const src = isPlainObject(item) ? item : {};
  const text = typeof src.text === 'string' ? src.text.trim() : '';
  const isCore = text === CORE_WISH_TEXT;
  return {
    id: typeof src.id === 'string' && src.id.trim() ? src.id.trim() : `w_${idx + 1}`,
    text,
    done: Boolean(src.done),
    pinned: Boolean(src.pinned) || isCore,
    author: typeof src.author === 'string' && src.author.trim() ? src.author.trim() : 'both',
    createdAt: typeof src.createdAt === 'string' && src.createdAt.trim() ? src.createdAt.trim() : '',
    doneAt: typeof src.doneAt === 'string' && src.doneAt.trim() ? src.doneAt.trim() : null,
    tags: normalizeStringArray(src.tags, isCore ? ['核心心愿', '未来'] : [])
  };
}

function normalizeLetter(input, fallback) {
  const src = isPlainObject(input) ? input : {};
  return {
    authorId: fallback.authorId,
    authorName:
      typeof src.authorName === 'string' && src.authorName.trim()
        ? src.authorName.trim()
        : fallback.authorName,
    nickname:
      typeof src.nickname === 'string' && src.nickname.trim()
        ? src.nickname.trim()
        : fallback.nickname,
    title: typeof src.title === 'string' && src.title.trim() ? src.title.trim() : fallback.title,
    meta: typeof src.meta === 'string' && src.meta.trim() ? src.meta.trim() : fallback.meta,
    text: typeof src.text === 'string' && src.text.trim() ? src.text : fallback.text,
    updatedAt:
      typeof src.updatedAt === 'string' && src.updatedAt.trim()
        ? src.updatedAt.trim()
        : fallback.updatedAt,
    unlockAt: typeof src.unlockAt === 'string' && src.unlockAt.trim() ? src.unlockAt.trim() : null
  };
}

export function createDefaultState() {
  return deepClone(DEFAULT_STATE);
}

export function normalizeState(input) {
  const defaults = createDefaultState();
  if (!isPlainObject(input)) {
    return defaults;
  }

  const coupleSrc = isPlainObject(input.couple) ? input.couple : {};
  const partnersSrc = isPlainObject(coupleSrc.partners) ? coupleSrc.partners : {};
  const settingsSrc = isPlainObject(input.settings) ? input.settings : {};
  const nextMeetSrc = isPlainObject(input.nextMeet) ? input.nextMeet : {};
  const lettersSrc = isPlainObject(input.letters) ? input.letters : {};

  const tickets = Array.isArray(input.tickets)
    ? input.tickets.map(normalizeTicket)
    : defaults.tickets;

  const milestones = Array.isArray(input.milestones)
    ? input.milestones.map(normalizeMilestone)
    : defaults.milestones;

  const photos = Array.isArray(input.photos)
    ? input.photos.map(normalizePhoto)
    : defaults.photos;

  const wishes = Array.isArray(input.wishes)
    ? input.wishes.map(normalizeWish).filter((w) => w.text.length > 0)
    : defaults.wishes;

  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt:
      typeof input.updatedAt === 'string' && input.updatedAt.trim()
        ? input.updatedAt.trim()
        : new Date().toISOString(),
    couple: {
      startDate:
        typeof coupleSrc.startDate === 'string' && coupleSrc.startDate.trim()
          ? coupleSrc.startDate.trim()
          : defaults.couple.startDate,
      passcode:
        typeof coupleSrc.passcode === 'string' && coupleSrc.passcode.trim()
          ? coupleSrc.passcode.trim()
          : defaults.couple.passcode,
      partners: {
        beijing: normalizePartner(partnersSrc.beijing, defaults.couple.partners.beijing),
        lyg: normalizePartner(partnersSrc.lyg, defaults.couple.partners.lyg)
      }
    },
    settings: {
      lockOnOpen: Boolean(settingsSrc.lockOnOpen)
    },
    nextMeet: {
      date:
        typeof nextMeetSrc.date === 'string' && nextMeetSrc.date.trim()
          ? nextMeetSrc.date.trim()
          : defaults.nextMeet.date,
      city:
        typeof nextMeetSrc.city === 'string' && nextMeetSrc.city.trim()
          ? nextMeetSrc.city.trim()
          : defaults.nextMeet.city,
      note:
        typeof nextMeetSrc.note === 'string' && nextMeetSrc.note.trim()
          ? nextMeetSrc.note.trim()
          : defaults.nextMeet.note
    },
    milestones,
    tickets,
    photos,
    wishes,
    letters: {
      beijing: normalizeLetter(lettersSrc.beijing, defaults.letters.beijing),
      lyg: normalizeLetter(lettersSrc.lyg, defaults.letters.lyg)
    }
  };
}

function ensureCoreWishPinned(wishes) {
  const list = Array.isArray(wishes) ? [...wishes] : [];
  const existingIdx = list.findIndex((w) => w.text === CORE_WISH_TEXT);
  if (existingIdx === -1) {
    list.unshift(deepClone(DEFAULT_STATE.wishes[0]));
  } else {
    const [core] = list.splice(existingIdx, 1);
    core.pinned = true;
    list.unshift(core);
  }
  return list;
}

export function migrateLegacyStorage(rawLegacy) {
  const legacy = isPlainObject(rawLegacy) ? rawLegacy : {};
  const tickets = parseJsonSafe(legacy.bj_lyg_tickets);
  const wishes = parseJsonSafe(legacy.bj_lyg_wishes);
  const letters = parseJsonSafe(legacy.bj_lyg_letters);
  const nextMeet = parseJsonSafe(legacy.bj_lyg_next_meet);

  const partial = {};
  if (Array.isArray(tickets)) partial.tickets = tickets;
  if (Array.isArray(wishes)) partial.wishes = wishes;
  if (isPlainObject(letters)) partial.letters = letters;
  if (isPlainObject(nextMeet)) partial.nextMeet = nextMeet;

  const normalized = normalizeState(partial);
  normalized.wishes = ensureCoreWishPinned(normalized.wishes);
  return normalized;
}

export function migrateBackupPayload(rawPayload) {
  const parsed = parseJsonSafe(rawPayload);
  if (!isPlainObject(parsed)) {
    throw new Error('无效的 JSON 备份文件：内容不是合法对象');
  }

  const hasV2 = parsed.schemaVersion === SCHEMA_VERSION;
  const hasKnownKeys =
    Array.isArray(parsed.tickets) ||
    Array.isArray(parsed.wishes) ||
    isPlainObject(parsed.letters) ||
    isPlainObject(parsed.nextMeet) ||
    isPlainObject(parsed.couple) ||
    Array.isArray(parsed.milestones);

  if (!hasV2 && !hasKnownKeys) {
    throw new Error('无效的 JSON 备份文件：缺少纪念册核心数据字段');
  }

  const normalized = normalizeState(parsed);
  if (!hasV2) {
    normalized.wishes = ensureCoreWishPinned(normalized.wishes);
  }
  return normalized;
}

export function getUnlockedCities(tickets) {
  if (!Array.isArray(tickets)) return [];
  const seen = new Set();
  for (const ticket of tickets) {
    if (!ticket || ticket.status !== '已检票') continue;
    const city =
      typeof ticket.toCity === 'string' && ticket.toCity.trim()
        ? ticket.toCity.trim()
        : inferToCity(ticket.route, '');
    if (city && city !== '下一站' && city !== '待定') {
      seen.add(city);
    }
  }
  return Array.from(seen);
}
