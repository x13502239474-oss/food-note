import type { ReactNode } from 'react'

interface Props {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}

export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center border border-line bg-paper text-sage">
        {icon}
      </div>
      <h3 className="font-serif text-[17px] font-semibold text-ink">{title}</h3>
      <p className="mt-2 max-w-[260px] text-xs leading-relaxed text-muted">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
