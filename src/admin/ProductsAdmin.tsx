import { useState } from 'react'
import { Archive, ArchiveRestore, Loader2, Pencil, Plus } from 'lucide-react'
import { createProduct, fetchAllProductsAdmin, setProductArchived, updateProduct, type ProductInput } from '@/lib/api'
import { useAsync } from '@/hooks/useAsync'
import { useSettings } from '@/hooks/useSettings'
import { useToast } from '@/hooks/useToast'
import { errMsg, money } from '@/lib/format'
import { isBackendConfigured } from '@/lib/supabase'
import { BackendNotice, ConfirmDialog, CupIcon, EmptyState, ErrorNote, Modal, Spinner, StockBadge } from '@/components/ui'
import { PageHead } from './AdminShell'
import { ImageUpload } from './ImageUpload'
import type { Product } from '@/types'

interface Form { name: string; description: string; price: string; image_url: string | null; is_available: boolean; is_featured: boolean; stock: string }
const blank: Form = { name: '', description: '', price: '', image_url: null, is_available: true, is_featured: false, stock: '0' }

function ProductForm({ editing, tracking, onDone, onClose }: { editing: Product | null; tracking: boolean; onDone: () => void; onClose: () => void }) {
  const { toast } = useToast()
  const [f, setF] = useState<Form>(editing ? { name: editing.name, description: editing.description, price: String(editing.price), image_url: editing.image_url, is_available: editing.is_available, is_featured: editing.is_featured, stock: '0' } : blank)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (!f.name.trim()) er.name = 'Name is required.'
    else if (f.name.length > 120) er.name = 'Name must be 120 characters or fewer.'
    const price = Number(f.price)
    if (f.price.trim() === '' || !Number.isFinite(price) || price < 0) er.price = 'Enter a valid price (0 or more).'
    else if (Math.round(price * 100) !== price * 100 && Math.abs(Math.round(price * 100) - price * 100) > 1e-6) er.price = 'Use at most 2 decimal places.'
    if (f.description.length > 1000) er.description = 'Description is too long (1000 max).'
    const stock = Number(f.stock)
    if (!editing && tracking && (!Number.isInteger(stock) || stock < 0)) er.stock = 'Stock must be a whole number, 0 or more.'
    setErrors(er)
    if (Object.keys(er).length) return
    const input: ProductInput = { name: f.name.trim(), description: f.description.trim(), price: Math.round(price * 100) / 100, image_url: f.image_url, is_available: f.is_available, is_featured: f.is_featured }
    setBusy(true)
    try {
      if (editing) await updateProduct(editing.id, input); else await createProduct(input, tracking ? stock : 0)
      toast(editing ? 'Product updated' : 'Product added')
      onDone()
    } catch (err) { toast(errMsg(err), 'error') } finally { setBusy(false) }
  }

  const bind = (k: 'name' | 'description' | 'price' | 'stock') => ({ value: f[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value }) })

  return (
    <form onSubmit={save} noValidate className="space-y-4">
      <ImageUpload label="Product photo" value={f.image_url} folder="products" onChange={(u) => setF({ ...f, image_url: u })} />
      <div><label className="label" htmlFor="pn">Name</label><input id="pn" className="input" maxLength={120} {...bind('name')} />{errors.name && <p className="field-error">{errors.name}</p>}</div>
      <div><label className="label" htmlFor="pd">Description</label><textarea id="pd" rows={3} className="input" maxLength={1000} {...bind('description')} />{errors.description && <p className="field-error">{errors.description}</p>}</div>
      <div><label className="label" htmlFor="pp">Price</label><input id="pp" className="input" inputMode="decimal" {...bind('price')} />{errors.price && <p className="field-error">{errors.price}</p>}</div>
      {!editing && tracking && <div><label className="label" htmlFor="ps">Starting stock</label><input id="ps" className="input" inputMode="numeric" {...bind('stock')} />{errors.stock && <p className="field-error">{errors.stock}</p>}</div>}
      {editing && tracking && <p className="text-sm text-choco-500">Change stock from the Inventory page so every change is recorded.</p>}
      <label className="flex items-center gap-2 font-bold"><input type="checkbox" className="h-5 w-5 accent-berry-500" checked={f.is_available} onChange={(e) => setF({ ...f, is_available: e.target.checked })} /> Available for ordering</label>
      <label className="flex items-center gap-2 font-bold"><input type="checkbox" className="h-5 w-5 accent-berry-500" checked={f.is_featured} onChange={(e) => setF({ ...f, is_featured: e.target.checked })} /> Show in “Featured” on the home page</label>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />} Save product</button>
      </div>
    </form>
  )
}

