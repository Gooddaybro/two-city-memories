import { CITY_COORDS } from '../../data/defaults.js';
import { getUnlockedCities } from '../schema.js';

export const MAP_VIEWBOX = { width: 640, height: 520 };

const GEO_BOUNDS = {
  minLng: 113.4,
  maxLng: 122.4,
  minLat: 31.8,
  maxLat: 41.4,
  padX: 48,
  padY: 42
};

export const EXTRA_CITY_COORDS = {
  ...CITY_COORDS,
  天津: [117.2009, 39.0842],
  青岛: [120.3826, 36.0671],
  烟台: [121.4479, 37.4638],
  威海: [122.1204, 37.5131],
  泰安: [117.0876, 36.2003],
  曲阜: [116.9863, 35.5809],
  南京: [118.7969, 32.0603],
  扬州: [119.4129, 32.3942],
  日照: [119.5269, 35.4164],
  潍坊: [119.1618, 36.7067],
  临沂: [118.3564, 35.1047],
  苏州: [120.5853, 31.2989]
};

export const DATE_IDEAS = [
  {
    id: 'idea1',
    category: '旅行',
    title: '去淄博看海岱楼亮灯 + 吃小饼烧烤',
    note: '晚风吹着烤炉烟火气，小狗负责卷饼，小猪负责挑肉串。'
  },
  {
    id: 'idea2',
    category: '看海',
    title: '去青岛八大关压马路 + 等橘子海日落',
    note: '沿着海边栈道走完一整个下午，拍一组胶片感双人照。'
  },
  {
    id: 'idea3',
    category: '美食',
    title: '互换城市美食局 · 铜锅涮肉 vs 海鲜大排档',
    note: '下一趟见面第一顿直接冲最想念的那一口热乎味道。'
  },
  {
    id: 'idea4',
    category: '仪式感',
    title: '找一间老胶片照相馆拍四宫格大头贴',
    note: '洗出来一人一张夹在手机壳背后，异地也能低头看见。'
  },
  {
    id: 'idea5',
    category: '夜游',
    title: '不设闹钟的深夜散步 + 便利店热可可',
    note: '把攒了一整个月的琐碎日常，边走边慢慢讲给对方听。'
  },
  {
    id: 'idea6',
    category: '城市',
    title: '去南京梧桐大道骑车 + 玄武湖吹风',
    note: '京沪线与宁连线都很顺路，顺便打卡咸水鸭与梅花糕。'
  },
  {
    id: 'idea7',
    category: '手作',
    title: '一起做一枚刻着 08·08 的银戒或陶艺杯',
    note: '一个放北京书桌，一个放连云港课题组工位。'
  },
  {
    id: 'idea8',
    category: '窝着',
    title: '投影仪电影马拉松 + 手腕再画一次小太阳',
    note: '不赶景点不看返程表，配着《我爱你》慢慢虚度一个周末。'
  },
  {
    id: 'idea9',
    category: '看日出',
    title: '去连云港海边等一场早起日出',
    note: '裹着厚外套并肩看天色从深蓝变成温柔琥珀金。'
  }
];

export function describeWeatherCode(code, isDay = true) {
  const c = Number(code);
  if (c === 0) return isDay ? { label: '晴朗', icon: '☀️' } : { label: '晴夜', icon: '🌙' };
  if (c === 1 || c === 2) return isDay ? { label: '多云', icon: '⛅' } : { label: '微云', icon: '☁️' };
  if (c === 3) return { label: '阴天', icon: '☁️' };
  if (c === 45 || c === 48) return { label: '薄雾', icon: '🌫️' };
  if (c >= 51 && c <= 57) return { label: '细雨', icon: '🌦️' };
  if (c >= 61 && c <= 67) return { label: c >= 63 ? '中大雨' : '小雨', icon: '🌧️' };
  if (c >= 71 && c <= 77) return { label: '降雪', icon: '❄️' };
  if (c >= 80 && c <= 82) return { label: '阵雨', icon: '🌦️' };
  if (c >= 85 && c <= 86) return { label: '阵雪', icon: '🌨️' };
  if (c >= 95) return { label: '雷雨', icon: '⛈️' };
  return { label: '微风', icon: '✨' };
}

