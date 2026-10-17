import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '@/hooks/useToast'
import { SettingsProvider } from '@/hooks/useSettings'
import { CatalogProvider } from '@/hooks/useCatalog'
import { CartProvider } from '@/hooks/useCart'
import { AuthProvider } from '@/hooks/useAuth'
import { Layout } from '@/components/Layout'
import { Spinner } from '@/components/ui'
import Home from '@/pages/Home'
import Products from '@/pages/Products'
import Checkout from '@/pages/Checkout'
import { OrderConfirmation, TrackOrder } from '@/pages/OrderStatus'
import { About, Contact } from '@/pages/Info'

// Admin code is split into its own chunk so customers never download it
const AdminShell = lazy(() => import('@/admin/AdminShell').then((m) => ({ default: m.AdminShell })))
const AdminLogin = lazy(() => import('@/admin/AdminShell').then((m) => ({ default: m.AdminLogin })))
const Overview = lazy(() => import('@/admin/Overview'))
const ProductsAdmin = lazy(() => import('@/admin/ProductsAdmin'))
const OrdersAdmin = lazy(() => import('@/admin/OrdersAdmin'))
const InventoryAdmin = lazy(() => import('@/admin/InventoryAdmin'))
const Reports = lazy(() => import('@/admin/Reports'))
const SettingsAdmin = lazy(() => import('@/admin/SettingsAdmin'))

function NotFound() {
  return <div className="container-page py-20 text-center"><h1 className="text-5xl">Page not found</h1><p className="mt-2 text-choco-500">That page doesn't exist.</p></div>
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <SettingsProvider>
            <CatalogProvider>
              <CartProvider>
                <Suspense fallback={<Spinner />}>
                  <Routes>
                    <Route element={<Layout />}>
                      <Route index element={<Home />} />
                      <Route path="products" element={<Products />} />
                      <Route path="checkout" element={<Checkout />} />
                      <Route path="order/:reference" element={<OrderConfirmation />} />
                      <Route path="track" element={<TrackOrder />} />
                      <Route path="about" element={<About />} />
                      <Route path="contact" element={<Contact />} />
                      <Route path="*" element={<NotFound />} />
                    </Route>
                    <Route path="admin/login" element={<AdminLogin />} />
                    <Route path="admin" element={<AdminShell />}>
                      <Route index element={<Overview />} />
                      <Route path="products" element={<ProductsAdmin />} />
                      <Route path="orders" element={<OrdersAdmin />} />
                      <Route path="inventory" element={<InventoryAdmin />} />
                      <Route path="reports" element={<Reports />} />
                      <Route path="settings" element={<SettingsAdmin />} />
                    </Route>
                  </Routes>
                </Suspense>
              </CartProvider>
            </CatalogProvider>
          </SettingsProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
