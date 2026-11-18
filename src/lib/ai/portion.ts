import type { AnalysisResult, PortionScale } from '@/types'
import { PORTION_FACTORS, PORTION_LABELS } from '@/lib/constants'
import { round, sumNutrition } from '@/lib/utils'

/**
 * 份量重算：把一份分析结果按「小份 / 正常 / 大份」等比换算。
 * 纯函数，不修改入参；换算后重新求和，保证明细与总量、营养数据的逻辑一致。
 */
export function applyPortion(result: AnalysisResult, target: PortionScale): AnalysisResult {
  if (target === result.portionScale) return result

  const from = PORTION_FACTORS[result.portionScale] ?? 1
  const to = PORTION_FACTORS[target] ?? 1
  const ratio = to / from

  const foods = result.foods.map((food) => ({
    ...food,
    weight_g: round(food.weight_g * ratio),
    calories: round(food.calories * ratio),
    protein: round(food.protein * ratio, 1),
    carbs: round(food.carbs * ratio, 1),
    fat: round(food.fat * ratio, 1),
    fiber: round(food.fiber * ratio, 1),
  }))

  const total = foods.reduce((sum, food) => sum + food.calories, 0)
  const notes = [
    ...result.notes.filter((note) => !note.startsWith('份量')),
    `份量已按「${PORTION_LABELS[target]}」换算，实际重量仍以你的判断为准。`,
  ]

  return {
    ...result,
    foods,
    total_calories: total,
    calorie_range: {
      min: round(result.calorie_range.min * ratio * 0.95),
      max: round(result.calorie_range.max * ratio * 1.05),
    },
    nutrition: sumNutrition(foods),
    portionScale: target,
    notes,
  }
}
