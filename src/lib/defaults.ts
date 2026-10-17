import type { StoreSettings } from '@/types'

/** Neutral, empty defaults used until the owner saves real settings (or backend is not configured). */
export const DEFAULT_SETTINGS: StoreSettings = {
  business_name: '',
  tagline: '',
  logo_url: null,
  hero_title: '',
  hero_subtitle: '',
  hero_image_url: null,
  gallery_urls: [],
  about: '',
  ordering_instructions: '',
  contact_phone: '',
  contact_email: '',
  address: '',
  facebook_url: '',
  messenger_url: '',
  instagram_url: '',
  operating_hours: '',
  currency_code: 'PHP',
  currency_symbol: '₱',
  inventory_tracking: false,
  low_stock_threshold: 5,
  pickup_enabled: false,
  delivery_enabled: false,
  delivery_fee: 0,
  payment_methods: [
    { id: 'cash', label: 'Cash on pickup / delivery', enabled: false, instructions: '' },
    { id: 'gcash', label: 'GCash', enabled: false, instructions: '' },
    { id: 'bank_transfer', label: 'Bank transfer', enabled: false, instructions: '' },
  ],
}

export const FALLBACK_NAME = 'Your Ice Cream Shop'
export const REFERENCE_PHOTO = '/assets/reference-photo.jpg'
