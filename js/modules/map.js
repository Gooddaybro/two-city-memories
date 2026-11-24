import {
  MAP_VIEWBOX,
  DATE_IDEAS,
  projectCoord,
  computeJourneyStats,
  pickDateIdea
} from '../utils/stage2-logic.js';
import { escapeHtml, showToast } from './ui.js';

// Real lat/lng coastline silhouette waypoints for North-East China (Hebei -> Bohai -> Shandong -> Jiangsu)
const LAND_POLYGON_COORDS = [
  [113.2, 41.6],
  [119.6, 41.6],
  [119.8, 40.0],
  [118.9, 39.1],
  [117.7, 39.0],
  [117.9, 38.2],
  [119.1, 37.9],
  [119.0, 37.2],
  [120.4, 37.6],
  [122.4, 37.4],
  [122.3, 36.9],
  [121.2, 36.6],
  [120.4, 36.0],
  [119.6, 35.4],
  [119.3, 34.8],
  [119.9, 34.3],
  [120.6, 33.4],
  [121.6, 32.0],
  [121.8, 31.4],
  [113.2, 31.4]
];

function buildLandPath() {
  const pts = LAND_POLYGON_COORDS.map((c) => projectCoord(c));
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
}

function buildGraticuleSvg() {
  const lines = [];
  for (const lat of [33, 35, 37, 39, 41]) {
    const p1 = projectCoord([113.4, lat]);
    const p2 = projectCoord([122.4, lat]);
    lines.push(
      `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="currentColor" stroke-opacity="0.06" stroke-dasharray="3 5" />` +
        `<text x="12" y="${p1.y - 3}" fill="currentColor" fill-opacity="0.22" font-size="9" font-family="monospace">${lat}°N</text>`
    );
  }
  for (const lng of [115, 117, 119, 121]) {
    const p1 = projectCoord([lng, 41.4]);
    const p2 = projectCoord([lng, 31.8]);
    lines.push(
      `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="currentColor" stroke-opacity="0.06" stroke-dasharray="3 5" />`
    );
  }
  return lines.join('');
}

function animateCount(el, target, suffix = '') {
  if (!el) return;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    el.textContent = `${target.toLocaleString()}${suffix}`;
    return;
  }

  const startTime = performance.now();
  const duration = 900;
  const step = (now) => {
    const progress = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(target * eased);
    el.textContent = `${current.toLocaleString()}${suffix}`;
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}

