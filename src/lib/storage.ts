import type { AppData, MealRecord, UserProfile } from '@/types'
import { isToday } from '@/lib/utils'

const KEY = 'food-note:v1'

export const DEFAULT_PROFILE: UserProfile = {
  dailyCalorieTarget: 0,
  targetCustomized: false,
  gender: '',
  activityLevel: 'moderate',
}

const DEFAULT_DATA: AppData = {
  records: [],
  profile: DEFAULT_PROFILE,
}

function safeParse(raw: string | null): AppData {
  if (!raw) return DEFAULT_DATA
  try {
    const parsed = JSON.parse(raw) as Partial<AppData>
    return {
      records: Array.isArray(parsed.records) ? parsed.records : [],
      profile: { ...DEFAULT_PROFILE, ...(parsed.profile ?? {}) },
    }
  } catch {
    return DEFAULT_DATA
  }
}

export function loadData(): AppData {
  try {
    return safeParse(localStorage.getItem(KEY))
  } catch {
    return DEFAULT_DATA
  }
}

export function saveData(data: AppData): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
    return true
  } catch {
    // 通常是容量超限（照片过多）。返回值让调用方给出提示。
    return false
  }
}

export function todayRecords(records: MealRecord[]): MealRecord[] {
  return records.filter((r) => isToday(r.eatenAt))
}
