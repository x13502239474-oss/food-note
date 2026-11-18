/**
 * FOOD NOTE · 图像识别代理（Cloudflare Workers）
 *
 * 作用：前端只把照片发到这个 Worker，密钥 ZHIPU_API_KEY 以 secret 形式
 * 存在 Cloudflare 服务端，永远不会下发到浏览器，因此朋友无需填任何 Key。
 *
 * 端点：
 *   POST /            body { image: dataURL, meal_type, action?: 'analyze' }
 *   POST /            body { action: 'ping' }    —— 健康检查，不消耗模型额度
 */

const ZHIPU_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const MODEL = 'glm-4v-flash' // 智谱长期免费视觉模型，max_tokens 上限 1024

const MEAL_NAMES = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
}

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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS })
    }
    if (request.method !== 'POST') {
      return json({ ok: false, error: '仅支持 POST 请求' }, 405)
    }

    let payload
    try {
      payload = await request.json()
    } catch {
      return json({ ok: false, error: '请求格式错误' }, 400)
    }

    // 健康检查：只验证 Worker 活着和密钥已配置，不调用模型、不消耗额度
    if (payload.action === 'ping') {
      return json({ ok: Boolean(env.ZHIPU_API_KEY), model: MODEL })
    }

    if (!env.ZHIPU_API_KEY) {
      return json({ ok: false, error: '识别服务尚未配置密钥' }, 503)
    }

    const image = payload.image
    if (typeof image !== 'string' || !image.startsWith('data:image/')) {
      return json({ ok: false, error: '缺少有效的图片数据' }, 400)
    }

    const mealType = MEAL_NAMES[payload.meal_type] ? payload.meal_type : 'lunch'
    const userPrompt = `请分析这张照片里的食物，判断这属于${MEAL_NAMES[mealType]}。严格只输出 JSON，不要代码块。`

    let resp
    try {
      resp = await fetch(ZHIPU_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.ZHIPU_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                { type: 'text', text: userPrompt },
                { type: 'image_url', image_url: { url: image } },
              ],
            },
          ],
          temperature: 0.2,
          max_tokens: 1024,
        }),
      })
    } catch {
      return json({ ok: false, error: '无法连接识别模型，请稍后重试' }, 502)
    }

    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      let detail = text.slice(0, 200)
      try {
        const j = JSON.parse(text)
        detail = j?.error?.message || detail
      } catch {
        // 保持原始片段
      }
      let message = `识别服务返回 ${resp.status}`
      if (resp.status === 401 || resp.status === 403) message = '模型密钥无效或额度不足'
      else if (resp.status === 429) message = '当前识别人数较多，请稍后再试'
      else if (resp.status === 400) message = '模型请求参数有误'
      return json({ ok: false, error: message, detail }, resp.status)
    }

    let data
    try {
      data = await resp.json()
    } catch {
      return json({ ok: false, error: '识别服务返回的内容不是有效 JSON' }, 502)
    }

    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) {
      return json({ ok: false, error: '识别服务没有返回分析内容，请重试' }, 502)
    }

    // 把模型输出的 JSON 字符串解析成对象返回给前端
    let result
    try {
      const cleaned = content
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim()
      const start = cleaned.indexOf('{')
      const end = cleaned.lastIndexOf('}')
      result = JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned)
    } catch {
      return json({ ok: false, error: '识别结果格式异常，请重试' }, 502)
    }

    return json({ ok: true, result })
  },
}
