import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import {
  AlertTriangle, ArrowLeft, Camera, Check, ChevronRight, Images, Info,
  Loader2, Pencil, Plus, Trash2, X,
} from 'lucide-react'
import type { AnalysisResult, Confidence, FoodItem, MealType, PortionScale } from '@/types'
import { isDemoMode, analyzeFood } from '@/lib/ai'
import { applyPortion } from '@/lib/ai/portion'
import { MEAL_LABELS, PORTION_LABELS } from '@/lib/constants'
import { compressImage, defaultMealType, round, sumNutrition, uid } from '@/lib/utils'
import { useStore } from '@/store'
import Photo from '@/components/Photo'
import NutritionBars from '@/components/NutritionBars'

type Stage = 'upload' | 'preview' | 'loading' | 'result'

interface Props {
  initialFile: File | null
  onClose: () => void
  onSaved: () => void
}

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
const PORTIONS: PortionScale[] = ['small', 'normal', 'large']

const CONFIDENCE_TEXT: Record<Confidence, string> = {
  high: '把握较高',
  medium: '中等把握',
  low: '把握较低 · 建议核对',
}

export default function AnalyzePage({ initialFile, onClose, onSaved }: Props) {
  const { addRecord } = useStore()
  const demoMode = isDemoMode()
  const [stage, setStage] = useState<Stage>(initialFile ? 'preview' : 'upload')
  const [photo, setPhoto] = useState<string | undefined>()
  const [fileName, setFileName] = useState('')
  const [mealType, setMealType] = useState<MealType>(defaultMealType())
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [saved, setSaved] = useState(false)
  const initialized = useRef(false)

  // 首页传入的文件在这里压缩为 dataURL（压缩后可存入本地）
  useEffect(() => {
    if (!initialFile || initialized.current) return
    initialized.current = true
    setError('')
    compressImage(initialFile)
      .then((url) => {
        setPhoto(url)
        setFileName(initialFile.name)
        setStage('preview')
      })
      .catch((err: Error) => {
        setError(err.message)
        setStage('upload')
      })
  }, [initialFile])

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError('请选择 JPG、PNG 或 WEBP 格式的图片')
      return
    }
    setError('')
    setStage('loading')
    compressImage(file)
      .then((url) => {
        setPhoto(url)
        setFileName(file.name)
        setStage('preview')
      })
      .catch((err: Error) => {
        setError(err.message)
        setStage('upload')
      })
  }

  async function runAnalysis() {
    if (!photo) return
    setError('')
    setStage('loading')
    try {
      const data = await analyzeFood(photo, mealType, fileName)
      setResult(data)
      setStage('result')
      window.scrollTo({ top: 0 })
    } catch (err) {
      setError(err instanceof Error ? err.message : '识别失败，请重试')
      setStage('preview')
    }
  }

  function changePortion(scale: PortionScale) {
    setResult((prev) => (prev ? applyPortion(prev, scale) : prev))
  }

  function updateFood(index: number, patch: Partial<FoodItem>) {
    setResult((prev) => {
      if (!prev) return prev
      const foods = prev.foods.map((food, i) => (i === index ? { ...food, ...patch } : food))
      return {
        ...prev,
        foods,
        total_calories: foods.reduce((sum, food) => sum + food.calories, 0),
        nutrition: sumNutrition(foods),
      }
    })
  }

  /** 修改重量时按比例联动热量与营养，保持数据逻辑一致 */
  function updateWeight(index: number, weight: number) {
    setResult((prev) => {
      if (!prev) return prev
      const old = prev.foods[index]
      if (!old || old.weight_g <= 0) return prev
      const ratio = weight / old.weight_g
      const foods = prev.foods.map((food, i) =>
        i === index
          ? {
              ...food,
              weight_g: round(weight),
              calories: round(food.calories * ratio),
              protein: round(food.protein * ratio, 1),
              carbs: round(food.carbs * ratio, 1),
              fat: round(food.fat * ratio, 1),
              fiber: round(food.fiber * ratio, 1),
            }
          : food,
      )
      return {
        ...prev,
        foods,
        total_calories: foods.reduce((sum, food) => sum + food.calories, 0),
        nutrition: sumNutrition(foods),
      }
    })
  }

  function saveMeal() {
    if (!result) return
    addRecord({
      id: uid(),
      mealType: result.mealType,
      title: result.foods.map((food) => food.name).join(' · '),
      calories: result.total_calories,
      nutrition: result.nutrition,
      photoDataUrl: result.photoDataUrl,
      eatenAt: Date.now(),
      foods: result.foods,
    })
    setSaved(true)
    window.setTimeout(onSaved, 650)
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-5 pb-4 pt-6">
        <button
          type="button"
          onClick={stage === 'result' ? () => setStage('preview') : onClose}
          className="focus-ring press -ml-2 flex items-center gap-1 px-2 py-1 text-xs text-ink-soft"
        >
          <ArrowLeft size={17} strokeWidth={1.6} />
          返回
        </button>
        <span className="font-serif text-[15px] font-semibold">食物分析</span>
        <span
          className={`border px-2 py-1 text-[10px] tracking-wide ${
            demoMode ? 'border-line bg-sand text-[#8A6647]' : 'border-sage text-sage'
          }`}
        >
          {demoMode ? '演示模式' : 'AI 识别'}
        </span>
      </header>

      {error && (
        <div className="mx-5 mb-4 flex items-start gap-2 border border-[#E4D5C6] bg-[#FBF2E8] px-3 py-2.5 text-xs leading-relaxed text-[#8A6647]">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError('')} aria-label="关闭提示">
            <X size={14} />
          </button>
        </div>
      )}

      {/* 阶段 1：上传 */}
      {stage === 'upload' && (
        <section className="px-5 pt-6">
          <div className="eyebrow">STEP 01 · 上传照片</div>
          <h2 className="magazine-title mt-3 text-[28px] leading-tight">这顿吃了什么？</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            拍一张照片，或使用相册里的照片。尽量让食物占满画面。
          </p>

          <label className="focus-ring press mt-7 flex cursor-pointer flex-col items-center justify-center border border-dashed border-sage bg-paper/60 px-6 py-14 text-center">
            <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
            <Camera size={30} strokeWidth={1.3} className="text-sage" />
            <span className="mt-4 text-sm font-medium text-ink">点击拍照</span>
            <span className="mt-1.5 text-[11px] text-muted">手机端将优先调用摄像头</span>
          </label>

          <label className="focus-ring press mt-3 flex cursor-pointer items-center justify-center gap-2 border border-line bg-paper py-3.5 text-xs font-medium text-ink-soft">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFile}
              className="hidden"
            />
            <Images size={16} strokeWidth={1.6} />
            从相册上传 JPG / PNG / WEBP
          </label>

          {demoMode && (
            <div className="mt-8 flex gap-2 border-l-2 border-sage bg-sage-soft/50 px-3 py-3 text-[11px] leading-relaxed text-ink-soft">
              <Info size={14} className="mt-0.5 shrink-0 text-sage" />
              <span>
                当前为演示模式：识别结果来自内置样例，用于体验完整流程，不代表对照片的真实识别。
              </span>
            </div>
          )}
        </section>
      )}

      {/* 阶段 2：预览与确认 */}
      {stage === 'preview' && photo && (
        <section className="px-5 pt-6">
          <div className="eyebrow">STEP 02 · 确认照片</div>
          <h2 className="magazine-title mt-3 text-[26px] leading-tight">这张照片可以吗？</h2>

          <div className="mt-5 overflow-hidden border border-line bg-sand">
            <Photo src={photo} alt="待分析的食物照片" className="h-[280px] w-full" label="食物照片" />
          </div>

          <div className="mt-6">
            <div className="eyebrow mb-3">这是哪一餐？</div>
            <div className="grid grid-cols-4 border border-line bg-paper">
              {MEAL_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMealType(type)}
                  className={`focus-ring py-3 text-xs transition-colors ${
                    mealType === type ? 'bg-sage text-white' : 'text-ink-soft hover:bg-sage-soft'
                  }`}
                >
                  {MEAL_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <label className="focus-ring press flex cursor-pointer items-center justify-center gap-2 border border-line bg-paper py-3 text-xs text-ink-soft">
              <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
              <Camera size={15} /> 重新拍照
            </label>
            <label className="focus-ring press flex cursor-pointer items-center justify-center gap-2 border border-line bg-paper py-3 text-xs text-ink-soft">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFile}
                className="hidden"
              />
              <Images size={15} /> 重新选择
            </label>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setPhoto(undefined)
                setStage('upload')
              }}
              className="focus-ring press flex items-center gap-1.5 py-2 text-xs text-muted"
            >
              <Trash2 size={14} /> 删除照片
            </button>
            <button
              type="button"
              onClick={runAnalysis}
              className="focus-ring press flex items-center gap-2 bg-sage px-7 py-3 text-sm font-medium text-white"
            >
              确认分析 <ChevronRight size={16} />
            </button>
          </div>
        </section>
      )}

      {/* 阶段 3：加载 */}
      {stage === 'loading' && (
        <section className="flex min-h-[70vh] flex-col items-center justify-center px-8 text-center">
          {photo ? (
            <div className="mb-8 h-28 w-28 overflow-hidden border border-line bg-sand">
              <Photo src={photo} alt="正在分析的照片" className="h-full w-full" />
            </div>
          ) : null}
          <Loader2 size={26} className="animate-spin text-sage" strokeWidth={1.5} />
          <h2 className="magazine-title mt-5 text-[22px]">AI 正在看这张照片…</h2>
          <p className="mt-2 max-w-[250px] text-xs leading-relaxed text-muted">
            正在分辨食物、估算份量，并汇总热量与营养。
          </p>
          <div className="mt-6 flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1 w-8 bg-sage/30"
                style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite alternate` }}
              />
            ))}
          </div>
          {demoMode && (
            <p className="mt-8 text-[10px] text-muted">演示模式 · 正在生成示例分析结果</p>
          )}
        </section>
      )}

      {/* 阶段 4：结果 */}
      {stage === 'result' && result && (
        <section className="px-5 pb-16 pt-5">
          <div className="flex items-center justify-between">
            <div className="eyebrow">ANALYSIS · 分析结果</div>
            <span className="text-[10px] text-muted">{CONFIDENCE_TEXT[result.confidence]}</span>
          </div>

          <div className="mt-4 flex items-center gap-4 border-b border-line pb-5">
            <div className="h-[76px] w-[76px] shrink-0 overflow-hidden border border-line bg-sand">
              <Photo src={result.photoDataUrl} alt="本餐照片" className="h-full w-full" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] tracking-wide text-muted">{result.meal_name}</div>
              <h2 className="magazine-title mt-1 truncate text-[20px]">{result.meal_name === '加餐' ? '加餐记录' : result.foods[0]?.name ?? '这一餐'}</h2>
              <p className="mt-1 text-[11px] text-muted">
                {result.foods.length} 种食物 · 点击明细可修正
              </p>
            </div>
          </div>

          {/* 总热量 */}
          <div className="border-b border-line py-7 text-center">
            <div className="stat-number text-[58px] leading-none text-ink">{result.total_calories}</div>
            <div className="mt-2 text-xs tracking-[0.1em] text-muted">kcal · 本餐预计摄入热量</div>
            <div className="mt-4 inline-flex items-center gap-1.5 bg-sage-soft px-3 py-1.5 text-xs text-ink-soft">
              约 {result.calorie_range.min} – {result.calorie_range.max} kcal
            </div>
            <p className="mx-auto mt-3 max-w-[280px] text-[10px] leading-relaxed text-muted">
              基于照片的估算值，不是精确测量结果。
            </p>
          </div>

          {/* 份量重算 —— 需求中特别强调的轻量交互 */}
          <div className="border-b border-line py-6">
            <div className="flex items-center justify-between">
              <div className="eyebrow">份量校正</div>
              <span className="text-[10px] text-muted">看照片吃不准？选一个</span>
            </div>
            <div className="mt-3 grid grid-cols-3 border border-line bg-paper">
              {PORTIONS.map((scale) => (
                <button
                  key={scale}
                  type="button"
                  onClick={() => changePortion(scale)}
                  className={`focus-ring flex items-center justify-center gap-1.5 py-3 text-xs transition-colors ${
                    result.portionScale === scale
                      ? 'bg-sage font-medium text-white'
                      : 'text-ink-soft hover:bg-sage-soft'
                  }`}
                >
                  {result.portionScale === scale && <Check size={13} strokeWidth={2} />}
                  {PORTION_LABELS[scale]}
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-[10px] leading-relaxed text-muted">
              按所选份量等比换算重量、热量与营养；换算后明细会自动重新求和。
            </p>
          </div>

          {/* 食物明细 */}
          <div className="border-b border-line py-6">
            <div className="flex items-baseline justify-between">
              <div className="eyebrow">食物明细</div>
              <span className="text-[10px] text-muted">明细合计 = 本餐总热量</span>
            </div>
            <div className="mt-4 divide-y divide-line border-y border-line">
              {result.foods.map((food, index) => (
                <div key={`${food.name}-${index}`} className="py-3.5">
                  {editingIndex === index ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-sage">修正第 {index + 1} 项</span>
                        <button
                          type="button"
                          onClick={() => setEditingIndex(null)}
                          className="focus-ring text-muted"
                          aria-label="收起编辑"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <label className="block">
                        <span className="text-[10px] text-muted">食物名称</span>
                        <input
                          value={food.name}
                          onChange={(e) => updateFood(index, { name: e.target.value })}
                          className="mt-1 w-full border border-line bg-paper px-2.5 py-2 text-xs outline-none focus:border-sage"
                        />
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className="text-[10px] text-muted">重量 (g) · 联动营养</span>
                          <input
                            type="number"
                            min="0"
                            value={food.weight_g}
                            onChange={(e) => updateWeight(index, Math.max(0, Number(e.target.value)))}
                            className="mt-1 w-full border border-line bg-paper px-2.5 py-2 text-xs outline-none focus:border-sage"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[10px] text-muted">热量 (kcal)</span>
                          <input
                            type="number"
                            min="0"
                            value={food.calories}
                            onChange={(e) => updateFood(index, { calories: Math.max(0, Number(e.target.value)) })}
                            className="mt-1 w-full border border-line bg-paper px-2.5 py-2 text-xs outline-none focus:border-sage"
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingIndex(null)}
                        className="focus-ring press w-full bg-ink py-2 text-xs text-white"
                      >
                        完成修正
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-ink">{food.name}</span>
                          <span className="bg-sage-soft px-1.5 py-0.5 text-[9px] text-sage">{food.category}</span>
                        </div>
                        <p className="mt-1 text-[10px] leading-relaxed text-muted">{food.basis}</p>
                        {food.uncertainty && food.uncertainty !== '—' && (
                          <p className="mt-0.5 text-[10px] leading-relaxed text-[#A57B5E]">
                            · {food.uncertainty}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[11px] text-muted">{food.weight_g}g</div>
                        <div className="stat-number mt-0.5 text-[16px]">{food.calories}</div>
                        <div className="text-[9px] text-muted">kcal</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingIndex(index)}
                        aria-label={`修正${food.name}`}
                        className="focus-ring press mt-1 shrink-0 text-muted hover:text-ink"
                      >
                        <Pencil size={14} strokeWidth={1.6} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between text-[11px]">
              <span className="text-muted">合计</span>
              <span className="font-medium text-ink">
                {result.foods.reduce((sum, food) => sum + food.weight_g, 0)}g · {result.total_calories} kcal
              </span>
            </div>
          </div>

          {/* 营养构成 */}
          <div className="border-b border-line py-6">
            <div className="eyebrow">营养成分</div>
            <div className="mt-5">
              <NutritionBars nutrition={result.nutrition} mode="meal" />
            </div>
          </div>

          {/* AI 建议 */}
          <div className="border-b border-line py-6">
            <div className="eyebrow">AI 饮食建议</div>
            <ul className="mt-4 space-y-3">
              {result.suggestions.map((suggestion, index) => (
                <li key={index} className="flex gap-3 text-xs leading-relaxed text-ink-soft">
                  <span className="stat-number shrink-0 text-sage">0{index + 1}</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 不确定性 */}
          <div className="py-6">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-[#A57B5E]" />
              <span className="eyebrow">关于估算的不确定性</span>
            </div>
            <ul className="mt-3 space-y-2">
              {result.notes.map((note, index) => (
                <li key={index} className="text-[11px] leading-relaxed text-muted">· {note}</li>
              ))}
            </ul>
          </div>

          <div className="sticky bottom-0 -mx-5 border-t border-line bg-canvas/95 px-5 py-4 backdrop-blur">
            <button
              type="button"
              onClick={saveMeal}
              disabled={saved}
              className="focus-ring press flex w-full items-center justify-center gap-2 bg-sage py-4 text-sm font-medium text-white disabled:opacity-70"
            >
              {saved ? <><Check size={17} /> 已加入今日饮食</> : <><Plus size={17} /> 加入今日饮食</>}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
