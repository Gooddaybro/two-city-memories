import { escapeHtml, showToast } from './ui.js';
import {
  SEAL_STYLES,
  RECEIPT_STAMPS,
  isCapsuleUnlocked,
  formatCapsuleCountdown,
  getPartnerMeta
} from '../utils/stage3-logic.js';

export function initCapsulesModule(store, cloud, { requireIdentity } = {}) {
  const modeLongBtn = document.getElementById('lettersModeLongBtn');
  const modeCapsuleBtn = document.getElementById('lettersModeCapsuleBtn');
  const longView = document.getElementById('lettersLongView');
  const capsuleView = document.getElementById('lettersCapsuleView');
  const capsulesGrid = document.getElementById('capsulesGrid');

  const composeModal = document.getElementById('capsuleModal');
  const openComposeBtn = document.getElementById('openCapsuleModalBtn');
  const titleInput = document.getElementById('capsuleTitleInput');
  const sealSelect = document.getElementById('capsuleSealSelect');
  const teaserInput = document.getElementById('capsuleTeaserInput');
  const unlockInput = document.getElementById('capsuleUnlockInput');
  const bodyInput = document.getElementById('capsuleBodyInput');

  const receiptModal = document.getElementById('receiptModal');
  const receiptStampsRow = document.getElementById('receiptStampsRow');
  const receiptNoteInput = document.getElementById('receiptNoteInput');
  const saveReceiptBtn = document.getElementById('saveReceiptBtn');

  let viewMode = 'long'; // 'long' | 'capsules'
  let crackingId = null;
  let shakingId = null;
  let activeReceiptTarget = null; // { type: 'capsule' | 'letter', id: string, title: string }
  let selectedStampId = RECEIPT_STAMPS[0].id;

  const setViewMode = (next) => {
    viewMode = next;
    longView?.classList.toggle('hidden', viewMode !== 'long');
    capsuleView?.classList.toggle('hidden', viewMode !== 'capsules');
    if (modeLongBtn && modeCapsuleBtn) {
      const activeCls = 'bg-[var(--accent-gold)] text-black font-bold';
      const idleCls = 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10';
      modeLongBtn.className = `px-4 py-2 rounded-full text-xs font-mono transition ${viewMode === 'long' ? activeCls : idleCls}`;
      modeCapsuleBtn.className = `px-4 py-2 rounded-full text-xs font-mono transition ${viewMode === 'capsules' ? activeCls : idleCls}`;
    }
  };

  const renderReceiptStamps = () => {
    if (!receiptStampsRow) return;
    receiptStampsRow.innerHTML = RECEIPT_STAMPS.map((st) => {
      const active = st.id === selectedStampId;
      return `
        <button type="button" data-pick-receipt="${escapeHtml(st.id)}" class="flex-1 py-2.5 px-3 rounded-xl border text-xs font-sans transition flex items-center justify-center gap-1.5 ${
          active
            ? 'border-[var(--accent-gold)] bg-amber-500/15 text-[var(--text-primary)] font-bold'
            : 'border-[var(--border-subtle)] bg-white/5 text-[var(--text-secondary)]'
        }">
          <span>${st.icon}</span>
          <span>${escapeHtml(st.label)}</span>
        </button>
      `;
    }).join('');
  };

  const openReceiptModal = (target) => {
    requireIdentity?.(() => {
      activeReceiptTarget = target;
      selectedStampId = RECEIPT_STAMPS[0].id;
      renderReceiptStamps();
      if (receiptNoteInput) receiptNoteInput.value = '';
      receiptModal?.classList.remove('hidden');
    });
  };

  const closeReceiptModal = () => {
    receiptModal?.classList.add('hidden');
    activeReceiptTarget = null;
  };

  const openComposeModal = () => {
    requireIdentity?.(() => {
      if (titleInput) titleInput.value = '';
      if (sealSelect) sealSelect.value = SEAL_STYLES[0].id;
      if (teaserInput) teaserInput.value = '';
      if (unlockInput) {
        const nextMeetDate = store.getState().nextMeet?.date || '2026-12-25';
        unlockInput.value = `${nextMeetDate}T00:00`;
      }
      if (bodyInput) bodyInput.value = '';
      composeModal?.classList.remove('hidden');
    });
  };

  const closeComposeModal = () => {
    composeModal?.classList.add('hidden');
  };

  const render = () => {
    const capsules = store.getState().capsules || [];
    const now = new Date();

    if (modeCapsuleBtn) {
      const readyCount = capsules.filter((c) => isCapsuleUnlocked(c, now) && !c.openedAt).length;
      modeCapsuleBtn.textContent =
        readyCount > 0 ? `🔥 火漆时光胶囊 (${readyCount} 封可拆)` : `🔥 火漆时光胶囊 (${capsules.length})`;
    }

    if (!capsulesGrid) return;
    capsulesGrid.innerHTML = capsules
      .map((c) => {
        const unlocked = isCapsuleUnlocked(c, now);
        const sender = getPartnerMeta(c.from);
        const receiver = getPartnerMeta(c.to);
        const countdown = formatCapsuleCountdown(c.unlockAt, now);
        const isOpen = unlocked && Boolean(c.openedAt);
        const isCracking = crackingId === c.id;
        const isShaking = shakingId === c.id;

        if (isOpen) {
          const receiptHtml = c.receipt
            ? `
              <div class="mt-4 pt-3 border-t border-dashed border-[var(--border-subtle)] flex items-center justify-between gap-2 text-xs">
                <div class="flex items-center gap-2">
                  <span class="px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-400/35 text-rose-200 font-mono text-[11px]">
                    ${escapeHtml(c.receipt.icon)} ${escapeHtml(c.receipt.label)}
                  </span>
                  ${c.receipt.note ? `<span class="text-[var(--text-secondary)] font-serif">“${escapeHtml(c.receipt.note)}”</span>` : ''}
                </div>
                <span class="text-[10px] font-mono text-[var(--text-muted)]">${escapeHtml(getPartnerMeta(c.receipt.by).nickname)}盖章</span>
              </div>
            `
            : `
              <div class="mt-4 pt-3 border-t border-dashed border-[var(--border-subtle)] flex justify-end">
                <button type="button" data-stamp-capsule="${escapeHtml(c.id)}" class="px-3 py-1.5 rounded-full text-[11px] font-mono border border-[var(--border-color)] text-[var(--accent-gold)] hover:bg-amber-500/10 transition">
                  💌 盖一个已读回执印章
                </button>
              </div>
            `;

          return `
            <article class="glass-card rounded-3xl p-5 sm:p-6 space-y-3 capsule-unfold border-amber-400/35">
              <div class="flex items-center justify-between gap-2 text-[11px] font-mono">
                <span class="text-[var(--accent-gold)]">${sender.emoji} ${escapeHtml(sender.name)} → ${receiver.emoji} ${escapeHtml(receiver.name)}</span>
                <span class="px-2 py-0.5 rounded-full bg-amber-500/15 text-[var(--accent-gold)] border border-[var(--border-color)]">已拆封 · ${escapeHtml(c.sealStyle)}</span>
              </div>
              <h4 class="font-serif text-lg font-bold text-[var(--text-primary)]">${escapeHtml(c.title)}</h4>
              <div class="text-sm font-serif text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">${escapeHtml(c.body)}</div>
              ${receiptHtml}
            </article>
          `;
        }

        return `
          <article class="capsule-envelope rounded-3xl p-6 flex flex-col justify-between items-center text-center space-y-4 relative overflow-hidden ${isShaking ? 'wax-shake' : ''}">
            <div class="w-full flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)] z-10">
              <span>${sender.emoji} ${escapeHtml(sender.name)} → ${receiver.emoji} ${escapeHtml(receiver.name)}</span>
              <span>${unlocked ? '✨ 已到拆封时刻' : '🔒 定时火漆封印中'}</span>
            </div>

            <div class="space-y-1.5 z-10 py-1">
              <h4 class="font-serif text-base sm:text-lg font-bold text-[var(--text-primary)]">${escapeHtml(c.title)}</h4>
              <p class="text-[11px] font-mono ${unlocked ? 'text-amber-300' : 'text-[var(--text-secondary)]'}">${escapeHtml(countdown)}</p>
            </div>

            <button type="button"
                    data-wax-capsule="${escapeHtml(c.id)}"
                    data-wax-unlocked="${unlocked ? '1' : '0'}"
                    class="wax-seal ${unlocked ? 'wax-seal-ready' : ''} ${isCracking ? 'wax-crack' : ''} w-20 h-20 rounded-full flex flex-col items-center justify-center font-serif font-bold text-xs tracking-wider cursor-pointer z-10 transition hover:scale-105 active:scale-95">
              <span>${escapeHtml(c.sealStyle)}</span>
              <span class="text-[9px] font-mono opacity-80 mt-0.5">${unlocked ? '点击拆封' : '轻晃暗号'}</span>
            </button>

            <p class="text-[11px] text-[var(--text-muted)] font-serif italic z-10">
              ${unlocked ? '火漆已松动，点一下印章展开这封信' : '点一下火漆摇一摇，偷看拆封前暗号提示'}
            </p>
          </article>
        `;
      })
      .join('');
  };

  modeLongBtn?.addEventListener('click', () => setViewMode('long'));
  modeCapsuleBtn?.addEventListener('click', () => setViewMode('capsules'));
  openComposeBtn?.addEventListener('click', openComposeModal);
  document.getElementById('closeCapsuleModalBtn')?.addEventListener('click', closeComposeModal);
  document.getElementById('cancelCapsuleModalBtn')?.addEventListener('click', closeComposeModal);
  composeModal?.addEventListener('click', (e) => {
    if (e.target === composeModal) closeComposeModal();
  });

  // Quick date preset buttons inside compose modal
  composeModal?.addEventListener('click', (e) => {
    const presetBtn = e.target.closest('[data-capsule-preset]');
    if (!presetBtn || !unlockInput) return;
    const type = presetBtn.getAttribute('data-capsule-preset');
    if (type === 'next-meet') {
      const d = store.getState().nextMeet?.date || '2026-12-25';
      unlockInput.value = `${d}T00:00`;
    } else if (type === 'new-year') {
      unlockInput.value = '2027-01-01T00:00';
    } else if (type === 'now') {
      const nowIso = new Date(Date.now() - 60_000);
      const pad = (n) => String(n).padStart(2, '0');
      unlockInput.value = `${nowIso.getFullYear()}-${pad(nowIso.getMonth() + 1)}-${pad(nowIso.getDate())}T${pad(nowIso.getHours())}:${pad(nowIso.getMinutes())}`;
    }
  });

  document.getElementById('saveCapsuleBtn')?.addEventListener('click', async () => {
    const partner = cloud.getIdentity()?.partner;
    if (!partner) return;
    const title = (titleInput?.value || '').trim();
    const body = (bodyInput?.value || '').trim();
    const sealStyle = sealSelect?.value || '08·08';
    const teaserHint = (teaserInput?.value || '').trim() || '寄件人留了一点神秘感，到期揭晓~';
    const rawUnlock = unlockInput?.value ? new Date(unlockInput.value).toISOString() : new Date().toISOString();

    if (!title || !body) {
      showToast('请填写胶囊标题和信件正文', 'error');
      return;
    }

    const capsule = {
      id: `cap_${Date.now()}`,
      from: partner,
      to: partner === 'beijing' ? 'lyg' : 'beijing',
      title,
      sealStyle,
      teaserHint,
      unlockAt: rawUnlock,
      body,
      createdAt: new Date().toISOString(),
      openedAt: null,
      receipt: null
    };

    store.update((draft) => {
      draft.capsules.unshift(capsule);
    });
    closeComposeModal();
    setViewMode('capsules');

    try {
      const res = await cloud.pushCapsuleCreate(capsule);
      showToast(res.localOnly ? '火漆时光胶囊已封存！' : '火漆胶囊已寄出，并通知对方 iPhone！', 'success');
    } catch (err) {
      showToast(err?.message || '胶囊已暂存本机，云端同步稍后重试', 'error');
    }
  });

  capsulesGrid?.addEventListener('click', (e) => {
    const waxBtn = e.target.closest('[data-wax-capsule]');
    if (waxBtn) {
      const id = waxBtn.getAttribute('data-wax-capsule');
      const unlocked = waxBtn.getAttribute('data-wax-unlocked') === '1';
      const capsule = (store.getState().capsules || []).find((c) => c.id === id);
      if (!capsule) return;

      if (!unlocked) {
        shakingId = id;
        render();
        showToast(`🔮 摇一摇暗号：${capsule.teaserHint}`);
        window.setTimeout(() => {
          shakingId = null;
          render();
        }, 620);
        return;
      }

      crackingId = id;
      render();
      window.setTimeout(async () => {
        crackingId = null;
        store.update((draft) => {
          draft.capsules = draft.capsules.map((c) =>
            c.id === id ? { ...c, openedAt: new Date().toISOString() } : c
          );
        });
        showToast('火漆已开启，慢慢读这封写给你的信 💌', 'success');
        try {
          await cloud.pushCapsuleOpen(id);
        } catch {
          // Local state already updated
        }
      }, 480);
      return;
    }

    const stampBtn = e.target.closest('[data-stamp-capsule]');
    if (stampBtn) {
      const id = stampBtn.getAttribute('data-stamp-capsule');
      const capsule = (store.getState().capsules || []).find((c) => c.id === id);
      if (capsule) {
        openReceiptModal({ type: 'capsule', id: capsule.id, title: capsule.title });
      }
    }
  });

  receiptStampsRow?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-pick-receipt]');
    if (!btn) return;
    selectedStampId = btn.getAttribute('data-pick-receipt') || RECEIPT_STAMPS[0].id;
    renderReceiptStamps();
  });

  document.getElementById('closeReceiptModalBtn')?.addEventListener('click', closeReceiptModal);
  document.getElementById('cancelReceiptModalBtn')?.addEventListener('click', closeReceiptModal);
  receiptModal?.addEventListener('click', (e) => {
    if (e.target === receiptModal) closeReceiptModal();
  });

  saveReceiptBtn?.addEventListener('click', async () => {
    const partner = cloud.getIdentity()?.partner;
    if (!partner || !activeReceiptTarget) return;
    const stamp = RECEIPT_STAMPS.find((s) => s.id === selectedStampId) || RECEIPT_STAMPS[0];
    const note = (receiptNoteInput?.value || '').trim().slice(0, 45);
    const receipt = {
      icon: stamp.icon,
      label: stamp.label,
      note,
      by: partner,
      at: new Date().toISOString()
    };

    const target = activeReceiptTarget;
    if (target.type === 'capsule') {
      store.update((draft) => {
        draft.capsules = draft.capsules.map((c) => (c.id === target.id ? { ...c, receipt } : c));
      });
      closeReceiptModal();
      try {
        const res = await cloud.pushCapsuleReceipt({ id: target.id, title: target.title, ...receipt });
        showToast(res.localOnly ? '已盖上心动回执印章 💌' : '已盖章回执并通知写信人 iPhone 💌', 'success');
      } catch {
        showToast('已盖上回执印章 💌', 'success');
      }
    } else if (target.type === 'letter') {
      store.update((draft) => {
        if (draft.letters[target.id]) {
          draft.letters[target.id].receipt = receipt;
        }
      });
      closeReceiptModal();
      try {
        const res = await cloud.pushLetterReceipt({ author: target.id, ...receipt });
        showToast(res.localOnly ? '已给这封长信盖上回执印章 💌' : '已盖章回执并提醒写信人 iPhone 💌', 'success');
      } catch {
        showToast('已给长信盖上回执印章 💌', 'success');
      }
    }
  });

  setViewMode('long');
  render();

  return {
    render,
    openReceiptModal,
    closeModals: () => {
      closeComposeModal();
      closeReceiptModal();
    }
  };
}
