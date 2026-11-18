import type { MealType } from '@/types'

/** 本地时区的 YYYY-MM-DD，避免 toISOString 的 UTC 偏移导致跨日错误 */
export function localDateKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isToday(timestamp: number): boolean {
  return localDateKey(new Date(timestamp)) === localDateKey()
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function formatDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const w = new Date(y, m - 1, d).getDay()
  return `${m}月${d}日 · ${week[w]}`
}

export function defaultMealType(): MealType {
  const h = new Date().getHours()
  if (h < 10) return 'breakfast'
  if (h < 15) return 'lunch'
  if (h < 21) return 'dinner'
  return 'snack'
}

/** 压缩图片为 dataURL，避免 LocalStorage 超限；同时统一为 JPEG 以缩小体积 */
export function compressImage(file: File, maxEdge = 1200, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('读取图片失败'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('图片解析失败，请换一张图片'))
      img.onload = () => {
        let { width, height } = img
        if (width > maxEdge || height > maxEdge) {
          const scale = maxEdge / Math.max(width, height)
          width = Math.round(width * scale)
          height = Math.round(height * scale)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('浏览器不支持图片处理'))
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

export function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function round(n: number, digits = 0): number {
  const factor = 10 ** digits
  return Math.round(n * factor) / factor
}

export function sumNutrition(list: Array<{ protein: number; carbs: number; fat: number; fiber: number }>) {
  return list.reduce(
    (acc, item) => ({
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
      fiber: acc.fiber + item.fiber,
    }),
    { protein: 0, carbs: 0, fat: 0, fiber: 0 },
  )
}
