import type { AiConfig } from '@/types'

/** 服务商预设。所有预设都使用 OpenAI Chat Completions 兼容协议。 */
export interface ProviderPreset {
  id: string
  label: string
  baseUrl: string
  model: string
  keyUrl: string
  /** 简短说明：免费额度 / 网络要求 / 视觉能力 */
  hint: string
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'aliyun',
    label: '阿里云百炼 · 通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-vl-max-latest',
    keyUrl: 'https://help.aliyun.com/zh/model-studio/get-api-key',
    hint: '国内直连；新账号通常有免费额度。模型名以控制台为准（如 qwen3-vl-plus）。',
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.5-flash',
    keyUrl: 'https://aistudio.google.com/apikey',
    hint: '识别能力强、有免费额度；但模型端点在境外，国内网络可能无法直连。',
  },
  {
    id: 'zhipu',
    label: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4v-flash',
    keyUrl: 'https://bigmodel.cn/usercenter/proj-mgmt/apikeys',
    hint: '国内直连；有免费视觉模型。模型名以控制台为准。',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'google/gemini-2.5-flash',
    keyUrl: 'https://openrouter.ai/keys',
    hint: '一个 Key 可选多家模型；海外服务，国内网络可能不稳定。',
  },
  {
    id: 'custom',
    label: '自定义（OpenAI 兼容）',
    baseUrl: '',
    model: '',
    keyUrl: '',
    hint: '任何兼容 /chat/completions 且支持图片输入的服务都可填。',
  },
]

export const DEFAULT_AI_CONFIG: AiConfig = {
  provider: 'aliyun',
  baseUrl: PROVIDER_PRESETS[0].baseUrl,
  apiKey: '',
  model: PROVIDER_PRESETS[0].model,
}

/** 只有当 Key、地址、模型三者都填了，才算接入真实识别 */
export function hasAiConfig(config: AiConfig | undefined): boolean {
  return Boolean(
    config?.apiKey?.trim() && config?.baseUrl?.trim() && config?.model?.trim(),
  )
}

/** 把 Base URL 规整为完整的 chat/completions 地址 */
export function chatEndpoint(baseUrl: string): string {
  const clean = baseUrl.trim().replace(/\/+$/, '')
  return /\/chat\/completions$/.test(clean) ? clean : `${clean}/chat/completions`
}

/** 切换预设时，把该预设的地址与模型带出来；Key 保持用户原来的输入 */
export function configFromPreset(preset: ProviderPreset, currentKey: string): AiConfig {
  return {
    provider: preset.id,
    baseUrl: preset.baseUrl,
    model: preset.model,
    apiKey: currentKey,
  }
}
