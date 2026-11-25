import { escapeHtml, showToast } from './ui.js';
import { getPartnerMeta } from '../utils/stage3-logic.js';

export function initLettersModule(store, cloud, { requireIdentity, onOpenReceipt } = {}) {
  const beijingBtn = document.getElementById('tabBeijingBtn');
  const lygBtn = document.getElementById('tabLygBtn');
  const bodyContainer = document.getElementById('letterContent');
  const metaContainer = document.getElementById('letterMeta');
  const receiptBar = document.getElementById('letterReceiptDisplay');
  const stampBtn = document.getElementById('stampCurrentLetterBtn');
  const drawer = document.getElementById('letterDrawer');
  const authorSelect = document.getElementById('letterAuthorSelect');
  const bodyInput = document.getElementById('letterBodyInput');

  let activeTab = 'beijing';

  const render = () => {
    const state = store.getState();
    const bjPartner = state.couple.partners.beijing;
    const lygPartner = state.couple.partners.lyg;
    const letter = state.letters[activeTab] || state.letters.beijing;

    if (beijingBtn) {
      beijingBtn.textContent = `${bjPartner.name} · 来自${bjPartner.city}（${bjPartner.nickname}）`;
      beijingBtn.className =
        activeTab === 'beijing'
          ? 'text-[var(--accent-gold)] border-b-2 border-[var(--accent-gold)] pb-2 transition font-bold'
          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] pb-2 transition';
    }

    if (lygBtn) {
      lygBtn.textContent = `${lygPartner.name} · 来自${lygPartner.city}（${lygPartner.nickname}）`;
      lygBtn.className =
        activeTab === 'lyg'
          ? 'text-[var(--accent-gold)] border-b-2 border-[var(--accent-gold)] pb-2 transition font-bold'
          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] pb-2 transition';
    }

    if (bodyContainer) {
      bodyContainer.innerHTML = String(letter.text || '')
        .split(/\n{2,}/)
        .map((para) => `<p class="leading-relaxed whitespace-pre-line">${escapeHtml(para)}</p>`)
        .join('');
    }

    if (metaContainer) {
      metaContainer.textContent = letter.meta;
    }

    if (receiptBar) {
      if (letter.receipt) {
        const byMeta = getPartnerMeta(letter.receipt.by);
        receiptBar.innerHTML = `
          <div class="inline-flex items-center flex-wrap gap-2 px-3 py-1.5 rounded-2xl bg-rose-500/10 border border-rose-400/25 text-xs">
            <span class="font-mono text-rose-200">${escapeHtml(letter.receipt.icon)} ${escapeHtml(letter.receipt.label)}</span>
            ${letter.receipt.note ? `<span class="text-[var(--text-secondary)] font-serif">“${escapeHtml(letter.receipt.note)}”</span>` : ''}
            <span class="text-[10px] font-mono text-[var(--text-muted)]">· ${escapeHtml(byMeta.nickname)}盖章</span>
          </div>
        `;
      } else {
        receiptBar.innerHTML = '';
      }
    }

    if (authorSelect) {
      const optBj = authorSelect.querySelector('option[value="beijing"]');
      const optLyg = authorSelect.querySelector('option[value="lyg"]');
      if (optBj) optBj.textContent = `${bjPartner.name} · 来自${bjPartner.city}（${bjPartner.nickname}）`;
      if (optLyg) optLyg.textContent = `${lygPartner.name} · 来自${lygPartner.city}（${lygPartner.nickname}）`;
    }
  };

  const openDrawer = () => {
    const state = store.getState();
    const openIt = (partner) => {
      const defaultTab = partner || activeTab;
      if (authorSelect) authorSelect.value = defaultTab;
      if (bodyInput) bodyInput.value = state.letters[defaultTab]?.text || '';
      drawer?.classList.remove('hidden');
    };

    if (cloud?.isCloudConfigured() && requireIdentity) {
      requireIdentity((p) => openIt(p));
    } else {
      openIt(cloud?.getIdentity()?.partner || activeTab);
    }
  };

  const closeDrawer = () => {
    drawer?.classList.add('hidden');
  };

  beijingBtn?.addEventListener('click', () => {
    activeTab = 'beijing';
    render();
  });

  lygBtn?.addEventListener('click', () => {
    activeTab = 'lyg';
    render();
  });

  stampBtn?.addEventListener('click', () => {
    const letter = store.getState().letters[activeTab];
    onOpenReceipt?.({ type: 'letter', id: activeTab, title: letter?.title || '双城来信' });
  });

  authorSelect?.addEventListener('change', (e) => {
    const nextAuthor = e.target.value === 'lyg' ? 'lyg' : 'beijing';
    if (bodyInput) bodyInput.value = store.getState().letters[nextAuthor]?.text || '';
  });

  document.getElementById('openLetterDrawerBtn')?.addEventListener('click', openDrawer);
  document.getElementById('closeLetterDrawerBtn')?.addEventListener('click', closeDrawer);
  document.getElementById('cancelLetterDrawerBtn')?.addEventListener('click', closeDrawer);
  drawer?.addEventListener('click', (e) => {
    if (e.target === drawer) closeDrawer();
  });

  document.getElementById('saveLetterBtn')?.addEventListener('click', async () => {
    const author = authorSelect?.value === 'lyg' ? 'lyg' : 'beijing';
    const text = (bodyInput?.value || '').trim();
    if (!text) {
      showToast('信件内容不能为空', 'error');
      return;
    }

    store.update((draft) => {
      draft.letters[author].text = text;
      draft.letters[author].updatedAt = new Date().toISOString().slice(0, 10);
    });

    activeTab = author;
    closeDrawer();

    try {
      const res = await cloud?.pushLetterUpdate(author, text);
      showToast(res && !res.localOnly ? '双城来信已云端同步并提醒对方 iPhone 💌' : '双城来信已保存', 'success');
    } catch {
      showToast('双城来信已保存到本机', 'success');
    }
  });

  document.getElementById('copyLetterBtn')?.addEventListener('click', async () => {
    const letter = store.getState().letters[activeTab];
    const textToCopy = `${letter.title}\n${letter.meta}\n\n${letter.text}`;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const el = document.createElement('textarea');
        el.value = textToCopy;
        el.setAttribute('readonly', '');
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      showToast('信件已复制，可以直接发给对方了', 'success');
    } catch {
      showToast('复制失败，请长按正文手动复制', 'error');
    }
  });

  render();

  return { render, closeDrawer };
}
