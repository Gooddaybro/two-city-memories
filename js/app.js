import { createBrowserStore } from './store.js';
import { CloudBridge } from './cloud.js';
import {
  initTheme,
  initLockScreen,
  initBackupControls,
  initStarfieldCanvas,
  initMobileBottomNav,
  showToast
} from './modules/ui.js';
import { initCountersModule } from './modules/counters.js';
import { initWeatherModule } from './modules/weather.js';
import { initMapModule } from './modules/map.js';
import { initCoupleModule } from './modules/couple.js';
import { initTicketsModule } from './modules/tickets.js';
import { initGalleryModule } from './modules/gallery.js';
import { initWishlistModule } from './modules/wishlist.js';
import { initLettersModule } from './modules/letters.js';
import { initSignalsModule } from './modules/signals.js';
import { initCapsulesModule } from './modules/capsules.js';
import { initVinylModule } from './modules/vinyl.js';
import { initScrollReveal } from './modules/effects.js';

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const isSupportedOrigin =
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  if (!isSupportedOrigin) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {
      // Non-fatal: app works identically without SW cache
    });
  });
}

function syncHeaderAndFooter(state) {
  const bj = state.couple.partners.beijing;
  const lyg = state.couple.partners.lyg;

  const navTitle = document.getElementById('navCoupleTitle');
  const navSub = document.getElementById('navCoupleSub');
  const footerSummary = document.getElementById('footerSummary');

  if (navTitle) navTitle.textContent = `${bj.name} ⇄ ${lyg.name}`;
  if (navSub) navSub.textContent = `${bj.nickname} & ${lyg.nickname}`;
  if (footerSummary) {
    const since = state.couple.startDate.slice(0, 10).replace(/-/g, '.');
    footerSummary.textContent = `${bj.nickname}与${lyg.nickname} · SINCE ${since} · 双城约会纪念册`;
  }
}

function bootstrap() {
  const store = createBrowserStore();
  const cloud = new CloudBridge(store);

  initTheme(store);
  const lockCtrl = initLockScreen(store, cloud);
  initBackupControls(store);
  initStarfieldCanvas();
  initMobileBottomNav();
  initScrollReveal();
  initVinylModule();

  const signals = initSignalsModule(store, cloud);
  const counters = initCountersModule(store, cloud, {
    requireIdentity: signals.requireIdentity
  });
  initWeatherModule(store);
  const openClaim = () => signals.openClaimModal(null);
  const couple = initCoupleModule(store, {
    cloud,
    onOpenMoodModal: () => signals.openMoodModal(),
    onOpenClaimModal: openClaim
  });
  const tickets = initTicketsModule(store);
  const gallery = initGalleryModule(store, cloud, {
    requireIdentity: signals.requireIdentity,
    onOpenClaimModal: openClaim
  });
  const mapCtrl = initMapModule(store, {
    cloud,
    requireIdentity: signals.requireIdentity,
    onOpenPhoto: (photo) => gallery.openLightbox(photo)
  });
  const wishlist = initWishlistModule(store, cloud, {
    requireIdentity: signals.requireIdentity,
    onOpenClaimModal: openClaim
  });
  const capsules = initCapsulesModule(store, cloud, {
    requireIdentity: signals.requireIdentity,
    onOpenClaimModal: openClaim
  });
  const letters = initLettersModule(store, cloud, {
    requireIdentity: signals.requireIdentity,
    onOpenReceipt: (target) => capsules.openReceiptModal(target),
    onOpenClaimModal: openClaim
  });

  syncHeaderAndFooter(store.getState());

  let lastPrivateUnlocked = cloud.isPrivateUnlocked();
  let lastAuthExpired = false;
  cloud.onStatusChange((status) => {
    const unlockedChanged = status.privateUnlocked !== lastPrivateUnlocked;
    lastPrivateUnlocked = status.privateUnlocked;
    if (unlockedChanged) {
      couple.render();
      signals.render();
      wishlist.render();
      letters.render();
      capsules.render();
      gallery.render();
      mapCtrl.render();
    }
    if (status.authExpired && !lastAuthExpired) {
      showToast('身份凭证已过期或口令已更新，请重新认领身份', 'error');
    }
    lastAuthExpired = Boolean(status.authExpired);
  });

  store.subscribe((nextState) => {
    syncHeaderAndFooter(nextState);
    lockCtrl.syncLockPrefs(nextState);
    counters.render();
    couple.render();
    signals.render();
    mapCtrl.render();
    tickets.render();
    gallery.render();
    wishlist.render();
    letters.render();
    capsules.render();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    counters.closeModal();
    couple.closeModals();
    signals.closeModals();
    capsules.closeModals();
    tickets.closeModal();
    gallery.closeLightbox();
    gallery.closeUploadModal();
    letters.closeDrawer();
  });

  // Auto-sync from Supabase cloud on load, on tab return, and silently every 45s while visible
  if (cloud.isCloudConfigured()) {
    cloud.startAutoSync(45_000);
  }

  registerServiceWorker();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
