# 双城约会纪念册 · 第一阶段（稳地基与个人化）设计规范

- **日期**：2026-11-24
- **仓库**：`D:\git\two-city-memories`（GitHub Pages `Deploy from a branch: main / (root)`）
- **所属阶段**：三阶段演进规划中的 **第一阶段（子项目 1：稳地基 & 注入专属内容）**

---

## 1. 目标与边界

### 本阶段目标（In Scope）
1. **注入真实专属信息**：将现有通用模板改造为 **许金阳（小狗 · 北京）⇄ 渐姝君（小猪 · 连云港）** 的双城约会纪念册，修正相爱起始日为 `2026.08.08`（口令 `0808`），置顶核心心愿“希望有一天能不在异地 并且我们越来越好”。
2. **新增个人/双人模块**：新增“关于我们”双人可编辑档案卡片（支持头像占位与网页端直接编辑）及“纪念日大事记”轻量化时间轴。
3. **零构建模块化拆分（方案 A）**：将原 1170 行单文件 `index.html` 拆分为原生 ES Modules（`assets/`、`data/`、`js/`、`images/`），保持 GitHub Pages `main` 根目录直发能力，零构建依赖。
4. **规范化数据结构（Schema v2）与存储抽象**：统一数据模型并预留地理坐标、里程、标签、定时解锁字段，无缝服务第二阶段（SVG 轨迹地图、里程统计、实时天气）、第三阶段（Supabase 云同步、火漆时光胶囊）及未来《双城年度报告》/ AI 总结；提供旧版 `bj_lyg_*` 本地存储与旧 JSON 备份的无损自动迁移。
5. **移动端 / 微信竖屏优先与 PWA**：新增手机端底部悬浮导航栏、触控热区优化、安全区适配、Open Graph 分享元数据，补齐 `manifest.json`、真实 PNG App 图标与轻量 `sw.js`。
6. **图片目录与规范**：创建 `images/` 目录与 `images/README.md`，支持后续放入 WebP/JPG 头像与相册照片，无图时零破图优雅降级。

### 非本阶段范围（Out of Scope，留待后续子项目）
- **第二阶段（拉颜值）**：Open-Meteo 双城实时天气条与昼夜色调、轻量 SVG 动态轨迹地图、里程 Count-up 面板、拟真复兴号磁介质车票与检票动效、约会决策小玩具、迷你旋转黑胶唱片机与心愿撒花。
- **第三阶段（强互动）**：迁移至 Supabase 云后端、服务端真鉴权双人口令锁、心愿/车票/来信双端实时同步、火漆封印时光胶囊完整交互、「想你了 · 戳一戳」与 Bark / Server酱 / 企微推送。

---

## 2. 个人化内容与交互设计

### 2.1 全站署名与基线数据
- **页面标题**：`许金阳 ⇄ 渐姝君 | 北京 ↔ 连云港 双城约会纪念册`
- **顶部导航品牌**：`许金阳 ⇄ 渐姝君` + 副标 `BJ ⇄ LYG · 小狗 & 小猪`
- **首屏双城栏**：
  - 左侧：`北京 · 许金阳（小狗）` / `在读研究生 · 实验室`
  - 右侧：`连云港 · 渐姝君（小猪）` / `在读研究生 · 课题组`
  - 距离标签：`距离 740+ KM`
- **首屏 3 枚动态卡片**：
  1. **相爱计时**：`Since 2026.08.08 · 相爱计时`，精确到天与时分秒，副标题 `自第一次在枣庄相聚开始`
  2. **解锁城市**：**动态计算**已检票行程涉及的唯一城市数量与城市名列表（修复旧版写死 `04` 的问题）
  3. **下一次倒计时**：可点击「设置」修改目标日期与城市，默认 `2026-12-25` / `淄博 / 待定`
- **隐私与口令锁**：
  - 保持用户确认的**默认免锁屏直接进入**（`lockOnOpen: false`）。
  - 点击右上角锁图标可随时锁定；解锁口令更新为 `0808`（对应 `2026.08.08`）。
  - 锁屏弹窗与底部设置支持勾选“下次打开自动开启口令锁”（保存在本地 `settings.lockOnOpen`），同时注明：当前为静态前端口令锁，真·云端权限隔离将在第三阶段接入 Supabase 后实现。
