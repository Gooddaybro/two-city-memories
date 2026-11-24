import { escapeHtml, showToast } from './ui.js';
import { enrichTicketMeta } from '../utils/stage2-logic.js';

function buildVirtualQrSvg(seedText) {
  const size = 7;
  let hash = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    hash ^= seedText.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const cells = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inCorner =
        (r < 2 && c < 2) ||
        (r < 2 && c >= size - 2) ||
        (r >= size - 2 && c < 2);
      const bit = ((hash >>> ((r * size + c) % 24)) & 1) === 1;
      if (inCorner || bit) {
        cells.push(`<rect x="${c * 4 + 2}" y="${r * 4 + 2}" width="3.4" height="3.4" rx="0.6" />`);
      }
    }
  }
  return `<svg viewBox="0 0 32 32" class="w-11 h-11 shrink-0 opacity-75" fill="currentColor" aria-hidden="true">${cells.join('')}</svg>`;
}

export function initTicketsModule(store) {
  const container = document.getElementById('ticketsContainer');
  const countLabel = document.getElementById('ticketCountLabel');
  const modal = document.getElementById('addTicketModal');

  const routeInput = document.getElementById('ticketRoute');
  const codeInput = document.getElementById('ticketCode');
  const dateInput = document.getElementById('ticketDate');
  const trainNoInput = document.getElementById('ticketTrainNo');
  const distanceInput = document.getElementById('ticketDistance');
  const themeInput = document.getElementById('ticketTheme');
  const subtitleInput = document.getElementById('ticketSubtitle');
  const descInput = document.getElementById('ticketDesc');
  const statusInput = document.getElementById('ticketStatus');

  let justStampedId = null;

  const openModal = () => {
    if (routeInput) routeInput.value = '';
    if (codeInput) codeInput.value = '';
    if (dateInput) dateInput.value = '';
    if (trainNoInput) trainNoInput.value = '';
    if (distanceInput) distanceInput.value = '';
    if (themeInput) themeInput.value = 'blue';
    if (subtitleInput) subtitleInput.value = '';
    if (descInput) descInput.value = '';
    if (statusInput) statusInput.value = '待出票';
    modal?.classList.remove('hidden');
  };

  const closeModal = () => {
    modal?.classList.add('hidden');
  };

  const render = () => {
    const { tickets } = store.getState();

    if (countLabel) {
      countLabel.textContent = `共 ${tickets.length} 趟复兴号专列`;
    }

    if (!container) return;
    container.innerHTML = tickets
      .map((t, idx) => {
        const meta = enrichTicketMeta(t, idx);
        const checked = t.status === '已检票';
        const isPink = meta.ticketTheme === 'pink';
        const cardVariant = isPink ? 'crh-ticket-pink' : 'crh-ticket-blue';
        const stampClass = justStampedId === t.id ? 'stamp-slam' : '';

        const routeParts = String(t.route || '北京 → 连云港').split(/→|->/);
        const fromLabel = (routeParts[0] || t.fromCity || '北京').trim();
        const toLabel = (routeParts[1] || t.toCity || '下一站').trim();
        const kmText = Number(t.distanceKm) > 0 ? `${t.distanceKm} km` : '双城专列';

        return `
          <article class="ticket-card ${cardVariant} rounded-2xl overflow-hidden flex flex-col justify-between group relative">
            <!-- Magnetic Fuxing Top Stripe -->
            <div class="crh-ticket-band px-5 py-2.5 flex items-center justify-between text-[11px] font-mono">
              <div class="flex items-center gap-2">
                <span class="font-bold tracking-wider">${escapeHtml(meta.trainNo)}</span>
                <span class="opacity-60">·</span>
                <span class="opacity-85">${escapeHtml(t.code)}</span>
                <span class="hidden sm:inline opacity-65">· ${escapeHtml(kmText)}</span>
              </div>
              <div class="flex items-center gap-2">
                <button data-toggle-ticket="${escapeHtml(t.id)}" class="px-2.5 py-0.5 rounded-full text-[10px] font-mono border border-current/35 bg-black/15 hover:bg-black/25 transition">
                  ${checked ? '已检票 ✓' : '待出票 · 点击检票'}
                </button>
                <button data-delete-ticket="${escapeHtml(t.id)}" title="删除车票" class="text-[11px] font-mono opacity-60 sm:opacity-0 sm:group-hover:opacity-100 hover:opacity-100 transition px-1">
                  ✕
                </button>
              </div>
            </div>

            <!-- Main Magnetic Ticket Body -->
            <div class="p-5 sm:p-6 space-y-4 relative">
              ${
                checked
                  ? `
                <div class="crh-stamp ${stampClass}" aria-hidden="true">
                  <span class="text-[8px] tracking-widest">CHECKED</span>
                  <span class="text-[11px] font-serif font-bold">已检票</span>
                  <span class="text-[7px] font-mono">08·08</span>
                </div>
              `
                  : ''
              }

              <!-- Station Row -->
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <div class="text-[10px] font-mono text-[var(--text-muted)]">FROM · 出发</div>
                  <div class="font-serif text-lg sm:text-xl font-bold text-[var(--text-primary)] truncate">${escapeHtml(fromLabel)}</div>
                </div>
                <div class="flex flex-col items-center px-2 shrink-0">
                  <span class="text-[10px] font-mono text-[var(--accent-gold)] font-bold">${escapeHtml(meta.trainNo)}</span>
                  <div class="w-14 sm:w-16 h-px bg-[var(--border-color)] relative my-1">
                    <span class="absolute -right-0.5 -top-[5px] text-[10px] text-[var(--accent-gold)]">▸</span>
                  </div>
                  <span class="text-[9px] font-mono text-[var(--text-muted)]">复兴号</span>
                </div>
                <div class="text-right min-w-0">
                  <div class="text-[10px] font-mono text-[var(--text-muted)]">TO · 到达</div>
                  <div class="font-serif text-lg sm:text-xl font-bold text-[var(--text-primary)] truncate">${escapeHtml(toLabel)}</div>
                </div>
              </div>

              <!-- Meta Grid -->
              <div class="grid grid-cols-3 gap-2 py-2.5 border-y border-dashed border-[var(--border-subtle)] text-[10px] font-mono">
                <div>
                  <span class="block text-[var(--text-muted)]">DATE</span>
                  <span class="text-[var(--text-primary)] font-medium">${escapeHtml(t.date)}</span>
                </div>
                <div class="text-center">
                  <span class="block text-[var(--text-muted)]">SEAT</span>
                  <span class="text-[var(--text-primary)] font-medium">${escapeHtml(meta.seat)}</span>
                </div>
                <div class="text-right">
                  <span class="block text-[var(--text-muted)]">GATE</span>
                  <span class="text-[var(--accent-gold)] font-bold">检票口 ${escapeHtml(meta.gate)}</span>
                </div>
              </div>

              <!-- Subtitle & Memory Note + Virtual QR -->
              <div class="flex items-end justify-between gap-3">
                <div class="space-y-1 min-w-0">
                  <div class="text-xs font-serif font-bold text-[var(--accent-gold)]">${escapeHtml(t.subtitle)}</div>
                  <p class="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">${escapeHtml(t.desc)}</p>
                </div>
                <div class="text-[var(--text-primary)] p-1 rounded-lg border border-[var(--border-subtle)] bg-white/5 shrink-0">
                  ${buildVirtualQrSvg(`${t.id}-${meta.trainNo}-${t.code}`)}
                </div>
              </div>
            </div>

            <!-- Stub Barcode Footer -->
            <div class="px-5 py-2.5 border-t border-dashed border-[var(--border-subtle)] flex items-center justify-between bg-black/10">
              <div class="w-28 sm:w-32 h-4 barcode-line opacity-35"></div>
              <span class="font-mono text-[9px] text-[var(--text-muted)] tracking-widest">CRH · 许金阳 ⇄ 渐姝君</span>
            </div>
          </article>
        `;
      })
      .join('');

    if (justStampedId) {
      window.setTimeout(() => {
        justStampedId = null;
      }, 650);
    }
  };

  container?.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('[data-toggle-ticket]');
    if (toggleBtn) {
      const id = toggleBtn.getAttribute('data-toggle-ticket');
      let becameChecked = false;
      store.update((draft) => {
        draft.tickets = draft.tickets.map((t) => {
          if (t.id !== id) return t;
          const nextStatus = t.status === '已检票' ? '待出票' : '已检票';
          if (nextStatus === '已检票') becameChecked = true;
          return { ...t, status: nextStatus };
        });
      });
      if (becameChecked) {
        justStampedId = id;
        render();
        showToast('叮！车票已检票盖章，又点亮一段旅程', 'success');
      } else {
        showToast('已切换为待出票状态');
      }
      return;
    }

    const deleteBtn = e.target.closest('[data-delete-ticket]');
    if (deleteBtn) {
      const id = deleteBtn.getAttribute('data-delete-ticket');
      store.update((draft) => {
        draft.tickets = draft.tickets.filter((t) => t.id !== id);
      });
      showToast('已删除该张车票');
    }
  });

  document.getElementById('openAddTicketBtn')?.addEventListener('click', openModal);
  document.getElementById('closeAddTicketBtn')?.addEventListener('click', closeModal);
  document.getElementById('cancelAddTicketBtn')?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.getElementById('saveNewTicketBtn')?.addEventListener('click', () => {
    const route = (routeInput?.value || '').trim() || '北京 → 连云港';
    const code = ((codeInput?.value || '').trim() || 'MEM').toUpperCase();
    const date = (dateInput?.value || '').trim() || '2027.01';
    const trainNo = (trainNoInput?.value || '').trim().toUpperCase();
    const distanceKm = Number(distanceInput?.value || 0) || 0;
    const ticketTheme = themeInput?.value === 'pink' ? 'pink' : 'blue';
    const subtitle = (subtitleInput?.value || '').trim() || '下一次重逢';
    const desc = (descInput?.value || '').trim() || '期待下一次见面。';
    const status = statusInput?.value === '已检票' ? '已检票' : '待出票';

    store.update((draft) => {
      draft.tickets.push({
        id: `t${Date.now()}`,
        route,
        code,
        trainNo,
        distanceKm,
        ticketTheme,
        date,
        subtitle,
        desc,
        status
      });
    });

    closeModal();
    showToast('新复兴号车票已加入足迹与地图', 'success');
  });

  render();

  return { render, closeModal };
}
