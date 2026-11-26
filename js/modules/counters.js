import { getUnlockedCities } from '../schema.js';
import { showToast } from './ui.js';
import { computeBirthdayCountdown } from '../utils/stage3-logic.js';

export function initCountersModule(store, cloud = null, { requireIdentity = null } = {}) {
  const loveCounterEl = document.getElementById('loveCounter');
  const loveSinceLabelEl = document.getElementById('loveSinceLabel');
  const cityCountEl = document.getElementById('unlockedCityCount');
  const cityListEl = document.getElementById('unlockedCityList');
  const nextMeetCounterEl = document.getElementById('nextMeetCounter');
  const nextMeetCityEl = document.getElementById('nextMeetCity');
  const specialBannerEl = document.getElementById('specialDayBanner');
  const specialIconEl = document.getElementById('specialDayIcon');
  const specialTitleEl = document.getElementById('specialDayTitle');
  const specialBodyEl = document.getElementById('specialDayBody');

  const modal = document.getElementById('nextMeetModal');
  const openBtn = document.getElementById('openNextMeetBtn');
  const cancelBtn = document.getElementById('cancelNextMeetBtn');
  const saveBtn = document.getElementById('saveNextMeetBtn');
  const dateInput = document.getElementById('nextMeetDateInput');
  const cityInput = document.getElementById('nextMeetCityInput');

  const renderSpecialDayBanner = (state, now) => {
    if (!specialBannerEl) return;
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const bj = state.couple.partners.beijing;
    const lyg = state.couple.partners.lyg;
    const bjBday = computeBirthdayCountdown(bj.birthday, now);
    const lygBday = computeBirthdayCountdown(lyg.birthday, now);

    let match = null;
    if (bjBday?.isToday) {
      match = {
        icon: '🎂',
        title: `今天是${bj.name}（${bj.nickname}）的生日！`,
        body: `祝北京的小狗生日快乐，愿科研顺心、岁岁年年都有小猪相伴 💛`
      };
    } else if (lygBday?.isToday) {
      match = {
        icon: '🎂',
        title: `今天是${lyg.name}（${lyg.nickname}）的生日！`,
        body: `祝连云港的小猪生日快乐，愿海风温柔、所愿皆得，永远被小狗偏爱 💛`
      };
    } else if (state.nextMeet?.date === todayStr) {
      match = {
        icon: '🚄',
        title: `今天是双城重逢日 · ${state.nextMeet.city || '奔赴彼此'}！`,
        body: '跨越 740 公里的等待终于清零，见面先给彼此一个大大的拥抱 🫂'
      };
    } else {
      const start = new Date(state.couple.startDate);
      if (now > start && now.getDate() === start.getDate()) {
        const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
        if (months > 0 && months % 12 === 0) {
          match = {
            icon: '💖',
            title: `今天是小狗与小猪相爱 ${months / 12} 周年纪念日！`,
            body: `自 2026.08.08 枣庄初遇以来，谢谢你一直坚定地向我走来 ✨`
          };
        } else if (months > 0) {
          match = {
            icon: '✨',
            title: `8 号纪念日 · 相爱满 ${months} 个月啦！`,
            body: '又一起走过了一个充满思念与奔赴的月份，去发一条心跳纸条吧 🐾'
          };
        }
      }
    }

    if (match) {
      if (specialIconEl) specialIconEl.textContent = match.icon;
      if (specialTitleEl) specialTitleEl.textContent = match.title;
      if (specialBodyEl) specialBodyEl.textContent = match.body;
      specialBannerEl.classList.remove('hidden');
    } else {
      specialBannerEl.classList.add('hidden');
    }
  };

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

  const renderLiveClock = () => {
    const state = store.getState();
    const now = new Date();
    const start = new Date(state.couple.startDate);
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
  };

  const render = () => {
    const state = store.getState();
    renderHeroNames(state);

    // 1. Live love counter & special-day banner
    const now = new Date();
    renderSpecialDayBanner(state, now);
    const dateLabel = state.couple.startDate.slice(0, 10).replace(/-/g, '.');
    if (loveSinceLabelEl) {
      loveSinceLabelEl.textContent = `Since ${dateLabel} · 相爱计时`;
    }
    renderLiveClock();

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

    const runSave = async () => {
      const prev = { ...store.getState().nextMeet };
      const payload = { date, city, note: prev.note || '冬日约会计划中' };
      store.update((draft) => {
        draft.nextMeet.date = date;
        draft.nextMeet.city = city;
      });
      closeModal();

      if (cloud?.isCloudConfigured()) {
        try {
          const res = await cloud.pushNextMeet(payload);
          showToast(
            res && !res.localOnly
              ? '下一次见面计划已云端同步并提醒对方 iPhone 🚄'
              : '已更新下一次见面倒计时',
            'success'
          );
        } catch (err) {
          store.update((draft) => {
            draft.nextMeet = prev;
          });
          showToast(err?.message || '见面计划同步失败，请稍后重试', 'error');
        }
      } else {
        showToast('已更新下一次见面倒计时', 'success');
      }
    };

    if (cloud?.isCloudConfigured() && requireIdentity) {
      requireIdentity(() => runSave());
    } else {
      runSave();
    }
  });

  render();
  window.setInterval(renderLiveClock, 1000);

  return { render, closeModal };
}
