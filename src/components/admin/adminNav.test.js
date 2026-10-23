import { describe, it, expect } from 'vitest'
import { navGroupsFor, titleForPath, BUSINESS_NAV, SUPERADMIN_NAV } from './adminNav'

const labels = (user) => navGroupsFor(user).flatMap(g => g.items.map(i => i.label))

describe('navGroupsFor', () => {
  it('gives staff only the order desk', () => {
    expect(labels({ role: 'staff' })).toEqual(['Dashboard', 'Orders', 'Stock'])
  })

  it('gives supervisors operations plus read-side management, but no catalogue or settings', () => {
    const l = labels({ role: 'supervisor' })
    expect(l).toEqual(expect.arrayContaining(['Dashboard', 'Orders', 'Stock', 'Intake', 'Alerts', 'Drivers', 'Customers', 'Coupons', 'Reports']))
    expect(l).not.toContain('Products')
    expect(l).not.toContain('Settings')
  })

  it('gives admins everything business-side', () => {
    const l = labels({ role: 'admin' })
    expect(l).toEqual(expect.arrayContaining(['Products', 'Promotions', 'Broadcast', 'Settings']))
    expect(l).not.toContain('Control Center')
  })

  it('shows eTIMS to a non-admin only when they hold the permission', () => {
    expect(labels({ role: 'supervisor' })).not.toContain('KRA eTIMS')
    expect(labels({ role: 'supervisor', customPermissions: ['manage_etims'] })).toContain('KRA eTIMS')
  })

  it('puts coupons, promotions and broadcasts under Marketing', () => {
    const groups = navGroupsFor({ role: 'admin' })
    const marketing = groups.find(g => g.group === 'Marketing')
    expect(marketing.items.map(i => i.label)).toEqual(['Coupons', 'Promotions', 'Broadcast'])
    // a supervisor only gets the part they can use
    const sup = navGroupsFor({ role: 'supervisor' }).find(g => g.group === 'Marketing')
    expect(sup.items.map(i => i.label)).toEqual(['Coupons'])
  })

  it('drops groups that end up empty', () => {
    const groups = navGroupsFor({ role: 'staff' })
    expect(groups.map(g => g.group)).toEqual(['Operations'])
  })

  it('gives the superadmin their own menu, with business pages marked view-only', () => {
    const groups = navGroupsFor({ role: 'superadmin' })
    expect(groups).toBe(SUPERADMIN_NAV)
    const all = groups.flatMap(g => g.items)
    expect(all.find(i => i.label === 'Control Center')).toBeTruthy()
    for (const label of ['Orders', 'Products', 'Stock', 'Customers', 'Reports']) {
      expect(all.find(i => i.label === label).viewOnly).toBe(true)
    }
    expect(all.find(i => i.label === 'User Management').viewOnly).toBeUndefined()
  })

  it('every nav path is unique within a menu', () => {
    for (const nav of [BUSINESS_NAV, SUPERADMIN_NAV]) {
      const paths = nav.flatMap(g => g.items.map(i => i.to))
      expect(new Set(paths).size).toBe(paths.length)
    }
  })
})

describe('titleForPath', () => {
  it('titles every menu page', () => {
    for (const item of [...BUSINESS_NAV, ...SUPERADMIN_NAV].flatMap(g => g.items)) {
      expect(titleForPath(item.to)).toBe(item.label)
    }
  })

  it('prefers the most specific page: intake is not "Stock"', () => {
    expect(titleForPath('/admin/stock/intake')).toBe('Intake')
    expect(titleForPath('/admin/stock')).toBe('Stock')
  })

  it('titles pages that were falling back to "Admin"', () => {
    expect(titleForPath('/admin/coupons')).toBe('Coupons')
    expect(titleForPath('/admin/promotions')).toBe('Promotions')
    expect(titleForPath('/admin/drivers')).toBe('Drivers')
  })

  it('titles detail and form pages', () => {
    expect(titleForPath('/admin/orders/64f0c0ffee')).toBe('Order Details')
    expect(titleForPath('/admin/orders')).toBe('Orders')
    expect(titleForPath('/admin/products/new')).toBe('New Product')
    expect(titleForPath('/admin/products/abc123/edit')).toBe('Products')
    expect(titleForPath('/admin/customers/abc')).toBe('Customers')
  })

  it('does not match on a bare string prefix', () => {
    expect(titleForPath('/admin/ordersx')).toBe('Admin')
    expect(titleForPath('/admin/nope')).toBe('Admin')
    expect(titleForPath()).toBe('Admin')
  })
})
