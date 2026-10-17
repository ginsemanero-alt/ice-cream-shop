import { requireSupabase } from './supabase'
import type {
  InventoryMovement, Order, OrderItem, OrderLookup, OrderStatus, Product, StatusHistory, StoreSettings,
} from '@/types'

const num = (v: unknown) => Number(v)

function normProduct(p: Record<string, unknown>): Product {
  return { ...(p as unknown as Product), price: num(p.price) }
}

function normOrder(o: Record<string, unknown>): Order {
  const items = (o.order_items as Record<string, unknown>[] | undefined)?.map((i) => ({
    ...(i as unknown as OrderItem),
    unit_price: num(i.unit_price),
    line_total: num(i.line_total),
  }))
  return {
    ...(o as unknown as Order),
    subtotal: num(o.subtotal),
    delivery_fee: num(o.delivery_fee),
    total: num(o.total),
    order_items: items,
  }
}

// ---------- settings ----------
export async function fetchSettings(): Promise<StoreSettings> {
  const { data, error } = await requireSupabase().from('store_settings').select('*').eq('id', 1).single()
  if (error) throw error
  return { ...(data as StoreSettings), delivery_fee: num(data.delivery_fee) }
}

export async function saveSettings(s: StoreSettings) {
  const { error } = await requireSupabase().from('store_settings').update(s).eq('id', 1)
  if (error) throw error
}

// ---------- products ----------
export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await requireSupabase()
    .from('products').select('*').is('archived_at', null).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(normProduct)
}

export async function fetchAllProductsAdmin(): Promise<Product[]> {
  const { data, error } = await requireSupabase().from('products').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(normProduct)
}

export interface ProductInput {
  name: string
  description: string
  price: number
  image_url: string | null
  is_available: boolean
  is_featured: boolean
}

export async function createProduct(input: ProductInput, initialStock: number) {
  const sb = requireSupabase()
  const { data, error } = await sb.from('products').insert(input).select().single()
  if (error) throw error
  if (initialStock > 0) {
    const { error: e2 } = await sb.rpc('adjust_stock', {
      p_product_id: data.id, p_change: initialStock, p_reason: 'restock', p_note: 'Initial stock',
    })
    if (e2) throw e2
  }
}

export async function updateProduct(id: string, input: ProductInput) {
  const { error } = await requireSupabase().from('products').update(input).eq('id', id)
  if (error) throw error
}

export async function setProductArchived(id: string, archived: boolean) {
  const { error } = await requireSupabase().from('products')
    .update({ archived_at: archived ? new Date().toISOString() : null }).eq('id', id)
  if (error) throw error
}

export async function adjustStock(productId: string, change: number, reason: 'restock' | 'adjustment', note: string) {
  const { error } = await requireSupabase().rpc('adjust_stock', {
    p_product_id: productId, p_change: change, p_reason: reason, p_note: note || null,
  })
  if (error) throw error
}

export async function fetchMovements(limit = 100): Promise<InventoryMovement[]> {
  const { data, error } = await requireSupabase()
    .from('inventory_movements').select('*').order('created_at', { ascending: false }).limit(limit)
  if (error) throw error
  return data as InventoryMovement[]
}

// ---------- orders ----------
export interface PlaceOrderInput {
  name: string
  phone: string
  fulfillment: 'pickup' | 'delivery'
  payment: string
  address: string
  notes: string
  items: { product_id: string; quantity: number }[]
}

/** Totals and prices are recalculated by the place_order database function. */
export async function placeOrder(i: PlaceOrderInput) {
  const { data, error } = await requireSupabase().rpc('place_order', {
    p_customer_name: i.name,
    p_customer_phone: i.phone,
    p_fulfillment_method: i.fulfillment,
    p_payment_method: i.payment,
    p_delivery_address: i.address || null,
    p_notes: i.notes || null,
    p_items: i.items,
  })
  if (error) throw error
  const row = (Array.isArray(data) ? data[0] : data) as { order_reference: string; order_status: OrderStatus; order_total: number }
  return { reference: row.order_reference, status: row.order_status, total: num(row.order_total) }
}

export async function lookupOrder(reference: string, phone: string): Promise<OrderLookup | null> {
  const { data, error } = await requireSupabase().rpc('get_order_status', { p_reference: reference, p_phone: phone })
  if (error) throw error
  if (!data) return null
  const d = data as OrderLookup
  return {
    ...d,
    subtotal: num(d.subtotal), delivery_fee: num(d.delivery_fee), total: num(d.total),
    items: d.items.map((i) => ({ ...i, unit_price: num(i.unit_price), line_total: num(i.line_total) })),
  }
}

export async function fetchOrders(opts: { from?: string; to?: string; limit?: number } = {}): Promise<Order[]> {
  let q = requireSupabase().from('orders').select('*, order_items(*)').order('created_at', { ascending: false })
  if (opts.from) q = q.gte('created_at', opts.from)
  if (opts.to) q = q.lt('created_at', opts.to)
  q = q.limit(opts.limit ?? 1000)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map(normOrder)
}

export async function fetchOrderHistory(orderId: string): Promise<StatusHistory[]> {
  const { data, error } = await requireSupabase()
    .from('order_status_history').select('*').eq('order_id', orderId).order('created_at')
  if (error) throw error
  return data as StatusHistory[]
}

export async function setOrderStatus(orderId: string, status: OrderStatus) {
  const { error } = await requireSupabase().rpc('update_order_status', { p_order_id: orderId, p_new_status: status })
  if (error) throw error
}

export async function setOrderPaid(orderId: string, paid: boolean) {
  const { error } = await requireSupabase().rpc('set_order_payment', { p_order_id: orderId, p_paid: paid })
  if (error) throw error
}
