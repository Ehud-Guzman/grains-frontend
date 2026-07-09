import { describe, it, expect } from 'vitest'
import { getOptimizedImageUrl } from './image'

const CLOUDINARY_URL = 'https://res.cloudinary.com/demo/image/upload/v123/products/maize.jpg'

describe('getOptimizedImageUrl', () => {
  it('returns null for missing input', () => {
    expect(getOptimizedImageUrl(null)).toBeNull()
    expect(getOptimizedImageUrl(undefined)).toBeNull()
    expect(getOptimizedImageUrl('')).toBeNull()
  })

  it('passes non-Cloudinary URLs through untouched', () => {
    expect(getOptimizedImageUrl('/beans.webp', { width: 480 })).toBe('/beans.webp')
    expect(getOptimizedImageUrl('https://example.com/x.jpg', { width: 480 }))
      .toBe('https://example.com/x.jpg')
  })

  it('injects f_auto,q_auto for Cloudinary URLs with no dimensions', () => {
    expect(getOptimizedImageUrl(CLOUDINARY_URL)).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v123/products/maize.jpg'
    )
  })

  it('adds width, height and crop mode when dimensions are given', () => {
    expect(getOptimizedImageUrl(CLOUDINARY_URL, { width: 448, height: 288 })).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_448,h_288,c_fill/v123/products/maize.jpg'
    )
  })

  it('adds the crop mode with a single dimension and honours a custom fit', () => {
    expect(getOptimizedImageUrl(CLOUDINARY_URL, { width: 480 })).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_480,c_fill/v123/products/maize.jpg'
    )
    expect(getOptimizedImageUrl(CLOUDINARY_URL, { width: 480, fit: 'fit' })).toContain(',c_fit/')
  })
})
