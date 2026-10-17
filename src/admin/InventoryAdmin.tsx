import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { adjustStock, fetchAllProductsAdmin, fetchMovements } from '@/lib/api'
import { useAsync } from '@/hooks/useAsync'
import { useSettings } from '@/hooks/useSettings'
import { useToast } from '@/hooks/useToast'
import { dateTime, errMsg } from '@/lib/format'
import { isBackendConfigured } from '@/lib/supabase'
import { BackendNotice, EmptyState, ErrorNote, Modal, Spinner } from '@/components/ui'
import { PageHead } from './AdminShell'
import type { Product } from '@/types'

const REASON: Record<string, string> = { order: 'Order', cancellation: 'Order cancelled', restock: 'Restock', adjustment: 'Adjustment' }

function AdjustForm({ product, onDone }: { product: Product; onDone: () => void }) {
  const { toast } = useToast()
  const [mode, setMode] = useState<'restock' | 'adjustment'>('restock')
  const [qty, setQty] = useState('')
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const n = Number(qty)
    if (!Number.isInteger(n) || n === 0) return setErr('Enter a whole number that is not zero.')
    if (mode === 'restock' && n < 0) return setErr('Restock must be a positive number. Use “Correction” to reduce stock.')
    if (product.stock_quantity + n < 0) return setErr(`Stock can't go below zero (currently ${product.stock_quantity}).`)
    setBusy(true)
    try { await adjustStock(product.id, n, mode, note.trim()); toast('Stock updated'); onDone() } catch (e2) { setErr(errMsg(e2)) } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p>Current stock: <b>{product.stock_quantity}</b></p>
      <div className="flex gap-2" role="radiogroup" aria-label="Type">
        {(['restock', 'adjustment'] as const).map((m) => (
          <button type="button" key={m} role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={`btn btn-sm ${mode === m ? 'btn-primary' : 'btn-ghost'}`}>{m === 'restock' ? 'Restock (+)' : 'Correction (+/−)'}</button>
        ))}
      </div>
      <div><label className="label" htmlFor="q">{mode === 'restock' ? 'Quantity to add' : 'Change (use a minus to reduce)'}</label><input id="q" className="input" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
      <div><label className="label" htmlFor="n">Note (optional)</label><input id="n" className="input" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} /></div>
      {err && <p role="alert" className="field-error">{err}</p>}
      <button className="btn btn-primary w-full" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />} Save</button>
    </form>
  )
}

export default function InventoryAdmin() {
  const { settings: s } = useSettings()
  const prods = useAsync(fetchAllProductsAdmin, [])
  const moves = useAsync(() => fetchMovements(100), [])
  const [adjust, setAdjust] = useState<Product | null>(null)

  if (!isBackendConfigured) return <><PageHead title="Inventory" /><BackendNotice /></>
  if (prods.loading || moves.loading) return <Spinner />
  if (prods.error || !prods.data) return <ErrorNote message={prods.error ?? 'Failed to load'} onRetry={() => void prods.reload()} />

  const active = prods.data.filter((p) => !p.archived_at)
  const nameOf = (id: string) => prods.data?.find((p) => p.id === id)?.name ?? 'Deleted product'
  const reloadAll = () => { void prods.reload(); void moves.reload() }

  return (
    <>
      <PageHead title="Inventory" />
      {!s.inventory_tracking && (
        <div className="card mb-6 !bg-caramel-100">
          <p className="font-bold">Inventory tracking is off, so stock isn't checked or deducted when orders come in.</p>
          <p className="text-sm">Turn it on in <Link className="underline" to="/admin/settings">Settings</Link>. You can still record stock counts below.</p>
        </div>
      )}
      {active.length === 0 ? <EmptyState title="No products">Add products first.</EmptyState> : (
        <ul className="grid gap-3 md:grid-cols-2">
          {active.map((p) => {
            const low = s.inventory_tracking && p.stock_quantity <= s.low_stock_threshold
            return (
              <li key={p.id} className="card flex items-center justify-between gap-3 !rounded-[2rem] !p-4">
                <div className="min-w-0"><p className="truncate font-display text-lg font-extrabold">{p.name}</p>
                  <p className={low ? 'font-bold text-berry-600' : 'text-choco-500'}>{p.stock_quantity} in stock{low && (p.stock_quantity === 0 ? ' · sold out' : ' · low')}</p></div>
                <button className="btn btn-ghost btn-sm" onClick={() => setAdjust(p)}>Adjust</button>
              </li>
            )
          })}
        </ul>
      )}

      <h2 className="mb-3 mt-10 text-2xl">Stock history</h2>
      {moves.error ? <ErrorNote message={moves.error} /> : !moves.data?.length ? <p className="text-choco-500">No stock movements recorded yet.</p> : (
        <div className="card overflow-x-auto !p-4">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead><tr className="text-choco-400"><th className="p-2">When</th><th className="p-2">Product</th><th className="p-2">Reason</th><th className="p-2 text-right">Change</th><th className="p-2 text-right">Stock after</th><th className="p-2">Note</th></tr></thead>
            <tbody>
              {moves.data.map((m) => (
                <tr key={m.id} className="border-t border-choco-100">
                  <td className="p-2">{dateTime(m.created_at)}</td><td className="p-2">{nameOf(m.product_id)}</td><td className="p-2">{REASON[m.reason]}</td>
                  <td className={`p-2 text-right font-bold ${m.change < 0 ? 'text-berry-600' : 'text-mint-700'}`}>{m.change > 0 ? '+' : ''}{m.change}</td>
                  <td className="p-2 text-right">{m.resulting_stock}</td><td className="p-2">{m.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!adjust} onClose={() => setAdjust(null)} title={adjust ? `Adjust ${adjust.name}` : ''}>
        {adjust && <AdjustForm product={adjust} onDone={() => { setAdjust(null); reloadAll() }} />}
      </Modal>
    </>
  )
}
