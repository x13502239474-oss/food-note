import type { AiConfig, MealType } from '@/types'
import { demoAnalyze } from '@/lib/ai/demoEngine'
import { analyzeWithRealApi } from '@/lib/ai/realApi'
import { hasAiConfig } from '@/lib/ai/config'

/** 是否处于演示模式：由用户当前配置动态决定 */
export function isDemoMode(config: AiConfig | undefined): boolean {
  return !hasAiConfig(config)
}

export async function analyzeFood(
  photoDataUrl: string | undefined,
  mealType: MealType,
  config: AiConfig | undefined,
  fileName = '',
) {
  if (!photoDataUrl) throw new Error('请先上传一张食物照片')
  return isDemoMode(config)
    ? demoAnalyze(photoDataUrl, mealType, fileName)
    : analyzeWithRealApi(photoDataUrl, mealType, config!)
}
