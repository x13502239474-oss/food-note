import type { AiConfig, AnalysisResult, FoodItem, MealType, Nutrition } from '@/types'
import { sumNutrition } from '@/lib/utils'
import { chatEndpoint, hasAiConfig } from '@/lib/ai/config'

const MEAL_NAMES: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
}

/**
 * 给视觉模型的系统提示词。
 * 目标：识别准确、明细可追溯、营养自洽、不确定的地方明确说出来。
 */
const SYSTEM_PROMPT = `你是一名严谨的食物营养分析师。用户会发来一张食物照片，你要仔细观察并估算。

必须只输出一个 JSON 对象，不要输出任何解释文字，不要使用代码块标记。

JSON 结构：
{
  "meal_name": "这一餐的名称",
  "total_calories": 整数,
  "calorie_range": { "min": 整数, "max": 整数 },
  "foods": [
    {
      "name": "食物名称",
      "category": "主食/肉类/蔬菜/水果/饮品/零食/其他",
      "ingredients": ["主要食材"],
      "cooking": "烹饪方式，未知写「未知」",
      "weight_g": 估算克数,
      "calories": 整数,
      "protein": 克,
      "carbs": 克,
      "fat": 克,
      "fiber": 克,
      "basis": "估算依据，例如参照常见餐盘/碗的尺寸，或常见每100克热量",
      "uncertainty": "无法确认的部分，例如用油、酱料、实际份量；没有则留空"
    }
  ],
  "nutrition": { "protein": 克, "carbs": 克, "fat": 克, "fiber": 克 },
  "suggestions": ["2-3 条具体可执行的建议"],
  "confidence": "high 或 medium 或 low",
  "notes": ["其他需要提醒用户的不确定性"]
}

严格要求：
1. 照片里有几种食物就分别列出几种，不要只给一个总热量。看不到的食物不要编造。
2. 重量只能估算：参照盘子/碗/勺/手的大小，或同类食物的常见份量，并在 basis 里说明依据。
3. 每种食物的 calories 约等于其重量对应的常见热量；total_calories 必须等于所有 foods 的 calories 之和。
4. nutrition 四项必须等于所有 foods 对应项之和，不要凭空给数。
5. calorie_range 体现照片估算的误差，一般取总量的约 85% 到 115%。
6. 烹饪油、酱料、隐藏脂肪如果无法从照片判断，写进对应食物的 uncertainty，不要假装精确。
7. suggestions 用中文，具体、客观、容易执行，语气平和，不要批评或制造焦虑。
8. 如果照片里没有可识别的食物，返回 foods: [] 并在 notes 里说明看到了什么。
9. 所有面向用户的文字字段都用中文。`

/** 把 fetch 的各类失败翻译成用户能看懂、能行动的错误 */
function friendlyError(status: number, body: string): Error {
  const head = body.slice(0, 300)
  if (status === 401 || status === 403) {
    return new Error('API Key 无效或没有权限，请到设置页检查密钥是否正确、是否已开通该模型。')
  }
  if (status === 404) {
    return new Error('接口地址或模型名不对（404）。请检查 Base URL 和模型名，注意有些服务需要在地址末尾加 /v1。')
  }
  if (status === 429) {
    return new Error('请求太频繁或免费额度已用完（429）。请稍后再试，或换一个服务商。')
  }
  if (status >= 500) {
    return new Error(`识别服务暂时不可用（${status}），请稍后重试。${head}`)
  }
  if (status === 400) {
    return new Error(`请求参数被拒绝（400），通常是模型名不对，或这家服务不支持图片输入。${head}`)
  }
  return new Error(`识别服务返回 ${status}：${head || '无详细说明'}`)
}

/** 解析模型输出：容忍代码块包裹和多余前后缀 */
function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    // 退而求其次：截取第一个 { 到最后一个 }
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1))
      } catch {
        // 继续抛出下面的统一错误
      }
    }
    throw new Error('模型没有按约定返回 JSON，请重试；如果一直失败，换一个模型名试试。')
  }
}

async function postChat(config: AiConfig, messages: unknown[], maxTokens: number): Promise<Response> {
  const endpoint = chatEndpoint(config.baseUrl)
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 60000)
  try {
    return await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: config.model.trim(),
        messages,
        temperature: 0.2,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('识别超时（60 秒）。请检查网络，或换一个响应更快的服务商。')
    }
    // 浏览器对跨域失败只给 TypeError，不会告诉你具体原因
    throw new Error(
      `无法连接 ${endpoint}。最常见原因是该服务商不允许浏览器跨域直连（CORS），或当前网络访问不到它。` +
        '可以换一个服务商试试（设置页有预设），或改用允许跨域的服务。',
    )
  } finally {
    window.clearTimeout(timer)
  }
}

/** 测试连接：用极短的文本请求验证 Key / 地址 / 网络，不消耗图片额度 */
export async function testAiConnection(config: AiConfig): Promise<void> {
  if (!hasAiConfig(config)) throw new Error('请先填写 API Key、Base URL 和模型名。')
  const response = await postChat(
    config,
    [{ role: 'user', content: '只回复两个字：正常' }],
    16,
  )
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw friendlyError(response.status, body)
  }
}

/** 调用视觉模型分析照片 */
export async function analyzeWithRealApi(
  photoDataUrl: string,
  mealType: MealType,
  config: AiConfig,
): Promise<AnalysisResult> {
  if (!hasAiConfig(config)) throw new Error('尚未配置识别接口，请到「我的」页填写。')

  const userPrompt = `请分析这张照片里的食物，判断这属于${MEAL_NAMES[mealType]}。严格只输出 JSON，不要代码块。`

  const response = await postChat(
    config,
    [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          { type: 'image_url', image_url: { url: photoDataUrl } },
        ],
      },
    ],
    // 1024 是所有预设服务商都能接受的安全值；智谱 glm-4v-flash 上限正是 1024
    1024,
  )

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw friendlyError(response.status, body)
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new Error('识别服务返回的内容不是有效 JSON，请重试。')
  }

  const obj = payload as Record<string, unknown>
  const choices = Array.isArray(obj?.choices) ? obj.choices : []
  const first = choices[0] as Record<string, unknown> | undefined
  const message = first?.message as Record<string, unknown> | undefined
  const content = message?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('识别服务没有返回分析内容，请重试。')
  }

  return normalizeApiResult(extractJson(content), mealType, photoDataUrl)
}

function num(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

/** 把任意模型返回规整为应用内部结构，并保证明细/总量/营养之间逻辑一致 */
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
    throw new Error('模型没有在照片里识别出食物。请确认照片清晰、食物在画面中，然后重试。')
  }

  // 以明细为准重新计算，避免模型给出的总热量和明细对不上
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
