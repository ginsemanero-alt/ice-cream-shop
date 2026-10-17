import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, ClipboardList, Sparkles } from 'lucide-react'
import { useSettings } from '@/hooks/useSettings'
import { useCatalog } from '@/hooks/useCatalog'
import { isBackendConfigured } from '@/lib/supabase'
import { REFERENCE_PHOTO } from '@/lib/defaults'
import { CupStack, EmptyState, ErrorNote, Reveal, Spinner, Wave } from '@/components/ui'
import { ProductCard, ProductModal } from '@/components/ProductCard'
import type { Product } from '@/types'

export default function Home() {
  const { settings: s, name } = useSettings()
  const { products, loading, error, reload } = useCatalog()
  const reduce = useReducedMotion()
  const [open, setOpen] = useState<Product | null>(null)

  const featured = products.filter((p) => p.is_featured).slice(0, 6)
  const shown = featured.length ? featured : products.slice(0, 6)
  const heroImg = s.hero_image_url || REFERENCE_PHOTO
  const gallery = s.gallery_urls

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-cream-100 to-cream-200">
        <div className="container-page grid items-center gap-10 py-10 md:grid-cols-2 md:py-16">
          <div>
            <motion.span initial={reduce ? false : { opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="badge mb-4 bg-berry-100 text-berry-600">
              <Sparkles size={14} className="mr-1" aria-hidden /> {s.tagline || 'Homemade ice cream'}
            </motion.span>
            <motion.h1 initial={reduce ? false : { opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-5xl leading-[0.95] sm:text-6xl lg:text-7xl">
              {s.hero_title || name}
            </motion.h1>
            <motion.p initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-5 max-w-md text-lg text-choco-600">
              {s.hero_subtitle || 'Browse our products and order straight from your phone.'}
            </motion.p>
            <motion.div initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-8 flex flex-wrap gap-3">
              <Link to="/products" className="btn btn-primary">See products <ArrowRight size={18} aria-hidden /></Link>
              <Link to="/contact" className="btn btn-ghost">Contact us</Link>
            </motion.div>
          </div>

          <motion.div initial={reduce ? false : { opacity: 0, scale: 0.92, rotate: 2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: 0.7 }} className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[3.5rem] border-8 border-cream-50 bg-choco-700 shadow-soft">
              <img src={heroImg} alt={`From the ${name} kitchen`} className={`h-full w-full object-cover ${s.hero_image_url ? '' : 'photo-lift'}`} />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-caramel-400/25 via-transparent to-berry-200/20 mix-blend-soft-light" />
              {!s.hero_image_url && <span className="absolute bottom-4 left-4 rounded-full bg-cream-50/90 px-4 py-1 text-xs font-extrabold uppercase tracking-wide">From our kitchen</span>}
            </div>
            <CupStack className="absolute -bottom-6 -right-2 hidden h-28 w-32 sm:block" />
          </motion.div>
        </div>
        <Wave className="text-cream-100" />
      </section>

      {/* FEATURED */}
      <section className="container-page py-12" aria-labelledby="featured">
        <Reveal>
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 id="featured" className="text-3xl sm:text-4xl">{featured.length ? 'Featured' : 'Our products'}</h2>
            <Link to="/products" className="font-display font-extrabold text-berry-500 hover:underline">View all →</Link>
          </div>
        </Reveal>
        {loading ? <Spinner /> : error ? <ErrorNote message={error} onRetry={() => void reload()} /> : shown.length === 0 ? (
          <EmptyState title="No products yet">
            {isBackendConfigured ? 'The shop owner hasn\'t added products yet. Please check back soon.' : 'Connect the backend and add products from the admin dashboard.'}
          </EmptyState>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((p, i) => <Reveal key={p.id} delay={i * 0.05}><ProductCard product={p} onOpen={() => setOpen(p)} /></Reveal>)}
          </div>
        )}
        <ProductModal product={open} onClose={() => setOpen(null)} />
      </section>

      {/* ABOUT */}
      <section className="container-page py-8">
        <Reveal>
          <div className="card grid gap-6 bg-choco-700 !text-cream-100 md:grid-cols-[1fr_2fr]">
            <div>
              <h2 className="text-3xl !text-cream-50">About us</h2>
              <CupStack className="mt-4 hidden h-24 w-28 md:block" />
            </div>
            <div>
              {s.about ? <p className="whitespace-pre-line text-lg">{s.about}</p> : <p className="opacity-70">The shop's story will appear here once the owner adds it in Store Settings.</p>}
              <Link to="/about" className="mt-4 inline-block font-display font-extrabold text-caramel-300 hover:underline">More about us →</Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* HOW TO ORDER */}
      <section className="container-page py-8" aria-labelledby="how">
        <Reveal>
          <div className="card">
            <h2 id="how" className="mb-4 flex items-center gap-2 text-3xl"><ClipboardList aria-hidden /> How to order</h2>
            {s.ordering_instructions ? <p className="whitespace-pre-line text-lg text-choco-600">{s.ordering_instructions}</p> : (
              <p className="text-choco-500">Ordering instructions haven't been set up yet. In the meantime, add items to your cart and check out, or use the contact details below.</p>
            )}
          </div>
        </Reveal>
      </section>

      {/* GALLERY */}
      {gallery.length > 0 && (
        <section className="container-page py-8" aria-labelledby="gallery">
          <h2 id="gallery" className="mb-6 text-3xl">Gallery</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {gallery.map((u, i) => <Reveal key={u} delay={i * 0.04}><img src={u} alt={`${name} gallery ${i + 1}`} loading="lazy" className="aspect-square w-full rounded-[2.5rem] object-cover shadow-soft" /></Reveal>)}
          </div>
        </section>
      )}
    </>
  )
}
