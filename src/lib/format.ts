import type { OrderStatus } from '@/types'

export function money(amount: number, symbol = '₱') {
  return `${symbol}${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function dateTime(iso: string) {
  return new Date(iso).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

/** Mirrors the transitions enforced in the update_order_status database function. */
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'ready', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

export function errMsg(e: unknown) {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return 'Something went wrong. Please try again.'
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    let s = String(v)
    // neutralise spreadsheet formula injection
    if (/^[=+\-@]/.test(s) && Number.isNaN(Number(s))) s = "'" + s
    return '"' + s.replace(/"/g, '""') + '"'
  }
  const blob = new Blob(['﻿' + rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
