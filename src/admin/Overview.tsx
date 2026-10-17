import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Clock, Wallet } from 'lucide-react'
import { fetchAllProductsAdmin, fetchOrders } from '@/lib/api'
import { useAsync } from '@/hooks/useAsync'
import { useSettings } from '@/hooks/useSettings'
import { dateTime, money } from '@/lib/format'
import { BackendNotice, EmptyState, ErrorNote, Spinner, StatusBadge } from '@/components/ui'
import { PageHead } from './AdminShell'
import { isBackendConfigured } from '@/lib/supabase'

export default function Overview() {
  const { settings: s } = useSettings()
  const { data, loading, error, reload } = useAsync(async () => {
    const [orders, products] = await Promise.all([fetchOrders({ limit: 1000 }), fetchAllProductsAdmin()])
    return { orders, products }
  }, [])

  if (!isBackendConfigured) return <><PageHead title="Overview" /><BackendNotice /></>
  if (loading) return <Spinner />
  if (error || !data) return <ErrorNote message={error ?? 'Failed to load'} onRetry={() => void reload()} />

  const { orders, products } = data
  const pending = orders.filter((o) => o.status === 'pending').length
  const completed = orders.filter((o) => o.status === 'completed')
  const paidRevenue = orders.filter((o) => o.payment_status === 'paid' && o.status !== 'cancelled').reduce((n, o) => n + o.total, 0)
  const completedSales = completed.reduce((n, o) => n + o.total, 0)
  const low = s.inventory_tracking ? products.filter((p) => !p.archived_at && p.is_available && p.stock_quantity <= s.low_stock_threshold) : []

  const stats = [
    { label: 'Total orders', value: String(orders.length), Icon: Wallet },
    { label: 'Pending', value: String(pending), Icon: Clock },
    { label: 'Completed', value: String(completed.length), Icon: CheckCircle2 },
    { label: 'Completed sales', value: money(completedSales, s.currency_symbol), Icon: Wallet },
  ]

  const setup: string[] = []
  if (!s.business_name) setup.push('Add your business name in Settings')
  if (products.filter((p) => !p.archived_at).length === 0) setup.push('Add your first product')
  if (!s.pickup_enabled && !s.delivery_enabled) setup.push('Enable pickup and/or delivery')
  if (!s.payment_methods.some((p) => p.enabled)) setup.push('Enable at least one payment method')

  return (
    <>
      <PageHead title="Overview" />
      {setup.length > 0 && (
        <div className="card mb-6 !bg-caramel-100">
          <h2 className="mb-2 text-xl">Finish setting up your shop</h2>
          <ul className="list-inside list-disc space-y-1 font-semibold">
            {setup.map((t) => <li key={t}>{t}</li>)}
          </ul>
          <p className="mt-2 text-sm">Customers can't place orders until pickup/delivery and a payment method are enabled.</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, Icon }) => (
          <div key={label} className="card !p-5"><Icon className="mb-2 text-berry-500" aria-hidden /><p className="text-sm font-bold text-choco-400">{label}</p><p className="font-display text-2xl font-black">{value}</p></div>
        ))}
      </div>
      <p className="mt-2 text-sm text-choco-500">Paid revenue (orders marked paid, excluding cancelled): <b>{money(paidRevenue, s.currency_symbol)}</b>. This is revenue, not profit — no costs are recorded.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-4 text-2xl">Recent orders</h2>
          {orders.length === 0 ? <EmptyState title="No orders yet">Orders will appear here once customers place them.</EmptyState> : (
            <ul className="divide-y divide-choco-100">
              {orders.slice(0, 6).map((o) => (
                <li key={o.id}><Link to="/admin/orders" className="flex items-center justify-between gap-3 py-3 hover:opacity-80">
                  <span><b>{o.reference}</b> · {o.customer_name}<span className="block text-xs text-choco-400">{dateTime(o.created_at)}</span></span>
                  <span className="text-right"><StatusBadge status={o.status} /><span className="block font-bold">{money(o.total, s.currency_symbol)}</span></span>
                </Link></li>
              ))}
            </ul>
          )}
        </section>
        <section className="card">
          <h2 className="mb-4 flex items-center gap-2 text-2xl"><AlertTriangle className="text-caramel-500" aria-hidden /> Low stock</h2>
          {!s.inventory_tracking ? <p className="text-choco-500">Inventory tracking is off. Turn it on in Settings to see low-stock warnings.</p> : low.length === 0 ? <p className="text-choco-500">Nothing is running low.</p> : (
            <ul className="divide-y divide-choco-100">
              {low.map((p) => <li key={p.id} className="flex justify-between py-3"><span className="font-bold">{p.name}</span><span className={p.stock_quantity === 0 ? 'font-extrabold text-berry-600' : 'font-extrabold text-caramel-600'}>{p.stock_quantity} left</span></li>)}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
