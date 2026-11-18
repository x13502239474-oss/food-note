import type { ChangeEvent } from 'react'
import { ArrowRight, Camera, Images, Sparkles, UtensilsCrossed } from 'lucide-react'
import TopBar from '@/components/TopBar'
import Photo from '@/components/Photo'
import RingProgress from '@/components/RingProgress'
import { PHOTOS } from '@/lib/constants'
import { sumNutrition } from '@/lib/utils'
import { todayRecords } from '@/lib/storage'
import { useStore } from '@/store'

interface Props {
  onStartAnalyze: (file: File | null) => void
  onGoSettings: () => void
}

export default function HomePage({ onStartAnalyze, onGoSettings }: Props) {
  const { data } = useStore()
  const today = todayRecords(data.records)
  const consumed = today.reduce((sum, record) => sum + record.calories, 0)
  const target = data.profile.dailyCalorieTarget
  const remaining = target - consumed
  const nutrition = sumNutrition(today.map((record) => record.nutrition))

  function pickFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) onStartAnalyze(file)
    event.target.value = ''
  }

  return (
    <>
      <TopBar onSettings={onGoSettings} />

      {/* 核心入口前置：手机端打开首页即可看到，无需滚动 */}
      <section className="px-5 pt-2">
        <div className="eyebrow">START HERE</div>
        <div className="paper-card mt-3 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-sage-soft text-sage">
              <UtensilsCrossed size={20} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="font-serif text-[19px] font-semibold leading-tight">这顿吃了什么？</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                拍一张照片，AI帮你估算热量与营养。
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="focus-ring press group flex cursor-pointer flex-col items-center justify-center gap-1.5 bg-sage py-3 text-white">
              <input type="file" accept="image/*" capture="environment" onChange={pickFile} className="hidden" />
              <Camera size={18} strokeWidth={1.7} />
              <span className="text-xs font-medium tracking-wide">立即拍照</span>
            </label>
            <label className="focus-ring press group flex cursor-pointer flex-col items-center justify-center gap-1.5 border border-sage bg-paper py-3 text-sage">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={pickFile}
                className="hidden"
              />
              <Images size={18} strokeWidth={1.7} />
              <span className="text-xs font-medium tracking-wide">从相册上传</span>
            </label>
          </div>
          <p className="mt-2.5 text-center text-[10px] text-muted">支持 JPG · PNG · WEBP</p>
        </div>
      </section>

      <hr className="hairline mx-5 mt-7" />

      {/* 杂志封面视觉区 */}
      <section className="px-5 pt-7">
        <div className="eyebrow">A NOTE ON WHAT YOU EAT</div>
        <h2 className="magazine-title mt-3 text-[34px] leading-[1.18]">
          看见食物，
          <br />
          了解热量。
        </h2>
        <p className="mt-3 text-[13px] tracking-wide text-muted">每一餐都值得认真对待。</p>
        <div className="mt-6 overflow-hidden border border-line bg-sand">
          <Photo
            src={PHOTOS.hero}
            alt="健康饮食摄影：新鲜蔬菜与均衡餐盘"
            className="h-[210px] w-full"
            label="健康饮食影像"
          />
        </div>
        <p className="mt-2.5 text-[10px] tracking-wide text-muted">
          FOOD JOURNAL · 用一张照片，记录真实的一餐
        </p>
      </section>

      <hr className="hairline mx-5 mt-8" />

      {/* 今日饮食概览 */}
      <section className="px-5 pt-7">
        <div className="flex items-baseline justify-between">
          <div className="eyebrow">TODAY · 今日概览</div>
          {today.length > 0 && <span className="text-[11px] text-muted">{today.length} 餐已记录</span>}
        </div>

        <div className="mt-5 flex items-center gap-5">
          {target > 0 ? (
            <RingProgress
              value={consumed}
              max={target}
              centerLabel={String(remaining >= 0 ? remaining : 0)}
              centerSub="kcal 剩余"
              overLabel="已超出目标"
            />
          ) : (
            <button
              type="button"
              onClick={onGoSettings}
              className="focus-ring press flex h-[148px] w-[148px] shrink-0 flex-col items-center justify-center rounded-full border border-dashed border-sage text-sage"
            >
              <Sparkles size={20} strokeWidth={1.5} />
              <span className="mt-3 text-[13px] font-medium">设置每日目标</span>
              <span className="mt-1 text-[10px] text-muted">从你自己的数据开始</span>
            </button>
          )}

          <div className="min-w-0 flex-1 space-y-3.5">
            <div>
              <div className="text-[11px] text-muted">已摄入</div>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span className="stat-number text-[24px] leading-none">{consumed}</span>
                <span className="text-[10px] text-muted">kcal</span>
              </div>
            </div>
            <div className="h-px bg-line" />
            <div>
              <div className="text-[11px] text-muted">每日目标</div>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span className="stat-number text-[20px] leading-none text-ink-soft">
                  {target > 0 ? target : '—'}
                </span>
                {target > 0 && <span className="text-[10px] text-muted">kcal</span>}
              </div>
            </div>
            <div className="h-px bg-line" />
            <div>
              <div className="text-[11px] text-muted">剩余可摄入</div>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span className={`stat-number text-[20px] leading-none ${remaining < 0 ? 'text-[#B08B6D]' : ''}`}>
                  {target > 0 ? Math.max(remaining, 0) : '—'}
                </span>
                {target > 0 && <span className="text-[10px] text-muted">kcal</span>}
              </div>
            </div>
          </div>
        </div>
        {target > 0 && remaining < 0 && (
          <p className="mt-4 border-l-2 border-[#D9C3B0] pl-3 text-[11px] leading-relaxed text-muted">
            今日已超过目标 {Math.abs(remaining)} kcal。这只是估算参考，明天保持平常节奏即可。
          </p>
        )}
      </section>

      <hr className="hairline mx-5 mt-8" />

      {/* 每日营养简览 */}
      <section className="px-5 pb-12 pt-7">
        <div className="flex items-baseline justify-between">
          <div className="eyebrow">NUTRITION · 营养构成</div>
          <span className="text-[10px] text-muted">今日累计</span>
        </div>
        {today.length === 0 ? (
          <div className="paper-card mt-4 flex items-center justify-between px-4 py-5">
            <p className="max-w-[190px] text-xs leading-relaxed text-muted">
              还没有记录。记录几餐后，这里会自动汇总营养数据。
            </p>
            <button
              type="button"
              onClick={() => onStartAnalyze(null)}
              className="focus-ring press flex shrink-0 items-center gap-1 text-xs font-medium text-sage"
            >
              记录一餐 <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <div className="paper-card mt-4 grid grid-cols-4 divide-x divide-line py-5">
            {[
              { label: '热量', value: consumed, unit: 'kcal' },
              { label: '蛋白质', value: Math.round(nutrition.protein), unit: 'g' },
              { label: '碳水', value: Math.round(nutrition.carbs), unit: 'g' },
              { label: '脂肪', value: Math.round(nutrition.fat), unit: 'g' },
            ].map((item) => (
              <div key={item.label} className="px-1 text-center">
                <div className="text-[10px] text-muted">{item.label}</div>
                <div className="stat-number mt-1.5 text-[19px] leading-none">{item.value}</div>
                <div className="mt-1 text-[9px] text-muted">{item.unit}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
