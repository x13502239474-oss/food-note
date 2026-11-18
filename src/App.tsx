import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { StoreProvider, useStore } from '@/store'
import BottomNav, { type Tab } from '@/components/BottomNav'
import HomePage from '@/pages/HomePage'
import RecordsPage from '@/pages/RecordsPage'
import MePage from '@/pages/MePage'
import AnalyzePage from '@/pages/AnalyzePage'

function Shell() {
  const [tab, setTab] = useState<Tab>('home')
  const [showAnalyze, setShowAnalyze] = useState(false)
  const [initialFile, setInitialFile] = useState<File | null>(null)
  const { storageWarning } = useStore()

  function openAnalyze(file: File | null = null) {
    setInitialFile(file)
    setShowAnalyze(true)
    window.scrollTo({ top: 0 })
  }

  function finishAnalyze() {
    setShowAnalyze(false)
    setInitialFile(null)
    setTab('home')
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="relative mx-auto min-h-screen w-full max-w-phone bg-canvas shadow-[0_0_60px_rgba(41,45,39,0.06)]">
      {storageWarning && (
        <div className="fixed left-1/2 top-3 z-50 flex w-[calc(100%-32px)] max-w-[448px] -translate-x-1/2 items-center gap-2 border border-[#E4D5C6] bg-[#FBF2E8] px-4 py-2.5 text-xs text-[#8A6647]">
          <AlertCircle size={15} strokeWidth={1.8} />
          本地存储空间不足，最新记录可能无法保存。请删除部分带照片的旧记录。
        </div>
      )}

      {showAnalyze ? (
        <AnalyzePage initialFile={initialFile} onClose={() => setShowAnalyze(false)} onSaved={finishAnalyze} />
      ) : (
        <>
          <main className="pb-24">
            {tab === 'home' && (
              <HomePage onStartAnalyze={openAnalyze} onGoSettings={() => setTab('me')} />
            )}
            {tab === 'records' && <RecordsPage onStartAnalyze={openAnalyze} />}
            {tab === 'me' && <MePage />}
          </main>
          <BottomNav active={tab} onChange={setTab} />
        </>
      )}
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
