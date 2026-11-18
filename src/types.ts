/** 用餐时段 */
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

/** AI 对识别结果的把握程度 */
export type Confidence = 'high' | 'medium' | 'low'

/** 份量档位：用于对识别结果做轻量重算 */
export type PortionScale = 'small' | 'normal' | 'large'

/** 四项核心营养（单位：g） */
export interface Nutrition {
  protein: number
  carbs: number
  fat: number
  fiber: number
}

/** 单一食物明细 */
export interface FoodItem extends Nutrition {
  name: string
  /** 食物种类，如 主食 / 肉类 / 蔬菜 */
  category: string
  /** 主要食材 */
  ingredients: string[]
  /** 烹饪方式 */
  cooking: string
  /** 估算重量（g） */
  weight_g: number
  /** 该项热量（kcal） */
  calories: number
  /** 估算依据说明 */
  basis: string
  /** 无法确认的部分 */
  uncertainty?: string
}

/** 一次分析的完整结果 */
export interface AnalysisResult {
  meal_name: string
  mealType: MealType
  total_calories: number
  calorie_range: { min: number; max: number }
  foods: FoodItem[]
  nutrition: Nutrition
  suggestions: string[]
  confidence: Confidence
  /** 不确定性提示（油、酱料、份量等） */
  notes: string[]
  photoDataUrl?: string
  portionScale: PortionScale
  isDemo: boolean
}

/** 保存到本地的一餐记录 */
export interface MealRecord {
  id: string
  mealType: MealType
  title: string
  calories: number
  nutrition: Nutrition
  photoDataUrl?: string
  eatenAt: number
  foods: FoodItem[]
  note?: string
}

/** 个人目标与身体数据 */
export interface UserProfile {
  dailyCalorieTarget: number
  /** 是否由用户主动设置过；false 时展示引导而非默认值 */
  targetCustomized: boolean
  heightCm?: number
  weightKg?: number
  age?: number
  gender: 'male' | 'female' | 'other' | ''
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
}

/** 用户自己填写的视觉模型配置（Key 只存在本机浏览器） */
export interface AiConfig {
  /** 预设服务商 id，或 'custom' */
  provider: string
  /** OpenAI 兼容服务的 Base URL，例如 https://dashscope.aliyuncs.com/compatible-mode/v1 */
  baseUrl: string
  apiKey: string
  /** 支持图片理解的模型名 */
  model: string
}

/** 全站持久化数据 */
export interface AppData {
  records: MealRecord[]
  profile: UserProfile
  aiConfig: AiConfig
}
