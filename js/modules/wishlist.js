import { escapeHtml, showToast } from './ui.js';
import { triggerWishConfetti } from './effects.js';

export function initWishlistModule(store) {
  const container = document.getElementById('wishlistContainer');
  const progressText = document.getElementById('wishProgressText');
  const progressBar = document.getElementById('wishProgressBar');
  const form = document.getElementById('addWishForm');
  const input = document.getElementById('newWishInput');

  const render = () => {
    const wishes = [...(store.getState().wishes || [])].sort(
      (a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))
    );

    if (container) {
      container.innerHTML = wishes
        .map((w, idx) => {
          const pinnedBadge = w.pinned
            ? '<span class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/15 text-[var(--accent-gold)] border border-[var(--border-color)]">★ 核心心愿</span>'
            : '';

          return `
            <div class="p-4 sm:p-5 flex items-center justify-between gap-3 group hover:bg-white/5 transition ${w.pinned ? 'wish-pinned' : ''}">
              <div class="flex items-center gap-3.5 min-w-0">
                <button data-toggle-wish="${escapeHtml(w.id)}" aria-label="切换完成状态" class="w-7 h-7 rounded-full border flex items-center justify-center shrink-0 transition ${
                  w.done
                    ? 'bg-[var(--accent-gold)] border-[var(--accent-gold)] text-black font-bold'
                    : 'border-[var(--border-color)] text-transparent hover:bg-white/5'
                }">
                  ✓
                </button>
                <div class="text-xs sm:text-sm font-sans leading-relaxed ${
                  w.done ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
                }">
                  <span>${idx + 1}. ${escapeHtml(w.text)}</span>
                  ${pinnedBadge}
                </div>
              </div>
              <button data-delete-wish="${escapeHtml(w.id)}" class="text-xs font-mono text-[var(--text-muted)] sm:opacity-0 sm:group-hover:opacity-100 hover:text-rose-400 transition px-2 py-1 shrink-0">
                删除
              </button>
            </div>
          `;
        })
        .join('');
    }

    const doneCount = wishes.filter((w) => w.done).length;
    const total = wishes.length;
    const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

    if (progressText) progressText.textContent = `${doneCount} / ${total} (${pct}%)`;
    if (progressBar) progressBar.style.width = `${pct}%`;
  };

  container?.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('[data-toggle-wish]');
    if (toggleBtn) {
      const id = toggleBtn.getAttribute('data-toggle-wish');
      let justCompleted = false;
      store.update((draft) => {
        draft.wishes = draft.wishes.map((w) => {
          if (w.id !== id) return w;
          const nextDone = !w.done;
          if (nextDone) justCompleted = true;
          return {
            ...w,
            done: nextDone,
            doneAt: nextDone ? new Date().toISOString().slice(0, 10) : null
          };
        });
      });
      if (justCompleted) {
        triggerWishConfetti(toggleBtn);
        showToast('又一起完成了一个双城心愿 ✨', 'success');
      }
      return;
    }

    const deleteBtn = e.target.closest('[data-delete-wish]');
    if (deleteBtn) {
      const id = deleteBtn.getAttribute('data-delete-wish');
      store.update((draft) => {
        draft.wishes = draft.wishes.filter((w) => w.id !== id);
      });
      showToast('已移除该条心愿');
    }
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = (input?.value || '').trim();
    if (!text) return;

    store.update((draft) => {
      draft.wishes.push({
        id: `w${Date.now()}`,
        text,
        done: false,
        pinned: false,
        author: 'both',
        createdAt: new Date().toISOString().slice(0, 10),
        doneAt: null,
        tags: ['心愿']
      });
    });

    if (input) input.value = '';
    showToast('新心愿已写入清单', 'success');
  });

  render();

  return { render };
}
