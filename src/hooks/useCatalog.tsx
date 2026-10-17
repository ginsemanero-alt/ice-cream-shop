import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Product } from '@/types'
import { fetchProducts } from '@/lib/api'
import { isBackendConfigured } from '@/lib/supabase'
import { errMsg } from '@/lib/format'

interface CatalogCtx {
  products: Product[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

const Ctx = createContext<CatalogCtx | null>(null)

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(isBackendConfigured)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!isBackendConfigured) return
    try {
      setProducts(await fetchProducts())
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

  return <Ctx.Provider value={{ products, loading, error, reload }}>{children}</Ctx.Provider>
}

export function useCatalog() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useCatalog outside provider')
  return c
}
