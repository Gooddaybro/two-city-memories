-- 双城约会纪念册 · 第三阶段 Supabase Postgres 建表脚本
-- 在 Supabase Dashboard -> SQL Editor 中整段粘贴运行即可。

-- 1. 今日心情状态贴纸
create table if not exists public.couple_moods (
  partner_id text primary key check (partner_id in ('beijing', 'lyg')),
  icon text not null default '✨',
  label text not null,
  note text not null default '',
  updated_at timestamptz not null default now()
);

-- 2. 双向同步研途心愿清单
create table if not exists public.wishes_sync (
  id text primary key,
  text text not null,
  done boolean not null default false,
  pinned boolean not null default false,
  author text not null default 'both',
  created_at text not null default '',
  done_at text,
  tags jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- 3. 时光胶囊定时信箱（未到期正文由 Edge Function 服务端严格屏蔽）
create table if not exists public.capsule_letters (
  id text primary key,
  from_partner text not null check (from_partner in ('beijing', 'lyg')),
  to_partner text not null check (to_partner in ('beijing', 'lyg')),
  title text not null,
  seal_style text not null default '08·08',
  teaser_hint text not null default '',
  unlock_at timestamptz not null,
  body text not null,
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  receipt jsonb
);

-- 4. 双城信号心跳墙（戳一戳 + 一键回抱）
create table if not exists public.love_signals (
  id text primary key,
  from_partner text not null check (from_partner in ('beijing', 'lyg')),
  preset_id text not null default 'miss',
  icon text not null default '🐾',
  label text not null default '突然想你',
  note text not null default '',
  hugged_back boolean not null default false,
  created_at timestamptz not null default now()
);

-- 5. 双城长信同步（含贴纸盖章回执）
create table if not exists public.dual_letters (
  author_id text primary key check (author_id in ('beijing', 'lyg')),
  text text not null,
  updated_at text not null default '',
  receipt jsonb
);

-- 6. 双城共享配置（下一次见面日 + 双方生日，供双端同步与每日定时提醒使用）
create table if not exists public.couple_settings (
  id text primary key default 'default',
  next_meet_date text not null default '2026-12-25',
  next_meet_city text not null default '淄博 / 待定',
  next_meet_note text not null default '冬日约会计划中',
  beijing_birthday text not null default '07-31',
  lyg_birthday text not null default '04-09',
  updated_by text,
  updated_at timestamptz not null default now()
);

-- 7. 纪念日定时推送去重日志（防止同一天重复推送）
create table if not exists public.reminder_logs (
  reminder_key text primary key,
  sent_date text not null,
  reminder_type text not null,
  target_partner text not null check (target_partner in ('beijing', 'lyg')),
  title text not null,
  sent_at timestamptz not null default now()
);

-- 8. 双城云端相册元数据（对应私有 Storage Bucket: couple-photos，由 Edge Function 签发 1 小时临时访问链接）
create table if not exists public.couple_photos (
  id text primary key,
  storage_path text not null unique,
  city text not null default '双城',
  photo_date text not null default '',
  title text not null,
  caption text not null default '',
  uploaded_by text not null check (uploaded_by in ('beijing', 'lyg')),
  created_at timestamptz not null default now()
);

-- 创建私密相册 Storage Bucket（private = false 表示非公开，外人无法直链访问；单文件上限 5MB）
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'couple-photos',
  'couple-photos',
  false,
  5242880,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

-- 全部启用 RLS 且不开放 anon 写权限（仅通过 Edge Function Service Role 访问）
alter table public.couple_moods enable row level security;
alter table public.wishes_sync enable row level security;
alter table public.capsule_letters enable row level security;
alter table public.love_signals enable row level security;
alter table public.dual_letters enable row level security;
alter table public.couple_settings enable row level security;
alter table public.reminder_logs enable row level security;
alter table public.couple_photos enable row level security;

grant usage on schema public to service_role;
grant all on table public.couple_moods, public.wishes_sync, public.capsule_letters, public.love_signals, public.dual_letters, public.couple_settings, public.reminder_logs, public.couple_photos to service_role;

-- 初始化默认心情、核心置顶心愿与共享配置
insert into public.couple_moods (partner_id, icon, label, note)
values
  ('beijing', '🔬', '实验室搬砖', '写完这组数据就来找小猪聊天'),
  ('lyg', '🌊', '看海吹风', '今天连云港的天很蓝，想小狗了')
on conflict (partner_id) do nothing;

insert into public.wishes_sync (id, text, done, pinned, author, created_at, tags)
values
  ('w0', '希望有一天能不在异地 并且我们越来越好', false, true, 'both', '2026-08-08', '["核心心愿","未来"]'::jsonb)
on conflict (id) do nothing;

insert into public.couple_settings (id, next_meet_date, next_meet_city, next_meet_note, beijing_birthday, lyg_birthday)
values
  ('default', '2026-12-25', '淄博 / 待定', '冬日约会计划中', '07-31', '04-09')
on conflict (id) do nothing;
