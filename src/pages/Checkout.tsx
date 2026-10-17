import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { useSettings } from '@/hooks/useSettings'
import { useCatalog } from '@/hooks/useCatalog'
import { useToast } from '@/hooks/useToast'
import { placeOrder } from '@/lib/api'
import { isBackendConfigured } from '@/lib/supabase'
import { errMsg, money } from '@/lib/format'
import { validateCheckout, type CheckoutFields } from '@/lib/validation'
import { BackendNotice, EmptyState, Spinner } from '@/components/ui'
import type { FulfillmentMethod } from '@/types'

export default function Checkout() {
  const { lines, subtotal, hasProblems, clear } = useCart()
  const { settings: s, loading: sl } = useSettings()
  const { loading: cl, reload } = useCatalog()
  const { toast } = useToast()
  const nav = useNavigate()

  const methods = useMemo<FulfillmentMethod[]>(() => [...(s.pickup_enabled ? ['pickup' as const] : []), ...(s.delivery_enabled ? ['delivery' as const] : [])], [s.pickup_enabled, s.delivery_enabled])
  const payments = useMemo(() => s.payment_methods.filter((p) => p.enabled), [s.payment_methods])

  const [fulfillment, setFulfillment] = useState<FulfillmentMethod | ''>('')
  const [payment, setPayment] = useState('')
  const [f, setF] = useState<CheckoutFields>({ name: '', phone: '', address: '', notes: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutFields | 'form', string>>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => { void reload() }, [reload])
  useEffect(() => { if (!fulfillment && methods.length === 1) setFulfillment(methods[0]) }, [fulfillment, methods])
  useEffect(() => { if (!payment && payments.length === 1) setPayment(payments[0].id) }, [payment, payments])

  if (sl || cl) return <Spinner />
  if (lines.length === 0) return (
    <div className="container-page py-16"><EmptyState title="Your cart is empty"><Link to="/products" className="btn btn-primary mt-4">Browse products</Link></EmptyState></div>
  )

  const fee = fulfillment === 'delivery' ? s.delivery_fee : 0
  const total = subtotal + fee
  const notSetUp = methods.length === 0 || payments.length === 0
  const set = (k: keyof CheckoutFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }))
  const chosenPayment = payments.find((p) => p.id === payment)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const errs: typeof errors = validateCheckout(f, fulfillment === 'delivery')
    if (!fulfillment) errs.form = 'Choose pickup or delivery.'
    else if (!payment) errs.form = 'Choose a payment method.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      const r = await placeOrder({
        name: f.name.trim(), phone: f.phone.trim(), fulfillment: fulfillment as FulfillmentMethod, payment,
        address: f.address.trim(), notes: f.notes.trim(),
        items: lines.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
      })
      clear()
      void reload()
      nav(`/order/${r.reference}`, { state: { total: r.total, status: r.status, phone: f.phone.trim() } })
    } catch (err) {
      const m = errMsg(err)
      setErrors({ form: m })
      toast(m, 'error')
      void reload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container-page py-10">
      <h1 className="text-4xl sm:text-5xl">Checkout</h1>
      <div className="mt-4"><BackendNotice /></div>
      {isBackendConfigured && notSetUp && (
        <div role="alert" className="mt-4 rounded-3xl bg-caramel-100 p-5 font-semibold">
          Ordering isn't open yet — the shop hasn't enabled {methods.length === 0 ? 'pickup or delivery' : 'a payment method'}. Please check back soon or contact the shop.
        </div>
      )}

      <form onSubmit={submit} noValidate className="mt-8 grid gap-8 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <fieldset className="card space-y-4">
            <legend className="mb-2 font-display text-2xl font-black">Your details</legend>
            <div>
              <label className="label" htmlFor="name">Full name</label>
              <input id="name" className="input" autoComplete="name" value={f.name} onChange={set('name')} aria-invalid={!!errors.name} maxLength={100} />
              {errors.name && <p className="field-error">{errors.name}</p>}
            </div>
            <div>
              <label className="label" htmlFor="phone">Mobile number</label>
              <input id="phone" className="input" type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} aria-invalid={!!errors.phone} maxLength={20} />
              {errors.phone && <p className="field-error">{errors.phone}</p>}
            </div>
          </fieldset>

          <fieldset className="card space-y-4">
            <legend className="mb-2 font-display text-2xl font-black">Pickup or delivery</legend>
            {methods.length === 0 ? <p className="text-choco-500">Not available yet.</p> : (
              <div className="grid gap-3 sm:grid-cols-2">
                {methods.map((m) => (
                  <label key={m} className={`cursor-pointer rounded-3xl border-2 p-4 font-display text-lg font-extrabold capitalize ${fulfillment === m ? 'border-berry-400 bg-berry-50' : 'border-choco-100 bg-white'}`}>
                    <input type="radio" name="fulfillment" className="mr-2 accent-berry-500" checked={fulfillment === m} onChange={() => setFulfillment(m)} /> {m}
                  </label>
                ))}
              </div>
            )}
            {fulfillment === 'delivery' && (
              <div>
                <label className="label" htmlFor="address">Delivery address</label>
                <textarea id="address" className="input" rows={3} value={f.address} onChange={set('address')} aria-invalid={!!errors.address} maxLength={300} />
                {errors.address && <p className="field-error">{errors.address}</p>}
              </div>
            )}
          </fieldset>

          <fieldset className="card space-y-4">
            <legend className="mb-2 font-display text-2xl font-black">Payment</legend>
            {payments.length === 0 ? <p className="text-choco-500">Not available yet.</p> : (
              <div className="space-y-3">
                {payments.map((p) => (
                  <label key={p.id} className={`block cursor-pointer rounded-3xl border-2 p-4 ${payment === p.id ? 'border-berry-400 bg-berry-50' : 'border-choco-100 bg-white'}`}>
                    <input type="radio" name="payment" className="mr-2 accent-berry-500" checked={payment === p.id} onChange={() => setPayment(p.id)} />
                    <span className="font-display text-lg font-extrabold">{p.label}</span>
                  </label>
                ))}
                {chosenPayment?.instructions && <p className="whitespace-pre-line rounded-2xl bg-cream-200 p-4 text-sm">{chosenPayment.instructions}</p>}
                <p className="text-xs text-choco-400">Your order stays “unpaid” until the shop verifies your payment.</p>
              </div>
            )}
            <div>
              <label className="label" htmlFor="notes">Notes (optional)</label>
              <textarea id="notes" className="input" rows={2} value={f.notes} onChange={set('notes')} maxLength={500} />
              {errors.notes && <p className="field-error">{errors.notes}</p>}
            </div>
          </fieldset>
        </div>

        <aside className="card h-fit space-y-4 lg:sticky lg:top-24">
          <h2 className="text-2xl">Order summary</h2>
          <ul className="divide-y divide-choco-100">
            {lines.map((l) => (
              <li key={l.product.id} className="flex justify-between gap-3 py-2">
                <span>{l.quantity} × {l.product.name}{l.problem && <b className="block text-sm text-berry-600">{l.problem}</b>}</span>
                <span className="font-bold">{money(l.lineTotal, s.currency_symbol)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-1">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(subtotal, s.currency_symbol)}</dd></div>
            {fulfillment === 'delivery' && <div className="flex justify-between"><dt>Delivery fee</dt><dd>{money(fee, s.currency_symbol)}</dd></div>}
            <div className="flex justify-between font-display text-2xl font-black"><dt>Total</dt><dd>{money(total, s.currency_symbol)}</dd></div>
          </dl>
          <p className="text-xs text-choco-400">The shop re-checks prices and availability when you place the order.</p>
          {errors.form && <p role="alert" className="rounded-2xl bg-berry-50 p-3 font-semibold text-berry-600">{errors.form}</p>}
          <button type="submit" className="btn btn-primary w-full" disabled={busy || !isBackendConfigured || notSetUp || hasProblems}>
            {busy && <Loader2 size={18} className="animate-spin" />} Place order
          </button>
        </aside>
      </form>
    </div>
  )
}
