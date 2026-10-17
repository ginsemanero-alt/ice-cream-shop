import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useCatalog } from '@/hooks/useCatalog'
import { useSettings } from '@/hooks/useSettings'
import { isBackendConfigured } from '@/lib/supabase'
import { EmptyState, ErrorNote, Reveal, Spinner } from '@/components/ui'
import { ProductCard, ProductModal } from '@/components/ProductCard'
import type { Product } from '@/types'

export default function Products() {
  const { products, loading, error, reload } = useCatalog()
  const { settings } = useSettings()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<Product | null>(null)

  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return t ? products.filter((p) => p.name.toLowerCase().includes(t) || p.description.toLowerCase().includes(t)) : products
  }, [products, q])

  return (
    <div className="container-page py-10">
      <h1 className="text-4xl sm:text-5xl">Products</h1>
      <p className="mt-2 text-choco-500">
        {settings.ordering_instructions ? 'Pick your favourites and add them to the cart.' : 'Add items to your cart and check out when ready.'}
      </p>

      {products.length > 6 && (
        <div className="relative mt-6 max-w-md">
          <label htmlFor="search" className="sr-only">Search products</label>
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-choco-300" aria-hidden />
          <input id="search" className="input !rounded-full pl-11" placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      )}

      <div className="mt-8">
        {loading ? <Spinner /> : error ? <ErrorNote message={error} onRetry={() => void reload()} /> : products.length === 0 ? (
          <EmptyState title="No products yet">
            {isBackendConfigured ? "The shop owner hasn't added any products yet. Please check back soon." : 'Connect the backend and add products from the admin dashboard.'}
          </EmptyState>
        ) : list.length === 0 ? (
          <EmptyState title="No matches">Nothing matches “{q}”. Try a different word.</EmptyState>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p, i) => <Reveal key={p.id} delay={Math.min(i, 5) * 0.05}><ProductCard product={p} onOpen={() => setOpen(p)} /></Reveal>)}
          </div>
        )}
      </div>
      <ProductModal product={open} onClose={() => setOpen(null)} />
    </div>
  )
}
