import { escapeHtml, showToast } from './ui.js';

export function initTicketsModule(store) {
  const container = document.getElementById('ticketsContainer');
  const countLabel = document.getElementById('ticketCountLabel');
  const modal = document.getElementById('addTicketModal');

  const routeInput = document.getElementById('ticketRoute');
  const codeInput = document.getElementById('ticketCode');
  const dateInput = document.getElementById('ticketDate');
  const subtitleInput = document.getElementById('ticketSubtitle');
  const descInput = document.getElementById('ticketDesc');
  const statusInput = document.getElementById('ticketStatus');

  const openModal = () => {
    if (routeInput) routeInput.value = '';
    if (codeInput) codeInput.value = '';
    if (dateInput) dateInput.value = '';
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
      countLabel.textContent = `共 ${tickets.length} 趟专列记录`;
    }

    if (!container) return;
    container.innerHTML = tickets
      .map((t) => {
        const checked = t.status === '已检票';
        const statusStyle = checked
          ? 'border-amber-500/40 text-amber-400 bg-amber-500/10'
          : 'border-dashed border-[var(--border-subtle)] text-[var(--text-muted)]';

        return `
          <article class="ticket-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between space-y-4 group">
            <div class="flex items-center justify-between border-b border-dashed border-[var(--border-subtle)] pb-3 gap-2">
              <div class="flex items-center space-x-2">
                <span class="font-mono text-xs font-bold text-[var(--accent-gold)]">${escapeHtml(t.code)}</span>
                <span class="text-[10px] font-mono text-[var(--text-muted)]">| 许金阳 ⇄ 渐姝君专列</span>
              </div>
              <div class="flex items-center gap-2">
                <button data-toggle-ticket="${escapeHtml(t.id)}" class="px-3 py-1 rounded-full text-[11px] font-mono border ${statusStyle} transition">
                  ${escapeHtml(t.status)} ⚡
                </button>
                <button data-delete-ticket="${escapeHtml(t.id)}" title="删除车票" class="text-[11px] font-mono text-[var(--text-muted)] sm:opacity-0 sm:group-hover:opacity-100 hover:text-rose-400 transition px-1.5 py-1">
                  ✕
                </button>
              </div>
            </div>

            <div>
              <h3 class="font-serif text-lg font-bold text-[var(--text-primary)] tracking-wide mb-1">${escapeHtml(t.route)}</h3>
              <div class="text-xs font-mono text-[var(--accent-gold)] mb-2">${escapeHtml(t.date)} · ${escapeHtml(t.subtitle)}</div>
              <p class="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">${escapeHtml(t.desc)}</p>
            </div>

            <div class="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <div class="w-28 sm:w-32 h-5 barcode-line opacity-40"></div>
              <span class="font-mono text-[9px] text-[var(--text-muted)] tracking-widest">TICKET ID: ${escapeHtml(t.id.toUpperCase())}</span>
            </div>
          </article>
        `;
      })
      .join('');
  };

  container?.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('[data-toggle-ticket]');
    if (toggleBtn) {
      const id = toggleBtn.getAttribute('data-toggle-ticket');
      store.update((draft) => {
        draft.tickets = draft.tickets.map((t) =>
          t.id === id ? { ...t, status: t.status === '已检票' ? '待出票' : '已检票' } : t
        );
      });
      showToast('已切换车票检票状态', 'success');
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
    const route = (routeInput?.value || '').trim() || '双城专列';
    const code = ((codeInput?.value || '').trim() || 'MEM').toUpperCase();
    const date = (dateInput?.value || '').trim() || '2027.01';
    const subtitle = (subtitleInput?.value || '').trim() || '下一次重逢';
    const desc = (descInput?.value || '').trim() || '期待下一次见面。';
    const status = statusInput?.value === '已检票' ? '已检票' : '待出票';

    store.update((draft) => {
      draft.tickets.push({
        id: `t${Date.now()}`,
        route,
        code,
        date,
        subtitle,
        desc,
        status
      });
    });

    closeModal();
    showToast('新高铁车票已加入足迹', 'success');
  });

  render();

  return { render, closeModal };
}
