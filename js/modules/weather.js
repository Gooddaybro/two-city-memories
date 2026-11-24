import {
  describeWeatherCode,
  generateWeatherTip,
  getSkyMood
} from '../utils/stage2-logic.js';

const WEATHER_CACHE_KEY = 'two_city_weather_cache_v1';
const CACHE_TTL_MS = 15 * 60 * 1000;

async function fetchCityWeather(lat, lng) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,weather_code,wind_speed_10m,is_day&timezone=Asia%2FShanghai`;
  const resp = await fetch(url, { mode: 'cors' });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  const cur = data?.current;
  if (!cur) throw new Error('Missing current weather payload');
  return {
    temp: Math.round(Number(cur.temperature_2m)),
    weatherCode: Number(cur.weather_code),
    windSpeed: Number(cur.wind_speed_10m || 0),
    isDay: cur.is_day === 1
  };
}

function readCache() {
  try {
    const raw = window.sessionStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    window.sessionStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // Ignore storage quota / privacy restriction
  }
}

export function initWeatherModule(store) {
  const bjTempEl = document.getElementById('weatherBjTemp');
  const bjDescEl = document.getElementById('weatherBjDesc');
  const lygTempEl = document.getElementById('weatherLygTemp');
  const lygDescEl = document.getElementById('weatherLygDesc');
  const diffBadgeEl = document.getElementById('weatherDiffBadge');
  const tipEl = document.getElementById('weatherTipText');
  const skyBadgeEl = document.getElementById('skyMoodBadge');
  const heroGlowEl = document.getElementById('heroAmbientGlow');
  const refreshBtn = document.getElementById('refreshWeatherBtn');

  const applySkyMood = () => {
    const mood = getSkyMood(new Date().getHours());
    if (skyBadgeEl) skyBadgeEl.textContent = mood.label;
    if (heroGlowEl) {
      heroGlowEl.style.background = `radial-gradient(circle, ${mood.glowColor} 0%, transparent 72%)`;
    }
  };

  const renderWeather = (bj, lyg) => {
    const bjInfo = describeWeatherCode(bj.weatherCode, bj.isDay);
    const lygInfo = describeWeatherCode(lyg.weatherCode, lyg.isDay);
    const diff = Math.abs(bj.temp - lyg.temp);

    if (bjTempEl) bjTempEl.textContent = `${bj.temp}°C`;
    if (bjDescEl) bjDescEl.textContent = `${bjInfo.icon} ${bjInfo.label}`;
    if (lygTempEl) lygTempEl.textContent = `${lyg.temp}°C`;
    if (lygDescEl) lygDescEl.textContent = `${lygInfo.icon} ${lygInfo.label}`;
    if (diffBadgeEl) diffBadgeEl.textContent = `温差 ${diff}°C`;
    if (tipEl) tipEl.textContent = generateWeatherTip(bj, lyg);
  };

  const renderFallback = () => {
    if (bjDescEl && bjDescEl.textContent.includes('加载')) bjDescEl.textContent = '✨ 北京实时连线中';
    if (lygDescEl && lygDescEl.textContent.includes('加载')) lygDescEl.textContent = '🌊 连云港海风时刻';
    if (diffBadgeEl) diffBadgeEl.textContent = '同屏此刻';
    if (tipEl) tipEl.textContent = '隔着 740 公里山海，无论晴雨，小狗和小猪都在同一片天空下。';
  };

  const loadWeather = async (forceRefresh = false) => {
    applySkyMood();

    if (!forceRefresh) {
      const cached = readCache();
      if (cached?.bj && cached?.lyg) {
        renderWeather(cached.bj, cached.lyg);
        return;
      }
    }

    refreshBtn?.classList.add('animate-spin');
    try {
      const state = store.getState();
      const bjCoords = state.couple.partners.beijing.coords || [116.4074, 39.9042];
      const lygCoords = state.couple.partners.lyg.coords || [119.2216, 34.5967];

      const [bj, lyg] = await Promise.all([
        fetchCityWeather(bjCoords[1], bjCoords[0]),
        fetchCityWeather(lygCoords[1], lygCoords[0])
      ]);

      writeCache({ bj, lyg });
      renderWeather(bj, lyg);
    } catch {
      renderFallback();
    } finally {
      window.setTimeout(() => refreshBtn?.classList.remove('animate-spin'), 400);
    }
  };

  refreshBtn?.addEventListener('click', () => loadWeather(true));
  loadWeather(false);

  return { refresh: () => loadWeather(true) };
}