export function initMapModule(store, { onOpenPhoto } = {}) {
  const svgMount = document.getElementById('routeMapSvgContainer');
  const detailCard = document.getElementById('mapCityDetailCard');
  const statsSection = document.getElementById('mileageStatsGrid');

  const statKmEl = document.getElementById('statTotalKm');
  const statTicketsEl = document.getElementById('statCheckedTickets');
  const statCitiesEl = document.getElementById('statLitCities');
  const statWishPctEl = document.getElementById('statWishPct');

  // Date idea scratch/draw widget elements
  const scratchCover = document.getElementById('dateIdeaCover');
  const ideaCategoryEl = document.getElementById('dateIdeaCategory');
  const ideaTitleEl = document.getElementById('dateIdeaTitle');
  const ideaNoteEl = document.getElementById('dateIdeaNote');
  const drawIdeaBtn = document.getElementById('drawDateIdeaBtn');
  const addIdeaWishBtn = document.getElementById('addDateIdeaToWishBtn');

  let selectedCity = '连云港';
  let hasAnimatedStats = false;
  let currentIdea = pickDateIdea(DATE_IDEAS, null);

  const renderDateIdea = (revealed = false) => {
    if (ideaCategoryEl) ideaCategoryEl.textContent = currentIdea.category;
    if (ideaTitleEl) ideaTitleEl.textContent = currentIdea.title;
    if (ideaNoteEl) ideaNoteEl.textContent = currentIdea.note;
    if (scratchCover) {
      scratchCover.classList.toggle('scratch-revealed', revealed);
    }
  };

  scratchCover?.addEventListener('click', () => {
    scratchCover.classList.add('scratch-revealed');
  });

  drawIdeaBtn?.addEventListener('click', () => {
    currentIdea = pickDateIdea(DATE_IDEAS, currentIdea?.id);
    renderDateIdea(true);
  });

  addIdeaWishBtn?.addEventListener('click', () => {
    const state = store.getState();
    const exists = state.wishes.some((w) => w.text === currentIdea.title);
    if (exists) {
      showToast('这个约会灵感已经在心愿清单里啦');
      return;
    }
    store.update((draft) => {
      draft.wishes.push({
        id: `w_${Date.now()}`,
        text: currentIdea.title,
        done: false,
        pinned: false,
        author: 'both',
        createdAt: new Date().toISOString().slice(0, 10),
        doneAt: null,
        tags: [currentIdea.category]
      });
    });
    showToast('已把这条约会灵感加入研途清单！', 'success');
  });

  renderDateIdea(false);

  const renderCityDetail = (stats) => {
    if (!detailCard) return;
    const node =
      stats.cityNodes.find((n) => n.city === selectedCity) ||
      stats.cityNodes[0];

    if (!node) return;
    selectedCity = node.city;

    const statusBadge = node.isHome
      ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/15 text-[var(--accent-gold)] border border-[var(--border-color)]">双城坐标</span>'
      : node.lit
        ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">已点亮足迹</span>'
        : '<span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/5 text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)]">筹备下一站</span>';

    const ticketsHtml = node.tickets.length
      ? node.tickets
          .map(
            (t) => `
          <div class="p-3 rounded-xl bg-white/5 border border-[var(--border-subtle)] space-y-1">
            <div class="flex items-center justify-between text-[11px] font-mono">
              <span class="text-[var(--accent-gold)] font-bold">${escapeHtml(t.date)} · ${escapeHtml(t.subtitle)}</span>
              <span class="text-[var(--text-muted)]">${escapeHtml(t.status)}</span>
            </div>
            <p class="text-xs text-[var(--text-secondary)] leading-relaxed">${escapeHtml(t.desc)}</p>
          </div>
        `
          )
          .join('')
      : `<p class="text-xs text-[var(--text-secondary)] leading-relaxed">${escapeHtml(node.subtitle || '属于许金阳与渐姝君的双城起点，每一趟奔赴都从这里出发。')}</p>`;

    const photosHtml = node.photos.length
      ? `
        <div class="space-y-2 pt-2">
          <div class="text-[10px] font-mono tracking-wider text-[var(--text-muted)] uppercase">精选胶片 · 点击查看大图 (${node.photos.length})</div>
          <div class="grid grid-cols-3 gap-2">
            ${node.photos
              .slice(0, 3)
              .map(
                (p) => `
              <button data-map-photo-id="${escapeHtml(p.id)}" class="group relative aspect-[3/4] rounded-xl overflow-hidden border border-[var(--border-subtle)] hover:border-[var(--accent-gold)] transition bg-black">
                <img src="${escapeHtml(p.path)}" alt="${escapeHtml(p.title)}" loading="lazy" class="w-full h-full object-cover object-[50%_25%] group-hover:scale-105 transition duration-300" />
              </button>
            `
              )
              .join('')}
          </div>
        </div>
      `
      : '';

    detailCard.innerHTML = `
      <div class="space-y-4">
        <div class="flex items-start justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
          <div>
            <div class="flex items-center gap-2">
              <h3 class="font-serif text-xl font-bold text-[var(--text-primary)]">${escapeHtml(node.city)}</h3>
              ${statusBadge}
            </div>
            <p class="text-[11px] font-mono text-[var(--text-muted)] mt-1">
              ${node.coords[1].toFixed(2)}° N · ${node.coords[0].toFixed(2)}° E
            </p>
          </div>
          <span class="text-[10px] font-mono text-[var(--text-muted)]">点击地图光点切换</span>
        </div>

        <div class="space-y-2.5">${ticketsHtml}</div>
        ${photosHtml}
      </div>
    `;
  };

  const renderStats = (stats, animate = false) => {
    if (animate) {
      animateCount(statKmEl, stats.totalKm, ' km');
      animateCount(statTicketsEl, stats.checkedTicketCount, ' 趟');
      animateCount(statCitiesEl, stats.unlockedCityCount, ' 座');
      animateCount(statWishPctEl, stats.wishPct, '%');
    } else {
      if (statKmEl) statKmEl.textContent = `${stats.totalKm.toLocaleString()} km`;
      if (statTicketsEl) statTicketsEl.textContent = `${stats.checkedTicketCount} 趟`;
      if (statCitiesEl) statCitiesEl.textContent = `${stats.unlockedCityCount} 座`;
      if (statWishPctEl) statWishPctEl.textContent = `${stats.wishPct}%`;
    }
  };

  const render = () => {
    const state = store.getState();
    const stats = computeJourneyStats(state);

    if (svgMount) {
      const landPath = buildLandPath();
      const graticule = buildGraticuleSvg();

      const arcsSvg = stats.routes
        .map((r) => {
          if (r.checked) {
            return `
              <path d="${r.path}" fill="none" stroke="var(--accent-gold)" stroke-opacity="0.24" stroke-width="2.2" stroke-linecap="round" />
              <path d="${r.path}" fill="none" stroke="url(#routeGlowGrad)" stroke-width="2.4" stroke-linecap="round" class="map-arc-flow" />
            `;
          }
          return `<path d="${r.path}" fill="none" stroke="var(--text-muted)" stroke-opacity="0.45" stroke-width="1.6" stroke-dasharray="5 6" stroke-linecap="round" />`;
        })
        .join('');

      const nodesSvg = stats.cityNodes
        .map((n) => {
          const isSelected = n.city === selectedCity;
          const r = n.isHome ? 7 : n.lit ? 5.5 : 4.5;
          const fill = n.lit ? 'var(--accent-gold)' : 'var(--text-muted)';
          const labelOffsetX = n.city === '连云港' ? 14 : n.city === '徐州' ? -14 : 12;
          const anchor = n.city === '徐州' ? 'end' : 'start';

          return `
            <g class="map-city-node cursor-pointer" data-map-city="${escapeHtml(n.city)}" tabindex="0" role="button" aria-label="查看${escapeHtml(n.city)}足迹">
              ${
                n.lit
                  ? `<circle cx="${n.point.x}" cy="${n.point.y}" r="${r + 9}" fill="var(--accent-gold)" fill-opacity="${isSelected ? 0.25 : 0.12}" class="map-node-pulse" />`
                  : ''
              }
              ${
                isSelected
                  ? `<circle cx="${n.point.x}" cy="${n.point.y}" r="${r + 5}" fill="none" stroke="var(--accent-gold)" stroke-width="1.5" />`
                  : ''
              }
              <circle cx="${n.point.x}" cy="${n.point.y}" r="${r}" fill="${fill}" stroke="var(--bg-main)" stroke-width="2" />
              <circle cx="${n.point.x}" cy="${n.point.y}" r="18" fill="transparent" />
              <text x="${n.point.x + labelOffsetX}" y="${n.point.y + 4}" text-anchor="${anchor}" fill="var(--text-primary)" font-size="${n.isHome ? 13 : 12}" font-weight="${isSelected || n.isHome ? '700' : '500'}" font-family="'Noto Serif SC', serif">
                ${escapeHtml(n.city)}${n.photos.length ? ' · 🎞' : ''}
              </text>
            </g>
          `;
        })
        .join('');

      svgMount.innerHTML = `
        <svg viewBox="0 0 ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}" class="w-full h-auto block select-none" aria-label="北京至连云港双城轨迹地图">
          <defs>
            <linearGradient id="routeGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#F8E7C0" stop-opacity="0.95" />
              <stop offset="50%" stop-color="#E5C185" stop-opacity="0.85" />
              <stop offset="100%" stop-color="#7AB6EA" stop-opacity="0.9" />
            </linearGradient>
            <linearGradient id="landGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="var(--accent-gold)" stop-opacity="0.09" />
              <stop offset="100%" stop-color="var(--accent-gold)" stop-opacity="0.02" />
            </linearGradient>
          </defs>

          <!-- Subtle sea/coordinate backdrop -->
          <rect width="${MAP_VIEWBOX.width}" height="${MAP_VIEWBOX.height}" rx="20" fill="transparent" />
          ${graticule}

          <!-- Eastern China stylized landmass & coastline -->
          <path d="${landPath}" fill="url(#landGrad)" stroke="var(--border-color)" stroke-width="1.3" stroke-linejoin="round" />

          <!-- Sea watermark labels -->
          <text x="530" y="138" fill="currentColor" fill-opacity="0.16" font-size="11" font-family="serif" letter-spacing="4">渤海</text>
          <text x="548" y="348" fill="currentColor" fill-opacity="0.16" font-size="11" font-family="serif" letter-spacing="4">黄海</text>

          <!-- Rail arcs -->
          ${arcsSvg}

          <!-- City nodes -->
          ${nodesSvg}
        </svg>
      `;
    }

    renderCityDetail(stats);
    renderStats(stats, false);
  };

  svgMount?.addEventListener('click', (e) => {
    const node = e.target.closest('[data-map-city]');
    if (!node) return;
    selectedCity = node.getAttribute('data-map-city') || selectedCity;
    render();
  });

  detailCard?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-map-photo-id]');
    if (!btn || typeof onOpenPhoto !== 'function') return;
    const id = btn.getAttribute('data-map-photo-id');
    const photo = (store.getState().photos || []).find((p) => p.id === id);
    if (photo) onOpenPhoto(photo);
  });

  // Trigger count-up animation once when stats panel scrolls into view
  if (statsSection && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !hasAnimatedStats) {
          hasAnimatedStats = true;
          renderStats(computeJourneyStats(store.getState()), true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(statsSection);
  }

  render();

  return { render };
}
