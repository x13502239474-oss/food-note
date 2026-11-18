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

const SYSTEM_PROMPT = `分析食物照片，只输出一个 JSON 对象，不要代码块、不要解释：
{"meal_name":"餐名","total_calories":整数,"calorie_range":{"min":整数,"max":整数},"foods":[{"name":"名","category":"分类","ingredients":["食材"],"cooking":"做法","weight_g":克,"calories":整数,"protein":克,"carbs":克,"fat":克,"fiber":克,"basis":"依据(≤15字)","uncertainty":"不确定项(≤15字,无则空)"}],"nutrition":{"protein":克,"carbs":克,"fat":克,"fiber":克},"suggestions":["2条建议,每条≤20字"],"confidence":"high|medium|low","notes":[]}
要求：几种食物分别列出；明细 calories 之和=total_calories；nutrition=各食物营养之和；range 取总量 85%-115%；所有文字用中文且简短；看不到不要编造。`

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
    const t0 = Date.now()

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
          temperature: 0.1,
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

    const elapsedMs = Date.now() - t0
    console.log(`[food-note] analyze ok in ${elapsedMs}ms, imageChars=${image.length}`)
    return json({ ok: true, result, elapsed_ms: elapsedMs })
  },
}
