/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 内置的图像识别代理地址（Cloudflare Worker）。构建时写入，前端不接触任何密钥。 */
  readonly VITE_PROXY_URL?: string
  readonly [key: string]: string | boolean | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
