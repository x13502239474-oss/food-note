import type { AnalysisResult, Confidence, FoodItem, MealType } from '@/types'
import { sumNutrition } from '@/lib/utils'

interface MealSeed {
  name: string
  foods: FoodItem[]
  suggestions: string[]
  notes: string[]
  confidence: Confidence
  range: { min: number; max: number }
}

/**
 * 演示模式内置样例。数据取自常见食材的公开营养参考值，
 * 仅用于展示交互与数据逻辑，不代表对任何真实照片的识别结论。
 */
const SEEDS: MealSeed[] = [
  {
    name: '米饭 · 红烧肉 · 炒青菜',
    confidence: 'medium',
    range: { min: 680, max: 840 },
    foods: [
      {
        name: '米饭', category: '主食', ingredients: ['大米'], cooking: '蒸',
        weight_g: 150, calories: 174, protein: 3.8, carbs: 38, fat: 0.4, fiber: 0.6,
        basis: '按常见家用碗约 150g 蒸米饭估算',
        uncertainty: '照片难以精确判断碗的实际容量',
      },
      {
        name: '红烧肉', category: '肉类', ingredients: ['五花肉', '酱油', '糖'], cooking: '红烧',
        weight_g: 100, calories: 395, protein: 14, carbs: 6, fat: 35, fiber: 0,
        basis: '按 100g 五花肉红烧后估算，含酱汁',
        uncertainty: '肥瘦比例与酱汁用量无法从照片确认',
      },
      {
        name: '炒青菜', category: '蔬菜', ingredients: ['绿叶菜', '蒜'], cooking: '清炒',
        weight_g: 120, calories: 82, protein: 2.4, carbs: 7, fat: 5.2, fiber: 2.4,
        basis: '按一盘约 120g 清炒绿叶菜估算',
        uncertainty: '用油量对热量影响较大',
      },
      {
        name: '烹饪用油及调味', category: '调味', ingredients: ['食用油', '酱油'], cooking: '—',
        weight_g: 12, calories: 108, protein: 0, carbs: 0.6, fat: 12, fiber: 0,
        basis: '按整餐约 12g 烹调用油估算',
        uncertainty: '实际用油与酱料无法从照片测量',
      },
    ],
    suggestions: [
      '本餐脂肪主要来自红烧肉和烹饪用油，下一餐可适当减少用油、优先选择瘦肉。',
      '膳食纤维偏低，建议补一份深色叶菜或菌菇类。',
      '米饭份量适中；若晚间活动较少，可略微减量。',
    ],
    notes: ['照片无法准确判断烹饪用油量与红烧肉的肥瘦比例，油脂热量为粗略估算。'],
  },
  {
    name: '鸡胸藜麦沙拉',
    confidence: 'medium',
    range: { min: 360, max: 470 },
    foods: [
      {
        name: '鸡胸肉', category: '蛋白质', ingredients: ['鸡胸肉'], cooking: '煎 / 烤',
        weight_g: 120, calories: 198, protein: 37, carbs: 0, fat: 4.3, fiber: 0,
        basis: '按一块约 120g 熟鸡胸肉估算', uncertainty: '厚度与是否裹粉无法确认',
      },
      {
        name: '藜麦', category: '主食', ingredients: ['藜麦'], cooking: '煮',
        weight_g: 100, calories: 120, protein: 4.4, carbs: 21.3, fat: 1.9, fiber: 2.8,
        basis: '按约 100g 熟藜麦估算', uncertainty: '—',
      },
      {
        name: '混合生菜', category: '蔬菜', ingredients: ['生菜', '芝麻菜'], cooking: '生食',
        weight_g: 100, calories: 18, protein: 1.4, carbs: 3.5, fat: 0.2, fiber: 1.6,
        basis: '按一份约 100g 叶菜估算', uncertainty: '—',
      },
      {
        name: '圣女果', category: '蔬菜', ingredients: ['圣女果'], cooking: '生食',
        weight_g: 60, calories: 11, protein: 0.5, carbs: 2.3, fat: 0.1, fiber: 0.7,
        basis: '按数颗约 60g 估算', uncertainty: '—',
      },
      {
        name: '油醋汁', category: '调味', ingredients: ['橄榄油', '醋'], cooking: '—',
        weight_g: 15, calories: 60, protein: 0, carbs: 1.5, fat: 6, fiber: 0,
        basis: '按 15g 油醋汁估算', uncertainty: '酱汁实际用量难以判断',
      },
    ],
    suggestions: [
      '蛋白质与蔬菜搭配均衡，是一餐结构不错的组合。',
      '油醋汁是主要脂肪来源，可减半使用以降低热量。',
      '若作为正餐，可再加一小份主食提升饱腹感。',
    ],
    notes: ['沙拉酱的用量从照片难以判断，按常见 15g 估算。'],
  },
  {
    name: '肉包 · 豆浆 · 水煮蛋',
    confidence: 'medium',
    range: { min: 330, max: 420 },
    foods: [
      {
        name: '肉包', category: '主食', ingredients: ['面粉', '猪肉'], cooking: '蒸',
        weight_g: 100, calories: 220, protein: 8, carbs: 30, fat: 8, fiber: 1.2,
        basis: '按 2 个中等大小肉包估算', uncertainty: '馅料肥瘦比例无法确认',
      },
      {
        name: '豆浆', category: '饮品', ingredients: ['黄豆'], cooking: '磨制',
        weight_g: 250, calories: 78, protein: 7, carbs: 5, fat: 3.5, fiber: 1.2,
        basis: '按一杯约 250ml 无糖豆浆估算', uncertainty: '是否加糖无法判断',
      },
      {
        name: '水煮蛋', category: '蛋白质', ingredients: ['鸡蛋'], cooking: '水煮',
        weight_g: 50, calories: 72, protein: 6.3, carbs: 0.6, fat: 4.8, fiber: 0,
        basis: '按 1 个中等鸡蛋估算', uncertainty: '—',
      },
    ],
    suggestions: [
      '蛋白质搭配不错，可再加一份水果补充维生素与膳食纤维。',
      '肉包油脂偏高，可以与菜包、全麦面点交替选择。',
      '如豆浆为无糖，本餐糖分摄入较合理。',
    ],
    notes: ['包子馅料成分与豆浆是否加糖无法从照片确认。'],
  },
  {
    name: '红烧牛肉面',
    confidence: 'low',
    range: { min: 480, max: 610 },
    foods: [
      {
        name: '面条', category: '主食', ingredients: ['小麦粉'], cooking: '煮',
        weight_g: 200, calories: 280, protein: 9, carbs: 56, fat: 1.2, fiber: 2,
        basis: '按一份约 200g 熟面条估算', uncertainty: '碗中实际面量难以判断',
      },
      {
        name: '牛肉', category: '蛋白质', ingredients: ['牛腱 / 牛腩'], cooking: '炖',
        weight_g: 80, calories: 170, protein: 20, carbs: 0, fat: 9, fiber: 0,
        basis: '按约 80g 熟牛肉估算', uncertainty: '部位不同脂肪差异较大',
      },
      {
        name: '青菜', category: '蔬菜', ingredients: ['小白菜'], cooking: '烫',
        weight_g: 100, calories: 22, protein: 1.8, carbs: 3.6, fat: 0.4, fiber: 1.8,
        basis: '按约 100g 烫青菜估算', uncertainty: '—',
      },
      {
        name: '汤底及调味', category: '调味', ingredients: ['高汤', '酱油', '辣油'], cooking: '—',
        weight_g: 20, calories: 70, protein: 1, carbs: 2, fat: 6, fiber: 0,
        basis: '按一份汤底调味估算', uncertainty: '是否加辣油、喝汤量无法判断',
      },
    ],
    suggestions: [
      '面条约占本餐热量一半，可适当减少面量、增加青菜。',
      '汤底钠含量通常较高，建议少喝汤。',
      '牛肉提供了较充足的优质蛋白，搭配方向合理。',
    ],
    notes: ['面条实际份量、汤底油脂与是否加辣油均无法从照片准确判断。'],
  },
  {
    name: '蛋炒饭 · 紫菜蛋花汤',
    confidence: 'low',
    range: { min: 400, max: 530 },
    foods: [
      {
        name: '蛋炒饭', category: '主食', ingredients: ['米饭', '鸡蛋', '葱花'], cooking: '炒',
        weight_g: 250, calories: 410, protein: 11, carbs: 58, fat: 15, fiber: 1.8,
        basis: '按一份约 250g 蛋炒饭估算', uncertainty: '用油量与米饭实际份量影响较大',
      },
      {
        name: '紫菜蛋花汤', category: '汤品', ingredients: ['紫菜', '鸡蛋'], cooking: '煮',
        weight_g: 200, calories: 45, protein: 3, carbs: 2, fat: 2.5, fiber: 0.4,
        basis: '按一碗约 200ml 估算', uncertainty: '—',
      },
    ],
    suggestions: [
      '炒饭用油较多，是热量主要来源；下次可尝试少油或用不粘锅。',
      '搭配的汤热量较低，但钠含量可能偏高。',
      '建议补一份绿叶蔬菜，提升膳食纤维摄入。',
    ],
    notes: ['炒饭用油量、是否额外加酱料无法从照片判断。'],
  },
  {
    name: '香煎三文鱼 · 糙米饭 · 西兰花',
    confidence: 'medium',
    range: { min: 460, max: 570 },
    foods: [
      {
        name: '三文鱼', category: '蛋白质', ingredients: ['三文鱼'], cooking: '香煎',
        weight_g: 120, calories: 250, protein: 24, carbs: 0, fat: 16, fiber: 0,
        basis: '按一块约 120g 三文鱼排估算', uncertainty: '鱼块厚度与部位无法确认',
      },
      {
        name: '糙米饭', category: '主食', ingredients: ['糙米'], cooking: '蒸',
        weight_g: 130, calories: 145, protein: 3.4, carbs: 30, fat: 1.2, fiber: 2.6,
        basis: '按约 130g 熟糙米饭估算', uncertainty: '—',
      },
      {
        name: '西兰花', category: '蔬菜', ingredients: ['西兰花'], cooking: '焯 / 炒',
        weight_g: 120, calories: 40, protein: 3.4, carbs: 8, fat: 0.5, fiber: 3.2,
        basis: '按约 120g 西兰花估算', uncertainty: '—',
      },
      {
        name: '烹饪用油', category: '调味', ingredients: ['橄榄油'], cooking: '—',
        weight_g: 8, calories: 72, protein: 0, carbs: 0, fat: 8, fiber: 0,
        basis: '按煎制用油约 8g 估算', uncertainty: '实际用油量无法测量',
      },
    ],
    suggestions: [
      '蛋白质与膳食纤维表现不错，整体结构均衡。',
      '三文鱼本身脂肪较高，烹饪时用少量油即可。',
      '如活动量较少，糙米饭可略微减量。',
    ],
    notes: ['鱼肉部位与烹饪用油量难以精确判断。'],
  },
  {
    name: '贝果 · 奶油奶酪 · 拿铁',
    confidence: 'medium',
    range: { min: 430, max: 540 },
    foods: [
      {
        name: '贝果', category: '主食', ingredients: ['小麦粉'], cooking: '烘烤',
        weight_g: 100, calories: 260, protein: 10, carbs: 50, fat: 1.5, fiber: 2.5,
        basis: '按 1 个约 100g 贝果估算', uncertainty: '是否有夹馅无法确认',
      },
      {
        name: '奶油奶酪', category: '调味', ingredients: ['奶酪'], cooking: '涂抹',
        weight_g: 20, calories: 70, protein: 1, carbs: 0.6, fat: 7, fiber: 0,
        basis: '按约 20g 涂抹量估算', uncertainty: '实际涂抹量难以判断',
      },
      {
        name: '拿铁', category: '饮品', ingredients: ['浓缩咖啡', '牛奶'], cooking: '萃取',
        weight_g: 300, calories: 150, protein: 7, carbs: 14, fat: 7, fiber: 0,
        basis: '按中杯约 300ml 全奶拿铁估算', uncertainty: '是否加糖、奶种无法判断',
      },
    ],
    suggestions: [
      '主食比例偏高，可搭配一份水果增加膳食纤维。',
      '拿铁可换低脂奶或燕麦奶，减少脂肪摄入。',
      '奶油奶酪用量不多，整体可控。',
    ],
    notes: ['饮品是否加糖、使用何种牛奶无法从照片确认。'],
  },
]

