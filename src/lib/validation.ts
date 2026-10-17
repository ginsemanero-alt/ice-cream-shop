export const PHONE_RE = /^[0-9+() -]{7,20}$/

export interface CheckoutFields {
  name: string
  phone: string
  address: string
  notes: string
}

export function validateCheckout(f: CheckoutFields, needsAddress: boolean) {
  const e: Partial<Record<keyof CheckoutFields, string>> = {}
  if (!f.name.trim()) e.name = 'Please enter your name.'
  else if (f.name.trim().length > 100) e.name = 'Name is too long.'
  if (!PHONE_RE.test(f.phone.trim())) e.phone = 'Enter a valid mobile number (digits, +, spaces or dashes).'
  if (needsAddress && !f.address.trim()) e.address = 'Delivery address is required.'
  if (f.address.length > 300) e.address = 'Address is too long (300 max).'
  if (f.notes.length > 500) e.notes = 'Notes are too long (500 max).'
  return e
}

export function isHttpUrl(v: string) {
  if (!v) return true
  try {
    const u = new URL(v)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}