- **页脚**：`XU JINYANG ⇄ JIAN SHUJUN · BEIJING ⇄ LIANYUNGANG`，`小狗与小猪 · SINCE 2026.08.08`。

### 2.2 新增模块：关于我们（双人档案卡片 + 纪念日大事记）
位于 Hero 与双城车票之间（导航项 `02. 关于我们`，后续模块编号顺延为 `03`–`06`）：
- **双人档案卡片**：
  - 桌面端两列并排，移动端竖向单列。
  - 左卡：**许金阳**（昵称 `小狗`，坐标 `北京`，角色 `在读研究生 · 实验室`），头像路径 `./images/avatar-xjy.webp`，缺省显示精致的金色/深蓝圆环徽章（`阳 · 小狗`）。
  - 右卡：**渐姝君**（昵称 `小猪`，坐标 `连云港`，角色 `在读研究生 · 课题组`），头像路径 `./images/avatar-jsj.webp`，缺省显示精致徽章（`君 · 小猪`）。
  - 每张卡片展示：城市、身份/方向、生日（默认“待补充”，可随时编辑）、个人标签列表（如 `#实验室`、`#海风`）、给对方的一句话。
  - 右上角提供「编辑档案」按钮，弹出表单可随时修改任一方的昵称、身份/方向、生日、标签（逗号分隔）与寄语，实时保存并刷新渲染。
- **纪念日大事记（轻量化时间轴）**：
  - 默认包含 4 条里程碑：`2026.08.08 枣庄 · 夏末初遇`、`2026.09 济南 · 泉城重逢`、`2026.10 连云港 · 奔赴山海`、`2026.11.01 徐州 · 彭城交汇`。
  - 提供「+ 记录新大事记」按钮，打开弹窗填写日期、城市、标题与备注即可追加，支持删除自定义条目。

### 2.3 现有 4 大模块专属化升级
1. **双城车票足迹**：
   - 第 1 趟行程日期修正为 `2026.08.08 – 08.09`，其余行程与文案贴合小狗与小猪的视角。
   - 顶部车票总数改为**动态渲染**（`共 N 趟专列记录`），支持点击状态胶囊切换 `已检票 / 待出票`，支持新增车票及删除自定义车票。
2. **双城胶片影集**：
   - 保留按城市筛选、35mm 取景框缺失占位、灯箱大图（含标题与日期）与本机试传临时预览。
   - 默认照片路径升级为优先支持 WebP（并在 `images/README.md` 写明直接放图片或修改 `data/defaults.js` 的清晰指引）：
     - `./images/01_zaozhuang_0808.webp`
     - `./images/02_jinan_09.webp`
     - `./images/03_lianyungang_10.webp`
     - `./images/04_xuzhou_1101.webp`
   - 筛选标签按照片列表动态生成（始终含 `全部` + 当前存在的唯一城市名），后续在 `data/defaults.js` 新增任意城市照片都会自动出现对应筛选标签。
3. **双城研途清单**：
   - 第 1 条为核心置顶心愿：`希望有一天能不在异地 并且我们越来越好`（`pinned: true`，带星标高亮样式且支持置顶排序）。
   - 保留完成进度条、新增、勾选与删除。
4. **双城来信**：
   - 页签改为 `许金阳 · 来自北京（小狗）` 与 `渐姝君 · 来自连云港（小猪）`。
   - 底稿改写为贴合“小狗”写给“小猪”、“小猪”写给“小狗”的自然口吻；写信抽屉支持随时编辑双方信件，复制按钮使用轻量化 Toast 提示替代 `alert()`。

---

## 3. 零构建模块化架构（方案 A）

保留 GitHub Pages `Deploy from a branch: main / (root)`，所有脚本采用原生 ES Modules（`<script type="module" src="./js/app.js"></script>`），全部资源路径使用相对路径 `./`，确保部署在 `/two-city-memories/` 子路径下零路径错误。

