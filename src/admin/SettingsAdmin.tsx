import { useEffect, useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useSettings } from '@/hooks/useSettings'
import { useToast } from '@/hooks/useToast'
import { saveSettings } from '@/lib/api'
import { errMsg } from '@/lib/format'
import { isBackendConfigured } from '@/lib/supabase'
import { isHttpUrl } from '@/lib/validation'
import { BackendNotice, Spinner } from '@/components/ui'
import { PageHead } from './AdminShell'
import { ImageUpload } from './ImageUpload'
import type { StoreSettings } from '@/types'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset className="card mb-6 space-y-4"><legend className="mb-2 font-display text-2xl font-black">{title}</legend>{children}</fieldset>
}

export default function SettingsAdmin() {
  const { settings, loading, reload } = useSettings()
  const { toast } = useToast()
  const [f, setF] = useState<StoreSettings>(settings)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  useEffect(() => setF(settings), [settings])

  if (!isBackendConfigured) return <><PageHead title="Store settings" /><BackendNotice /></>
  if (loading) return <Spinner />

  const text = (k: keyof StoreSettings, label: string, opts: { area?: boolean; type?: string; hint?: string } = {}) => (
    <div>
      <label className="label" htmlFor={k}>{label}</label>
      {opts.area
        ? <textarea id={k} rows={4} className="input" value={String(f[k] ?? '')} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
        : <input id={k} type={opts.type ?? 'text'} className="input" value={String(f[k] ?? '')} onChange={(e) => setF({ ...f, [k]: e.target.value })} />}
      {opts.hint && <p className="mt-1 text-xs text-choco-400">{opts.hint}</p>}
      {errors[k] && <p className="field-error">{errors[k]}</p>}
    </div>
  )

  function setPay(i: number, patch: Partial<StoreSettings['payment_methods'][number]>) {
    setF({ ...f, payment_methods: f.payment_methods.map((p, j) => (j === i ? { ...p, ...patch } : p)) })
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const er: Record<string, string> = {}
    for (const k of ['facebook_url', 'messenger_url', 'instagram_url'] as const) if (!isHttpUrl(f[k].trim())) er[k] = 'Enter a full link starting with https://'
    if (!/^[A-Z]{3}$/.test(f.currency_code)) er.currency_code = 'Use a 3-letter code such as PHP.'
    if (!f.currency_symbol.trim() || f.currency_symbol.length > 4) er.currency_symbol = 'Symbol is required (max 4 characters).'
    if (!(f.delivery_fee >= 0)) er.delivery_fee = 'Must be 0 or more.'
    if (!Number.isInteger(f.low_stock_threshold) || f.low_stock_threshold < 0) er.low_stock_threshold = 'Whole number, 0 or more.'
    if (f.payment_methods.some((p) => !p.label.trim())) er.payment = 'Every payment method needs a name.'
    setErrors(er)
    if (Object.keys(er).length) { toast('Please fix the highlighted fields', 'error'); return }
    setBusy(true)
    try {
      await saveSettings({ ...f, payment_methods: f.payment_methods.map((p) => ({ ...p, id: p.id || crypto.randomUUID().slice(0, 8), label: p.label.trim() })) })
      await reload()
      toast('Settings saved')
    } catch (err) { toast(errMsg(err), 'error') } finally { setBusy(false) }
  }

  return (
    <form onSubmit={save} noValidate>
      <PageHead title="Store settings"><button className="btn btn-primary btn-sm" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />} Save changes</button></PageHead>

      <Section title="Brand">
        {text('business_name', 'Business name')}
        {text('tagline', 'Tagline')}
        <ImageUpload label="Logo" value={f.logo_url} folder="brand" onChange={(u) => setF({ ...f, logo_url: u })} />
      </Section>

      <Section title="Home page">
        {text('hero_title', 'Hero headline', { hint: 'Leave empty to show the business name.' })}
        {text('hero_subtitle', 'Hero text')}
        <ImageUpload label="Hero image" value={f.hero_image_url} folder="hero" onChange={(u) => setF({ ...f, hero_image_url: u })} />
        <div>
          <span className="label">Gallery images</span>
          <div className="flex flex-wrap gap-3">
            {f.gallery_urls.map((u) => (
              <div key={u} className="relative h-24 w-24 overflow-hidden rounded-3xl bg-cream-200">
                <img src={u} alt="Gallery" className="h-full w-full object-cover" />
                <button type="button" className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-berry-600" aria-label="Remove gallery image" onClick={() => setF({ ...f, gallery_urls: f.gallery_urls.filter((x) => x !== u) })}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <div className="mt-3"><ImageUpload label="Add gallery image" value={null} folder="gallery" onChange={(u) => u && setF((x) => ({ ...x, gallery_urls: [...x.gallery_urls, u] }))} /></div>
        </div>
        {text('about', 'About the shop', { area: true })}
        {text('ordering_instructions', 'Ordering instructions', { area: true })}
      </Section>

      <Section title="Contact">
        {text('contact_phone', 'Phone / mobile')}
        {text('contact_email', 'Email', { type: 'email' })}
        {text('address', 'Address', { area: true })}
        {text('operating_hours', 'Operating hours', { area: true })}
        {text('messenger_url', 'Messenger link', { hint: 'e.g. https://m.me/yourpage' })}
        {text('facebook_url', 'Facebook link')}
        {text('instagram_url', 'Instagram link')}
      </Section>

      <Section title="Ordering & payment">
        <label className="flex items-center gap-2 font-bold"><input type="checkbox" className="h-5 w-5 accent-berry-500" checked={f.pickup_enabled} onChange={(e) => setF({ ...f, pickup_enabled: e.target.checked })} /> Offer pickup</label>
        <label className="flex items-center gap-2 font-bold"><input type="checkbox" className="h-5 w-5 accent-berry-500" checked={f.delivery_enabled} onChange={(e) => setF({ ...f, delivery_enabled: e.target.checked })} /> Offer delivery</label>
        <div><label className="label" htmlFor="df">Delivery fee</label><input id="df" type="number" min={0} step="0.01" className="input" value={f.delivery_fee} onChange={(e) => setF({ ...f, delivery_fee: Number(e.target.value) })} />{errors.delivery_fee && <p className="field-error">{errors.delivery_fee}</p>}</div>
        <div className="space-y-3">
          <span className="label">Payment methods</span>
          {f.payment_methods.map((p, i) => (
            <div key={p.id + i} className="space-y-2 rounded-3xl bg-white p-4">
              <div className="flex items-center gap-3">
                <input aria-label="Payment method name" className="input" value={p.label} onChange={(e) => setPay(i, { label: e.target.value })} />
                <button type="button" className="rounded-full p-2 text-berry-600 hover:bg-berry-50" aria-label={`Remove ${p.label}`} onClick={() => setF({ ...f, payment_methods: f.payment_methods.filter((_, j) => j !== i) })}><Trash2 size={18} /></button>
              </div>
              <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" className="h-5 w-5 accent-berry-500" checked={p.enabled} onChange={(e) => setPay(i, { enabled: e.target.checked })} /> Enabled</label>
              <textarea aria-label={`Instructions for ${p.label}`} rows={2} className="input" placeholder="Instructions shown to customers (e.g. account name & number)" value={p.instructions} onChange={(e) => setPay(i, { instructions: e.target.value })} />
            </div>
          ))}
          {errors.payment && <p className="field-error">{errors.payment}</p>}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setF({ ...f, payment_methods: [...f.payment_methods, { id: crypto.randomUUID().slice(0, 8), label: '', enabled: false, instructions: '' }] })}><Plus size={16} /> Add method</button>
        </div>
      </Section>

      <Section title="Currency & inventory">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="cc">Currency code</label><input id="cc" className="input" maxLength={3} value={f.currency_code} onChange={(e) => setF({ ...f, currency_code: e.target.value.toUpperCase() })} />{errors.currency_code && <p className="field-error">{errors.currency_code}</p>}</div>
          <div><label className="label" htmlFor="cs">Currency symbol</label><input id="cs" className="input" maxLength={4} value={f.currency_symbol} onChange={(e) => setF({ ...f, currency_symbol: e.target.value })} />{errors.currency_symbol && <p className="field-error">{errors.currency_symbol}</p>}</div>
        </div>
        <label className="flex items-center gap-2 font-bold"><input type="checkbox" className="h-5 w-5 accent-berry-500" checked={f.inventory_tracking} onChange={(e) => setF({ ...f, inventory_tracking: e.target.checked })} /> Track inventory (prevents overselling)</label>
        <div><label className="label" htmlFor="lt">Low-stock warning at or below</label><input id="lt" type="number" min={0} className="input" value={f.low_stock_threshold} onChange={(e) => setF({ ...f, low_stock_threshold: Number(e.target.value) })} />{errors.low_stock_threshold && <p className="field-error">{errors.low_stock_threshold}</p>}</div>
      </Section>

      <button className="btn btn-primary" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />} Save changes</button>
    </form>
  )
}
