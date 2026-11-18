import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AiConfig, AppData, MealRecord, UserProfile } from '@/types'
import { loadData, saveData } from '@/lib/storage'

interface StoreValue {
  data: AppData
  setProfile: (patch: Partial<UserProfile>) => void
  setAiConfig: (patch: Partial<AiConfig>) => void
  addRecord: (record: MealRecord) => void
  updateRecord: (id: string, patch: Partial<MealRecord>) => void
  deleteRecord: (id: string) => void
  storageWarning: boolean
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData())
  const [storageWarning, setStorageWarning] = useState(false)

  // 所有变更统一在这里持久化，避免在 setState 更新函数内产生副作用
  useEffect(() => {
    setStorageWarning(!saveData(data))
  }, [data])

  const setProfile = useCallback((patch: Partial<UserProfile>) => {
    setData((prev) => ({ ...prev, profile: { ...prev.profile, ...patch } }))
  }, [])

  const setAiConfig = useCallback((patch: Partial<AiConfig>) => {
    setData((prev) => ({ ...prev, aiConfig: { ...prev.aiConfig, ...patch } }))
  }, [])

  const addRecord = useCallback((record: MealRecord) => {
    setData((prev) => ({ ...prev, records: [record, ...prev.records] }))
  }, [])

  const updateRecord = useCallback((id: string, patch: Partial<MealRecord>) => {
    setData((prev) => ({
      ...prev,
      records: prev.records.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }))
  }, [])

  const deleteRecord = useCallback((id: string) => {
    setData((prev) => ({ ...prev, records: prev.records.filter((r) => r.id !== id) }))
  }, [])

  const value = useMemo(
    () => ({ data, setProfile, setAiConfig, addRecord, updateRecord, deleteRecord, storageWarning }),
    [data, setProfile, setAiConfig, addRecord, updateRecord, deleteRecord, storageWarning],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore 必须在 StoreProvider 内使用')
  return ctx
}
