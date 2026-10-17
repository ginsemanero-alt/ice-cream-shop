import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import type { Product } from '@/types'
import { useSettings } from '@/hooks/useSettings'
import { useCart } from '@/hooks/useCart'
import { useToast } from '@/hooks/useToast'
import { money } from '@/lib/format'
import { CupIcon, Modal, QuantityStepper, StockBadge } from './ui'

function useSellable(p: Product) {
  const { settings } = useSettings()
  const sold = !p.is_available || (settings.inventory_tracking && p.stock_quantity < 1)
  const max = settings.inventory_tracking ? Math.min(99, p.stock_quantity) : 99
  return { sold, max, settings }
}

export function ProductCard({ product: p, onOpen }: { product: Product; onOpen: () => void }) {
  const { sold, settings } = useSellable(p)
  const { add } = useCart()
  const { toast } = useToast()

  return (
    <motion.article whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className="flex flex-col overflow-hidden rounded-[2.5rem] bg-cream-50 shadow-soft sm:rounded-[3.5rem]">
      <button onClick={onOpen} className="relative block aspect-square w-full overflow-hidden bg-cream-200" aria-label={`View ${p.name}`}>
        {p.image_url ? (
          <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover transition duration-500 hover:scale-105" />
        ) : (
          <span className="grid h-full place-items-center"><CupIcon className="w-1/2 opacity-60" /></span>
        )}
        <span className="absolute left-4 top-4"><StockBadge available={p.is_available} tracking={settings.inventory_tracking} stock={p.stock_quantity} threshold={settings.low_stock_threshold} /></span>
      </button>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-xl">{p.name}</h3>
        {p.description && <p className="mt-1 line-clamp-2 text-sm text-choco-500">{p.description}</p>}
        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="font-display text-2xl font-black text-choco-700">{money(p.price, settings.currency_symbol)}</span>
          <button
            disabled={sold}
            onClick={() => { const m = add(p.id); toast(m ?? `${p.name} added to cart`, m ? 'info' : 'success') }}
            className="btn btn-pink btn-sm" aria-label={`Add ${p.name} to cart`}
          >
            <Plus size={16} /> Add
          </button>
        </div>
      </div>
    </motion.article>
  )
}

export function ProductModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const [qty, setQty] = useState(1)
  const { add, setOpen } = useCart()
  const { toast } = useToast()
  // key by id so the quantity resets for each product
  return (
    <Modal open={!!product} onClose={onClose} title={product?.name ?? ''} wide>
      {product && <Detail key={product.id} product={product} qty={qty} setQty={setQty} onAdd={() => {
        const m = add(product.id, qty)
        toast(m ?? `${product.name} added to cart`, m ? 'info' : 'success')
        setQty(1); onClose(); setOpen(true)
      }} />}
    </Modal>
  )
}

function Detail({ product: p, qty, setQty, onAdd }: { product: Product; qty: number; setQty: (n: number) => void; onAdd: () => void }) {
  const { sold, max, settings } = useSellable(p)
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="aspect-square overflow-hidden rounded-[2.5rem] bg-cream-200">
        {p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center"><CupIcon className="w-1/2 opacity-60" /></span>}
      </div>
      <div className="flex flex-col gap-4">
        <StockBadge available={p.is_available} tracking={settings.inventory_tracking} stock={p.stock_quantity} threshold={settings.low_stock_threshold} />
        <p className="font-display text-3xl font-black text-choco-700">{money(p.price, settings.currency_symbol)}</p>
        {p.description ? <p className="whitespace-pre-line text-choco-600">{p.description}</p> : <p className="text-choco-400">No description yet.</p>}
        <div className="mt-auto space-y-4">
          {!sold && <QuantityStepper value={qty} onChange={(n) => setQty(Math.min(Math.max(1, n), max))} max={max} label="Quantity" />}
          <button className="btn btn-primary w-full" disabled={sold} onClick={onAdd}>
            {sold ? 'Not available' : `Add ${qty} to cart · ${money(p.price * qty, settings.currency_symbol)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
