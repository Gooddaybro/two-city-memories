import { escapeHtml, showToast } from './ui.js';

function renderAvatarHtml(partner) {
  const initial = escapeHtml((partner.name || '').slice(-1) || '★');
  const nick = escapeHtml(partner.nickname || '');
  const src = escapeHtml(partner.avatar || '');
  const alt = escapeHtml(`${partner.name}（${partner.nickname}）`);

  return `
    <div class="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-[var(--border-color)] bg-white/5 shrink-0 flex items-center justify-center">
      <div class="avatar-fallback w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-500/20 via-transparent to-sky-500/20 text-center">
        <span class="font-serif text-xl sm:text-2xl font-bold text-[var(--accent-gold)] leading-none">${initial}</span>
        <span class="text-[10px] font-mono text-[var(--text-secondary)] mt-1">${nick}</span>
      </div>
      ${
        src
          ? `<img src="${src}" alt="${alt}" class="avatar-img absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-300" />`
          : ''
      }
    </div>
  `;
}

export function initCoupleModule(store) {
  const partnersContainer = document.getElementById('coupleProfilesGrid');
  const milestonesContainer = document.getElementById('milestonesTimeline');

  const profileModal = document.getElementById('editProfileModal');
  const profilePartnerSelect = document.getElementById('profilePartnerSelect');
  const profileNameInput = document.getElementById('profileNameInput');
  const profileNickInput = document.getElementById('profileNickInput');
  const profileRoleInput = document.getElementById('profileRoleInput');
  const profileBirthdayInput = document.getElementById('profileBirthdayInput');
  const profileTagsInput = document.getElementById('profileTagsInput');
  const profileMottoInput = document.getElementById('profileMottoInput');

  const milestoneModal = document.getElementById('addMilestoneModal');
  const milestoneDateInput = document.getElementById('milestoneDateInput');
  const milestoneCityInput = document.getElementById('milestoneCityInput');
  const milestoneTitleInput = document.getElementById('milestoneTitleInput');
  const milestoneNoteInput = document.getElementById('milestoneNoteInput');

  const fillProfileForm = (partnerId) => {
    const partner = store.getState().couple.partners[partnerId];
    if (!partner) return;
    if (profilePartnerSelect) profilePartnerSelect.value = partnerId;
    if (profileNameInput) profileNameInput.value = partner.name || '';
    if (profileNickInput) profileNickInput.value = partner.nickname || '';
    if (profileRoleInput) profileRoleInput.value = partner.role || '';
    if (profileBirthdayInput) profileBirthdayInput.value = partner.birthday || '';
    if (profileTagsInput) profileTagsInput.value = (partner.tags || []).join('，');
    if (profileMottoInput) profileMottoInput.value = partner.motto || '';
  };

  const openProfileModal = (partnerId = 'beijing') => {
    fillProfileForm(partnerId);
    profileModal?.classList.remove('hidden');
  };

  const closeProfileModal = () => {
    profileModal?.classList.add('hidden');
  };

  const openMilestoneModal = () => {
    if (milestoneDateInput) milestoneDateInput.value = '';
    if (milestoneCityInput) milestoneCityInput.value = '';
    if (milestoneTitleInput) milestoneTitleInput.value = '';
    if (milestoneNoteInput) milestoneNoteInput.value = '';
    milestoneModal?.classList.remove('hidden');
  };

  const closeMilestoneModal = () => {
    milestoneModal?.classList.add('hidden');
  };

  const render = () => {
    const state = store.getState();
    const partners = [state.couple.partners.beijing, state.couple.partners.lyg];

    if (partnersContainer) {
      partnersContainer.innerHTML = partners
        .map((p) => {
          const tagsHtml = (p.tags || [])
            .map(
              (tag) =>
                `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-mono border border-[var(--border-subtle)] bg-white/5 text-[var(--text-secondary)]">#${escapeHtml(tag)}</span>`
            )
            .join('');

          const birthdayText = p.birthday ? escapeHtml(p.birthday) : '点击编辑补充生日';

          return `
            <article class="glass-card rounded-3xl p-5 sm:p-7 flex flex-col justify-between space-y-5">
              <div class="flex items-start justify-between gap-4">
                <div class="flex items-center gap-4">
                  ${renderAvatarHtml(p)}
                  <div>
                    <div class="flex items-center flex-wrap gap-2">
                      <h3 class="font-serif text-xl font-bold text-[var(--text-primary)]">${escapeHtml(p.name)}</h3>
                      <span class="px-2 py-0.5 rounded-full text-[11px] font-mono border border-[var(--border-color)] text-[var(--accent-gold)] bg-white/5">${escapeHtml(p.nickname)}</span>
                    </div>
                    <p class="text-xs font-mono text-[var(--text-secondary)] mt-1">${escapeHtml(p.city)} · ${escapeHtml(p.role)}</p>
                    <p class="text-[11px] font-mono text-[var(--text-muted)] mt-1">🎂 ${birthdayText}</p>
                  </div>
                </div>
                <button data-edit-partner="${escapeHtml(p.id)}" class="px-3 py-1.5 rounded-full text-[11px] font-mono border border-[var(--border-subtle)] hover:border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition shrink-0">
                  编辑
                </button>
              </div>

              <div class="flex flex-wrap gap-2">${tagsHtml}</div>

              <blockquote class="pt-4 border-t border-[var(--border-subtle)] text-xs sm:text-sm font-serif text-[var(--text-secondary)] leading-relaxed">
                “${escapeHtml(p.motto)}”
              </blockquote>
            </article>
          `;
        })
        .join('');

      // Gracefully show avatar image only when it loads
      partnersContainer.querySelectorAll('.avatar-img').forEach((img) => {
        img.addEventListener('load', () => {
          img.classList.remove('opacity-0');
        });
        img.addEventListener('error', () => {
          img.remove();
        });
      });
    }

    if (milestonesContainer) {
      const list = state.milestones || [];
      milestonesContainer.innerHTML = list
        .map(
          (m, idx) => `
          <div class="relative pl-6 sm:pl-8 pb-6 last:pb-0 group">
            <span class="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full bg-[var(--accent-gold)] ring-4 ring-[var(--accent-glow)]"></span>
            ${idx < list.length - 1 ? '<span class="absolute left-[4px] top-4 bottom-0 w-px bg-[var(--border-subtle)]"></span>' : ''}
            <div class="glass-card rounded-2xl p-4 sm:p-5 flex items-start justify-between gap-4">
              <div class="space-y-1">
                <div class="flex items-center flex-wrap gap-2 text-[11px] font-mono">
                  <span class="text-[var(--accent-gold)] font-bold">${escapeHtml(m.date)}</span>
                  <span class="text-[var(--text-muted)]">·</span>
                  <span class="px-2 py-0.5 rounded-full border border-[var(--border-subtle)] text-[var(--text-secondary)]">${escapeHtml(m.city)}</span>
                </div>
                <h4 class="font-serif text-base font-bold text-[var(--text-primary)]">${escapeHtml(m.title)}</h4>
                ${m.note ? `<p class="text-xs text-[var(--text-secondary)] leading-relaxed">${escapeHtml(m.note)}</p>` : ''}
              </div>
              <button data-delete-milestone="${escapeHtml(m.id)}" title="删除大事记" class="text-[11px] font-mono text-[var(--text-muted)] sm:opacity-0 sm:group-hover:opacity-100 hover:text-rose-400 transition px-2 py-1 shrink-0">
                删除
              </button>
            </div>
          </div>
        `
        )
        .join('');
    }
  };

  partnersContainer?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-edit-partner]');
    if (btn) openProfileModal(btn.getAttribute('data-edit-partner'));
  });

  milestonesContainer?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-delete-milestone]');
    if (!btn) return;
    const id = btn.getAttribute('data-delete-milestone');
    store.update((draft) => {
      draft.milestones = draft.milestones.filter((m) => m.id !== id);
    });
    showToast('已删除该条大事记');
  });

  document.getElementById('openEditProfileBtn')?.addEventListener('click', () => openProfileModal('beijing'));
  document.getElementById('closeEditProfileBtn')?.addEventListener('click', closeProfileModal);
  document.getElementById('cancelEditProfileBtn')?.addEventListener('click', closeProfileModal);
  profileModal?.addEventListener('click', (e) => {
    if (e.target === profileModal) closeProfileModal();
  });

  profilePartnerSelect?.addEventListener('change', (e) => {
    fillProfileForm(e.target.value);
  });

  document.getElementById('saveEditProfileBtn')?.addEventListener('click', () => {
    const partnerId = profilePartnerSelect?.value === 'lyg' ? 'lyg' : 'beijing';
    const name = (profileNameInput?.value || '').trim();
    const nickname = (profileNickInput?.value || '').trim();
    const role = (profileRoleInput?.value || '').trim();
    const birthday = (profileBirthdayInput?.value || '').trim();
    const tags = (profileTagsInput?.value || '')
      .split(/[,，、\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    const motto = (profileMottoInput?.value || '').trim();

    store.update((draft) => {
      const target = draft.couple.partners[partnerId];
      if (name) target.name = name;
      if (nickname) target.nickname = nickname;
      if (role) target.role = role;
      target.birthday = birthday;
      if (tags.length) target.tags = tags;
      if (motto) target.motto = motto;
    });

    closeProfileModal();
    showToast('双人档案已更新保存', 'success');
  });

  document.getElementById('openAddMilestoneBtn')?.addEventListener('click', openMilestoneModal);
  document.getElementById('closeAddMilestoneBtn')?.addEventListener('click', closeMilestoneModal);
  document.getElementById('cancelAddMilestoneBtn')?.addEventListener('click', closeMilestoneModal);
  milestoneModal?.addEventListener('click', (e) => {
    if (e.target === milestoneModal) closeMilestoneModal();
  });

  document.getElementById('saveMilestoneBtn')?.addEventListener('click', () => {
    const date = (milestoneDateInput?.value || '').trim() || new Date().toISOString().slice(0, 10).replace(/-/g, '.');
    const city = (milestoneCityInput?.value || '').trim() || '双城';
    const title = (milestoneTitleInput?.value || '').trim();
    const note = (milestoneNoteInput?.value || '').trim();

    if (!title) {
      showToast('请填写大事记标题', 'error');
      return;
    }

    store.update((draft) => {
      draft.milestones.push({
        id: `m_${Date.now()}`,
        date,
        city,
        title,
        note,
        tags: [city]
      });
    });

    closeMilestoneModal();
    showToast('已记录新的纪念日大事记', 'success');
  });

  render();

  return {
    render,
    closeModals: () => {
      closeProfileModal();
      closeMilestoneModal();
    }
  };
}
