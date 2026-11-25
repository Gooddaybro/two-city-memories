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

# 设置私密环境变量（不会提交到 GitHub）
npx supabase secrets set `
  COUPLE_SECRET=0808 `
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

等 1 分钟 GitHub Pages 部署完成，两台 iPhone 打开线上纪念册，各自点右上角 **认领身份 → 输入 `0808`**，点一下「🐾 突然想你」，对方手机锁屏立刻秒弹提醒！
