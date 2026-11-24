import { createBrowserStore } from './store.js';
import {
  initTheme,
  initLockScreen,
  initBackupControls,
  initStarfieldCanvas,
  initMobileBottomNav
} from './modules/ui.js';
import { initCountersModule } from './modules/counters.js';
import { initCoupleModule } from './modules/couple.js';
import { initTicketsModule } from './modules/tickets.js';
import { initGalleryModule } from './modules/gallery.js';
import { initWishlistModule } from './modules/wishlist.js';
import { initLettersModule } from './modules/letters.js';

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

  initTheme(store);
  const lockCtrl = initLockScreen(store);
  initBackupControls(store);
  initStarfieldCanvas();
  initMobileBottomNav();

  const counters = initCountersModule(store);
  const couple = initCoupleModule(store);
  const tickets = initTicketsModule(store);
  const gallery = initGalleryModule(store);
  const wishlist = initWishlistModule(store);
  const letters = initLettersModule(store);

  syncHeaderAndFooter(store.getState());

  store.subscribe((nextState) => {
    syncHeaderAndFooter(nextState);
    lockCtrl.syncLockPrefs(nextState);
    counters.render();
    couple.render();
    tickets.render();
    gallery.render();
    wishlist.render();
    letters.render();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    counters.closeModal();
    couple.closeModals();
    tickets.closeModal();
    gallery.closeLightbox();
    letters.closeDrawer();
  });

  registerServiceWorker();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
