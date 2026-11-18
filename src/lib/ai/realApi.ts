import type { AnalysisResult, FoodItem, MealType, Nutrition } from '@/types'
import { sumNutrition } from '@/lib/utils'

/**
 * 图像识别客户端（零配置模式）。
 *
 * 前端不接触任何 API Key：照片发到项目自带的云代理（Cloudflare Worker），
 * 由代理在服务端持有密钥调用视觉模型。用户和朋友都无需填写任何东西。
 *
 * 代理地址优先级：
 *   1. localStorage 里的 food-note:proxy-url（调试 / 自部署时用）
 *   2. 内置的默认 Worker 地址
 */

const DEFAULT_PROXY_URL = import.meta.env.VITE_PROXY_URL?.trim() || ''
const PROXY_URL_KEY = 'food-note:proxy-url'

function proxyUrl(): string {
  try {
    const custom = localStorage.getItem(PROXY_URL_KEY)?.trim()
    if (custom) return custom.replace(/\/+$/, '')
  } catch {
    // localStorage 不可用时用默认值
  }
  return DEFAULT_PROXY_URL.replace(/\/+$/, '')
}

export function hasProxy(): boolean {
  return Boolean(proxyUrl())
}

export function getProxyUrl(): string {
  return proxyUrl()
}

export function setProxyUrl(url: string): void {
  try {
    if (url.trim()) localStorage.setItem(PROXY_URL_KEY, url.trim().replace(/\/+$/, ''))
    else localStorage.removeItem(PROXY_URL_KEY)
  } catch {
    // 忽略存储失败
  }
}

/** 把代理返回的各类失败翻译成用户能看懂的话 */
function friendlyError(status: number, body: string): Error {
  let detail = body.slice(0, 200)
  let parsed: { error?: string; detail?: string } | undefined
  try {
    parsed = JSON.parse(body)
    if (parsed?.error) detail = parsed.error
  } catch {
    // 保留原始片段
  }
  if (status === 503) return new Error(parsed?.error || '识别服务尚未就绪，请稍后再试。')
  if (status === 429) return new Error('当前识别人数较多，请稍后再试。')
  if (status >= 500) return new Error(parsed?.error || '识别服务暂时不可用，请稍后重试。')
  return new Error(parsed?.error || `识别失败（${status}）：${detail}`)
}

async function callProxy(payload: Record<string, unknown>, timeoutMs = 120000): Promise<Response> {
  const url = proxyUrl()
  if (!url) throw new Error('识别服务未配置，请检查网络后重试。')
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('网络较慢，识别超过 2 分钟未完成。请换用更稳定的网络后重试。')
    }
    throw new Error('无法连接识别服务，请检查网络后重试。')
  } finally {
    window.clearTimeout(timer)
  }
}

/** 健康检查：不消耗模型额度 */
export async function testProxyConnection(): Promise<void> {
  const response = await callProxy({ action: 'ping' }, 15000)
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw friendlyError(response.status, body)
  }
  const data = (await response.json().catch(() => ({}))) as { ok?: boolean }
  if (!data.ok) throw new Error('识别服务密钥未配置，请联系应用维护者。')
}

const MEAL_NAMES: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
}

/** 调用代理分析照片 */
export async function analyzeWithRealApi(
  photoDataUrl: string,
  mealType: MealType,
): Promise<AnalysisResult> {
  const response = await callProxy({
    image: photoDataUrl,
    meal_type: mealType,
    action: 'analyze',
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw friendlyError(response.status, body)
  }

  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; result?: unknown; error?: string }
    | null
  if (!payload?.ok || !payload.result) {
    throw new Error(payload?.error || '识别服务没有返回有效结果，请重试。')
  }

  return normalizeApiResult(payload.result, mealType, photoDataUrl)
}

function num(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

/** 把代理返回的模型结果规整为应用内部结构，保证明细/总量/营养之间逻辑一致 */
function normalizeApiResult(raw: unknown, mealType: MealType, photoDataUrl: string): AnalysisResult {
  if (!raw || typeof raw !== 'object') throw new Error('识别结果为空')
  const obj = raw as Record<string, unknown>
  const rawFoods = Array.isArray(obj.foods) ? obj.foods : []

  const foods: FoodItem[] = rawFoods.map((item, index) => {
    const food = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>
    const ingredients = Array.isArray(food.ingredients)
      ? food.ingredients.filter((v): v is string => typeof v === 'string')
      : []
    return {
      name: typeof food.name === 'string' && food.name.trim() ? food.name.trim() : `食物 ${index + 1}`,
      category: typeof food.category === 'string' ? food.category : '其他',
      ingredients,
      cooking: typeof food.cooking === 'string' ? food.cooking : '—',
      weight_g: Math.max(0, num(food.weight_g)),
      calories: Math.max(0, Math.round(num(food.calories))),
      protein: Math.max(0, num(food.protein)),
      carbs: Math.max(0, num(food.carbs)),
      fat: Math.max(0, num(food.fat)),
      fiber: Math.max(0, num(food.fiber)),
      basis: typeof food.basis === 'string' ? food.basis : '由视觉模型估算',
      uncertainty: typeof food.uncertainty === 'string' && food.uncertainty.trim() ? food.uncertainty : undefined,
    }
  })

  if (foods.length === 0) {
    throw new Error('没有在照片里识别出食物。请确认照片清晰、食物在画面中，然后重试。')
  }

  const total = foods.reduce((sum, food) => sum + food.calories, 0)
  const nutrition: Nutrition = sumNutrition(foods)
  const rangeRaw = obj.calorie_range as Record<string, unknown> | undefined
  const min = rangeRaw && num(rangeRaw.min, 0) > 0 ? num(rangeRaw.min) : Math.round(total * 0.85)
  const max = rangeRaw && num(rangeRaw.max, 0) > 0 ? num(rangeRaw.max) : Math.round(total * 1.15)

  const suggestions = Array.isArray(obj.suggestions)
    ? obj.suggestions.filter((v): v is string => typeof v === 'string' && Boolean(v.trim()))
    : []

  const confidence = obj.confidence === 'high' || obj.confidence === 'low' ? obj.confidence : 'medium'

  return {
    meal_name: typeof obj.meal_name === 'string' && obj.meal_name.trim() ? obj.meal_name.trim() : MEAL_NAMES[mealType],
    mealType,
    total_calories: total,
    calorie_range: { min: Math.min(Math.round(min), total), max: Math.max(Math.round(max), total) },
    foods,
    nutrition,
    suggestions,
    confidence,
    notes: [
      '照片无法准确测量重量与隐藏油脂，以上为估算值，请结合自己的判断核对。',
      ...(Array.isArray(obj.notes) ? obj.notes.filter((v): v is string => typeof v === 'string' && Boolean(v.trim())) : []),
    ],
    photoDataUrl,
    portionScale: 'normal',
    isDemo: false,
  }
}