```text
two-city-memories/
├── index.html                  # 语义化页面骨架、弹窗容器、PWA 与 Open Graph Meta
├── manifest.json               # PWA 清单（start_url: "./", scope: "./"）
├── sw.js                       # 轻量 Service Worker（Network-First + 静态回退）
├── assets/
│   ├── css/
│   │   └── main.css            # 双主题 CSS 变量、胶片噪点、车票切口、Toast、移动端底部导航与安全区
│   └── icons/
│       ├── icon.svg            # 双城徽章矢量源图
│       ├── icon-192.png        # PWA 192x192 PNG 图标
│       ├── icon-512.png        # PWA 512x512 PNG 图标
│       └── apple-touch-icon.png# iOS 180x180 主屏幕图标
├── data/
│   └── defaults.js             # 许金阳 & 渐姝君的默认数据与 Schema v2 默认常量
├── images/
│   └── README.md               # 头像与相册照片放置、命名与 WebP 压缩指南
├── js/
│   ├── schema.js               # Schema v2 规范化、校验与旧版 localStorage / JSON 自动迁移
│   ├── store.js                # StorageAdapter 抽象与 LocalStorageAdapter 实现
│   ├── app.js                  # 主入口：加载状态、协调模块初始化与全局事件
│   └── modules/
│       ├── counters.js         # 相爱实时计时、解锁城市动态计算、下次见面倒计时
│       ├── couple.js           # 「关于我们」双人档案卡片与纪念日大事记
│       ├── tickets.js          # 双城车票足迹渲染、新增、状态切换与删除
│       ├── gallery.js          # 胶片影集动态城市筛选、35mm 占位、灯箱与本地临时预览
│       ├── wishlist.js         # 研途清单（含置顶核心心愿）、进度条与增删改
│       ├── letters.js          # 双城来信切换、编辑抽屉与剪贴板复制
│       └── ui.js               # 主题切换、口令锁屏、星空画布、移动端底部导航、Toast、备份导入导出
└── tests/
    ├── schema.test.mjs         # Node 内置测试：Schema 校验、旧数据迁移、默认值补全
    └── store.test.mjs          # Node 内置测试：StorageAdapter 读写、导入导出、容错回退
```

### 模块职责边界
- **`data/defaults.js`**：纯数据模块，无 DOM 依赖，既可被浏览器导入也可被 Node 测试直接导入。
- **`js/schema.js`**：纯函数模块（无 `window`/`document` 依赖），负责 `createDefaultState()`、`normalizeState(input)`、`migrateLegacyStorage(legacyKeys)`、`migrateBackupPayload(raw)`，天然可单元测试。
- **`js/store.js`**：对外暴露统一 `MemoryStore`（接收任意符合 `{ getItem, setItem, removeItem }` 的 storage 实现，默认注入 `window.localStorage`），提供 `getState()`、`update(mutator)`、`subscribe(listener)`、`exportPayload()`、`importPayload(raw)`、`reset()`。UI 模块禁止直接调用 `localStorage`。
- **`js/modules/*.js`**：各自负责对应区域的 DOM 渲染与交互，通过 `store` 更新状态并由订阅或回调触发联动刷新（例如修改车票时，自动刷新 `counters.js` 中的城市统计与 `tickets.js` 列表）。

---

## 4. 统一数据模型（Schema v2）与兼容性

### 4.1 Schema v2 结构
统一存储键为 `two_city_memories_v2`（主题键沿用 `bj_lyg_theme` 以无缝继承已有偏好）：

