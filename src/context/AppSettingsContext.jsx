import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { publicSettingsService } from '../services/admin/settings.service'
import { productService } from '../services/product.service'
import { DEFAULT_SHOP_INFO } from '../utils/constants'
import { useBranch } from './BranchContext'

const DEFAULT_SETTINGS = {
  shopName: DEFAULT_SHOP_INFO.name,
  shopTagline: DEFAULT_SHOP_INFO.tagline,
  shopPhone: DEFAULT_SHOP_INFO.phone,
  shopPhones: [],
  shopEmail: DEFAULT_SHOP_INFO.email,
  shopHours: DEFAULT_SHOP_INFO.hours,
  shopLocation: DEFAULT_SHOP_INFO.location,
  shopWhatsapp: DEFAULT_SHOP_INFO.whatsapp,
  deliveryFee: 0,
  minimumOrderValue: 0,
  minimumOrderQuantity: 0,
  allowGuestOrders: true,
  allowCashOnDelivery: true,
  allowPayOnPickup: true,
  allowMpesa: true,
  maintenanceMode: false,
  maintenanceMessage: 'We are currently undergoing maintenance. Please check back soon.',
  deliveryPricingMode: 'flat',
  hasDeliveryZones: false,
  vatEnabled: false,
  vatRate: 16,
  loyaltyEnabled: true,
  loyaltyBronzeThreshold: 5000,
  loyaltySilverThreshold: 25000,
  loyaltyGoldThreshold: 75000,
}

// 0 is a real VAT rate (zero-rated). Only a missing or garbled value falls back to the standard 16% -
// `Number(rate) || 16` turned a branch's 0% into 16% on the cart and checkout while the server charged 0%.
export const parseVatRate = (value) => {
  if (value === null || value === undefined || value === '') return 16
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : 16
}

export const normalizeSettings = (settings = {}) => {
  const merged = { ...DEFAULT_SETTINGS, ...settings }

  return {
    ...merged,
    shopInfo: {
      name: merged.shopName,
      tagline: merged.shopTagline,
      phone: merged.shopPhone,
      phones: merged.shopPhones,
      email: merged.shopEmail,
      hours: merged.shopHours,
      location: merged.shopLocation,
      whatsapp: merged.shopWhatsapp,
    },
    orderSettings: {
      deliveryFee: Number(merged.deliveryFee) || 0,
      minimumOrderValue: Number(merged.minimumOrderValue) || 0,
      minimumOrderQuantity: Number(merged.minimumOrderQuantity) || 0,
      allowGuestOrders: merged.allowGuestOrders !== false,
      allowCashOnDelivery: merged.allowCashOnDelivery !== false,
      allowPayOnPickup: merged.allowPayOnPickup !== false,
      allowMpesa: merged.allowMpesa !== false,
      // Distance-based delivery pricing
      deliveryPricingMode: merged.deliveryPricingMode || 'flat',
      hasDeliveryZones: merged.hasDeliveryZones === true,
      // Tax
      vatEnabled: merged.vatEnabled === true,
      vatRate: parseVatRate(merged.vatRate),
    },
  }
}

const AppSettingsContext = createContext(null)

export function AppSettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => normalizeSettings())
  const [isLoading, setIsLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  // True when the last fetch failed and we're running on defaults. Money-
  // sensitive flows (checkout) must not trust delivery fee / VAT / minimum
  // order values while this is set.
  const [loadFailed, setLoadFailed] = useState(false)
  const [categories, setCategories] = useState([])
  const { branchId } = useBranch()
  // The branch the settings on screen belong to (the server says so in every public settings answer).
  // When geolocation later resolves to that same branch there is nothing to re-fetch - the second round trip
  // for settings and categories used to happen on every first visit.
  const loadedBranchRef = useRef(null)

  const refreshSettings = async () => {
    setIsLoading(true)
    try {
      const res = await publicSettingsService.get()
      loadedBranchRef.current = res.data?.data?.branchId ? String(res.data.data.branchId) : null
      const nextSettings = normalizeSettings(res.data?.data)
      setSettings(nextSettings)
      setHasLoaded(true)
      setLoadFailed(false)
      return nextSettings
    } catch (error) {
      setHasLoaded(true)
      setLoadFailed(true)
      return settings
    } finally {
      setIsLoading(false)
    }
  }

  const applySettings = (nextSettings) => {
    setSettings(normalizeSettings(nextSettings))
    setHasLoaded(true)
    setLoadFailed(false)
    setIsLoading(false)
  }

  // Refetch when the resolved shop branch changes — settings (min order, VAT,
  // delivery zones) and categories are per-branch. The branchId param rides in
  // automatically via the api.js request interceptor; force bypasses the
  // module-level categories cache which is keyed per session, not per branch.
  useEffect(() => {
    if (branchId && loadedBranchRef.current === String(branchId)) return   // already showing this branch
    refreshSettings()
    productService.getCategories({ force: true })
      .then(res => setCategories(res.data?.data || []))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId])

  const value = useMemo(() => ({
    ...settings,
    isLoading,
    hasLoaded,
    loadFailed,
    categories,
    refreshSettings,
    applySettings,
  }), [settings, isLoading, hasLoaded, loadFailed, categories])

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
