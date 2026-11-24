import { escapeHtml, showToast } from './ui.js';

function buildFallbackFrame(photo) {
  return `
    <div class="w-full h-full p-4 flex flex-col justify-between text-neutral-300 relative overflow-hidden" style="background: ${escapeHtml(photo.gradient)};">
      <div class="absolute inset-2 border border-white/10 pointer-events-none"></div>
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[38px] opacity-10 font-serif pointer-events-none">35mm</div>

      <div class="flex justify-between items-center text-[9px] font-mono opacity-65 z-10 gap-2">
        <span>[ + ] FOCUS</span>
        <span class="truncate">${escapeHtml(photo.presetMeta)}</span>
      </div>

      <div class="text-center my-auto space-y-1 z-10 px-2">
        <div class="font-serif text-sm font-bold text-amber-100/95">${escapeHtml(photo.title)}</div>
        <div class="text-[10px] font-mono text-neutral-400 break-all">放入 ${escapeHtml(photo.path)} 自动显示</div>
      </div>

      <div class="flex justify-between items-center text-[8px] font-mono text-neutral-500 z-10">
        <span>READY FOR PHOTO</span>
        <span>EXPOSURE 08·08</span>
      </div>
    </div>
  `;
}

export function initGalleryModule(store) {
  const tabsContainer = document.getElementById('galleryFilterTabs');
  const grid = document.getElementById('galleryGrid');
  const lightboxModal = document.getElementById('lightboxModal');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxMeta = document.getElementById('lightboxMeta');
  const uploadBtn = document.getElementById('triggerLocalPhotoBtn');
  const uploadInput = document.getElementById('localPhotoInput');

  let currentFilter = '全部';
  let previewPhotos = [];

  const getAllPhotos = () => [...previewPhotos, ...(store.getState().photos || [])];

  const openLightbox = (photo) => {
    if (!lightboxModal || !lightboxImg) return;
    lightboxImg.src = photo.path;
    lightboxImg.alt = photo.title;
    if (lightboxCaption) lightboxCaption.textContent = photo.caption || photo.title;
    if (lightboxMeta) lightboxMeta.textContent = `${photo.city} · ${photo.date || '35mm Archive'}`;
    lightboxModal.classList.remove('hidden');
  };

  const closeLightbox = () => {
    lightboxModal?.classList.add('hidden');
  };

  const render = () => {
    const allPhotos = getAllPhotos();
    const citySet = new Set(['全部']);
    for (const p of allPhotos) {
      if (p.city) citySet.add(p.city);
    }
    const cities = Array.from(citySet);
    if (!cities.includes(currentFilter)) {
      currentFilter = '全部';
    }

    if (tabsContainer) {
      tabsContainer.innerHTML = cities
        .map(
          (c) => `
          <button data-gallery-city="${escapeHtml(c)}" class="px-3.5 py-2 rounded-full text-xs font-mono transition ${
            currentFilter === c
              ? 'bg-[var(--accent-gold)] text-black font-bold'
              : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10'
          }">
            ${escapeHtml(c)}
          </button>
        `
        )
        .join('');
    }

    if (!grid) return;
    const filtered =
      currentFilter === '全部' ? allPhotos : allPhotos.filter((p) => p.city === currentFilter);

    grid.innerHTML = filtered
      .map(
        (p, idx) => `
        <article data-photo-id="${escapeHtml(p.id)}" class="glass-card rounded-2xl overflow-hidden group flex flex-col justify-between cursor-pointer transition hover:scale-[1.01]">
          <div class="photo-frame relative w-full aspect-[4/3] bg-black overflow-hidden">
            <img src="${escapeHtml(p.path)}"
                 alt="${escapeHtml(p.title)}"
                 loading="lazy"
                 class="gallery-img w-full h-full object-cover group-hover:scale-105 transition duration-500" />
            <div class="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[9px] font-mono text-amber-200/90 border border-white/10 pointer-events-none">
              FRAME ${String(idx + 1).padStart(2, '0')} // 35mm
            </div>
          </div>

          <div class="p-4 space-y-1">
            <div class="flex items-center justify-between text-xs gap-2">
              <span class="font-serif font-bold text-[var(--text-primary)] truncate">${escapeHtml(p.title)}</span>
              <span class="font-mono text-[10px] text-[var(--accent-gold)] shrink-0">${escapeHtml(p.city)}</span>
            </div>
            <div class="text-[10px] font-mono text-[var(--text-muted)] flex justify-between">
              <span>${escapeHtml(p.date || 'ARCHIVE')}</span>
              <span>35MM FILM</span>
            </div>
          </div>
        </article>
      `
      )
      .join('');

    // Bind safe image error fallback without inline handlers
    grid.querySelectorAll('.gallery-img').forEach((img) => {
      const card = img.closest('[data-photo-id]');
      const photoId = card?.getAttribute('data-photo-id');
      const photo = filtered.find((item) => item.id === photoId);
      if (!photo) return;
      img.addEventListener('error', () => {
        const frame = img.parentElement;
        if (frame) {
          frame.innerHTML = buildFallbackFrame(photo);
          card?.setAttribute('data-missing', '1');
        }
      });
    });
  };

  tabsContainer?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-gallery-city]');
    if (!btn) return;
    currentFilter = btn.getAttribute('data-gallery-city') || '全部';
    render();
  });

  grid?.addEventListener('click', (e) => {
    const card = e.target.closest('[data-photo-id]');
    if (!card) return;
    if (card.getAttribute('data-missing') === '1') {
      showToast('把照片按说明放入 images/ 目录即可查看大图');
      return;
    }
    const id = card.getAttribute('data-photo-id');
    const photo = getAllPhotos().find((p) => p.id === id);
    if (photo) openLightbox(photo);
  });

  lightboxModal?.addEventListener('click', (e) => {
    if (e.target === lightboxModal) closeLightbox();
  });
  document.getElementById('closeLightboxBtn')?.addEventListener('click', closeLightbox);

  uploadBtn?.addEventListener('click', () => {
    if (uploadInput) {
      uploadInput.value = '';
      uploadInput.click();
    }
  });

  uploadInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const baseName = file.name.replace(/\.[^.]+$/, '').slice(0, 14) || '本机预览';
      previewPhotos.unshift({
        id: `preview_${Date.now()}`,
        city: '本机试传',
        date: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
        title: baseName,
        caption: `${baseName}（本机临时预览，刷新后清除；长期保存请放入 images/）`,
        path: String(evt.target?.result || ''),
        gradient: 'linear-gradient(135deg, #1f2937, #111827)',
        presetMeta: '35mm · Local Preview'
      });
      currentFilter = '全部';
      render();
      showToast('已加载本机预览图（长期展示请放入 images/ 目录）', 'success');
    };
    reader.readAsDataURL(file);
  });

  render();

  return { render, closeLightbox };
}
