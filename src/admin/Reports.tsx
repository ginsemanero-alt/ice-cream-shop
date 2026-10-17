import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download } from 'lucide-react'
import { fetchOrders } from '@/lib/api'
import { useAsync } from '@/hooks/useAsync'
import { useSettings } from '@/hooks/useSettings'
import { downloadCsv, money } from '@/lib/format'
import { isBackendConfigured } from '@/lib/supabase'
import { BackendNotice, EmptyState, ErrorNote, Spinner } from '@/components/ui'
import { PageHead } from './AdminShell'

type Group = 'day' | 'week' | 'month'

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function bucket(iso: string, g: Group) {
  const d = new Date(iso)
  if (g === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  if (g === 'week') { const m = new Date(d); m.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return `Wk of ${ymd(m)}` }
  return ymd(d)
}

export default function Reports() {
  const { settings: s } = useSettings()
  const today = new Date()
  const start = new Date(); start.setDate(today.getDate() - 29)
  const [from, setFrom] = useState(ymd(start))
  const [to, setTo] = useState(ymd(today))
  const [group, setGroup] = useState<Group>('day')

  const valid = from !== '' && to !== '' && from <= to
  const { data, loading, error, reload } = useAsync(async () => {
    if (!valid) return []
    const end = new Date(`${to}T00:00:00`); end.setDate(end.getDate() + 1)
    return fetchOrders({ from: new Date(`${from}T00:00:00`).toISOString(), to: end.toISOString(), limit: 5000 })
  }, [from, to])

  const stats = useMemo(() => {
    const orders = (data ?? []).filter((o) => o.status !== 'cancelled')
    const sales = orders.reduce((n, o) => n + o.total, 0)
    const received = orders.filter((o) => o.payment_status === 'paid').reduce((n, o) => n + o.total, 0)
    const completed = orders.filter((o) => o.status === 'completed')
    const series = new Map<string, { label: string; sales: number; orders: number }>()
    for (const o of orders) {
      const k = bucket(o.created_at, group)
      const row = series.get(k) ?? { label: k, sales: 0, orders: 0 }
      row.sales += o.total; row.orders += 1; series.set(k, row)
    }
    const prod = new Map<string, { name: string; qty: number; sales: number }>()
    for (const o of orders) for (const i of o.order_items ?? []) {
      const r = prod.get(i.product_name) ?? { name: i.product_name, qty: 0, sales: 0 }
      r.qty += i.quantity; r.sales += i.line_total; prod.set(i.product_name, r)
    }
    return {
      orders, sales, received, completedCount: completed.length,
      cancelled: (data ?? []).length - orders.length,
      series: [...series.values()].sort((a, b) => a.label.localeCompare(b.label)),
      ranking: [...prod.values()].sort((a, b) => b.qty - a.qty),
    }
  }, [data, group])

  if (!isBackendConfigured) return <><PageHead title="Reports" /><BackendNotice /></>

  function exportCsv() {
    downloadCsv(`sales-${from}-to-${to}.csv`, [
      ['Reference', 'Date', 'Status', 'Payment status', 'Method', 'Customer', 'Subtotal', 'Delivery fee', 'Total'],
      ...(data ?? []).map((o) => [o.reference, o.created_at, o.status, o.payment_status, o.fulfillment_method, o.customer_name, o.subtotal, o.delivery_fee, o.total]),
      [],
      ['Product', 'Units sold', 'Sales'],
      ...stats.ranking.map((r) => [r.name, r.qty, r.sales]),
    ])
  }

  return (
    <>
      <PageHead title="Reports">
        <button className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!data?.length}><Download size={16} /> Export CSV</button>
      </PageHead>

      <div className="card mb-6 flex flex-wrap items-end gap-4 !p-5">
        <div><label className="label" htmlFor="f">From</label><input id="f" type="date" className="input" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><label className="label" htmlFor="t">To</label><input id="t" type="date" className="input" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></div>
        <div><label className="label" htmlFor="g">Group by</label>
          <select id="g" className="input" value={group} onChange={(e) => setGroup(e.target.value as Group)}><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option></select></div>
      </div>
      {!valid && <p role="alert" className="field-error mb-4">Choose a valid date range (start on or before end).</p>}

      {loading ? <Spinner /> : error ? <ErrorNote message={error} onRetry={() => void reload()} /> : !data?.length ? (
        <EmptyState title="No orders in this range">Reports are built only from real orders. Try a wider date range.</EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              ['Orders (excl. cancelled)', String(stats.orders.length)],
              ['Sales (ordered value)', money(stats.sales, s.currency_symbol)],
              ['Revenue received (marked paid)', money(stats.received, s.currency_symbol)],
              ['Completed orders', String(stats.completedCount)],
            ].map(([l, v]) => <div key={l} className="card !p-5"><p className="text-sm font-bold text-choco-400">{l}</p><p className="font-display text-2xl font-black">{v}</p></div>)}
          </div>
          <p className="mt-2 text-sm text-choco-500">{stats.cancelled} cancelled order(s) excluded. Profit is not shown because product costs aren't recorded.</p>

          <section className="card mt-6" aria-label="Sales chart">
            <h2 className="mb-4 text-2xl">Sales by {group}</h2>
            <div className="h-72" role="img" aria-label="Bar chart of sales over time">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8D9CE" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6B4429' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#6B4429' }} width={56} />
                  <Tooltip formatter={(v) => money(Number(v), s.currency_symbol)} />
                  <Bar dataKey="sales" name="Sales" fill="#C94F6E" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="card mt-6 overflow-x-auto">
            <h2 className="mb-4 text-2xl">Top products</h2>
            {stats.ranking.length === 0 ? <p className="text-choco-500">No items.</p> : (
              <table className="w-full min-w-[360px] text-left">
                <thead><tr className="text-sm text-choco-400"><th className="p-2">#</th><th className="p-2">Product</th><th className="p-2 text-right">Units</th><th className="p-2 text-right">Sales</th></tr></thead>
                <tbody>{stats.ranking.map((r, i) => <tr key={r.name} className="border-t border-choco-100"><td className="p-2">{i + 1}</td><td className="p-2 font-bold">{r.name}</td><td className="p-2 text-right">{r.qty}</td><td className="p-2 text-right">{money(r.sales, s.currency_symbol)}</td></tr>)}</tbody>
              </table>
            )}
          </section>
        </>
      )}
    </>
  )
}
