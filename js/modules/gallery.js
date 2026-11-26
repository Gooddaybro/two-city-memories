import { escapeHtml, showToast } from './ui.js';
import { compressImageFile, formatFileSize } from '../utils/image-compressor.js';
import { getPartnerMeta } from '../utils/stage3-logic.js';

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
        <div class="text-[10px] font-mono text-neutral-400 break-all">照片加载中或暂不可用</div>
      </div>

      <div class="flex justify-between items-center text-[8px] font-mono text-neutral-500 z-10">
        <span>READY FOR PHOTO</span>
        <span>EXPOSURE 08·08</span>
      </div>
    </div>
  `;
}

export function initGalleryModule(store, cloud = null, { requireIdentity = null, onOpenClaimModal = null } = {}) {
  const tabsContainer = document.getElementById('galleryFilterTabs');
  const grid = document.getElementById('galleryGrid');
  const privacyNotice = document.getElementById('galleryPrivacyNotice');

  // Lightbox controls
  const lightboxModal = document.getElementById('lightboxModal');
  const lightboxStage = document.getElementById('lightboxStage');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxMeta = document.getElementById('lightboxMeta');
  const lightboxCounter = document.getElementById('lightboxCounter');
  const lightboxPrevBtn = document.getElementById('lightboxPrevBtn');
  const lightboxNextBtn = document.getElementById('lightboxNextBtn');

  // Upload modal controls
  const openUploadBtn = document.getElementById('openUploadPhotoBtn');
  const uploadModal = document.getElementById('uploadPhotoModal');
  const fileInput = document.getElementById('uploadPhotoFileInput');
  const pickPhotoBtn = document.getElementById('pickUploadPhotoBtn');
  const emptyPrompt = document.getElementById('uploadPhotoEmptyPrompt');
  const previewWrap = document.getElementById('uploadPhotoPreviewWrap');
  const previewImg = document.getElementById('uploadPhotoPreviewImg');
  const compressMetaEl = document.getElementById('uploadPhotoCompressMeta');
  const cityInput = document.getElementById('uploadPhotoCity');
  const dateInput = document.getElementById('uploadPhotoDate');
  const titleInput = document.getElementById('uploadPhotoTitle');
  const captionInput = document.getElementById('uploadPhotoCaption');
  const submitUploadBtn = document.getElementById('submitUploadPhotoBtn');

  let currentFilter = '全部';
  let localPreviewPhotos = [];
  let pendingCompressed = null;
  let lightboxList = [];
  let lightboxIndex = 0;
  let touchStartX = null;

  const isPrivateUnlocked = () => !cloud || cloud.isPrivateUnlocked();

  const getAllPhotos = () => {
    const state = store.getState();
    const cloudList = isPrivateUnlocked() && Array.isArray(state.cloudPhotos) ? state.cloudPhotos : [];
    return [...cloudList, ...localPreviewPhotos, ...(state.photos || [])];
  };

  const getFilteredPhotos = () => {
    const all = getAllPhotos();
    return currentFilter === '全部' ? all : all.filter((p) => p.city === currentFilter);
  };

  const renderLightboxCurrent = () => {
    const photo = lightboxList[lightboxIndex];
    if (!photo || !lightboxImg) return;
    lightboxImg.src = photo.path;
    lightboxImg.alt = photo.title;
    if (lightboxCaption) lightboxCaption.textContent = photo.caption || photo.title;
    if (lightboxMeta) {
      const uploader = photo.uploadedBy ? ` · ${getPartnerMeta(photo.uploadedBy).emoji} 上传` : '';
      lightboxMeta.textContent = `${photo.city} · ${photo.date || '35mm Archive'}${uploader}`;
    }
    if (lightboxCounter) {
      lightboxCounter.textContent =
        lightboxList.length > 1 ? `${lightboxIndex + 1} / ${lightboxList.length}（左右滑或方向键切换）` : '';
    }
    const multi = lightboxList.length > 1;
    lightboxPrevBtn?.classList.toggle('hidden', !multi);
    lightboxNextBtn?.classList.toggle('hidden', !multi);
  };

  const openLightbox = (photo, customList = null) => {
    if (!lightboxModal || !lightboxImg || !photo) return;
    const sourceList = Array.isArray(customList) && customList.length ? customList : getFilteredPhotos();
    const idx = sourceList.findIndex((p) => p.id === photo.id);
    if (idx >= 0) {
      lightboxList = sourceList;
      lightboxIndex = idx;
    } else {
      lightboxList = [photo];
      lightboxIndex = 0;
    }
    renderLightboxCurrent();
    lightboxModal.classList.remove('hidden');
  };

  const stepLightbox = (delta) => {
    if (!lightboxList.length) return;
    lightboxIndex = (lightboxIndex + delta + lightboxList.length) % lightboxList.length;
    renderLightboxCurrent();
  };

  const closeLightbox = () => {
    lightboxModal?.classList.add('hidden');
  };

  const resetUploadForm = () => {
    pendingCompressed = null;
    if (fileInput) fileInput.value = '';
    emptyPrompt?.classList.remove('hidden');
    previewWrap?.classList.add('hidden');
    if (previewImg) previewImg.src = '';
    if (compressMetaEl) compressMetaEl.textContent = '';
    if (cityInput) cityInput.value = '';
    if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
    if (titleInput) titleInput.value = '';
    if (captionInput) captionInput.value = '';
    if (submitUploadBtn) {
      submitUploadBtn.removeAttribute('disabled');
      submitUploadBtn.textContent = cloud?.isCloudConfigured() ? '上传到云端影集' : '添加到本机预览';
    }
  };

  const openUploadModal = () => {
    const openIt = () => {
      resetUploadForm();
      uploadModal?.classList.remove('hidden');
    };
    if (cloud?.isCloudConfigured() && requireIdentity) {
      requireIdentity(() => openIt());
    } else {
      openIt();
    }
  };

  const closeUploadModal = () => {
    uploadModal?.classList.add('hidden');
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

    if (grid) {
      const filtered =
        currentFilter === '全部' ? allPhotos : allPhotos.filter((p) => p.city === currentFilter);

      grid.innerHTML = filtered
        .map((p, idx) => {
          const cloudBadge = p.isCloud
            ? `<span class="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[9px] font-mono text-amber-200 border border-amber-300/25 pointer-events-none">☁️ 云端</span>`
            : '';
          const deleteBtn = p.isCloud
            ? `<button type="button" data-delete-cloud-photo="${escapeHtml(p.id)}" title="删除云端照片" class="text-[11px] font-mono text-[var(--text-muted)] hover:text-rose-400 transition px-1">删除</button>`
            : '<span>35MM FILM</span>';

          return `
            <article data-photo-id="${escapeHtml(p.id)}" class="glass-card rounded-2xl overflow-hidden group flex flex-col justify-between cursor-pointer transition hover:scale-[1.01]">
              <div class="photo-frame relative w-full aspect-[3/4] bg-black overflow-hidden">
                <img src="${escapeHtml(p.path)}"
                     alt="${escapeHtml(p.title)}"
                     loading="lazy"
                     class="gallery-img w-full h-full object-cover object-[50%_25%] group-hover:scale-105 transition duration-500" />
                <div class="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[9px] font-mono text-amber-200/90 border border-white/10 pointer-events-none">
                  FRAME ${String(idx + 1).padStart(2, '0')} // 35mm
                </div>
                ${cloudBadge}
              </div>

              <div class="p-4 space-y-1">
                <div class="flex items-center justify-between text-xs gap-2">
                  <span class="font-serif font-bold text-[var(--text-primary)] truncate">${escapeHtml(p.title)}</span>
                  <span class="font-mono text-[10px] text-[var(--accent-gold)] shrink-0">${escapeHtml(p.city)}</span>
                </div>
                <div class="text-[10px] font-mono text-[var(--text-muted)] flex justify-between items-center">
                  <span>${escapeHtml(p.date || 'ARCHIVE')}</span>
                  ${deleteBtn}
                </div>
              </div>
            </article>
          `;
        })
        .join('');

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
    }

    if (privacyNotice) {
      if (cloud?.isCloudConfigured() && !isPrivateUnlocked()) {
        privacyNotice.innerHTML = `
          <div class="inline-flex flex-wrap items-center justify-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-dashed border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-muted)]">
            <span>🔒 手机上传的私密合影仅小狗与小猪解锁后可见</span>
            <button type="button" data-unlock-private="1" class="text-[var(--accent-gold)] hover:underline font-bold">认领身份查看</button>
          </div>
        `;
      } else if (cloud?.isCloudConfigured()) {
        const count = (store.getState().cloudPhotos || []).length;
        privacyNotice.innerHTML = `<p class="text-[11px] font-mono text-[var(--text-muted)]">☁️ 私有云端相册已连接（当前已同步 ${count} 张手机上传合影 · 自动 WebP 压缩与 EXIF 隐私脱敏）</p>`;
      } else {
        privacyNotice.innerHTML = `<p class="text-[11px] font-mono text-[var(--text-muted)]">✨ 本地体验模式：点击「上传新合影」可在当前页面预览</p>`;
      }
    }
  };

  tabsContainer?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-gallery-city]');
    if (!btn) return;
    currentFilter = btn.getAttribute('data-gallery-city') || '全部';
    render();
  });

  privacyNotice?.addEventListener('click', (e) => {
    if (e.target.closest('[data-unlock-private]')) {
      onOpenClaimModal?.();
    }
  });

  grid?.addEventListener('click', (e) => {
    const delBtn = e.target.closest('[data-delete-cloud-photo]');
    if (delBtn) {
      e.stopPropagation();
      const id = delBtn.getAttribute('data-delete-cloud-photo');
      if (!window.confirm('确定删除这张云端合影吗？删除后双端相册都会同步移除。')) return;
      requireIdentity?.(async () => {
        const prev = [...(store.getState().cloudPhotos || [])];
        store.update((draft) => {
          draft.cloudPhotos = (draft.cloudPhotos || []).filter((p) => p.id !== id);
        });
        try {
          await cloud?.deleteCloudPhoto(id);
          showToast('已从双端云端相册删除该照片');
        } catch (err) {
          store.update((draft) => {
            draft.cloudPhotos = prev;
          });
          showToast(err?.message || '删除云端照片失败，请稍后重试', 'error');
        }
      });
      return;
    }

    const card = e.target.closest('[data-photo-id]');
    if (!card) return;
    if (card.getAttribute('data-missing') === '1') {
      showToast('照片暂无法加载，刷新或重新同步云端试试');
      return;
    }
    const id = card.getAttribute('data-photo-id');
    const filtered = getFilteredPhotos();
    const photo = filtered.find((p) => p.id === id);
    if (photo) openLightbox(photo, filtered);
  });

  // Lightbox navigation (click, keyboard, touch swipe)
  lightboxModal?.addEventListener('click', (e) => {
    if (e.target === lightboxModal) closeLightbox();
  });
  document.getElementById('closeLightboxBtn')?.addEventListener('click', closeLightbox);
  lightboxPrevBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    stepLightbox(-1);
  });
  lightboxNextBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    stepLightbox(1);
  });

  document.addEventListener('keydown', (e) => {
    if (lightboxModal?.classList.contains('hidden')) return;
    if (e.key === 'ArrowLeft') stepLightbox(-1);
    if (e.key === 'ArrowRight') stepLightbox(1);
  });

  lightboxStage?.addEventListener(
    'touchstart',
    (e) => {
      touchStartX = e.changedTouches?.[0]?.clientX ?? null;
    },
    { passive: true }
  );
  lightboxStage?.addEventListener(
    'touchend',
    (e) => {
      if (touchStartX === null) return;
      const endX = e.changedTouches?.[0]?.clientX ?? touchStartX;
      const dx = endX - touchStartX;
      touchStartX = null;
      if (Math.abs(dx) >= 45) {
        stepLightbox(dx > 0 ? -1 : 1);
      }
    },
    { passive: true }
  );

  // Upload modal events
  openUploadBtn?.addEventListener('click', openUploadModal);
  document.getElementById('closeUploadPhotoBtn')?.addEventListener('click', closeUploadModal);
  document.getElementById('cancelUploadPhotoBtn')?.addEventListener('click', closeUploadModal);
  uploadModal?.addEventListener('click', (e) => {
    if (e.target === uploadModal) closeUploadModal();
  });

  pickPhotoBtn?.addEventListener('click', () => {
    if (fileInput) {
      fileInput.value = '';
      fileInput.click();
    }
  });

  fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (compressMetaEl) compressMetaEl.textContent = '正在自动压缩为 WebP 并清除 EXIF 隐私...';
    emptyPrompt?.classList.add('hidden');
    previewWrap?.classList.remove('hidden');

    try {
      const compressed = await compressImageFile(file, { maxDimension: 1600, quality: 0.82 });
      pendingCompressed = compressed;
      if (previewImg) previewImg.src = compressed.previewDataUrl;
      const fmt = compressed.mimeType === 'image/webp' ? 'WebP' : 'JPEG';
      if (compressMetaEl) {
        compressMetaEl.textContent = `${formatFileSize(compressed.originalSize)} → ${formatFileSize(compressed.compressedSize)} · ${compressed.width}×${compressed.height} ${fmt} · 已去 EXIF`;
      }
      if (titleInput && !titleInput.value.trim()) {
        const cleanName = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 20);
        if (cleanName && !/^IMG|^DSC|^Screenshot|^PXL/i.test(cleanName)) {
          titleInput.value = cleanName;
        }
      }
    } catch (err) {
      pendingCompressed = null;
      emptyPrompt?.classList.remove('hidden');
      previewWrap?.classList.add('hidden');
      showToast(err?.message || '图片处理失败，请换一张重试', 'error');
    }
  });

  submitUploadBtn?.addEventListener('click', async () => {
    if (!pendingCompressed) {
      showToast('请先选择一张照片', 'error');
      return;
    }

    const city = (cityInput?.value || '').trim() || '双城';
    const rawDate = (dateInput?.value || '').trim();
    const dateLabel = rawDate ? rawDate.replace(/-/g, '.') : new Date().toISOString().slice(0, 10).replace(/-/g, '.');
    const title = (titleInput?.value || '').trim() || `${city}新合影`;
    const caption = (captionInput?.value || '').trim() || title;

    if (!cloud?.isCloudConfigured()) {
      localPreviewPhotos.unshift({
        id: `preview_${Date.now()}`,
        city,
        date: dateLabel,
        title,
        caption: `${caption}（本地预览模式）`,
        path: pendingCompressed.previewDataUrl,
        gradient: 'linear-gradient(135deg, #1f2937, #111827)',
        presetMeta: `35mm · Local · ${city}`
      });
      currentFilter = '全部';
      closeUploadModal();
      render();
      showToast('已添加到本机影集预览', 'success');
      return;
    }

    submitUploadBtn.setAttribute('disabled', 'true');
    submitUploadBtn.textContent = '上传中...';

    try {
      const res = await cloud.uploadCloudPhoto({
        blob: pendingCompressed.blob,
        mimeType: pendingCompressed.mimeType,
        city,
        date: dateLabel,
        title,
        caption
      });
      if (res?.photo) {
        store.update((draft) => {
          draft.cloudPhotos = [res.photo, ...(draft.cloudPhotos || [])];
        });
      }
      currentFilter = '全部';
      closeUploadModal();
      showToast('新合影已加密上传到云端影集，并提醒对方 iPhone 📸', 'success');
    } catch (err) {
      submitUploadBtn.removeAttribute('disabled');
      submitUploadBtn.textContent = '上传到云端影集';
      showToast(err?.message || '上传失败，请稍后重试', 'error');
    }
  });

  render();

  return { render, openLightbox, closeLightbox, closeUploadModal };
}
