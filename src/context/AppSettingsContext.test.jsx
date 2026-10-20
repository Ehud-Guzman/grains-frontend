import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { AppSettingsProvider, normalizeSettings, parseVatRate } from './AppSettingsContext'
import { useBranch } from './BranchContext'
import { publicSettingsService } from '../services/admin/settings.service'
import { productService } from '../services/product.service'

vi.mock('./BranchContext', () => ({ useBranch: vi.fn() }))
vi.mock('../services/admin/settings.service', () => ({ publicSettingsService: { get: vi.fn() } }))
vi.mock('../services/product.service', () => ({ productService: { getCategories: vi.fn() } }))

describe('VAT rate handling (regression: 0% was shown as 16%)', () => {
  test('0 is a real rate and is kept', () => {
    expect(parseVatRate(0)).toBe(0)
    expect(parseVatRate('0')).toBe(0)
    expect(normalizeSettings({ vatEnabled: true, vatRate: 0 }).orderSettings.vatRate).toBe(0)
  })

  test('ordinary rates pass through', () => {
    expect(parseVatRate(16)).toBe(16)
    expect(parseVatRate('8')).toBe(8)
    expect(parseVatRate(14.5)).toBe(14.5)
  })

  test('a missing, blank, negative or garbled rate falls back to the standard 16%', () => {
    for (const bad of [undefined, null, '', 'abc', -5, NaN]) {
      expect(parseVatRate(bad)).toBe(16)
    }
    expect(normalizeSettings({}).orderSettings.vatRate).toBe(16)
    expect(normalizeSettings().orderSettings.vatRate).toBe(16)
  })

  test('an unrelated setting is unaffected', () => {
    expect(normalizeSettings({ vatEnabled: true, vatRate: 0 }).orderSettings.vatEnabled).toBe(true)
  })
})

describe('settings are not fetched twice for the same branch (2026-10 audit, F-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    productService.getCategories.mockResolvedValue({ data: { data: ['Cereals'] } })
  })

  const renderWithBranch = (branchId) => {
    useBranch.mockReturnValue({ branchId })
    const view = render(<AppSettingsProvider><span /></AppSettingsProvider>)
    return {
      moveTo: async (next) => {
        useBranch.mockReturnValue({ branchId: next })
        await act(async () => { view.rerender(<AppSettingsProvider><span /></AppSettingsProvider>) })
      },
    }
  }

  test('geolocation resolving to the branch the settings already belong to causes no second fetch', async () => {
    publicSettingsService.get.mockResolvedValue({ data: { data: { branchId: 'b1', shopName: 'Main' } } })
    let view
    await act(async () => { view = renderWithBranch(null) })
    expect(publicSettingsService.get).toHaveBeenCalledTimes(1)

    await view.moveTo('b1')
    expect(publicSettingsService.get).toHaveBeenCalledTimes(1)
    expect(productService.getCategories).toHaveBeenCalledTimes(1)
  })

  test('resolving to a DIFFERENT branch fetches that branch\'s settings and categories', async () => {
    publicSettingsService.get.mockResolvedValue({ data: { data: { branchId: 'b1', shopName: 'Main' } } })
    let view
    await act(async () => { view = renderWithBranch(null) })
    await view.moveTo('b2')
    expect(publicSettingsService.get).toHaveBeenCalledTimes(2)
    expect(productService.getCategories).toHaveBeenCalledTimes(2)
  })

  test('an older server that does not say which branch the settings are for always re-fetches', async () => {
    publicSettingsService.get.mockResolvedValue({ data: { data: { shopName: 'Main' } } })
    let view
    await act(async () => { view = renderWithBranch(null) })
    await view.moveTo('b1')
    expect(publicSettingsService.get).toHaveBeenCalledTimes(2)
  })
})
