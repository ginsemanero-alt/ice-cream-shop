import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { CheckCircle2, Loader2, Search } from 'lucide-react'
import { lookupOrder } from '@/lib/api'
import { isBackendConfigured } from '@/lib/supabase'
import { dateTime, errMsg, money } from '@/lib/format'
import { useSettings } from '@/hooks/useSettings'
import { BackendNotice, ErrorNote, StatusBadge } from '@/components/ui'
import type { OrderLookup } from '@/types'

/** Customers can only see an order when they know BOTH the reference and the phone number used. */
function OrderView({ order }: { order: OrderLookup }) {
  const { settings: s } = useSettings()
  const pm = s.payment_methods.find((p) => p.id === order.payment_method)
  return (
    <div className="card space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-choco-400">Order reference</p>
          <p className="font-display text-3xl font-black tracking-wider">{order.reference}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <p className="text-sm text-choco-500">Placed {dateTime(order.created_at)} · {order.fulfillment_method === 'pickup' ? 'Pickup' : 'Delivery'} · {pm?.label ?? order.payment_method} · Payment: <b>{order.payment_status}</b></p>
      <ul className="divide-y divide-choco-100">
        {order.items.map((i, idx) => (
          <li key={idx} className="flex justify-between py-2"><span>{i.quantity} × {i.product_name}</span><span className="font-bold">{money(i.line_total, s.currency_symbol)}</span></li>
        ))}
      </ul>
      <div className="flex justify-between font-display text-2xl font-black"><span>Total</span><span>{money(order.total, s.currency_symbol)}</span></div>
    </div>
  )
}

export function OrderConfirmation() {
  const { reference = '' } = useParams()
  const { state } = useLocation() as { state: { phone?: string } | null }
  const [order, setOrder] = useState<OrderLookup | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(state?.phone))

  const load = useCallback(async () => {
    if (!state?.phone) return
    try { setOrder(await lookupOrder(reference, state.phone)); setError(null) } catch (e) { setError(errMsg(e)) } finally { setLoading(false) }
  }, [reference, state?.phone])
  useEffect(() => { void load() }, [load])

  return (
    <div className="container-page max-w-2xl py-10">
      <div className="mb-6 text-center">
        <CheckCircle2 size={56} className="mx-auto text-mint-500" aria-hidden />
        <h1 className="mt-2 text-4xl">Order received</h1>
        <p className="mt-2 text-choco-500">Save your reference number. You'll need it with your phone number to check your order status.</p>
      </div>
      {loading ? <p className="text-center"><Loader2 className="mx-auto animate-spin" /></p> : error ? <ErrorNote message={error} onRetry={() => void load()} /> : order ? <OrderView order={order} /> : (
        <div className="card text-center">
          <p className="text-sm font-bold text-choco-400">Order reference</p>
          <p className="font-display text-3xl font-black tracking-wider">{reference}</p>
          <p className="mt-3 text-choco-500">Use <Link to="/track" className="font-bold text-berry-500 underline">Track order</Link> to see the latest status.</p>
        </div>
      )}
      <div className="mt-6 text-center"><Link to="/products" className="btn btn-ghost">Keep browsing</Link></div>
    </div>
  )
}

export function TrackOrder() {
  const [ref, setRef] = useState('')
  const [phone, setPhone] = useState('')
  const [order, setOrder] = useState<OrderLookup | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function go(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null); setNotFound(false); setOrder(null)
    try {
      const o = await lookupOrder(ref, phone)
      if (o) setOrder(o); else setNotFound(true)
    } catch (err) { setError(errMsg(err)) } finally { setBusy(false) }
  }

  return (
    <div className="container-page max-w-2xl py-10">
      <h1 className="text-4xl sm:text-5xl">Track your order</h1>
      <div className="mt-4"><BackendNotice /></div>
      <form onSubmit={go} className="card mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="ref">Order reference</label>
          <input id="ref" className="input uppercase" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="IC-XXXXXXXX" required />
        </div>
        <div>
          <label className="label" htmlFor="tphone">Mobile number used on the order</label>
          <input id="tphone" className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </div>
        <button className="btn btn-primary" disabled={busy || !isBackendConfigured}>{busy ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />} Find order</button>
      </form>
      <div className="mt-6">
        {error && <ErrorNote message={error} />}
        {notFound && <p role="alert" className="rounded-3xl bg-berry-50 p-5 font-semibold text-berry-600">No order matches that reference and number. Please check and try again.</p>}
        {order && <OrderView order={order} />}
      </div>
    </div>
  )
}
