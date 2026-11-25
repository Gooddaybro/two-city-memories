import { escapeHtml, showToast } from './ui.js';
import { triggerWishConfetti } from './effects.js';

function authorBadge(author) {
  if (author === 'beijing') {
    return '<span class="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-sky-500/10 text-sky-300 border border-sky-400/20">🐶 小狗</span>';
  }
  if (author === 'lyg') {
    return '<span class="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/10 text-rose-300 border border-rose-400/20">🐷 小猪</span>';
  }
  return '';
}

export function initWishlistModule(store, cloud, { requireIdentity } = {}) {
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
                  ${authorBadge(w.author)}
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
      const runToggle = async () => {
        let updatedWish = null;
        store.update((draft) => {
          draft.wishes = draft.wishes.map((w) => {
            if (w.id !== id) return w;
            const nextDone = !w.done;
            updatedWish = {
              ...w,
              done: nextDone,
              doneAt: nextDone ? new Date().toISOString().slice(0, 10) : null
            };
            return updatedWish;
          });
        });

        if (updatedWish?.done) {
          triggerWishConfetti(toggleBtn);
          showToast('又一起完成了一个双城心愿 ✨', 'success');
        }
        if (updatedWish && cloud) {
          try {
            await cloud.pushWishToggle(updatedWish);
          } catch {
            // Keep local optimistic update
          }
        }
      };

      if (cloud?.isCloudConfigured() && requireIdentity) {
        requireIdentity(() => runToggle());
      } else {
        runToggle();
      }
      return;
    }

    const deleteBtn = e.target.closest('[data-delete-wish]');
    if (deleteBtn) {
      const id = deleteBtn.getAttribute('data-delete-wish');
      const runDelete = async () => {
        store.update((draft) => {
          draft.wishes = draft.wishes.filter((w) => w.id !== id);
        });
        showToast('已移除该条心愿');
        try {
          await cloud?.pushWishDelete(id);
        } catch {
          // Local already updated
        }
      };

      if (cloud?.isCloudConfigured() && requireIdentity) {
        requireIdentity(() => runDelete());
      } else {
        runDelete();
      }
    }
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = (input?.value || '').trim();
    if (!text) return;

    const runAdd = async (partnerId) => {
      const wish = {
        id: `w${Date.now()}`,
        text,
        done: false,
        pinned: false,
        author: partnerId || cloud?.getIdentity()?.partner || 'both',
        createdAt: new Date().toISOString().slice(0, 10),
        doneAt: null,
        tags: ['心愿']
      };

      store.update((draft) => {
        draft.wishes.push(wish);
      });
      if (input) input.value = '';

      try {
        const res = await cloud?.pushWishAdd(wish);
        showToast(
          res && !res.localOnly ? '新心愿已云端同步并提醒对方 iPhone ✨' : '新心愿已写入清单',
          'success'
        );
      } catch {
        showToast('新心愿已写入本机清单', 'success');
      }
    };

    if (cloud?.isCloudConfigured() && requireIdentity) {
      requireIdentity((partner) => runAdd(partner));
    } else {
      runAdd(cloud?.getIdentity()?.partner || 'both');
    }
  });

  render();

  return { render };
}
