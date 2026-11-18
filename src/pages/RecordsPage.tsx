import { useState } from 'react'
import { Camera, ChevronLeft, ChevronRight, Coffee, Cookie, Moon, Pencil, Sun, Trash2, Utensils } from 'lucide-react'
import type { MealRecord, MealType } from '@/types'
import TopBar from '@/components/TopBar'
import Photo from '@/components/Photo'
import EmptyState from '@/components/EmptyState'
import NutritionBars from '@/components/NutritionBars'
import { MEAL_LABELS, MEAL_ORDER } from '@/lib/constants'
import { formatDateLabel, formatTime, localDateKey, round, sumNutrition } from '@/lib/utils'
import { useStore } from '@/store'

interface Props {
  onStartAnalyze: (file: File | null) => void
}

const MEAL_ICONS: Record<MealType, typeof Coffee> = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Moon,
  snack: Cookie,
}

function shiftDate(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number)
  return localDateKey(new Date(y, m - 1, d + delta))
}

interface EditForm {
  title: string
  calories: number
  weight: number
}

export default function RecordsPage({ onStartAnalyze }: Props) {
  const { data, updateRecord, deleteRecord } = useStore()
  const [selectedDate, setSelectedDate] = useState(localDateKey())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ title: '', calories: 0, weight: 0 })
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const records = data.records
    .filter((record) => localDateKey(new Date(record.eatenAt)) === selectedDate)
    .sort((a, b) => b.eatenAt - a.eatenAt)
  const totalCalories = records.reduce((sum, record) => sum + record.calories, 0)
  const nutrition = sumNutrition(records.map((record) => record.nutrition))

  function startEdit(record: MealRecord) {
    setEditingId(record.id)
    setEditForm({
      title: record.title,
      calories: record.calories,
      weight: record.foods[0]?.weight_g ?? 0,
    })
  }

  function saveEdit(record: MealRecord) {
    const first = record.foods[0]
    let foods = record.foods
    if (first) {
      const ratio = first.weight_g > 0 ? editForm.weight / first.weight_g : 1
      const othersTotal = record.foods.slice(1).reduce((sum, food) => sum + food.calories, 0)
      foods = record.foods.map((food, index) =>
        index === 0
          ? {
              ...food,
              weight_g: round(editForm.weight),
              calories: Math.max(0, round(editForm.calories - othersTotal)),
              protein: round(food.protein * ratio, 1),
              carbs: round(food.carbs * ratio, 1),
              fat: round(food.fat * ratio, 1),
              fiber: round(food.fiber * ratio, 1),
            }
          : food,
      )
    }
    updateRecord(record.id, {
      title: editForm.title.trim() || record.title,
      calories: foods.length ? foods.reduce((sum, food) => sum + food.calories, 0) : Math.max(0, editForm.calories),
      nutrition: sumNutrition(foods),
      foods,
    })
    setEditingId(null)
    setConfirmDeleteId(null)
  }

  return (
    <>
      <TopBar title="饮食记录" subtitle="你的私人食物照片日记" />

      {/* 日期切换 */}
      <section className="px-5 pt-2">
        <div className="flex items-center justify-between border-y border-line py-3">
          <button
            type="button"
            onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
            aria-label="前一天"
            className="focus-ring press p-2 text-muted hover:text-ink"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <div className="font-serif text-[15px] font-semibold">{formatDateLabel(selectedDate)}</div>
            <div className="mt-0.5 text-[10px] text-muted">
              {selectedDate === localDateKey() ? '今天' : `${records.length} 条记录`}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}
            aria-label="后一天"
            disabled={selectedDate >= localDateKey()}
            className="focus-ring press p-2 text-muted hover:text-ink disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </section>

      {records.length === 0 ? (
        <EmptyState
          icon={<Utensils size={24} strokeWidth={1.4} />}
          title="这一天还没有记录"
          description="拍一张食物的照片，留下这一餐的热量与营养，以后可以随时回顾。"
          action={
            <button
              type="button"
              onClick={() => onStartAnalyze(null)}
              className="focus-ring press flex items-center gap-2 bg-sage px-6 py-3 text-xs font-medium text-white"
            >
              <Camera size={15} /> 记录第一餐
            </button>
          }
        />
      ) : (
        <>
          {/* 每日营养统计 */}
          <section className="px-5 pt-6">
            <div className="eyebrow">DAILY SUMMARY · 每日汇总</div>
            <div className="paper-card mt-4 px-5 py-5">
              <div className="flex items-end justify-between border-b border-line pb-4">
                <div>
                  <div className="text-[11px] text-muted">总摄入热量</div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="stat-number text-[38px] leading-none">{totalCalories}</span>
                    <span className="text-[11px] text-muted">kcal</span>
                  </div>
                </div>
                <div className="text-right text-[10px] leading-relaxed text-muted">
                  {records.length} 餐 · {data.profile.dailyCalorieTarget > 0
                    ? `目标 ${data.profile.dailyCalorieTarget} kcal`
                    : '未设置目标'}
                </div>
              </div>
              <div className="pt-5">
                <NutritionBars nutrition={nutrition} mode="daily" />
              </div>
            </div>
          </section>

          {/* 分时段照片日记 */}
          <div className="mx-5 my-8 h-px bg-line" />

          <section className="px-5 pb-14">
            <div className="eyebrow mb-4">MEAL JOURNAL · 分时段日记</div>
            <div className="space-y-8">
              {MEAL_ORDER.map((mealType) => {
                const Icon = MEAL_ICONS[mealType]
                const items = records.filter((record) => record.mealType === mealType)
                return (
                  <div key={mealType}>
                    <div className="flex items-center gap-2">
                      <Icon size={16} strokeWidth={1.5} className="text-sage" />
                      <span className="text-[13px] font-medium">{MEAL_LABELS[mealType]}</span>
                      <span className="text-[10px] text-muted">{items.length > 0 ? `${items.length} 条` : '—'}</span>
                    </div>

                    {items.length === 0 ? (
                      <p className="mt-3 border-l border-line pl-3 text-[11px] text-muted">未记录</p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {items.map((record) => (
                          <article key={record.id} className="paper-card overflow-hidden">
                            <div className="flex">
                              <div className="h-[96px] w-[96px] shrink-0 bg-sand">
                                <Photo src={record.photoDataUrl} alt={record.title} className="h-full w-full" label="餐食照片" />
                              </div>
                              <div className="min-w-0 flex-1 p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <h3 className="truncate text-[13px] font-medium leading-snug">{record.title}</h3>
                                    <p className="mt-1 text-[10px] text-muted">{formatTime(record.eatenAt)} · 记录</p>
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <div className="stat-number text-[18px] leading-none">{record.calories}</div>
                                    <div className="mt-0.5 text-[9px] text-muted">kcal</div>
                                  </div>
                                </div>
                                {editingId === record.id ? (
                                  <div className="mt-3 space-y-2 border-t border-line pt-3">
                                    <label className="block">
                                      <span className="text-[10px] text-muted">食物名称</span>
                                      <input
                                        value={editForm.title}
                                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                        className="mt-1 w-full border border-line bg-paper px-2 py-1.5 text-[11px] outline-none focus:border-sage"
                                      />
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                      <label className="block">
                                        <span className="text-[10px] text-muted">热量 kcal</span>
                                        <input
                                          type="number"
                                          min="0"
                                          value={editForm.calories}
                                          onChange={(e) => setEditForm({ ...editForm, calories: Math.max(0, Number(e.target.value)) })}
                                          className="mt-1 w-full border border-line bg-paper px-2 py-1.5 text-[11px] outline-none focus:border-sage"
                                        />
                                      </label>
                                      <label className="block">
                                        <span className="text-[10px] text-muted">主份重量 g</span>
                                        <input
                                          type="number"
                                          min="0"
                                          value={editForm.weight}
                                          onChange={(e) => setEditForm({ ...editForm, weight: Math.max(0, Number(e.target.value)) })}
                                          className="mt-1 w-full border border-line bg-paper px-2 py-1.5 text-[11px] outline-none focus:border-sage"
                                        />
                                      </label>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => saveEdit(record)}
                                        className="focus-ring press flex-1 bg-ink py-2 text-[11px] text-white"
                                      >
                                        保存修改
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingId(null)}
                                        className="focus-ring press border border-line px-3 py-2 text-[11px] text-muted"
                                      >
                                        取消
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mt-2 flex items-center gap-3">
                                    <button
                                      type="button"
                                      onClick={() => startEdit(record)}
                                      className="focus-ring press flex items-center gap-1 text-[10px] text-muted hover:text-ink"
                                    >
                                      <Pencil size={12} /> 修改
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        confirmDeleteId === record.id
                                          ? (deleteRecord(record.id), setConfirmDeleteId(null))
                                          : setConfirmDeleteId(record.id)
                                      }
                                      className={`focus-ring press flex items-center gap-1 text-[10px] ${
                                        confirmDeleteId === record.id ? 'text-[#A57B5E]' : 'text-muted hover:text-ink'
                                      }`}
                                    >
                                      <Trash2 size={12} />
                                      {confirmDeleteId === record.id ? '确认删除？' : '删除'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        </>
      )}
    </>
  )
}
