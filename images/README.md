# 双城照片与头像存放指南（`images/`）

把你们的真实照片放进这个目录并提交推送到 `main` 分支后，网站会自动显示，不再展示占位图。

## 1. 预设文件名（放入即自动生效）

| 用途 | 推荐文件名 | 对应位置 |
| --- | --- | --- |
| 许金阳（小狗）头像 | `avatar-xjy.webp` | “关于我们”双人档案卡片 |
| 渐姝君（小猪）头像 | `avatar-jsj.webp` | “关于我们”双人档案卡片 |
| 枣庄初遇照片 | `01_zaozhuang_0808.webp` | 双城胶片影集 |
| 济南重逢照片 | `02_jinan_09.webp` | 双城胶片影集 |
| 连云港看海照片 | `03_lianyungang_10.webp` | 双城胶片影集 |
| 徐州晚秋照片 | `04_xuzhou_1101.webp` | 双城胶片影集 |

> 如果你暂时只有 `.jpg` / `.png` 照片，不想转换格式，也可以直接把图片放进本目录，然后打开 [`data/defaults.js`](../data/defaults.js) 把对应项的 `path` 或 `avatar` 改成你的实际文件名即可。

## 2. 推荐压缩为 WebP（手机微信秒开）

- **头像**：建议正方形裁剪（如 `400×400`），WebP 质量 `80`，单张控制在 **50 KB** 以内。
- **影集照片**：建议长边缩放至 `1400px`–`1600px`，WebP 质量 `80`–`85`，单张控制在 **200 KB–400 KB**，兼顾高清与手机流量加载速度。
- 可用在线工具（如 Squoosh）或命令行 `cwebp -q 82 input.jpg -o output.webp` 转换。

## 3. 追加更多照片

把新照片放进 `images/`（例如 `05_zibo_1225.webp`），再打开 [`data/defaults.js`](../data/defaults.js)，在 `DEFAULT_STATE.photos` 数组里新增一条对象：

```js
{
  id: 'p5',
  city: '淄博',
  date: '2026.12.25',
  title: '琉璃夜色 · 淄博',
  path: './images/05_zibo_1225.webp',
  caption: '海岱楼夜景与热气腾腾的烧烤',
  tags: ['淄博', '冬日'],
  gradient: 'linear-gradient(135deg, #1e293b, #0f172a)',
  presetMeta: '35mm · f/1.8 · ISO 400 · Zibo'
}
```

影集顶部的城市筛选标签会自动识别新增城市，无需改动其他代码。
