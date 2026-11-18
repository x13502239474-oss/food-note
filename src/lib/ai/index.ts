import type { MealType } from '@/types'
import { demoAnalyze } from '@/lib/ai/demoEngine'
import { analyzeWithRealApi, hasProxy } from '@/lib/ai/realApi'

/**
 * 是否处于演示模式。
 * 只有代理地址未配置时才回退到演示模式；正常部署后始终走真实识别，
 * 用户和朋友都无需填写任何东西。
 */
export function isDemoMode(): boolean {
  return !hasProxy()
}

export async function analyzeFood(
  photoDataUrl: string | undefined,
  mealType: MealType,
  fileName = '',
) {
  if (!photoDataUrl) throw new Error('请先上传一张食物照片')
  return isDemoMode()
    ? demoAnalyze(photoDataUrl, mealType, fileName)
    : analyzeWithRealApi(photoDataUrl, mealType)
}