```json
{
  "schemaVersion": 2,
  "updatedAt": "2026-11-24T19:30:00.000Z",
  "couple": {
    "startDate": "2026-08-08T00:00:00",
    "passcode": "0808",
    "partners": {
      "beijing": {
        "id": "beijing",
        "name": "许金阳",
        "nickname": "小狗",
        "city": "北京",
        "coords": [116.4074, 39.9042],
        "role": "在读研究生 · 实验室",
        "birthday": "",
        "avatar": "./images/avatar-xjy.webp",
        "tags": ["北京", "实验室", "小狗"],
        "motto": "从北京出发的每一班高铁，终点都是你。"
      },
      "lyg": {
        "id": "lyg",
        "name": "渐姝君",
        "nickname": "小猪",
        "city": "连云港",
        "coords": [119.2216, 34.5967],
        "role": "在读研究生 · 课题组",
        "birthday": "",
        "avatar": "./images/avatar-jsj.webp",
        "tags": ["连云港", "课题组", "小猪"],
        "motto": "吹过连云港的海风，也想和你一起看尽四季。"
      }
    }
  },
  "settings": {
    "lockOnOpen": false
  },
  "nextMeet": {
    "date": "2026-12-25",
    "city": "淄博 / 待定",
    "note": "冬日约会计划中"
  },
  "milestones": [
    {
      "id": "m1",
      "date": "2026.08.08",
      "city": "枣庄",
      "title": "夏末初遇",
      "note": "小狗和小猪在枣庄第一次相聚，双城故事正式开启。",
      "tags": ["初遇", "纪念日"]
    }
  ],
  "tickets": [
    {
      "id": "t1",
      "date": "2026.08.08 – 08.09",
      "code": "ZZG",
      "route": "北京 / 连云港 → 枣庄",
      "fromCity": "北京",
      "toCity": "枣庄",
      "coords": [117.3237, 34.8105],
      "distanceKm": 620,
      "subtitle": "初遇 · 去了小猪家那边",
      "desc": "第一次奔赴，夏末的风吹过枣庄，小狗和小猪的故事从这一张车票开始。",
      "status": "已检票",
      "tags": ["初遇", "枣庄"]
    }
  ],
  "photos": [
    {
      "id": "p1",
      "city": "枣庄",
      "date": "2026.08.08",
      "title": "夏末初遇 · 枣庄",
      "path": "./images/01_zaozhuang_0808.webp",
      "caption": "2026.08.08 · 枣庄初遇",
      "tags": ["枣庄", "初遇"],
      "gradient": "linear-gradient(135deg, #1f2937, #111827)",
      "presetMeta": "35mm · f/1.8 · ISO 200 · Zaozhuang"
    }
  ],
  "wishes": [
    {
      "id": "w0",
      "text": "希望有一天能不在异地 并且我们越来越好",
      "done": false,
      "pinned": true,
      "author": "both",
      "createdAt": "2026-08-08",
      "doneAt": null,
      "tags": ["核心心愿", "未来"]
    }
  ],
  "letters": {
    "beijing": {
      "authorId": "beijing",
      "authorName": "许金阳",
      "nickname": "小狗",
      "title": "许金阳 · 来自北京（小狗）",
      "meta": "寄件地: 北京市 · 实验室灯下",
      "text": "...",
      "updatedAt": "2026-11-24",
      "unlockAt": null
    },
    "lyg": {
      "authorId": "lyg",
      "authorName": "渐姝君",
      "nickname": "小猪",
      "title": "渐姝君 · 来自连云港（小猪）",
      "meta": "寄件地: 连云港市 · 海风吹过时",
      "text": "...",
      "updatedAt": "2026-11-24",
      "unlockAt": null
    }
  }
}
```

### 4.2 旧版数据无损迁移规则
- **首次加载迁移**：当 `two_city_memories_v2` 不存在但旧键（`bj_lyg_tickets`、`bj_lyg_wishes`、`bj_lyg_letters`、`bj_lyg_next_meet`）任一存在时：
  - 将旧版 `tickets`、`wishes`、`letters`、`nextMeet` 自动补全 Schema v2 缺失字段（如 `coords`、`distanceKm`、`pinned`、`tags`、`authorName`）。
  - 若迁移后的 `wishes` 中不含核心心愿 `希望有一天能不在异地 并且我们越来越好`，自动将其置顶插入列表首位。
  - 写入 `two_city_memories_v2`，不破坏旧键（便于回滚）。
