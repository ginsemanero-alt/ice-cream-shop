import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Product } from '@/types'
import { useCatalog } from './useCatalog'
import { useSettings } from './useSettings'

const KEY = 'icecream.cart.v1'
const MAX_QTY = 99

export interface CartLine {
  product: Product
  quantity: number
  /** max allowed given inventory tracking */
  max: number
  problem: string | null
  lineTotal: number
}

interface CartCtx {
  lines: CartLine[]
  count: number
  subtotal: number
  hasProblems: boolean
  open: boolean
  setOpen: (v: boolean) => void
  add: (productId: string, qty?: number) => string | null
  setQty: (productId: string, qty: number) => void
  remove: (productId: string) => void
  clear: () => void
}

const Ctx = createContext<CartCtx | null>(null)

// Only product ids and quantities are persisted. Names/prices always come from the database.
function load(): Record<string, number> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(raw)) if (typeof v === 'number' && v > 0) out[k] = Math.min(MAX_QTY, Math.floor(v))
    return out
  } catch {
    return {}
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { products, loading } = useCatalog()
  const { settings } = useSettings()
  const [raw, setRaw] = useState<Record<string, number>>(load)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(raw)) } catch { /* storage unavailable */ }
  }, [raw])

  const limitFor = useCallback((p: Product) => (settings.inventory_tracking ? Math.min(MAX_QTY, p.stock_quantity) : MAX_QTY), [settings.inventory_tracking])

  const lines = useMemo<CartLine[]>(() => {
    if (loading) return []
    const out: CartLine[] = []
    for (const [id, quantity] of Object.entries(raw)) {
      const product = products.find((p) => p.id === id)
      if (!product) continue // removed/archived products silently drop out
      const max = limitFor(product)
      let problem: string | null = null
      if (!product.is_available) problem = 'Currently unavailable'
      else if (settings.inventory_tracking && product.stock_quantity < 1) problem = 'Sold out'
      else if (quantity > max) problem = `Only ${max} left`
      out.push({ product, quantity, max, problem, lineTotal: product.price * quantity })
    }
    return out
  }, [raw, products, loading, limitFor, settings.inventory_tracking])

  const add = useCallback((productId: string, qty = 1) => {
    const p = products.find((x) => x.id === productId)
    if (!p) return 'Product not found.'
    if (!p.is_available) return 'This product is currently unavailable.'
    const max = limitFor(p)
    const current = raw[productId] ?? 0
    if (max < 1) return 'Sorry, this product is sold out.'
    const next = Math.min(max, current + qty)
    setRaw((r) => ({ ...r, [productId]: next }))
    return next < current + qty ? `Only ${max} available — cart updated to the maximum.` : null
  }, [products, raw, limitFor])

  const setQty = useCallback((id: string, qty: number) => {
    setRaw((r) => {
      const next = { ...r }
      if (qty <= 0) delete next[id]
      else next[id] = Math.min(MAX_QTY, Math.floor(qty))
      return next
    })
  }, [])

  const remove = useCallback((id: string) => setRaw((r) => { const n = { ...r }; delete n[id]; return n }), [])
  const clear = useCallback(() => setRaw({}), [])

  const value = useMemo<CartCtx>(() => {
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0)
    return {
      lines,
      count: lines.reduce((s, l) => s + l.quantity, 0),
      subtotal,
      hasProblems: lines.some((l) => l.problem),
      open, setOpen, add, setQty, remove, clear,
    }
  }, [lines, open, add, setQty, remove, clear])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCart() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useCart outside provider')
  return c
}
