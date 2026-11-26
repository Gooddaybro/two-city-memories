export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const accent =
    type === 'error'
      ? 'border-rose-400/50 text-rose-300'
      : type === 'success'
        ? 'border-amber-400/50'
        : '';

  toast.className = `toast-item px-4 py-2.5 rounded-2xl text-xs font-sans flex items-center gap-2 max-w-[90vw] ${accent}`;
  toast.textContent = message;
  container.appendChild(toast);

  window.setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(6px)';
    toast.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    window.setTimeout(() => toast.remove(), 220);
  }, 2600);
}

export function initTheme(store) {
  const applyTheme = (theme) => {
    document.body.setAttribute('data-theme', theme);
    const icon = document.getElementById('themeIcon');
    const label = document.getElementById('themeLabel');
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (icon) icon.textContent = theme === 'dark' ? '🌙' : '☀️';
    if (label) label.textContent = theme === 'dark' ? '暗夜星轨' : '海风画报';
    if (metaTheme) metaTheme.setAttribute('content', theme === 'dark' ? '#0A0D14' : '#F6F8FA');
  };

  applyTheme(store.getTheme());

  const toggleBtn = document.getElementById('themeToggleBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = document.body.getAttribute('data-theme') || 'dark';
      const next = store.setTheme(current === 'dark' ? 'light' : 'dark');
      applyTheme(next);
    });
  }
}

export function initLockScreen(store, cloud = null) {
  const lockScreen = document.getElementById('lockScreen');
  const lockBtn = document.getElementById('lockScreenBtn');
  const passcodeInput = document.getElementById('passcodeInput');
  const passcodeSubmitBtn = document.getElementById('passcodeSubmitBtn');
  const passcodeError = document.getElementById('passcodeError');
  const lockHint = document.getElementById('lockPasscodeHint');
  const autoLockCheckbox = document.getElementById('lockOnOpenToggle');

  const syncLockPrefs = (state) => {
    if (lockHint) {
      lockHint.textContent = '请输入解锁密码';
    }
    if (autoLockCheckbox) {
      autoLockCheckbox.checked = Boolean(state.settings.lockOnOpen);
    }
  };

  const openLock = () => {
    if (!lockScreen) return;
    lockScreen.classList.remove('hidden');
    if (passcodeError) passcodeError.classList.add('hidden');
    if (passcodeInput) {
      passcodeInput.value = '';
      window.setTimeout(() => passcodeInput.focus(), 60);
    }
  };

  const verifyPasscode = async () => {
    const val = (passcodeInput?.value || '').trim();
    if (!val) {
      if (passcodeError) {
        passcodeError.textContent = '请输入解锁密码';
        passcodeError.classList.remove('hidden');
      }
      return;
    }

    passcodeSubmitBtn?.setAttribute('disabled', 'true');
    try {
      if (cloud?.verifyPasscode) {
        await cloud.verifyPasscode(val);
      } else {
        const expected = String(store.getState().couple.passcode || '').trim();
        if (!expected || val !== expected) {
          throw new Error('密码错误，请重试');
        }
      }
      lockScreen?.classList.add('hidden');
      passcodeError?.classList.add('hidden');
      if (passcodeInput) passcodeInput.value = '';
      showToast('欢迎回到小狗与小猪的双城空间', 'success');
    } catch (err) {
      if (passcodeError) {
        passcodeError.textContent = err?.message || '密码错误，请重试';
        passcodeError.classList.remove('hidden');
      }
    } finally {
      passcodeSubmitBtn?.removeAttribute('disabled');
    }
  };

  const initialState = store.getState();
  syncLockPrefs(initialState);
  if (initialState.settings.lockOnOpen) {
    openLock();
  }

  lockBtn?.addEventListener('click', openLock);
  passcodeSubmitBtn?.addEventListener('click', verifyPasscode);
  passcodeInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') verifyPasscode();
  });

  autoLockCheckbox?.addEventListener('change', (e) => {
    const enabled = Boolean(e.target.checked);
    store.update((draft) => {
      draft.settings.lockOnOpen = enabled;
    });
    showToast(enabled ? '已开启下次打开自动口令锁' : '已恢复免锁屏直接进入', 'success');
  });

  return { syncLockPrefs };
}

export function initBackupControls(store) {
  const exportBtn = document.getElementById('exportDataBtn');
  const importBtn = document.getElementById('importDataBtn');
  const importInput = document.getElementById('importInput');
  const resetBtn = document.getElementById('resetDataBtn');

  exportBtn?.addEventListener('click', () => {
    const payload = store.exportPayload();
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `two_city_memories_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('JSON 备份已导出', 'success');
  });

  importBtn?.addEventListener('click', () => {
    if (importInput) {
      importInput.value = '';
      importInput.click();
    }
  });

  importInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        store.importPayload(String(evt.target?.result || ''));
        showToast('备份已成功导入并同步到页面', 'success');
      } catch (err) {
        showToast(err?.message || '无效的 JSON 备份文件', 'error');
      }
    };
    reader.readAsText(file);
  });

  resetBtn?.addEventListener('click', () => {
    if (window.confirm('确定清除本机缓存吗？云端同步的心跳墙、心愿、心情与时光胶囊不受影响，刷新后会自动从云端拉取。')) {
      store.reset();
      showToast('已清除本机缓存（云端记录未受影响）', 'success');
    }
  });
}

export function initStarfieldCanvas() {
  const canvas = document.getElementById('ambientCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let stars = [];

  const initStars = () => {
    stars = [];
    const count = Math.min(120, Math.floor((canvas.width * canvas.height) / 10000));
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.4 + 0.5,
        alpha: Math.random(),
        speed: Math.random() * 0.008 + 0.003
      });
    }
  };

  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initStars();
  };

  const animateStars = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const isDark = document.body.getAttribute('data-theme') !== 'light';
    ctx.fillStyle = isDark ? '#E5C185' : '#3A6B9F';

    for (const s of stars) {
      s.alpha += s.speed;
      if (s.alpha > 1 || s.alpha < 0) s.speed = -s.speed;
      ctx.globalAlpha = Math.abs(s.alpha) * (isDark ? 0.65 : 0.35);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }

    window.requestAnimationFrame(animateStars);
  };

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  animateStars();
}

export function initMobileBottomNav() {
  const links = Array.from(document.querySelectorAll('.mobile-nav-item[data-section]'));
  if (!links.length) return;

  const setActive = (id) => {
    for (const link of links) {
      link.classList.toggle('active', link.getAttribute('data-section') === id);
    }
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: '-25% 0px -55% 0px', threshold: [0.1, 0.35, 0.6] }
    );

    for (const link of links) {
      const targetId = link.getAttribute('data-section');
      const section = targetId ? document.getElementById(targetId) : null;
      if (section) observer.observe(section);
    }
  }

  for (const link of links) {
    link.addEventListener('click', () => {
      const targetId = link.getAttribute('data-section');
      if (targetId) setActive(targetId);
    });
  }
}
