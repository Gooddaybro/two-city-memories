/**
 * 第三阶段云端同步配置（公开文件，切勿在此填入任何密钥或 Bark Key）
 *
 * 留空时：纪念册运行在「本地体验模式」，所有第三阶段互动（0808 身份认领、心情贴纸、
 *         戳一戳心跳墙、火漆时光胶囊、贴纸盖章回执）均可在浏览器内完整体验。
 * 填入后：自动切换为「Supabase 云端双向同步 + 双 iPhone Bark 秒级推送」模式。
 *
 * 配置步骤见：docs/stage3-cloud-setup.md
 * 示例：'https://your-project-ref.supabase.co/functions/v1/two-city-api'
 */
export const CLOUD_CONFIG = {
  apiBaseUrl: ''
};
