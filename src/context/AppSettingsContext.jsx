import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { publicSettingsService } from '../services/admin/settings.service'
import { productService } from '../services/product.service'
import { DEFAULT_SHOP_INFO } from '../utils/constants'

const DEFAULT_SETTINGS = {
  shopName: DEFAULT_SHOP_INFO.name,
  shopTagline: DEFAULT_SHOP_INFO.tagline,
  shopPhone: DEFAULT_SHOP_INFO.phone,
  shopEmail: DEFAULT_SHOP_INFO.email,
  shopHours: DEFAULT_SHOP_INFO.hours,
  shopLocation: DEFAULT_SHOP_INFO.location,
  shopWhatsapp: DEFAULT_SHOP_INFO.whatsapp,
  deliveryFee: 0,
  minimumOrderValue: 0,
  allowGuestOrders: true,
  allowCashOnDelivery: true,
  allowPayOnPickup: true,
  allowMpesa: true,
  maintenanceMode: false,
  maintenanceMessage: 'We are currently undergoing maintenance. Please check back soon.',
}

const normalizeSettings = (settings = {}) => {
  const merged = { ...DEFAULT_SETTINGS, ...settings }

  return {
    ...merged,
    shopInfo: {
      name: merged.shopName,
      tagline: merged.shopTagline,
      phone: merged.shopPhone,
      email: merged.shopEmail,
      hours: merged.shopHours,
      location: merged.shopLocation,
      whatsapp: merged.shopWhatsapp,
    },
    orderSettings: {
      deliveryFee: Number(merged.deliveryFee) || 0,
      minimumOrderValue: Number(merged.minimumOrderValue) || 0,
      allowGuestOrders: merged.allowGuestOrders !== false,
      allowCashOnDelivery: merged.allowCashOnDelivery !== false,
      allowPayOnPickup: merged.allowPayOnPickup !== false,
      allowMpesa: merged.allowMpesa !== false,
    },
  }
}

const AppSettingsContext = createContext(null)

export function AppSettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => normalizeSettings())
  const [isLoading, setIsLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [categories, setCategories] = useState([])

  const refreshSettings = async () => {
    setIsLoading(true)
    try {
      const res = await publicSettingsService.get()
      const nextSettings = normalizeSettings(res.data?.data)
      setSettings(nextSettings)
      setHasLoaded(true)
      return nextSettings
    } catch (error) {
      setHasLoaded(true)
      return settings
    } finally {
      setIsLoading(false)
    }
  }

  const applySettings = (nextSettings) => {
    setSettings(normalizeSettings(nextSettings))
    setHasLoaded(true)
    setIsLoading(false)
  }

  useEffect(() => {
    refreshSettings()
    productService.getCategories()
      .then(res => setCategories(res.data?.data || []))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = useMemo(() => ({
    ...settings,
    isLoading,
    hasLoaded,
    categories,
    refreshSettings,
    applySettings,
  }), [settings, isLoading, hasLoaded, categories])

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  )
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext)
  if (!context) throw new Error('useAppSettings must be used within AppSettingsProvider')
  return context
}

export function useShopInfo() {
  return useAppSettings().shopInfo
}

export function useCategories() {
  return useAppSettings().categories
}
