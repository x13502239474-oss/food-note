import type { MealType } from '@/types'
import { demoAnalyze } from '@/lib/ai/demoEngine'
import { analyzeWithRealApi, hasRealApi } from '@/lib/ai/realApi'

/** 未配置接口地址时自动进入演示模式 */
export const IS_DEMO_MODE = !hasRealApi

export async function analyzeFood(
  photoDataUrl: string | undefined,
  mealType: MealType,
  fileName = '',
) {
  if (!photoDataUrl) throw new Error('请先上传一张食物照片')
  return IS_DEMO_MODE
    ? demoAnalyze(photoDataUrl, mealType, fileName)
    : analyzeWithRealApi(photoDataUrl, mealType)
}
