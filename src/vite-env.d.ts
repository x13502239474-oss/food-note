/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 真实视觉识别接口的完整 URL（例如自建代理 /api/analyze）。留空即演示模式。 */
  readonly VITE_VISION_API_URL?: string
  /** 仅用于本地/可信环境；生产环境必须由服务端代理持有密钥。 */
  readonly VITE_VISION_API_KEY?: string
  readonly VITE_VISION_MODEL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
