import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { fetchOrderHistory, fetchOrders, setOrderPaid, setOrderStatus } from '@/lib/api'
import { useAsync } from '@/hooks/useAsync'
import { useSettings } from '@/hooks/useSettings'
import { useToast } from '@/hooks/useToast'
import { NEXT_STATUSES, STATUS_LABEL, dateTime, errMsg, money } from '@/lib/format'
import { isBackendConfigured } from '@/lib/supabase'
import { BackendNotice, ConfirmDialog, EmptyState, ErrorNote, Modal, Spinner, StatusBadge } from '@/components/ui'
import { PageHead } from './AdminShell'
import type { Order, OrderStatus } from '@/types'

function Detail({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const { settings: s } = useSettings()
  const { toast } = useToast()
  const history = useAsync(() => fetchOrderHistory(order.id), [order.id, order.status])
  const [confirm, setConfirm] = useState<OrderStatus | null>(null)
  const [paidConfirm, setPaidConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const pm = s.payment_methods.find((p) => p.id === order.payment_method)

  async function change(status: OrderStatus) {
    setBusy(true)
    try { await setOrderStatus(order.id, status); toast(`Order ${STATUS_LABEL[status].toLowerCase()}`); setConfirm(null); onChanged() } catch (e) { toast(errMsg(e), 'error') } finally { setBusy(false) }
  }
  async function togglePaid() {
    setBusy(true)
    try { await setOrderPaid(order.id, order.payment_status !== 'paid'); toast('Payment status updated'); setPaidConfirm(false); onChanged() } catch (e) { toast(errMsg(e), 'error') } finally { setBusy(false) }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2"><StatusBadge status={order.status} />
        <span className={`badge ${order.payment_status === 'paid' ? 'bg-mint-100 text-mint-700' : 'bg-caramel-200 text-choco-800'}`}>{order.payment_status}</span></div>
      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div><dt className="font-bold text-choco-400">Customer</dt><dd>{order.customer_name}</dd></div>
        <div><dt className="font-bold text-choco-400">Phone</dt><dd><a className="underline" href={`tel:${order.customer_phone}`}>{order.customer_phone}</a></dd></div>
        <div><dt className="font-bold text-choco-400">Method</dt><dd className="capitalize">{order.fulfillment_method}</dd></div>
        <div><dt className="font-bold text-choco-400">Payment</dt><dd>{pm?.label ?? order.payment_method}</dd></div>
        {order.delivery_address && <div className="sm:col-span-2"><dt className="font-bold text-choco-400">Address</dt><dd className="whitespace-pre-line">{order.delivery_address}</dd></div>}
        {order.notes && <div className="sm:col-span-2"><dt className="font-bold text-choco-400">Notes</dt><dd className="whitespace-pre-line">{order.notes}</dd></div>}
      </dl>
      <ul className="divide-y divide-choco-100 rounded-3xl bg-white px-4">
        {order.order_items?.map((i) => <li key={i.id} className="flex justify-between py-2"><span>{i.quantity} × {i.product_name} <span className="text-xs text-choco-400">@ {money(i.unit_price, s.currency_symbol)}</span></span><b>{money(i.line_total, s.currency_symbol)}</b></li>)}
        {order.delivery_fee > 0 && <li className="flex justify-between py-2"><span>Delivery fee</span><b>{money(order.delivery_fee, s.currency_symbol)}</b></li>}
        <li className="flex justify-between py-2 font-display text-lg font-black"><span>Total</span><span>{money(order.total, s.currency_symbol)}</span></li>
      </ul>

      <div>
        <h3 className="mb-2 text-lg">Update</h3>
        <div className="flex flex-wrap gap-2">
          {NEXT_STATUSES[order.status].map((st) => (
            <button key={st} className={`btn btn-sm ${st === 'cancelled' ? 'btn-danger' : 'btn-primary'}`} onClick={() => setConfirm(st)}>{st === 'cancelled' ? 'Cancel order' : `Mark ${STATUS_LABEL[st].toLowerCase()}`}</button>
          ))}
          {NEXT_STATUSES[order.status].length === 0 && <p className="text-sm text-choco-500">This order is {order.status}; no further changes.</p>}
          {order.status !== 'cancelled' && <button className="btn btn-ghost btn-sm" onClick={() => setPaidConfirm(true)}>{order.payment_status === 'paid' ? 'Mark unpaid' : 'Mark paid (payment verified)'}</button>}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-lg">History</h3>
        {history.loading ? <Spinner /> : history.error ? <ErrorNote message={history.error} /> : (
          <ol className="space-y-1 text-sm">
            {history.data?.map((h) => <li key={h.id}><b>{STATUS_LABEL[h.to_status as OrderStatus] ?? h.to_status}</b> · <span className="text-choco-400">{dateTime(h.created_at)}</span></li>)}
          </ol>
        )}
      </div>

      <ConfirmDialog open={!!confirm} danger={confirm === 'cancelled'} busy={busy} title={confirm === 'cancelled' ? 'Cancel this order?' : 'Change status?'}
        message={confirm === 'cancelled' ? 'This cannot be undone. If stock was deducted for this order it will be returned to inventory.' : `Move this order to “${confirm ? STATUS_LABEL[confirm] : ''}”?`}
        confirmLabel="Yes, continue" onConfirm={() => confirm && void change(confirm)} onCancel={() => setConfirm(null)} />
      <ConfirmDialog open={paidConfirm} busy={busy} title={order.payment_status === 'paid' ? 'Mark as unpaid?' : 'Mark as paid?'}
        message={order.payment_status === 'paid' ? 'The order will show as unpaid again.' : 'Only confirm after you have verified the payment (cash received, GCash/bank transfer seen in your account).'}
        confirmLabel="Confirm" onConfirm={() => void togglePaid()} onCancel={() => setPaidConfirm(false)} />
    </div>
  )
}

export default function OrdersAdmin() {
  const { settings: s } = useSettings()
  const { data, loading, error, reload } = useAsync(() => fetchOrders({ limit: 500 }), [])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | OrderStatus>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return (data ?? []).filter((o) => (status === 'all' || o.status === status) && (!t || o.reference.toLowerCase().includes(t) || o.customer_name.toLowerCase().includes(t) || o.customer_phone.includes(t)))
  }, [data, q, status])
  const open = data?.find((o) => o.id === openId) ?? null

  if (!isBackendConfigured) return <><PageHead title="Orders" /><BackendNotice /></>
  if (loading && !data) return <Spinner />
  if (error || !data) return <ErrorNote message={error ?? 'Failed to load'} onRetry={() => void reload()} />

  return (
    <>
      <PageHead title="Orders" />
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <label htmlFor="oq" className="sr-only">Search orders</label>
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-choco-300" aria-hidden />
          <input id="oq" className="input !rounded-full pl-11" placeholder="Search reference, name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label className="sr-only" htmlFor="os">Filter by status</label>
        <select id="os" className="input !w-auto !rounded-full" value={status} onChange={(e) => setStatus(e.target.value as 'all' | OrderStatus)}>
          <option value="all">All statuses</option>
          {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((k) => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}
        </select>
      </div>

      {list.length === 0 ? <EmptyState title={data.length === 0 ? 'No orders yet' : 'No matching orders'}>{data.length === 0 ? 'Real orders from customers will show up here.' : 'Try a different search or filter.'}</EmptyState> : (
        <ul className="space-y-3">
          {list.map((o) => (
            <li key={o.id}>
              <button onClick={() => setOpenId(o.id)} className="card flex w-full flex-wrap items-center justify-between gap-3 !rounded-[2rem] !p-4 text-left hover:shadow-pop sm:!p-5">
                <span><b className="font-display text-lg">{o.reference}</b><span className="block text-sm text-choco-500">{o.customer_name} · {dateTime(o.created_at)}</span></span>
                <span className="flex items-center gap-3"><StatusBadge status={o.status} /><b>{money(o.total, s.currency_symbol)}</b></span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Modal open={!!open} onClose={() => setOpenId(null)} title={open ? `Order ${open.reference}` : ''} wide>
        {open && <Detail order={open} onChanged={() => void reload()} />}
      </Modal>
    </>
  )
}
