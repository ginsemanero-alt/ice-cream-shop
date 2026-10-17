import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { StoreSettings } from '@/types'
import { DEFAULT_SETTINGS, FALLBACK_NAME } from '@/lib/defaults'
import { fetchSettings } from '@/lib/api'
import { isBackendConfigured } from '@/lib/supabase'
import { errMsg } from '@/lib/format'

interface SettingsCtx {
  settings: StoreSettings
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  name: string
}

const Ctx = createContext<SettingsCtx | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(isBackendConfigured)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!isBackendConfigured) return
    try {
      setSettings(await fetchSettings())
      setError(null)
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const name = settings.business_name.trim() || FALLBACK_NAME
  useEffect(() => {
    document.title = settings.business_name.trim() || FALLBACK_NAME
  }, [settings.business_name])

  return <Ctx.Provider value={{ settings, loading, error, reload, name }}>{children}</Ctx.Provider>
}

export function useSettings() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useSettings outside provider')
  return c
}
