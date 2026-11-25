/**
 * 第三阶段云端同步配置（仅含公开 Edge Function 网关地址，不含任何密钥或 Bark Key）
 *
 * 所有私密口令、HMAC 签名密钥与双 iPhone Bark Key 均安全存储在 Supabase Secrets 中。
 */
export const CLOUD_CONFIG = {
  apiBaseUrl: 'https://uumegiamqvikmvbmmujd.supabase.co/functions/v1/two-city-api'
};
