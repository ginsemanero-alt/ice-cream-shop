import { useState, type FormEvent } from 'react'
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { BarChart3, Boxes, ClipboardList, Cog, LayoutDashboard, Loader2, LogOut, Package, Store } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { isBackendConfigured } from '@/lib/supabase'
import { errMsg } from '@/lib/format'
import { BackendNotice, BrandMark, Spinner } from '@/components/ui'
import { useSettings } from '@/hooks/useSettings'

const nav = [
  { to: '/admin', label: 'Overview', Icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', Icon: Package },
  { to: '/admin/orders', label: 'Orders', Icon: ClipboardList },
  { to: '/admin/inventory', label: 'Inventory', Icon: Boxes },
  { to: '/admin/reports', label: 'Reports', Icon: BarChart3 },
  { to: '/admin/settings', label: 'Settings', Icon: Cog },
]

export function AdminLogin() {
  const { signIn, session, isAdmin, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const go = useNavigate()

  if (loading) return <Spinner />
  if (session && isAdmin) return <Navigate to="/admin" replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    try { await signIn(email.trim(), password); go('/admin') } catch (err) { setError(errMsg(err)) } finally { setBusy(false) }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-cream-200 p-4">
      <div className="w-full max-w-md space-y-4">
        <BackendNotice />
        <form onSubmit={submit} className="card space-y-4">
          <h1 className="text-3xl">Admin sign in</h1>
          {session && !isAdmin && <p role="alert" className="rounded-2xl bg-berry-50 p-3 font-semibold text-berry-600">This account is not an admin. See the README to promote your first admin.</p>}
          <div><label className="label" htmlFor="em">Email</label><input id="em" type="email" className="input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><label className="label" htmlFor="pw">Password</label><input id="pw" type="password" className="input" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          {error && <p role="alert" className="field-error">{error}</p>}
          <button className="btn btn-primary w-full" disabled={busy || !isBackendConfigured}>{busy && <Loader2 size={18} className="animate-spin" />} Sign in</button>
        </form>
      </div>
    </div>
  )
}

/** Frontend guard. The real protection is RLS/RPC checks in the database. */
export function AdminShell() {
  const { session, isAdmin, loading, signOut } = useAuth()
  const { name, settings } = useSettings()
  if (loading) return <Spinner />
  if (!session || !isAdmin) return <Navigate to="/admin/login" replace />

  return (
    <div className="min-h-screen bg-cream-200 lg:flex">
      <aside className="bg-choco-800 p-3 text-cream-100 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:p-5">
        <div className="mb-3 hidden items-center gap-2 lg:flex"><BrandMark logo={settings.logo_url} name={name} /><span className="truncate font-display text-lg font-black text-cream-50">{name}</span></div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto lg:flex-col">
          {nav.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 font-display font-bold ${isActive ? 'bg-caramel-300 text-choco-800' : 'hover:bg-choco-700'}`}>
              <Icon size={18} aria-hidden /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-3 flex gap-1 lg:mt-8 lg:flex-col">
          <NavLink to="/" className="flex items-center gap-2 rounded-full px-4 py-2.5 font-bold hover:bg-choco-700"><Store size={18} aria-hidden /> View shop</NavLink>
          <button onClick={() => void signOut()} className="flex items-center gap-2 rounded-full px-4 py-2.5 text-left font-bold hover:bg-choco-700"><LogOut size={18} aria-hidden /> Sign out</button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 sm:p-8"><Outlet /></main>
    </div>
  )
}

export function PageHead({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-3xl sm:text-4xl">{title}</h1>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}
