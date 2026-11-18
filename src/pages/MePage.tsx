import { useEffect, useState } from 'react'
import { Check, Info, Lock, Save, Sparkles } from 'lucide-react'
import type { UserProfile } from '@/types'
import TopBar from '@/components/TopBar'
import { ACTIVITY_FACTORS, ACTIVITY_LABELS } from '@/lib/constants'
import { IS_DEMO_MODE } from '@/lib/ai'
import { round } from '@/lib/utils'
import { useStore } from '@/store'

/** Mifflin-St Jeor 公式；性别未填写时取男女常数平均值 */
function calcBmr(profile: UserProfile): number | null {
  const { weightKg, heightCm, age } = profile
  if (!weightKg || !heightCm || !age) return null
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  if (profile.gender === 'female') return base - 161
  if (profile.gender === 'male') return base + 5
  return base - 78
}

export default function MePage() {
  const { data, setProfile } = useStore()
  const [form, setForm] = useState<UserProfile>(data.profile)
  const [saved, setSaved] = useState(false)

  useEffect(() => setForm(data.profile), [data.profile])

  const bmr = calcBmr(form)
  const tdee = bmr ? round(bmr * (ACTIVITY_FACTORS[form.activityLevel] ?? 1.55)) : null
  const floor = form.gender === 'female' ? 1200 : 1500
  const gentleTarget = tdee ? Math.max(round(tdee * 0.9), floor) : null

  function save() {
    setProfile({ ...form, targetCustomized: form.dailyCalorieTarget > 0 })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  const inputClass =
    'mt-1.5 w-full border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-sage'

  return (
    <>
      <TopBar title="我的" subtitle="目标与身体数据" />

      <section className="px-5 pt-3">
        <div className="eyebrow">DAILY GOAL · 每日目标</div>
        <div className="paper-card mt-4 p-5">
          <label className="block">
            <span className="text-[12px] font-medium text-ink">每日热量目标 (kcal)</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={form.dailyCalorieTarget || ''}
              placeholder="例如 1800"
              onChange={(e) => setForm({ ...form, dailyCalorieTarget: Math.max(0, Number(e.target.value)) })}
              className="stat-number mt-2 w-full border-b border-line bg-transparent pb-2 text-[38px] leading-none outline-none placeholder:text-muted/50 focus:border-sage"
            />
          </label>
          <p className="mt-4 text-[11px] leading-relaxed text-muted">
            目标仅作参考，不鼓励极端节食。如暂时没有目标，可以留空，首页不会替你假设数值。
          </p>
        </div>
      </section>

      <hr className="hairline mx-5 mt-8" />

      {/* 身体数据 */}
      <section className="px-5 pt-7">
        <div className="eyebrow">BODY DATA · 可选填写</div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          只有你主动填写的数据才会被用来估算。留空时不会自行推断任何身体信息。
        </p>

        <div className="paper-card mt-4 space-y-5 p-5">
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[11px] text-muted">身高 (cm)</span>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={form.heightCm ?? ''}
                placeholder="—"
                onChange={(e) => setForm({ ...form, heightCm: Number(e.target.value) || undefined })}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-muted">体重 (kg)</span>
              <input
                type="number"
                min="0"
                inputMode="decimal"
                value={form.weightKg ?? ''}
                placeholder="—"
                onChange={(e) => setForm({ ...form, weightKg: Number(e.target.value) || undefined })}
                className={inputClass}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[11px] text-muted">年龄</span>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={form.age ?? ''}
                placeholder="—"
                onChange={(e) => setForm({ ...form, age: Number(e.target.value) || undefined })}
                className={inputClass}
              />
            </label>
            <div>
              <span className="text-[11px] text-muted">性别（可选）</span>
              <div className="mt-1.5 grid grid-cols-3 border border-line">
                {([
                  ['', '不填'],
                  ['male', '男'],
                  ['female', '女'],
                ] as Array<[UserProfile['gender'], string]>).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm({ ...form, gender: value })}
                    className={`focus-ring py-2.5 text-xs transition-colors ${
                      form.gender === value ? 'bg-sage text-white' : 'bg-paper text-ink-soft'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="block">
            <span className="text-[11px] text-muted">日常活动水平</span>
            <select
              value={form.activityLevel}
              onChange={(e) => setForm({ ...form, activityLevel: e.target.value as UserProfile['activityLevel'] })}
              className={inputClass}
            >
              {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={save}
            className="focus-ring press flex w-full items-center justify-center gap-2 bg-sage py-3 text-xs font-medium text-white"
          >
            {saved ? <><Check size={15} /> 已保存</> : <><Save size={15} /> 保存设置</>}
          </button>
        </div>
      </section>

      {/* 估算结果 */}
      <section className="px-5 pb-10 pt-8">
        <div className="eyebrow">ESTIMATE · 参考估算</div>
        {bmr && tdee && gentleTarget ? (
          <div className="paper-card mt-4 overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
              <div className="px-4 py-5">
                <div className="text-[10px] text-muted">基础代谢 BMR</div>
                <div className="stat-number mt-1.5 text-[24px]">{Math.round(bmr)}</div>
                <div className="mt-0.5 text-[9px] text-muted">kcal / 天</div>
              </div>
              <div className="px-4 py-5">
                <div className="text-[10px] text-muted">每日总消耗 TDEE</div>
                <div className="stat-number mt-1.5 text-[24px]">{tdee}</div>
                <div className="mt-0.5 text-[9px] text-muted">kcal / 天</div>
              </div>
            </div>
            <div className="px-4 py-5">
              <div className="flex items-baseline justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-sage">
                  <Sparkles size={14} /> 温和参考目标
                </div>
                <div className="stat-number text-[22px]">{gentleTarget}</div>
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-muted">
                按 TDEE 略作调整，且不低于 {floor} kcal。这是粗略估算，不能替代专业营养师建议。
              </p>
              <button
                type="button"
                onClick={() => {
                  setForm({ ...form, dailyCalorieTarget: gentleTarget })
                  setProfile({ ...form, dailyCalorieTarget: gentleTarget, targetCustomized: true })
                  setSaved(true)
                  window.setTimeout(() => setSaved(false), 1800)
                }}
                className="focus-ring press mt-4 w-full border border-sage py-2.5 text-xs font-medium text-sage"
              >
                采用为每日目标
              </button>
            </div>
          </div>
        ) : (
          <div className="paper-card mt-4 flex items-start gap-2.5 px-4 py-4 text-[11px] leading-relaxed text-muted">
            <Info size={15} className="mt-0.5 shrink-0 text-sage" />
            填写身高、体重、年龄后，这里会显示基础代谢与每日能量消耗的参考估算。
          </div>
        )}
      </section>

      <hr className="hairline mx-5" />

      <section className="px-5 pb-14 pt-7">
        <div className="eyebrow">ABOUT · 关于</div>
        <div className="mt-4 space-y-3 text-[11px] leading-relaxed text-muted">
          <p className="flex items-start gap-2">
            <Lock size={13} className="mt-0.5 shrink-0" />
            所有照片与记录只保存在这台设备的浏览器里，无需注册登录。
          </p>
          <p className="flex items-start gap-2">
            <Info size={13} className="mt-0.5 shrink-0" />
            {IS_DEMO_MODE
              ? '当前为演示模式：识别结果来自内置样例，热量与营养均为示例估算。'
              : '当前已接入识别接口；结果仍为估算值，请结合自己的判断核对。'}
          </p>
          <p>FOOD NOTE / 食物研究所 · 看见食物，了解热量。</p>
        </div>
      </section>
    </>
  )
}
