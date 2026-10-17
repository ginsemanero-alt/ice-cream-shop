export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
export type FulfillmentMethod = 'pickup' | 'delivery'

export interface PaymentMethod {
  id: string
  label: string
  enabled: boolean
  instructions: string
}

export interface StoreSettings {
  business_name: string
  tagline: string
  logo_url: string | null
  hero_title: string
  hero_subtitle: string
  hero_image_url: string | null
  gallery_urls: string[]
  about: string
  ordering_instructions: string
  contact_phone: string
  contact_email: string
  address: string
  facebook_url: string
  messenger_url: string
  instagram_url: string
  operating_hours: string
  currency_code: string
  currency_symbol: string
  inventory_tracking: boolean
  low_stock_threshold: number
  pickup_enabled: boolean
  delivery_enabled: boolean
  delivery_fee: number
  payment_methods: PaymentMethod[]
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string | null
  is_available: boolean
  is_featured: boolean
  stock_quantity: number
  archived_at: string | null
  created_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  product_name: string
  unit_price: number
  quantity: number
  line_total: number
}

export interface Order {
  id: string
  reference: string
  status: OrderStatus
  fulfillment_method: FulfillmentMethod
  payment_method: string
  payment_status: 'unpaid' | 'paid'
  customer_name: string
  customer_phone: string
  delivery_address: string | null
  notes: string | null
  subtotal: number
  delivery_fee: number
  total: number
  created_at: string
  order_items?: OrderItem[]
}

export interface StatusHistory {
  id: string
  order_id: string
  from_status: string | null
  to_status: string
  created_at: string
}

export interface InventoryMovement {
  id: string
  product_id: string
  order_id: string | null
  change: number
  resulting_stock: number
  reason: 'order' | 'cancellation' | 'restock' | 'adjustment'
  note: string | null
  created_at: string
}

export interface OrderLookup {
  reference: string
  status: OrderStatus
  payment_status: 'unpaid' | 'paid'
  fulfillment_method: FulfillmentMethod
  payment_method: string
  subtotal: number
  delivery_fee: number
  total: number
  created_at: string
  items: { product_name: string; unit_price: number; quantity: number; line_total: number }[]
}
