import { escapeHtml, showToast } from './ui.js';
import {
  MOOD_PRESETS,
  SIGNAL_PRESETS,
  computeSignalStats,
  getPartnerMeta
} from '../utils/stage3-logic.js';

function formatShortTime(iso) {
  if (!iso) return '刚刚';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '刚刚';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function initSignalsModule(store, cloud) {
  const identityBtn = document.getElementById('identityBadgeBtn');
  const syncModeBadge = document.getElementById('cloudSyncModeBadge');
  const manualSyncBtn = document.getElementById('manualCloudSyncBtn');

  // Claim Modal
  const claimModal = document.getElementById('claimIdentityModal');
  const claimPartnerRadios = Array.from(document.querySelectorAll('input[name="claimPartner"]'));
  const claimPasscodeInput = document.getElementById('claimPasscodeInput');
  const claimErrorEl = document.getElementById('claimErrorText');
  const claimSubmitBtn = document.getElementById('claimSubmitBtn');
  const claimLogoutBtn = document.getElementById('claimLogoutBtn');

  // Mood Modal
  const moodModal = document.getElementById('moodModal');
  const moodPresetsGrid = document.getElementById('moodPresetsGrid');
  const moodCustomNoteInput = document.getElementById('moodCustomNoteInput');
  const saveMoodBtn = document.getElementById('saveMoodBtn');

  // Signal Launcher & Heartbeat Wall
  const signalPresetBar = document.getElementById('signalPresetBar');
  const signalNoteInput = document.getElementById('signalNoteInput');
  const signalPulseStage = document.getElementById('signalPulseStage');
  const signalWeeklyEl = document.getElementById('signalWeeklyCount');
  const signalTotalEl = document.getElementById('signalTotalCount');
  const signalWallEl = document.getElementById('signalWallList');

  let pendingAction = null;
  let selectedMoodId = MOOD_PRESETS[0].id;
  let lastLocalPokeAt = 0;

  const updateIdentityBadge = () => {
    const id = cloud.getIdentity();
    if (identityBtn) {
      if (id) {
        const meta = getPartnerMeta(id.partner);
        identityBtn.innerHTML = `<span>${meta.emoji}</span><span class="hidden sm:inline">${escapeHtml(meta.name)}</span>`;
        identityBtn.classList.add('border-[var(--border-color)]', 'text-[var(--accent-gold)]');
      } else {
        identityBtn.innerHTML = `<span>🔑</span><span class="hidden sm:inline">认领身份</span>`;
        identityBtn.classList.remove('border-[var(--border-color)]', 'text-[var(--accent-gold)]');
      }
    }

    if (syncModeBadge) {
      if (cloud.isCloudConfigured()) {
        syncModeBadge.textContent = cloud.online ? '☁️ 云端双向同步已连接 · Bark 推送就绪' : '☁️ 云端重连中（本地暂存）';
      } else {
        syncModeBadge.textContent = '✨ 本地体验模式（配好 Supabase 后秒切双 iPhone 云同步 + Bark 推送）';
      }
    }

    if (claimLogoutBtn) {
      claimLogoutBtn.classList.toggle('hidden', !id);
    }
  };

  const openClaimModal = (afterClaim = null) => {
    pendingAction = afterClaim;
    const current = cloud.getIdentity();
    if (current) {
      claimPartnerRadios.forEach((r) => {
        r.checked = r.value === current.partner;
      });
    }
    if (claimPasscodeInput) claimPasscodeInput.value = '';
    claimErrorEl?.classList.add('hidden');
    claimModal?.classList.remove('hidden');
    window.setTimeout(() => claimPasscodeInput?.focus(), 60);
  };

  const closeClaimModal = () => {
    claimModal?.classList.add('hidden');
    pendingAction = null;
  };

  const requireIdentity = (callback) => {
    const id = cloud.getIdentity();
    if (id) {
      callback(id.partner);
      return true;
    }
    showToast('请先输入密码认领「小狗」或「小猪」身份');
    openClaimModal(callback);
    return false;
  };

  const renderMoodPresets = () => {
    if (!moodPresetsGrid) return;
    moodPresetsGrid.innerHTML = MOOD_PRESETS.map((m) => {
      const active = m.id === selectedMoodId;
      return `
        <button type="button" data-mood-preset="${escapeHtml(m.id)}" class="p-3 rounded-2xl border text-left transition flex items-center gap-2.5 ${
          active
            ? 'border-[var(--accent-gold)] bg-amber-500/15 text-[var(--text-primary)]'
            : 'border-[var(--border-subtle)] bg-white/5 text-[var(--text-secondary)] hover:border-[var(--border-color)]'
        }">
          <span class="text-lg">${m.icon}</span>
          <span class="text-xs font-sans font-medium">${escapeHtml(m.label)}</span>
        </button>
      `;
    }).join('');
  };

  const openMoodModal = () => {
    requireIdentity((partner) => {
      const cur = store.getState().moods?.[partner];
      const matched = MOOD_PRESETS.find((m) => m.label === cur?.label);
      selectedMoodId = matched ? matched.id : MOOD_PRESETS[0].id;
      renderMoodPresets();
      if (moodCustomNoteInput) moodCustomNoteInput.value = cur?.note || '';
      moodModal?.classList.remove('hidden');
    });
  };

  const closeMoodModal = () => {
    moodModal?.classList.add('hidden');
  };

  const triggerPulseEffect = (fromPartner, label) => {
    if (!signalPulseStage) return;
    const sender = getPartnerMeta(fromPartner);
    const receiver = getPartnerMeta(fromPartner === 'beijing' ? 'lyg' : 'beijing');
    signalPulseStage.innerHTML = `
      <div class="signal-pulse-banner flex items-center justify-center gap-2 text-xs font-mono text-[var(--accent-gold)] py-1.5">
        <span>${sender.emoji} ${escapeHtml(sender.city)}</span>
        <span class="signal-wave-line">━━ ✦ ${escapeHtml(label)} ✦ ━━▸</span>
        <span>${receiver.emoji} ${escapeHtml(receiver.city)}</span>
      </div>
    `;
    window.setTimeout(() => {
      if (signalPulseStage) signalPulseStage.innerHTML = '';
    }, 2600);
  };

  const render = () => {
    updateIdentityBadge();

    if (signalPresetBar && !signalPresetBar.dataset.rendered) {
      signalPresetBar.dataset.rendered = '1';
      signalPresetBar.innerHTML = SIGNAL_PRESETS.map(
        (p) => `
        <button type="button" data-send-signal="${escapeHtml(p.id)}" class="touch-target px-3.5 py-2.5 rounded-2xl border border-[var(--border-subtle)] hover:border-[var(--accent-gold)] bg-white/5 hover:bg-amber-500/10 transition flex items-center justify-center gap-1.5 text-xs font-sans text-[var(--text-primary)] active:scale-95">
          <span class="text-base">${p.icon}</span>
          <span>${escapeHtml(p.label)}</span>
        </button>
      `
      ).join('');
    }

    const signals = store.getState().signals || [];
    const stats = computeSignalStats(signals);
    if (signalWeeklyEl) signalWeeklyEl.textContent = `${stats.weekly} 次`;
    if (signalTotalEl) signalTotalEl.textContent = `${stats.total} 次`;

    const myPartner = cloud.getIdentity()?.partner || null;

    if (signalWallEl) {
      const visible = signals.slice(0, 10);
      signalWallEl.innerHTML = visible.length
        ? visible
            .map((s) => {
              const sender = getPartnerMeta(s.from);
              const canHugBack = !s.huggedBack && (!myPartner || myPartner !== s.from);
              return `
                <div class="p-3.5 rounded-2xl bg-white/5 border border-[var(--border-subtle)] flex items-start justify-between gap-3">
                  <div class="flex items-start gap-3 min-w-0">
                    <span class="w-8 h-8 rounded-full border border-[var(--border-color)] bg-amber-500/10 flex items-center justify-center text-sm shrink-0">${sender.emoji}</span>
                    <div class="min-w-0">
                      <div class="flex items-center flex-wrap gap-1.5 text-[11px] font-mono">
                        <span class="font-bold text-[var(--text-primary)]">${escapeHtml(sender.name)}</span>
                        <span class="px-2 py-0.5 rounded-full text-[10px] border border-[var(--border-subtle)] text-[var(--accent-gold)]">${s.icon} ${escapeHtml(s.label)}</span>
                        <span class="text-[10px] text-[var(--text-muted)]">${formatShortTime(s.createdAt)}</span>
                      </div>
                      ${s.note ? `<p class="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed break-words">${escapeHtml(s.note)}</p>` : ''}
                    </div>
                  </div>
                  <div class="shrink-0">
                    ${
                      s.huggedBack
                        ? '<span class="px-2.5 py-1 rounded-full text-[10px] font-mono text-rose-300 bg-rose-500/10 border border-rose-500/25">🫂 已回抱</span>'
                        : canHugBack
                          ? `<button type="button" data-hug-signal="${escapeHtml(s.id)}" class="px-2.5 py-1 rounded-full text-[10px] font-mono border border-[var(--border-color)] text-[var(--accent-gold)] hover:bg-amber-500/15 transition">🫂 回抱</button>`
                          : '<span class="text-[10px] font-mono text-[var(--text-muted)]">已送达</span>'
                    }
                  </div>
                </div>
              `;
            })
            .join('')
        : '<p class="text-xs text-[var(--text-muted)] text-center py-4">还没有发出双城电波，点上面按钮戳一下对方吧~</p>';
    }
  };

  // Event bindings
  identityBtn?.addEventListener('click', () => openClaimModal(null));
  document.getElementById('closeClaimModalBtn')?.addEventListener('click', closeClaimModal);
  document.getElementById('cancelClaimModalBtn')?.addEventListener('click', closeClaimModal);
  claimModal?.addEventListener('click', (e) => {
    if (e.target === claimModal) closeClaimModal();
  });

  const submitClaim = async () => {
    const selected = claimPartnerRadios.find((r) => r.checked)?.value || 'beijing';
    const passcode = (claimPasscodeInput?.value || '').trim();
    claimErrorEl?.classList.add('hidden');
    claimSubmitBtn?.setAttribute('disabled', 'true');

    try {
      const res = await cloud.claimIdentity(selected, passcode);
      const meta = getPartnerMeta(res.partner);
      const callback = pendingAction;
      closeClaimModal();
      showToast(`身份已认领：${meta.emoji} ${meta.name}（${meta.nickname}）`, 'success');
      if (typeof callback === 'function') callback(res.partner);
      if (cloud.isCloudConfigured()) {
        cloud.syncFromCloud();
      }
    } catch (err) {
      if (claimErrorEl) {
        claimErrorEl.textContent = err?.message || '口令验证失败';
        claimErrorEl.classList.remove('hidden');
      }
    } finally {
      claimSubmitBtn?.removeAttribute('disabled');
    }
  };

  claimSubmitBtn?.addEventListener('click', submitClaim);
  claimPasscodeInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitClaim();
  });

  claimLogoutBtn?.addEventListener('click', () => {
    cloud.logout();
    closeClaimModal();
    showToast('已退出当前身份认领');
  });

  manualSyncBtn?.addEventListener('click', async () => {
    if (!cloud.isCloudConfigured()) {
      showToast('当前为本地体验模式，按 docs/stage3-cloud-setup.md 填入云端地址即可开启双端同步');
      return;
    }
    const ok = await cloud.syncFromCloud();
    showToast(ok ? '已从 Supabase 拉取最新双城动态' : '云端同步失败，请稍后重试', ok ? 'success' : 'error');
  });

  moodPresetsGrid?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-mood-preset]');
    if (!btn) return;
    selectedMoodId = btn.getAttribute('data-mood-preset') || MOOD_PRESETS[0].id;
    renderMoodPresets();
    const preset = MOOD_PRESETS.find((m) => m.id === selectedMoodId);
    if (moodCustomNoteInput && !moodCustomNoteInput.value.trim() && preset) {
      moodCustomNoteInput.placeholder = preset.defaultNote;
    }
  });

  document.getElementById('closeMoodModalBtn')?.addEventListener('click', closeMoodModal);
  document.getElementById('cancelMoodModalBtn')?.addEventListener('click', closeMoodModal);
  moodModal?.addEventListener('click', (e) => {
    if (e.target === moodModal) closeMoodModal();
  });

  saveMoodBtn?.addEventListener('click', async () => {
    const partner = cloud.getIdentity()?.partner;
    if (!partner) return;
    const preset = MOOD_PRESETS.find((m) => m.id === selectedMoodId) || MOOD_PRESETS[0];
    const note = (moodCustomNoteInput?.value || '').trim().slice(0, 32) || preset.defaultNote;
    const moodPayload = {
      icon: preset.icon,
      label: preset.label,
      note,
      updatedAt: new Date().toISOString()
    };

    store.update((draft) => {
      draft.moods[partner] = moodPayload;
    });
    closeMoodModal();

    try {
      const res = await cloud.pushMood(moodPayload);
      showToast(res.localOnly ? '今日心情贴纸已更新（本地模式）' : '今日心情已同步并提醒对方 iPhone', 'success');
    } catch (err) {
      showToast(err?.message || '已保存到本机，云端同步稍后重试', 'error');
    }
  });

  signalPresetBar?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-send-signal]');
    if (!btn) return;
    const presetId = btn.getAttribute('data-send-signal');
    const preset = SIGNAL_PRESETS.find((p) => p.id === presetId) || SIGNAL_PRESETS[0];

    requireIdentity(async (partner) => {
      if (Date.now() - lastLocalPokeAt < 4000) {
        showToast('电波正在飞行中，稍等 4 秒再戳~');
        return;
      }
      lastLocalPokeAt = Date.now();

      const customNote = (signalNoteInput?.value || '').trim().slice(0, 30);
      const signal = {
        id: `sig_${Date.now()}`,
        from: partner,
        presetId: preset.id,
        icon: preset.icon,
        label: preset.label,
        note: customNote || preset.defaultNote,
        sound: preset.sound,
        createdAt: new Date().toISOString(),
        huggedBack: false
      };

      store.update((draft) => {
        draft.signals.unshift(signal);
        draft.signals = draft.signals.slice(0, 30);
      });
      if (signalNoteInput) signalNoteInput.value = '';
      triggerPulseEffect(partner, preset.label);

      try {
        const res = await cloud.pushSignal(signal);
        if (res.localOnly) {
          showToast(`已发射「${preset.label}」信号（本地模式，重新认领身份即可触发云端推送）`);
        } else if (res.push?.sent) {
          showToast(`已发射「${preset.label}」，对方 iPhone 锁屏即将响起 Bark 提醒！`, 'success');
        } else {
          showToast(`信号已同步到心跳墙（对方 Bark 推送未送达：${res.push?.reason || res.push?.status || '未配置'}）`, 'error');
        }
      } catch (err) {
        showToast(err?.message || '信号已写入本机，云端推送失败', 'error');
      }
    });
  });

  signalWallEl?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-hug-signal]');
    if (!btn) return;
    const id = btn.getAttribute('data-hug-signal');
    requireIdentity(async (partner) => {
      store.update((draft) => {
        draft.signals = draft.signals.map((s) => (s.id === id ? { ...s, huggedBack: true } : s));
      });
      triggerPulseEffect(partner, '双向回抱 🫂');
      try {
        const res = await cloud.pushHugBack(id);
        showToast(res.localOnly ? '已回抱对方 🫂' : '已回抱并推送到对方 iPhone 🫂', 'success');
      } catch {
        showToast('已记录回抱 🫂', 'success');
      }
    });
  });

  cloud.onStatusChange(updateIdentityBadge);
  render();

  return {
    render,
    requireIdentity,
    openClaimModal,
    openMoodModal,
    closeModals: () => {
      closeClaimModal();
      closeMoodModal();
    }
  };
}
