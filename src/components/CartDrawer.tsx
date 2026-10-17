import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ShoppingBag, Trash2, X } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { useSettings } from '@/hooks/useSettings'
import { useCatalog } from '@/hooks/useCatalog'
import { money } from '@/lib/format'
import { EmptyState, QuantityStepper } from './ui'

export function CartDrawer() {
  const { open, setOpen, lines, subtotal, setQty, remove, hasProblems } = useCart()
  const { settings } = useSettings()
  const { reload } = useCatalog()
  const nav = useNavigate()
  const sym = settings.currency_symbol

  useEffect(() => {
    if (!open) return
    void reload() // refresh prices and stock whenever the cart opens
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, setOpen, reload])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70]">
          <motion.div className="absolute inset-0 bg-choco-900/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
          <motion.aside
            role="dialog" aria-modal="true" aria-label="Shopping cart"
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col rounded-l-[2.5rem] bg-cream-50 shadow-soft"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="flex items-center justify-between p-6 pb-3">
              <h2 className="flex items-center gap-2 text-2xl"><ShoppingBag aria-hidden /> Your cart</h2>
              <button onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-cream-200 hover:bg-berry-100" aria-label="Close cart"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6">
              {lines.length === 0 ? (
                <div className="py-8"><EmptyState title="Your cart is empty">Add something from the products page.</EmptyState></div>
              ) : (
                <ul className="space-y-4 py-2">
                  {lines.map((l) => (
                    <li key={l.product.id} className="flex gap-3 rounded-3xl bg-white p-3">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-cream-200">
                        {l.product.image_url && <img src={l.product.image_url} alt={l.product.name} className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-lg font-extrabold">{l.product.name}</p>
                        <p className="text-sm text-choco-500">{money(l.product.price, sym)} each</p>
                        {l.problem && <p className="text-sm font-bold text-berry-600">{l.problem}</p>}
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <QuantityStepper value={l.quantity} onChange={(n) => setQty(l.product.id, n)} min={1} max={Math.max(1, l.max)} label={`Quantity of ${l.product.name}`} />
                          <span className="font-display font-extrabold">{money(l.lineTotal, sym)}</span>
                        </div>
                      </div>
                      <button onClick={() => remove(l.product.id)} className="self-start rounded-full p-2 text-choco-400 hover:bg-berry-100 hover:text-berry-600" aria-label={`Remove ${l.product.name}`}><Trash2 size={18} /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {lines.length > 0 && (
              <div className="space-y-3 border-t border-choco-100 p-6">
                <div className="flex items-center justify-between font-display text-xl font-extrabold"><span>Subtotal</span><span>{money(subtotal, sym)}</span></div>
                <p className="text-xs text-choco-400">Delivery fee (if any) is added at checkout. Final prices are confirmed by the shop when you place the order.</p>
                {hasProblems && <p className="text-sm font-bold text-berry-600">Please fix the highlighted items before checking out.</p>}
                <button className="btn btn-primary w-full" disabled={hasProblems} onClick={() => { setOpen(false); nav('/checkout') }}>Checkout</button>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}
