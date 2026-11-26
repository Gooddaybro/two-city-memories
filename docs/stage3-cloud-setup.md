# 双 iPhone 秒级推送（Bark）+ Supabase 云端双向同步 · 5 分钟配置指南

按这 4 步配好后，许金阳和渐姝君的两台 iPhone 就能实现：
- **心愿清单 / 心情贴纸 / 心跳墙 / 双城来信** 24 小时云端双向同步；
- **火漆时光胶囊** 未到期前服务端严格锁死正文，防偷看；
- **戳一戳 / 寄胶囊 / 许心愿** 秒级直达对方 iPhone 锁屏（走苹果官方 APNs 通道，永不掉线）。

---

## 第 1 步：两台 iPhone 安装 Bark 并拿到各自的 Key（1 分钟）

1. 许金阳和渐姝君分别在 iPhone **App Store** 搜索安装免费应用 **Bark**（图标红白铃铛）。
2. 打开 Bark，允许推送通知。
3. 首页会显示一串专属推送链接，例如 `https://api.day.app/AbCdEf123456/`：
   - 斜杠后面的 `AbCdEf123456` 就是你的 **Bark Key**；
   - 分别记下 **许金阳的 `BARK_KEY_XJY`** 和 **渐姝君的 `BARK_KEY_JSJ`**。

---

## 第 2 步：在 Supabase 免费建项目并初始化数据表（2 分钟）

1. 打开 [https://supabase.com](https://supabase.com) 用 GitHub 登录，点击 **New Project**（免费层即可，Region 选 Singapore 或 Tokyo 延迟最低）。
2. 进入项目左侧 **SQL Editor → New Query**，把仓库里的 `supabase/schema.sql` 全部复制进去点 **Run**。

---

## 第 3 步：部署 `two-city-api` Edge Function 并填环境变量（2 分钟）

在电脑 PowerShell 中进入项目目录，用 Supabase CLI 部署（或直接在网页端 Functions 创建）：

```powershell
Set-Location 'D:\git\two-city-memories'
npx supabase login
npx supabase link --project-ref <你的ProjectRef>

# 设置私密环境变量（不会提交到 GitHub；建议口令使用 6 位以上字母+数字组合）
npx supabase secrets set `
  COUPLE_SECRET=<你们俩的专属口令> `
  BARK_KEY_XJY=<许金阳的BarkKey> `
  BARK_KEY_JSJ=<渐姝君的BarkKey> `
  SITE_URL=https://gooddaybro.github.io/two-city-memories/

# 部署统一网关（关闭默认 JWT 网关，函数内部自带 HMAC 口令鉴权）
npx supabase functions deploy two-city-api --no-verify-jwt
```

部署完成后会得到你的云端网关地址：
`https://<你的ProjectRef>.supabase.co/functions/v1/two-city-api`

---

## 第 4 步：把地址填进前端并推送（30 秒）

打开 `data/cloud-config.js`，把上面的地址填进 `apiBaseUrl`：

```js
export const CLOUD_CONFIG = {
  apiBaseUrl: 'https://<你的ProjectRef>.supabase.co/functions/v1/two-city-api'
};
```

提交并推送到 `main`：

```powershell
git add data/cloud-config.js
git commit -m "chore: connect stage 3 supabase cloud sync and bark push"
git push origin main
```

等 1 分钟 GitHub Pages 部署完成，两台 iPhone 打开线上纪念册，各自点右上角 **认领身份 → 输入你们在 Supabase 设置的专属口令**，即可解锁双城私密动态并接收 Bark 推送！

> 安全提示：随时可以通过 `npx supabase secrets set COUPLE_SECRET=<新口令>` 更换线上口令，旧设备的登录凭证会自动失效并要求重新验证。

---

## 第 5 步：开启 GitHub Actions 自动部署后端（配置一次，永久自动上线）

仓库已内置 [.github/workflows/deploy-supabase.yml](../.github/workflows/deploy-supabase.yml)。只需在 GitHub 仓库配置 2 个 Secrets，以后每次修改 `supabase/functions/` 并 `git push origin main`，都会在 1 分钟内自动部署 Edge Function：

1. 打开 [https://supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)，点击 **Generate new token**，复制生成的 `sbp_...` 令牌。
2. 进入 GitHub 仓库页面 → **Settings → Secrets and variables → Actions → New repository secret**，添加以下 2 项：
   - `SUPABASE_ACCESS_TOKEN`：刚才复制的 `sbp_...` 令牌
   - `SUPABASE_PROJECT_REF`：你的 Supabase 项目 Reference ID（即网关域名 `https://<ProjectRef>.supabase.co/...` 中的 `<ProjectRef>`）
3. 配置完成后，也可随时在 GitHub 仓库 **Actions → Deploy Supabase Edge Function → Run workflow** 手动一键触发部署。

---

## 第 6 步：开启每日 09:00 纪念日 & 生日自动 Bark 提醒

仓库已内置 [.github/workflows/daily-reminders.yml](../.github/workflows/daily-reminders.yml)，每天北京时间 09:00 自动检查：
- 每月 8 号相爱月纪念 & 8 月 8 日周年纪念；
- 许金阳（07-31）与渐姝君（04-09）双方生日（当天双方提醒 + 提前 3 天提醒对方准备惊喜）；
- 云端同步的下一次见面日（提前 3 天 + 见面当天）。

开启只需 2 步：
1. 在 Supabase SQL Editor 重新运行一次最新的 `supabase/schema.sql`（幂等建表，会自动补充 `couple_settings` 与 `reminder_logs`）。
2. 生成一串随机密钥（例如 24 位字母数字），分别写入两处：
   - **Supabase Secrets**：`npx supabase secrets set CRON_SECRET=<你的随机密钥>`
   - **GitHub Repository Secrets**：新增 `CRON_SECRET`（与上面完全一致）
3. 可以在 GitHub **Actions → Daily Anniversary & Countdown Bark Reminders → Run workflow** 填一个测试日期（如 `2027-04-09`）+ 勾选 `dry_run` 预览推送文案！

---

## 第 7 步：开启手机端直接上传私有云端相册（Supabase Storage）

无需额外手动建桶！只要在 Supabase SQL Editor 运行最新的 `supabase/schema.sql`，就会自动完成：
- 创建元数据表 `public.couple_photos`（启用 RLS，仅 `service_role` 可访问）；
- 创建**私有** Storage Bucket `couple-photos`（`public = false`，单文件上限 5MB，仅允许 WebP/JPG/PNG）。

上线后，在手机上认领身份，点击影集右上角 **「📸 上传新合影」**：
- 前端会自动将 iPhone 原图缩放至最长边 1600px、压缩为 WebP 并清除 EXIF/GPS 隐私；
- 通过签名直传至私有 Bucket，外人无法直链访问；
- 双端通过 1 小时有效签名链接自动同步，并自动联动双城轨迹地图与 Bark 提醒！