/** 从图片取粗略色调，用于演示模式下给出「看起来相关」的结果 */
function imageTone(dataUrl?: string): Promise<{ green: number; bright: number; warm: number } | null> {
  if (!dataUrl) return Promise.resolve(null)
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 8
      canvas.height = 8
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(null)
      ctx.drawImage(img, 0, 0, 8, 8)
      const data = ctx.getImageData(0, 0, 8, 8).data
      let r = 0, g = 0, b = 0
      const count = data.length / 4
      for (let i = 0; i < data.length; i += 4) {
        r += data[i]
        g += data[i + 1]
        b += data[i + 2]
      }
      r /= count
      g /= count
      b /= count
      resolve({ green: g - (r + b) / 2, bright: (r + g + b) / 3, warm: r - b })
    }
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}

function pickSeed(index: number): MealSeed {
  return SEEDS[((index % SEEDS.length) + SEEDS.length) % SEEDS.length]
}

function chooseSeedIndex(name: string, tone: { green: number; bright: number; warm: number } | null): number {
  const lower = name.toLowerCase()
  const rules: Array<[RegExp, number]> = [
    [/沙拉|salad|藜麦|轻食|鸡胸/, 1],
    [/牛肉面|拉面|noodle|面条/, 3],
    [/炒饭|fried.?rice/, 4],
    [/三文鱼|salmon|糙米/, 5],
    [/贝果|bagel|咖啡|拿铁|早午餐/, 6],
    [/包子|豆浆|早餐|鸡蛋/, 2],
    [/红烧|米饭|rice|午餐|便当/, 0],
  ]
  for (const [pattern, index] of rules) {
    if (pattern.test(lower)) return index
  }
  if (tone) {
    if (tone.green > 8) return 1
    if (tone.bright > 175) return 2
    if (tone.warm > 18 && tone.bright < 160) return 0
  }
  return Math.floor(Math.random() * SEEDS.length)
}

/** 演示识别：延时模拟推理过程，返回结构化结果 */
export async function demoAnalyze(
  photoDataUrl: string | undefined,
  mealType: MealType,
  fileName = '',
): Promise<AnalysisResult> {
  const tone = await imageTone(photoDataUrl)
  const seed = pickSeed(chooseSeedIndex(fileName, tone))
  await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 700))

  const foods = seed.foods.map((food) => ({ ...food, ingredients: [...food.ingredients] }))
  const total = foods.reduce((sum, food) => sum + food.calories, 0)

  return {
    meal_name: mealType === 'breakfast' ? '早餐' : mealType === 'lunch' ? '午餐' : mealType === 'dinner' ? '晚餐' : '加餐',
    mealType,
    total_calories: total,
    calorie_range: { ...seed.range },
    foods,
    nutrition: sumNutrition(foods),
    suggestions: [...seed.suggestions],
    confidence: seed.confidence,
    notes: [...seed.notes],
    photoDataUrl,
    portionScale: 'normal',
    isDemo: true,
  }
}