export default function ProductsAdmin() {
  const { settings: s } = useSettings()
  const { toast } = useToast()
  const { data, loading, error, reload } = useAsync(fetchAllProductsAdmin, [])
  const [editing, setEditing] = useState<Product | null>(null)
  const [adding, setAdding] = useState(false)
  const [archive, setArchive] = useState<Product | null>(null)
  const [busy, setBusy] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  if (!isBackendConfigured) return <><PageHead title="Products" /><BackendNotice /></>
  if (loading) return <Spinner />
  if (error || !data) return <ErrorNote message={error ?? 'Failed to load'} onRetry={() => void reload()} />

  const list = data.filter((p) => showArchived || !p.archived_at)

  async function doArchive() {
    if (!archive) return
    setBusy(true)
    try { await setProductArchived(archive.id, true); toast('Product archived'); setArchive(null); await reload() } catch (e) { toast(errMsg(e), 'error') } finally { setBusy(false) }
  }
  async function restore(p: Product) {
    try { await setProductArchived(p.id, false); toast('Product restored'); await reload() } catch (e) { toast(errMsg(e), 'error') }
  }

  return (
    <>
      <PageHead title="Products">
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" className="h-4 w-4 accent-berry-500" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Show archived</label>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}><Plus size={16} /> Add product</button>
      </PageHead>

      {list.length === 0 ? <EmptyState title="No products yet">Add your first real product to show it on the storefront.</EmptyState> : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => (
            <li key={p.id} className={`card flex gap-4 !p-4 sm:!rounded-[2.5rem] ${p.archived_at ? 'opacity-60' : ''}`}>
              <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-3xl bg-cream-200">
                {p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" /> : <CupIcon className="w-12 opacity-60" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-xl font-extrabold">{p.name}</p>
                <p className="font-bold">{money(p.price, s.currency_symbol)}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {p.archived_at ? <span className="badge bg-choco-100 text-choco-500">Archived</span> : <StockBadge available={p.is_available} tracking={s.inventory_tracking} stock={p.stock_quantity} threshold={s.low_stock_threshold} />}
                  {s.inventory_tracking && <span className="text-xs font-bold text-choco-500">{p.stock_quantity} in stock</span>}
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`}><Pencil size={14} /> Edit</button>
                  {p.archived_at
                    ? <button className="btn btn-ghost btn-sm" onClick={() => void restore(p)}><ArchiveRestore size={14} /> Restore</button>
                    : <button className="btn btn-sm text-berry-600 hover:bg-berry-50" onClick={() => setArchive(p)} aria-label={`Archive ${p.name}`}><Archive size={14} /> Archive</button>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={adding || !!editing} onClose={() => { setAdding(false); setEditing(null) }} title={editing ? 'Edit product' : 'Add product'}>
        {(adding || editing) && <ProductForm key={editing?.id ?? 'new'} editing={editing} tracking={s.inventory_tracking} onClose={() => { setAdding(false); setEditing(null) }} onDone={() => { setAdding(false); setEditing(null); void reload() }} />}
      </Modal>
      <ConfirmDialog open={!!archive} danger busy={busy} title="Archive product?" message={`“${archive?.name}” will disappear from the storefront. Past orders keep their history, and you can restore it later.`} confirmLabel="Archive" onConfirm={() => void doArchive()} onCancel={() => setArchive(null)} />
    </>
  )
}
