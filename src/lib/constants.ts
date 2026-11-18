/** 实拍食物摄影（Unsplash 免费图床，零积分成本）。加载失败时 UI 有纯色降级。 */
export const PHOTOS = {
  hero: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&q=85&fit=crop',
  breakfast: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=80&fit=crop',
  lunch: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80&fit=crop',
  dinner: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80&fit=crop',
  snack: 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=800&q=80&fit=crop',
} as const

export const MEAL_LABELS: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
}

export const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'] as const

export const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: '久坐（几乎不运动）',
  light: '轻度活动（每周 1–3 次）',
  moderate: '中度活动（每周 3–5 次）',
  active: '高强度活动（每周 6–7 次）',
  very_active: '体力劳动 / 专业训练',
}

export const ACTIVITY_FACTORS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

/** 份量档位对基准份量的倍率 */
export const PORTION_FACTORS: Record<string, number> = {
  small: 0.75,
  normal: 1,
  large: 1.35,
}

export const PORTION_LABELS: Record<string, string> = {
  small: '小份',
  normal: '正常',
  large: '大份',
}

export const EMPTY_NUTRITION = { protein: 0, carbs: 0, fat: 0, fiber: 0 }

/** 营养参考值（每日成人大致范围），仅用于进度条刻度和「适中/偏高」评价，不做医疗判断 */
export const NUTRITION_GUIDE = {
  protein: { label: '蛋白质', en: 'Protein', daily: 60 },
  carbs: { label: '碳水化合物', en: 'Carbs', daily: 260 },
  fat: { label: '脂肪', en: 'Fat', daily: 60 },
  fiber: { label: '膳食纤维', en: 'Fiber', daily: 25 },
} as const
