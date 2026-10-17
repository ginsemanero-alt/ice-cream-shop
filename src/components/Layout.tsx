import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, Globe, Mail, MapPin, Menu, MessageCircle, Phone, ShoppingBag, X, Clock } from 'lucide-react'
import { useSettings } from '@/hooks/useSettings'
import { useCart } from '@/hooks/useCart'
import { BackendNotice, BrandMark, Wave } from './ui'
import { CartDrawer } from './CartDrawer'
import { isHttpUrl } from '@/lib/validation'
import { isBackendConfigured } from '@/lib/supabase'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/products', label: 'Products' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
  { to: '/track', label: 'Track order' },
]

function Navbar() {
  const { settings, name } = useSettings()
  const { count, setOpen } = useCart()
  const [menu, setMenu] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-choco-100 bg-cream-100/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Link to="/" className="flex min-w-0 items-center gap-2 rounded-full" aria-label={`${name} home`}>
          <BrandMark logo={settings.logo_url} name={name} />
          <span className="truncate font-display text-xl font-black text-choco-800">{name}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `rounded-full px-4 py-2 font-display font-bold transition ${isActive ? 'bg-choco-700 text-cream-50' : 'hover:bg-cream-200'}`}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button onClick={() => setOpen(true)} className="relative grid h-11 w-11 place-items-center rounded-full bg-berry-400 text-white shadow-pop active:translate-y-0.5 active:shadow-none" aria-label={`Open cart, ${count} items`}>
            <ShoppingBag size={20} />
            {count > 0 && (
              <motion.span key={count} initial={{ scale: 1.6 }} animate={{ scale: 1 }} className="absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full bg-choco-800 px-1 text-xs font-extrabold">
                {count}
              </motion.span>
            )}
          </button>
          <button onClick={() => setMenu((m) => !m)} className="grid h-11 w-11 place-items-center rounded-full bg-cream-200 md:hidden" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu}>
            {menu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menu && (
          <motion.nav initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-choco-100 md:hidden" aria-label="Mobile">
            <div className="container-page flex flex-col gap-1 py-3">
              {links.map((l) => (
                <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setMenu(false)} className={({ isActive }) => `rounded-2xl px-4 py-3 font-display text-lg font-bold ${isActive ? 'bg-choco-700 text-cream-50' : 'hover:bg-cream-200'}`}>
                  {l.label}
                </NavLink>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}

export function ContactLines({ light = false }: { light?: boolean }) {
  const { settings: s } = useSettings()
  const row = 'flex items-start gap-3'
  const ic = light ? 'text-caramel-300' : 'text-berry-500'
  const social = [
    { url: s.messenger_url, label: 'Messenger', Icon: MessageCircle },
    { url: s.facebook_url, label: 'Facebook', Icon: Globe },
    { url: s.instagram_url, label: 'Instagram', Icon: Camera },
  ].filter((x) => x.url && isHttpUrl(x.url))
  const any = s.contact_phone || s.contact_email || s.address || s.operating_hours || social.length
  if (!any) return <p className="opacity-70">Contact details haven't been set up yet.</p>
  return (
    <ul className="space-y-3">
      {s.contact_phone && <li className={row}><Phone size={18} className={`mt-1 shrink-0 ${ic}`} aria-hidden /><a href={`tel:${s.contact_phone.replace(/[^0-9+]/g, '')}`} className="hover:underline">{s.contact_phone}</a></li>}
      {s.contact_email && <li className={row}><Mail size={18} className={`mt-1 shrink-0 ${ic}`} aria-hidden /><a href={`mailto:${s.contact_email}`} className="break-all hover:underline">{s.contact_email}</a></li>}
      {s.address && <li className={row}><MapPin size={18} className={`mt-1 shrink-0 ${ic}`} aria-hidden /><span className="whitespace-pre-line">{s.address}</span></li>}
      {s.operating_hours && <li className={row}><Clock size={18} className={`mt-1 shrink-0 ${ic}`} aria-hidden /><span className="whitespace-pre-line">{s.operating_hours}</span></li>}
      {social.map(({ url, label, Icon }) => (
        <li key={label} className={row}><Icon size={18} className={`mt-1 shrink-0 ${ic}`} aria-hidden /><a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline">{label}</a></li>
      ))}
    </ul>
  )
}

function Footer() {
  const { name, settings } = useSettings()
  return (
    <footer className="mt-20 bg-choco-800 text-cream-100">
      <div className="text-choco-800 -mt-px"><Wave className="-translate-y-px text-cream-100" flip /></div>
      <div className="container-page grid gap-10 pb-10 pt-4 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2"><BrandMark logo={settings.logo_url} name={name} size={44} /><span className="font-display text-2xl font-black text-cream-50">{name}</span></div>
          {settings.tagline && <p className="mt-3 text-cream-200">{settings.tagline}</p>}
        </div>
        <div>
          <h3 className="mb-3 text-lg !text-caramel-300">Visit & contact</h3>
          <ContactLines light />
        </div>
        <div>
          <h3 className="mb-3 text-lg !text-caramel-300">Explore</h3>
          <ul className="space-y-2">
            {links.map((l) => <li key={l.to}><Link to={l.to} className="hover:underline">{l.label}</Link></li>)}
          </ul>
        </div>
      </div>
      <p className="border-t border-choco-600 py-4 text-center text-sm text-choco-200">© {new Date().getFullYear()} {name}</p>
    </footer>
  )
}

export function Layout() {
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-white focus:px-4 focus:py-2">Skip to content</a>
      <Navbar />
      {!isBackendConfigured && <div className="container-page mt-4"><BackendNotice compact /></div>}
      <AnimatePresence mode="wait">
        <motion.main id="main" key={pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="flex-1">
          <Outlet />
        </motion.main>
      </AnimatePresence>
      <Footer />
      <CartDrawer />
    </div>
  )
}
