import { clamp } from '@/lib/utils'

interface Props {
  value: number
  max: number
  size?: number
  stroke?: number
  centerLabel: string
  centerSub?: string
  overLabel?: string
}

/** 细线环形进度图：纯 SVG，便于完全控制杂志风格 */
export default function RingProgress({
  value,
  max,
  size = 148,
  stroke = 6,
  centerLabel,
  centerSub,
  overLabel,
}: Props) {
  const safeMax = max > 0 ? max : 1
  const ratio = clamp(value / safeMax, 0, 1)
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const filled = circumference * ratio
  const isOver = max > 0 && value > max

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E8EDE4" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isOver ? '#B08B6D' : '#829477'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 600ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="stat-number text-[34px] leading-none text-ink">{centerLabel}</span>
        {centerSub && <span className="mt-2 text-[11px] tracking-wide text-muted">{centerSub}</span>}
        {isOver && overLabel && <span className="mt-1 text-[10px] text-[#B08B6D]">{overLabel}</span>}
      </div>
    </div>
  )
}
