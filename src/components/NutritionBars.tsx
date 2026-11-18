import type { Nutrition } from '@/types'
import { NUTRITION_GUIDE } from '@/lib/constants'
import { clamp, round } from '@/lib/utils'

interface Props {
  nutrition: Nutrition
  mode?: 'meal' | 'daily'
}

type Key = keyof Nutrition

function evaluate(key: Key, value: number, mode: 'meal' | 'daily'): string {
  const ratio = value / NUTRITION_GUIDE[key].daily
  if (mode === 'meal') {
    if (ratio < 0.1) return '少量'
    if (ratio < 0.32) return '适中'
    if (ratio < 0.55) return '较多'
    return '偏高'
  }
  if (ratio < 0.35) return '不足'
  if (ratio < 0.8) return '适中'
  if (ratio < 1.1) return '充足'
  return '偏高'
}

export default function NutritionBars({ nutrition, mode = 'meal' }: Props) {
  const keys: Key[] = ['protein', 'carbs', 'fat', 'fiber']

  return (
    <div className="space-y-4">
      {keys.map((key) => {
        const guide = NUTRITION_GUIDE[key]
        const value = round(nutrition[key], 1)
        const ratio = value / guide.daily
        const verdict = evaluate(key, value, mode)
        const isHigh = verdict === '偏高' || verdict === '较多'
        const isLow = verdict === '不足' || verdict === '少量'
        const barColor = isHigh ? '#B08B6D' : isLow ? '#C9CFC3' : '#829477'
        const textColor = isHigh ? 'text-[#A57B5E]' : isLow ? 'text-muted' : 'text-sage'

        return (
          <div key={key}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] font-medium text-ink">{guide.label}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted">{guide.en}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="stat-number text-[15px] text-ink">{value}</span>
                <span className="text-[10px] text-muted">g</span>
                <span className={`w-8 text-right text-[11px] ${textColor}`}>{verdict}</span>
              </div>
            </div>
            <div className="h-1 w-full bg-sage-soft">
              <div
                className="h-1 transition-all duration-500"
                style={{ width: `${clamp(ratio, 0, 1) * 100}%`, backgroundColor: barColor }}
              />
            </div>
          </div>
        )
      })}
      <p className="pt-1 text-[10px] leading-relaxed text-muted">
        进度条以成人每日参考摄入量为刻度，仅供大致参考，非医学检测结果。
      </p>
    </div>
  )
}