- **JSON 备份导入兼容**：`importPayload(raw)` 同时支持 Schema v2 备份和旧版 `{ tickets, wishes, letters, nextMeet }` 备份。

---

## 5. 移动端 / 微信优先与 PWA 设计

### 5.1 移动端竖屏单手交互
- **底部常驻磨砂导航栏**（仅 `md:hidden` 移动端显示）：6 个简洁入口（首页、我们、车票、影集、心愿、来信），点击平滑滚动至对应锚点并随滚动高亮当前分区；适配 `padding-bottom: env(safe-area-inset-bottom)`，`main`/`footer` 底部留白防止内容被遮挡。
- **触控友好**：交互按钮与表单输入高度 ≥ 44px；弹窗在手机端支持内部最大高度滚动（`max-h-[88vh] overflow-y-auto`），避免输入法弹出时按钮不可点。
- **微信分享卡片元数据**：在 `<head>` 中配置 `description`、`og:title`、`og:description`、`og:type`、`og:image`（指向 `./assets/icons/icon-512.png`）与 `theme-color`。

### 5.2 PWA 规范
- **`manifest.json`**：
  - `name`: `许金阳 ⇄ 渐姝君 · 双城约会纪念册`
  - `short_name`: `双城纪念册`
  - `start_url`: `./`、`scope`: `./`、`display`: `standalone`
  - `background_color`: `#0A0D14`、`theme_color`: `#0A0D14`
  - `icons`: 192×192 与 512×512 PNG（含 `any` 与 `maskable` 适配）。
- **`sw.js`**：
  - 仅在 `https:` 或 `localhost`/`127.0.0.1` 环境下注册，注册失败静默忽略不影响正常使用。
  - 对同源静态资源采用 **Network-First（网络优先，断网回退缓存）**，确保 GitHub Pages 推送更新后用户打开即看到最新内容。
- **图标生成**：用脚本生成真实有效的 `icon.svg`、`icon-192.png`、`icon-512.png` 与 `apple-touch-icon.png`（深邃午夜蓝底 + 鎏金 `BJ ⇄ LYG` 双城星轨徽章）。

---

## 6. 容错与验收标准

### 6.1 容错处理
- `localStorage` 不可用（隐私模式受限）或内容被破坏时，`store.js` 自动降级为内存态 + 默认数据并安全运行，不抛未捕获异常。
- 导入非法 JSON 文件时，使用轻量 Toast 提示具体原因，不覆盖当前数据。
- 图片（头像或影集照片）加载失败时，使用 `onerror` 无缝回退到专属徽章或 35mm 取景框，无破图图标。
- 复制信件优先使用 `navigator.clipboard.writeText`，在非安全上下文或微信旧版内核下自动回退 `execCommand('copy')`。

### 6.2 验收与测试计划
1. **自动化单元测试（`node --test`）**：
   - 验证 `schema.js`：默认数据完整性（起始日 `2026-08-08`、许金阳/渐姝君信息、置顶心愿）、旧版 `bj_lyg_*` 迁移、旧版与 v2 JSON 备份归一化、缺字段/非法值防御。
   - 验证 `store.js`：状态读写、订阅通知、导出/导入往返一致、损坏 JSON 容错、重置恢复默认值。
2. **本地 HTTP 静态服务实测**：
   - 启动本地静态服务加载 `index.html`（ES Modules 需通过 HTTP 访问，不能直接 `file://` 双击）。
   - 验证关键路径返回 HTTP 200：`index.html`、`manifest.json`、`sw.js`、`assets/css/main.css`、`assets/icons/icon-192.png`、`assets/icons/icon-512.png`、`assets/icons/apple-touch-icon.png`、`js/app.js`。
   - 核对页面核心文案、交互流程（编辑双人档案、新增里程碑、切换车票状态、新增/勾选心愿、切换/编辑双城来信、主题切换、口令 `0808` 锁屏/解锁、JSON 导出导入）与浏览器控制台零报错。
3. **Git 状态干净**：不提交 `.idea/` 等无关本地目录，所有改动均在当前仓库 `main` 清晰可追溯。
