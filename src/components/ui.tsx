import { useEffect, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, Loader2, Minus, Plus, X } from 'lucide-react'
import { isBackendConfigured } from '@/lib/supabase'
import type { OrderStatus } from '@/types'
import { STATUS_LABEL } from '@/lib/format'

/* ---------- Cup motifs (pure SVG, no stock images) ---------- */
export function CupIcon({ className = '', lid = '#FFF6E6', body = '#C07A22', band = '#E994A8' }: { className?: string; lid?: string; body?: string; band?: string }) {
  return (
    <svg viewBox="0 0 120 100" className={className} aria-hidden>
      <ellipse cx="60" cy="26" rx="52" ry="14" fill={lid} stroke="#6B4429" strokeWidth="3" />
      <ellipse cx="60" cy="26" rx="38" ry="8" fill="#fff" opacity=".5" />
      <path d="M14 30h92l-9 56a10 10 0 0 1-10 8H33a10 10 0 0 1-10-8z" fill={body} stroke="#6B4429" strokeWidth="3" strokeLinejoin="round" />
      <path d="M19 52h82l-3 18H22z" fill={band} opacity=".9" />
    </svg>
  )
}

export function CupStack({ className = '' }: { className?: string }) {
  return (
    <div className={`relative ${className}`} aria-hidden>
      <CupIcon className="absolute bottom-0 left-0 w-[55%]" body="#AE8468" />
      <CupIcon className="absolute bottom-0 right-0 w-[55%]" body="#C07A22" band="#FADDE3" />
      <CupIcon className="absolute left-[22%] top-0 w-[55%]" body="#6B4429" band="#E994A8" />
    </div>
  )
}

/** Wavy divider echoing a cup lid ring */
export function Wave({ className = 'text-cream-50', flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className={`block h-8 w-full sm:h-14 ${flip ? 'rotate-180' : ''} ${className}`} aria-hidden>
      <path fill="currentColor" d="M0 40c120 40 240 40 360 0s240-40 360 0 240 40 360 0 240-40 360 0v40H0z" />
    </svg>
  )
}

export function BrandMark({ logo, name, size = 40 }: { logo: string | null; name: string; size?: number }) {
  return logo ? (
    <img src={logo} alt={`${name} logo`} style={{ width: size, height: size }} className="rounded-full object-cover" />
  ) : (
    <span className="grid place-items-center rounded-full bg-choco-700" style={{ width: size, height: size }} aria-hidden>
      <CupIcon className="w-[70%]" />
    </span>
  )
}

/* ---------- Badges ---------- */
const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: 'bg-caramel-200 text-choco-800',
  confirmed: 'bg-berry-100 text-berry-600',
  preparing: 'bg-caramel-300 text-choco-800',
  ready: 'bg-mint-100 text-mint-700',
  completed: 'bg-mint-500 text-white',
  cancelled: 'bg-choco-100 text-choco-500',
}
export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>
}

export function StockBadge({ available, tracking, stock, threshold }: { available: boolean; tracking: boolean; stock: number; threshold: number }) {
  if (!available) return <span className="badge bg-choco-100 text-choco-500">Unavailable</span>
  if (tracking && stock < 1) return <span className="badge bg-berry-100 text-berry-600">Sold out</span>
  if (tracking && stock <= threshold) return <span className="badge bg-caramel-200 text-choco-800">Low stock</span>
  return <span className="badge bg-mint-100 text-mint-700">Available</span>
}

/* ---------- Misc ---------- */
export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 font-bold text-choco-400" role="status">
      <Loader2 className="animate-spin" aria-hidden /> {label}
    </div>
  )
}

export function EmptyState({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center rounded-[3rem] border-2 border-dashed border-choco-200 bg-cream-50 px-6 py-12 text-center">
      {icon ?? <CupIcon className="mb-4 w-20 opacity-70" />}
      <h3 className="text-xl">{title}</h3>
      {children && <div className="mt-2 text-choco-500">{children}</div>}
    </div>
  )
}

export function BackendNotice({ compact = false }: { compact?: boolean }) {
  if (isBackendConfigured) return null
  return (
    <div role="alert" className={`flex items-start gap-3 rounded-3xl border-2 border-caramel-300 bg-caramel-100 text-choco-700 ${compact ? 'p-3 text-sm' : 'p-5'}`}>
      <AlertTriangle className="mt-0.5 shrink-0 text-caramel-600" aria-hidden />
      <div>
        <p className="font-extrabold">Backend not configured</p>
        <p className="text-sm">
          Supabase credentials are missing, so products, orders and settings can't load or save. Copy <b>.env.example</b> to <b>.env</b>, fill in the values and restart. See the README.
        </p>
      </div>
    </div>
  )
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-3xl bg-berry-50 p-5 text-berry-600">
      <p className="font-extrabold">Something went wrong</p>
      <p className="text-sm">{message}</p>
      {onRetry && <button className="btn btn-ghost btn-sm mt-3" onClick={onRetry}>Try again</button>}
    </div>
  )
}

export function QuantityStepper({ value, onChange, min = 1, max = 99, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label: string }) {
  return (
    <div className="inline-flex items-center rounded-full bg-cream-200 p-1" role="group" aria-label={label}>
      <button type="button" className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-sm hover:bg-berry-100 disabled:opacity-40" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Decrease quantity">
        <Minus size={16} />
      </button>
      <span className="w-10 text-center font-display text-lg font-extrabold" aria-live="polite">{value}</span>
      <button type="button" className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-sm hover:bg-berry-100 disabled:opacity-40" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity">
        <Plus size={16} />
      </button>
    </div>
  )
}

export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

/* ---------- Modal + confirm ---------- */
export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')
        if (!f.length) return
        const first = f[0], last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prev?.focus?.()
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] flex items-end justify-center bg-choco-900/60 p-0 sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
          <motion.div
            ref={ref}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className={`max-h-[92vh] w-full overflow-y-auto rounded-t-[2.5rem] bg-cream-50 p-6 shadow-soft outline-none sm:rounded-[3rem] sm:p-8 ${wide ? 'max-w-3xl' : 'max-w-lg'}`}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-2xl">{title}</h2>
              <button onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cream-200 hover:bg-berry-100" aria-label="Close dialog"><X size={18} /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger = false, busy = false, onConfirm, onCancel }: { open: boolean; title: string; message: string; confirmLabel?: string; danger?: boolean; busy?: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="mb-6 text-choco-600">{message}</p>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button className="btn btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
          {busy && <Loader2 size={16} className="animate-spin" />} {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
