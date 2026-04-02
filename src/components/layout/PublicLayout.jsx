import { Outlet } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import Navbar from './Navbar'
import Footer from './Footer'
import CartDrawer from '../cart/CartDrawer'
import Spinner from '../ui/Spinner'
import { useAppSettings } from '../../context/AppSettingsContext'

export default function PublicLayout() {
  const { hasLoaded, isLoading, maintenanceMode, maintenanceMessage, shopInfo } = useAppSettings()

  if (isLoading && !hasLoaded) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (maintenanceMode) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-lg w-full bg-white border border-earth-100 rounded-3xl shadow-warm p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle size={28} />
            </div>
            <p className="text-xs font-body font-semibold uppercase tracking-[0.2em] text-earth-500 mb-3">
              Temporarily Unavailable
            </p>
            <h1 className="font-display text-3xl text-earth-900 font-bold mb-3">
              {shopInfo.name}
            </h1>
            <p className="text-earth-600 font-body leading-relaxed">
              {maintenanceMessage}
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Navbar />
      <main className="flex-1 page-enter">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
    </div>
  )
}
