import { Settings2 } from 'lucide-react'

interface Props {
  title?: string
  subtitle?: string
  onSettings?: () => void
}

export default function TopBar({ title, subtitle, onSettings }: Props) {
  return (
    <header className="flex items-start justify-between px-5 pt-6 pb-4">
      <div>
        <div className="eyebrow">FOOD NOTE</div>
        <h1 className="mt-0.5 font-serif text-[19px] font-semibold tracking-[-0.02em] text-ink">
          {title ?? '食物研究所'}
        </h1>
        {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
      </div>
      {onSettings && (
        <button
          type="button"
          onClick={onSettings}
          aria-label="打开设置"
          className="focus-ring press -mr-1 mt-1 flex h-9 w-9 items-center justify-center text-ink-soft hover:text-ink"
        >
          <Settings2 size={20} strokeWidth={1.6} />
        </button>
      )}
    </header>
  )
}
