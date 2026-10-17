import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, XCircle } from 'lucide-react'

type Kind = 'success' | 'error' | 'info'
interface Toast { id: number; kind: Kind; message: string }

const Ctx = createContext<{ toast: (message: string, kind?: Kind) => void }>({ toast: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])

  const toast = useCallback((message: string, kind: Kind = 'success') => {
    const id = Date.now() + Math.random()
    setItems((t) => [...t, { id, kind, message }])
    setTimeout(() => setItems((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 6000 : 3500)
  }, [])

  const Icon = { success: CheckCircle2, error: XCircle, info: Info }
  const color = { success: 'bg-mint-700', error: 'bg-berry-600', info: 'bg-choco-700' }

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => {
            const I = Icon[t.kind]
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10 }}
                className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-full px-5 py-3 text-sm font-bold text-white shadow-soft ${color[t.kind]}`}
              >
                <I size={18} aria-hidden /> {t.message}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
