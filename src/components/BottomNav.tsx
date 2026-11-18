import { CalendarDays, Home, UserRound } from 'lucide-react'

export type Tab = 'home' | 'records' | 'me'

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
}

const ITEMS: Array<{ key: Tab; label: string; icon: typeof Home }> = [
  { key: 'home', label: '首页', icon: Home },
  { key: 'records', label: '饮食记录', icon: CalendarDays },
  { key: 'me', label: '我的', icon: UserRound },
]

export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav
      aria-label="底部导航"
      className="safe-bottom fixed bottom-0 left-1/2 z-30 w-full max-w-phone -translate-x-1/2 border-t border-line bg-paper/95 backdrop-blur"
    >
      <div className="grid grid-cols-3">
        {ITEMS.map(({ key, label, icon: Icon }) => {
          const isActive = active === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              aria-current={isActive ? 'page' : undefined}
              className={`focus-ring flex flex-col items-center gap-1 py-2.5 text-[11px] tracking-wide transition-colors ${
                isActive ? 'text-sage' : 'text-muted hover:text-ink-soft'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2 : 1.6} />
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
