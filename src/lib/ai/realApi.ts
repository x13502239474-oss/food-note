import type { AnalysisResult, FoodItem, MealType, Nutrition } from '@/types'
import { sumNutrition } from '@/lib/utils'

const API_URL = import.meta.env.VITE_VISION_API_URL?.trim()
const API_KEY = import.meta.env.VITE_VISION_API_KEY?.trim()
const MODEL = import.meta.env.VITE_VISION_MODEL?.trim()

export const hasRealApi = Boolean(API_URL)

/**
 * 真实视觉模型适配层（预留接口）。
 *
 * ⚠️ 安全说明：当前项目是纯静态站点，前端环境变量会被打包进公开 JS。
 * 正式上线时请勿把厂商密钥写进 VITE_VISION_API_KEY，
 * 而应把 VITE_VISION_API_URL 指向你自己的服务端代理，由代理持有密钥。
 *
 * 接口约定（POST JSON）：
 *   请求 { image: dataURL, model?: string, meal_type: string }
 *   返回与「AI 返回数据结构」一致的 JSON
 */
export async function analyzeWithRealApi(
  photoDataUrl: string,
  mealType: MealType,
): Promise<AnalysisResult> {
  if (!API_URL) throw new Error('尚未配置识别接口地址')

  let response: Response
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
      },
      body: JSON.stringify({
        image: photoDataUrl,
        ...(MODEL ? { model: MODEL } : {}),
        meal_type: mealType,
      }),
    })
  } catch {
    throw new Error('无法连接识别服务，请检查网络或接口地址')
  }

  if (!response.ok) {
    throw new Error(`识别服务返回 ${response.status}，请检查接口配置`)
  }

  let raw: unknown
  try {
    raw = await response.json()
  } catch {
    throw new Error('识别服务返回的数据格式有误')
  }

  return normalizeApiResult(raw, mealType, photoDataUrl)
}

function num(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

/** 把任意接口返回规整为应用内部结构，并保证明细/总量/营养之间逻辑一致 */
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
      weight_g: num(food.weight_g),
      calories: num(food.calories),
      protein: num(food.protein),
      carbs: num(food.carbs),
      fat: num(food.fat),
      fiber: num(food.fiber),
      basis: typeof food.basis === 'string' ? food.basis : '由视觉模型估算',
      uncertainty: typeof food.uncertainty === 'string' ? food.uncertainty : undefined,
    }
  })

  if (foods.length === 0) throw new Error('识别服务未返回任何食物明细')

  const total = foods.reduce((sum, food) => sum + food.calories, 0)
  const nutrition: Nutrition = sumNutrition(foods)
  const rangeRaw = obj.calorie_range as Record<string, unknown> | undefined
  const min = rangeRaw && num(rangeRaw.min, 0) > 0 ? num(rangeRaw.min) : Math.round(total * 0.88)
  const max = rangeRaw && num(rangeRaw.max, 0) > 0 ? num(rangeRaw.max) : Math.round(total * 1.12)

  const suggestions = Array.isArray(obj.suggestions)
    ? obj.suggestions.filter((v): v is string => typeof v === 'string')
    : []

  const confidence = obj.confidence === 'high' || obj.confidence === 'low' ? obj.confidence : 'medium'

  return {
    meal_name: typeof obj.meal_name === 'string' ? obj.meal_name : '这一餐',
    mealType,
    total_calories: total,
    calorie_range: { min: Math.min(min, total), max: Math.max(max, total) },
    foods,
    nutrition,
    suggestions,
    confidence,
    notes: [
      '照片无法准确测量重量与隐藏油脂，以上为估算值。',
      ...(Array.isArray(obj.notes) ? obj.notes.filter((v): v is string => typeof v === 'string') : []),
    ],
    photoDataUrl,
    portionScale: 'normal',
    isDemo: false,
  }
}