function isRainyCode(code) {
  const c = Number(code);
  return (c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95;
}

function isSnowyCode(code) {
  const c = Number(code);
  return (c >= 71 && c <= 77) || (c >= 85 && c <= 86);
}

export function generateWeatherTip(bj, lyg) {
  const bjTemp = Math.round(Number(bj?.temp ?? 10));
  const lygTemp = Math.round(Number(lyg?.temp ?? 12));
  const diff = Math.abs(bjTemp - lygTemp);
  const bjWind = Number(bj?.windSpeed ?? 0);
  const lygWind = Number(lyg?.windSpeed ?? 0);

  if (isSnowyCode(bj?.weatherCode) || isSnowyCode(lyg?.weatherCode)) {
    return `一方飘雪，隔着 740 公里也想和你同看一场白雪，记得保暖加衣。`;
  }
  if (isRainyCode(bj?.weatherCode) && isRainyCode(lyg?.weatherCode)) {
    return `北京和连云港此刻都在下雨，出门记得带伞，晚上视频互相报平安。`;
  }
  if (isRainyCode(bj?.weatherCode)) {
    return `北京正在下雨（${bjTemp}°C），小狗出门别忘带伞；连云港 ${lygTemp}°C，小猪也要照顾好自己。`;
  }
  if (isRainyCode(lyg?.weatherCode)) {
    return `连云港有雨（${lygTemp}°C），小猪回课题组记得带伞；北京 ${bjTemp}°C，小狗在想你。`;
  }
  if (diff >= 6) {
    const colder = bjTemp < lygTemp ? '北京' : '连云港';
    const who = bjTemp < lygTemp ? '小狗' : '小猪';
    return `两城温差 ${diff}°C，${colder}偏冷（北京 ${bjTemp}°C / 连云港 ${lygTemp}°C），记得提醒${who}多穿件外套。`;
  }
  if (bjWind >= 22 || lygWind >= 22) {
    const windy = bjWind >= lygWind ? '北京风有点大' : '连云港海风有点大';
    return `${windy}（北京 ${bjTemp}°C · 连云港 ${lygTemp}°C），吹风记得拉好衣领加衣。`;
  }
  return `北京 ${bjTemp}°C 与连云港 ${lygTemp}°C 相差 ${diff}°C，虽然隔着山海，此刻同看一片天色。`;
}

export function getSkyMood(hour) {
  const h = ((Number(hour) % 24) + 24) % 24;
  if (h >= 5 && h < 8) {
    return {
      id: 'dawn',
      label: '晨光微熹',
      glowColor: 'rgba(244, 185, 130, 0.28)',
      accentTint: '#F2B880'
    };
  }
  if (h >= 8 && h < 16) {
    return {
      id: 'day',
      label: '晴空正午',
      glowColor: 'rgba(116, 178, 232, 0.24)',
      accentTint: '#7AB6EA'
    };
  }
  if (h >= 16 && h < 19) {
    return {
      id: 'sunset',
      label: '橘子海黄昏',
      glowColor: 'rgba(238, 134, 96, 0.30)',
      accentTint: '#EE8660'
    };
  }
  return {
    id: 'night',
    label: '暗夜星轨',
    glowColor: 'rgba(229, 193, 133, 0.24)',
    accentTint: '#E5C185'
  };
}

export function projectCoord(coords) {
  const lng = Number(coords?.[0] ?? 117.5);
  const lat = Number(coords?.[1] ?? 36.5);
  const usableW = MAP_VIEWBOX.width - GEO_BOUNDS.padX * 2;
  const usableH = MAP_VIEWBOX.height - GEO_BOUNDS.padY * 2;

  const nx = (lng - GEO_BOUNDS.minLng) / (GEO_BOUNDS.maxLng - GEO_BOUNDS.minLng);
  const ny = (GEO_BOUNDS.maxLat - lat) / (GEO_BOUNDS.maxLat - GEO_BOUNDS.minLat);

  return {
    x: Number((GEO_BOUNDS.padX + nx * usableW).toFixed(1)),
    y: Number((GEO_BOUNDS.padY + ny * usableH).toFixed(1))
  };
}

export function buildBezierArc(p1, p2, curvature = 0.22) {
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const cx = Number((mx - dy * curvature).toFixed(1));
  const cy = Number((my + dx * curvature).toFixed(1));
  return `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`;
}

export function enrichTicketMeta(ticket, index = 0) {
  const defaultTrains = ['G2589', 'G107', 'G2587', 'G149', 'G2591', 'G115'];
  const defaultSeats = ['04车 08A', '06车 08F', '03车 05A', '05车 08C', '07车 02F', '02车 08A'];
  const defaultGates = ['A12', 'B08', 'A06', 'B15', 'A09', 'B04'];

  const trainNo =
    typeof ticket?.trainNo === 'string' && ticket.trainNo.trim()
      ? ticket.trainNo.trim().toUpperCase()
      : defaultTrains[index % defaultTrains.length];
  const seat =
    typeof ticket?.seat === 'string' && ticket.seat.trim()
      ? ticket.seat.trim()
      : defaultSeats[index % defaultSeats.length];
  const gate =
    typeof ticket?.gate === 'string' && ticket.gate.trim()
      ? ticket.gate.trim().toUpperCase()
      : defaultGates[index % defaultGates.length];
  const ticketTheme =
    ticket?.ticketTheme === 'pink' || ticket?.ticketTheme === 'blue'
      ? ticket.ticketTheme
      : index % 2 === 1
        ? 'pink'
        : 'blue';

  return { trainNo, seat, gate, ticketTheme };
}

export function computeJourneyStats(state) {
  const tickets = Array.isArray(state?.tickets) ? state.tickets : [];
  const photos = Array.isArray(state?.photos) ? state.photos : [];
  const wishes = Array.isArray(state?.wishes) ? state.wishes : [];

  const checkedTickets = tickets.filter((t) => t.status === '已检票');
  const totalKm = checkedTickets.reduce((sum, t) => sum + (Number(t.distanceKm) || 0), 0);
  const unlockedCities = getUnlockedCities(tickets);

  const wishTotal = wishes.length;
  const wishDone = wishes.filter((w) => w.done).length;
  const wishPct = wishTotal > 0 ? Math.round((wishDone / wishTotal) * 100) : 0;

  const nodeMap = new Map();

  const ensureNode = (city, coords, isHome = false, subtitle = '') => {
    if (!city || city === '下一站' || city === '待定') return null;
    const resolvedCoords =
      Array.isArray(coords) && coords.length === 2 ? coords : EXTRA_CITY_COORDS[city] || null;
    if (!resolvedCoords) return null;

    if (!nodeMap.has(city)) {
      nodeMap.set(city, {
        city,
        coords: resolvedCoords,
        point: projectCoord(resolvedCoords),
        isHome,
        lit: isHome,
        subtitle,
        tickets: [],
        photos: []
      });
    } else if (isHome) {
      const existing = nodeMap.get(city);
      existing.isHome = true;
      existing.lit = true;
      if (subtitle) existing.subtitle = subtitle;
    }
    return nodeMap.get(city);
  };

  const bjPartner = state?.couple?.partners?.beijing;
  const lygPartner = state?.couple?.partners?.lyg;

  ensureNode(
    bjPartner?.city || '北京',
    bjPartner?.coords || EXTRA_CITY_COORDS['北京'],
    true,
    `${bjPartner?.name || '许金阳'}（${bjPartner?.nickname || '小狗'}）坐标`
  );
  ensureNode(
    lygPartner?.city || '连云港',
    lygPartner?.coords || EXTRA_CITY_COORDS['连云港'],
    true,
    `${lygPartner?.name || '渐姝君'}（${lygPartner?.nickname || '小猪'}）坐标`
  );

  const routes = [];
  const bjPoint = projectCoord(bjPartner?.coords || EXTRA_CITY_COORDS['北京']);
  const lygPoint = projectCoord(lygPartner?.coords || EXTRA_CITY_COORDS['连云港']);

  for (const ticket of tickets) {
    const dest = ticket.toCity;
    const node = ensureNode(dest, ticket.coords, false, ticket.subtitle || '');
    if (node) {
      node.tickets.push(ticket);
      if (ticket.status === '已检票') {
        node.lit = true;
      }

      const fromCity = ticket.fromCity || '北京';
      const fromNode = nodeMap.get(fromCity);
      const startPt = fromNode ? fromNode.point : bjPoint;

      if (dest !== fromCity) {
        routes.push({
          id: ticket.id,
          from: fromCity,
          to: dest,
          checked: ticket.status === '已检票',
          path: buildBezierArc(startPt, node.point, dest === '连云港' ? -0.18 : 0.2)
        });
      }

      // If destination is a midpoint city (neither Beijing nor Lianyungang), also draw LYG -> dest arc
      if (dest !== '北京' && dest !== '连云港') {
        routes.push({
          id: `${ticket.id}_lyg`,
          from: '连云港',
          to: dest,
          checked: ticket.status === '已检票',
          path: buildBezierArc(lygPoint, node.point, -0.22)
        });
      }
    }
  }

  for (const photo of photos) {
    const node = nodeMap.get(photo.city);
    if (node) {
      node.photos.push(photo);
      node.lit = true;
    }
  }

  return {
    totalKm,
    checkedTicketCount: checkedTickets.length,
    totalTickets: tickets.length,
    unlockedCityCount: unlockedCities.length,
    unlockedCities,
    wishDone,
    wishTotal,
    wishPct,
    cityNodes: Array.from(nodeMap.values()),
    routes
  };
}

export function pickDateIdea(pool = DATE_IDEAS, lastId = null, rand = Math.random) {
  const list = Array.isArray(pool) && pool.length ? pool : DATE_IDEAS;
  const candidates = list.length > 1 && lastId ? list.filter((item) => item.id !== lastId) : list;
  const idx = Math.floor(rand() * candidates.length) % candidates.length;
  return candidates[idx];
}
