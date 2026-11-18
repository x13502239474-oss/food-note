import { useEffect, useState } from 'react'
import { Check, Eye, EyeOff, Info, Loader2, Lock, Save, Sparkles, Trash2, Wifi } from 'lucide-react'
import type { AiConfig, UserProfile } from '@/types'
import TopBar from '@/components/TopBar'
import { ACTIVITY_FACTORS, ACTIVITY_LABELS } from '@/lib/constants'
import { isDemoMode } from '@/lib/ai'
import { testAiConnection } from '@/lib/ai/realApi'
import {
  DEFAULT_AI_CONFIG,
  PROVIDER_PRESETS,
  configFromPreset,
  hasAiConfig,
} from '@/lib/ai/config'
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
  const { data, setProfile, setAiConfig } = useStore()
  const [form, setForm] = useState<UserProfile>(data.profile)
  const [saved, setSaved] = useState(false)
  const [aiForm, setAiForm] = useState<AiConfig>(data.aiConfig)
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => setForm(data.profile), [data.profile])
  useEffect(() => setAiForm(data.aiConfig), [data.aiConfig])

  const demoMode = isDemoMode(data.aiConfig)

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
      <TopBar title="我的" subtitle="目标与 AI 识别设置" />

      {/* AI 识别配置 */}
      <section className="px-5 pt-3">
        <div className="flex items-center justify-between">
          <div className="eyebrow">AI VISION · 图像识别</div>
          <span
            className={`border px-2 py-1 text-[10px] tracking-wide ${
              demoMode ? 'border-line bg-sand text-[#8A6647]' : 'border-sage bg-mist text-sage'
            }`}
          >
            {demoMode ? '演示模式' : '真实识别'}
          </span>
        </div>

        <div className="paper-card mt-4 p-5">
          <p className="text-[13px] font-medium leading-relaxed text-ink">
            接入视觉大模型后，拍照识别会真正看懂照片内容。
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
            API Key 只保存在这台设备的浏览器里，不会上传到任何服务器，也不会写进网站代码。
            你需要自己去服务商申请一个 Key（多数有免费额度）。
          </p>

          <label className="mt-5 block">
            <span className="text-[11px] font-medium text-ink">服务商预设</span>
            <select
              value={aiForm.provider}
              onChange={(e) => {
                const preset = PROVIDER_PRESETS.find((p) => p.id === e.target.value)
                if (preset) setAiForm(configFromPreset(preset, aiForm.apiKey))
              }}
              className={inputClass}
            >
              {PROVIDER_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>

          {(() => {
            const preset = PROVIDER_PRESETS.find((p) => p.id === aiForm.provider)
            return preset ? (
              <div className="mt-2 space-y-1.5 text-[10px] leading-relaxed text-muted">
                <p>{preset.hint}</p>
                {preset.keyUrl && (
                  <a
                    href={preset.keyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-sage underline underline-offset-2"
                  >
                    前往申请 API Key ↗
                  </a>
                )}
              </div>
            ) : null
          })()}

          <label className="mt-4 block">
            <span className="text-[11px] font-medium text-ink">API Key</span>
            <div className="relative mt-1.5">
              <input
                type={showKey ? 'text' : 'password'}
                autoComplete="off"
                spellCheck={false}
                value={aiForm.apiKey}
                placeholder="粘贴你的密钥"
                onChange={(e) => {
                  setAiForm({ ...aiForm, apiKey: e.target.value, provider: 'custom' })
                  setTestResult(null)
                }}
                className={`${inputClass} mt-0 pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                aria-label={showKey ? '隐藏密钥' : '显示密钥'}
                className="absolute right-0 top-0 flex h-full w-11 items-center justify-center text-muted"
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </label>

          <div className="mt-4 grid grid-cols-1 gap-4">
            <label className="block">
              <span className="text-[11px] text-muted">接口地址 Base URL</span>
              <input
                type="url"
                inputMode="url"
                spellCheck={false}
                value={aiForm.baseUrl}
                placeholder="https://.../v1"
                onChange={(e) => {
                  setAiForm({ ...aiForm, baseUrl: e.target.value, provider: 'custom' })
                  setTestResult(null)
                }}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-muted">视觉模型名</span>
              <input
                type="text"
                spellCheck={false}
                value={aiForm.model}
                placeholder="例如 qwen-vl-max-latest"
                onChange={(e) => {
                  setAiForm({ ...aiForm, model: e.target.value, provider: 'custom' })
                  setTestResult(null)
                }}
                className={inputClass}
              />
            </label>
          </div>

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              disabled={!hasAiConfig(aiForm) || testing}
              onClick={() => {
                setAiConfig(aiForm)
                setSaved(true)
                window.setTimeout(() => setSaved(false), 1800)
              }}
              className="focus-ring press flex flex-1 items-center justify-center gap-2 bg-sage py-3 text-xs font-medium text-white disabled:opacity-40"
            >
              {saved ? <><Check size={15} /> 已保存</> : <><Save size={15} /> 保存配置</>}
            </button>
            <button
              type="button"
              disabled={!hasAiConfig(aiForm) || testing}
              onClick={async () => {
                setTesting(true)
                setTestResult(null)
                try {
                  await testAiConnection(aiForm)
                  setTestResult({ ok: true, message: '连接成功，密钥与地址可用。' })
                } catch (error) {
                  setTestResult({
                    ok: false,
                    message: error instanceof Error ? error.message : '连接失败，请检查配置。',
                  })
                } finally {
                  setTesting(false)
                }
              }}
              className="focus-ring press flex items-center justify-center gap-2 border border-sage px-4 py-3 text-xs font-medium text-sage disabled:opacity-40"
            >
              {testing ? <Loader2 size={15} className="animate-spin" /> : <Wifi size={15} />}
              测试
            </button>
          </div>

          {testResult && (
            <p
              className={`mt-3 text-[11px] leading-relaxed ${
                testResult.ok ? 'text-sage' : 'text-[#A6503F]'
              }`}
            >
              {testResult.message}
            </p>
          )}

          {!demoMode && (
            <button
              type="button"
              onClick={() => {
                setAiConfig(DEFAULT_AI_CONFIG)
                setTestResult(null)
              }}
              className="focus-ring press mt-4 flex items-center gap-1.5 text-[11px] text-muted underline underline-offset-2"
            >
              <Trash2 size={12} /> 清除配置，回到演示模式
            </button>
          )}
        </div>
      </section>

      <hr className="hairline mx-5 mt-8" />

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
            {demoMode
              ? '当前为演示模式：识别结果来自内置样例，热量与营养均为示例估算。'
              : '当前已接入视觉模型；照片会发送给你配置的服务商，结果仍为估算值，请结合自己的判断核对。'}
          </p>
          <p>FOOD NOTE / 食物研究所 · 看见食物，了解热量。</p>
        </div>
      </section>
    </>
  )
}
