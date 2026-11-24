import { getUnlockedCities } from '../schema.js';
import { showToast } from './ui.js';

export function initCountersModule(store) {
  const loveCounterEl = document.getElementById('loveCounter');
  const loveSinceLabelEl = document.getElementById('loveSinceLabel');
  const cityCountEl = document.getElementById('unlockedCityCount');
  const cityListEl = document.getElementById('unlockedCityList');
  const nextMeetCounterEl = document.getElementById('nextMeetCounter');
  const nextMeetCityEl = document.getElementById('nextMeetCity');

  const modal = document.getElementById('nextMeetModal');
  const openBtn = document.getElementById('openNextMeetBtn');
  const cancelBtn = document.getElementById('cancelNextMeetBtn');
  const saveBtn = document.getElementById('saveNextMeetBtn');
  const dateInput = document.getElementById('nextMeetDateInput');
  const cityInput = document.getElementById('nextMeetCityInput');

  const renderHeroNames = (state) => {
    const bj = state.couple.partners.beijing;
    const lyg = state.couple.partners.lyg;
    const heroBjName = document.getElementById('heroBjName');
    const heroBjRole = document.getElementById('heroBjRole');
    const heroLygName = document.getElementById('heroLygName');
    const heroLygRole = document.getElementById('heroLygRole');

    if (heroBjName) heroBjName.textContent = `${bj.city} · ${bj.name}（${bj.nickname}）`;
    if (heroBjRole) heroBjRole.textContent = bj.role;
    if (heroLygName) heroLygName.textContent = `${lyg.city} · ${lyg.name}（${lyg.nickname}）`;
    if (heroLygRole) heroLygRole.textContent = lyg.role;
  };

  const render = () => {
    const state = store.getState();
    renderHeroNames(state);

    // 1. Live love counter
    const now = new Date();
    const start = new Date(state.couple.startDate);
    const dateLabel = state.couple.startDate.slice(0, 10).replace(/-/g, '.');
    if (loveSinceLabelEl) {
      loveSinceLabelEl.textContent = `Since ${dateLabel} · 相爱计时`;
    }

    const diffMs = now - start;
    if (loveCounterEl) {
      if (diffMs >= 0) {
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
        const mins = Math.floor((diffMs / (1000 * 60)) % 60);
        const secs = Math.floor((diffMs / 1000) % 60);
        const pad = (n) => String(n).padStart(2, '0');
        loveCounterEl.innerHTML = `${days}<span class="text-xs font-normal text-[var(--text-muted)]">天</span> ${pad(hours)}:${pad(mins)}:${pad(secs)}`;
      } else {
        const remainDays = Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
        loveCounterEl.innerHTML = `还有 ${remainDays}<span class="text-xs font-normal text-[var(--text-muted)]">天</span>`;
      }
    }

    // 2. Dynamic unlocked cities from checked-in tickets
    const cities = getUnlockedCities(state.tickets);
    if (cityCountEl) {
      cityCountEl.innerHTML = `${String(cities.length).padStart(2, '0')} <span class="text-xs font-normal text-[var(--text-muted)]">座双城及中转站</span>`;
    }
    if (cityListEl) {
      cityListEl.textContent = cities.length ? cities.join(' · ') : '等待点亮第一座城';
    }

    // 3. Next reunion countdown
    const { nextMeet } = state;
    if (nextMeet?.date && nextMeetCounterEl) {
      const target = new Date(`${nextMeet.date}T00:00:00`);
      const meetDiff = target - now;
      if (meetDiff > 0) {
        const mDays = Math.ceil(meetDiff / (1000 * 60 * 60 * 24));
        nextMeetCounterEl.innerHTML = `${mDays}<span class="text-xs font-normal text-[var(--text-muted)]">天后相见</span>`;
      } else {
        nextMeetCounterEl.textContent = '赴约中 / 今相见';
      }
    }
    if (nextMeetCityEl) {
      nextMeetCityEl.textContent = `下一站: ${nextMeet?.city || '冬日约会计划中'}`;
    }
  };

  const openModal = () => {
    const { nextMeet } = store.getState();
    if (dateInput) dateInput.value = nextMeet.date || '2026-12-25';
    if (cityInput) cityInput.value = nextMeet.city || '';
    modal?.classList.remove('hidden');
  };

  const closeModal = () => {
    modal?.classList.add('hidden');
  };

  openBtn?.addEventListener('click', openModal);
  cancelBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  saveBtn?.addEventListener('click', () => {
    const date = dateInput?.value || '';
    const city = (cityInput?.value || '').trim() || '下一站待定';
    if (!date) {
      showToast('请选择下一次见面的日期', 'error');
      return;
    }
    store.update((draft) => {
      draft.nextMeet.date = date;
      draft.nextMeet.city = city;
    });
    closeModal();
    showToast('已更新下一次见面倒计时', 'success');
  });

  render();
  window.setInterval(render, 1000);

  return { render, closeModal };
}
