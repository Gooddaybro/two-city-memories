import { escapeHtml, showToast } from './ui.js';

export function initLettersModule(store) {
  const beijingBtn = document.getElementById('tabBeijingBtn');
  const lygBtn = document.getElementById('tabLygBtn');
  const bodyContainer = document.getElementById('letterContent');
  const metaContainer = document.getElementById('letterMeta');
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

    // Keep author select labels in sync with editable partner names
    if (authorSelect) {
      const optBj = authorSelect.querySelector('option[value="beijing"]');
      const optLyg = authorSelect.querySelector('option[value="lyg"]');
      if (optBj) optBj.textContent = `${bjPartner.name} · 来自${bjPartner.city}（${bjPartner.nickname}）`;
      if (optLyg) optLyg.textContent = `${lygPartner.name} · 来自${lygPartner.city}（${lygPartner.nickname}）`;
    }
  };

  const openDrawer = () => {
    const state = store.getState();
    if (authorSelect) authorSelect.value = activeTab;
    if (bodyInput) bodyInput.value = state.letters[activeTab]?.text || '';
    drawer?.classList.remove('hidden');
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

  document.getElementById('saveLetterBtn')?.addEventListener('click', () => {
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
    showToast('双城来信已保存', 'success');
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
