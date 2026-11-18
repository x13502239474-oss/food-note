/// <reference types="vite/client" />

/**
 * 视觉模型配置现在由用户在「我的」页填写，密钥只存本机浏览器，
 * 不再使用构建时环境变量（避免把密钥打包进公开的 JS 文件）。
 */
interface ImportMetaEnv {
  readonly [key: string]: string | boolean | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
