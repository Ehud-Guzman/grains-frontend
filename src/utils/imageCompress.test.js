import { describe, it, expect, vi } from 'vitest'
import { fitWithin, needsCompression, compressImage, COMPRESS_ABOVE_BYTES, MAX_EDGE } from './imageCompress'

// File objects whose reported size we control without allocating megabytes.
const fakeFile = (size, { type = 'image/jpeg', name = 'IMG_2041.JPG' } = {}) => {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('fitWithin', () => {
  it('scales the long edge down to the limit and keeps the aspect ratio', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 })
    expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: 1600 })
  })

  it('never scales up', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 })
    expect(fitWithin(MAX_EDGE, 100)).toEqual({ width: MAX_EDGE, height: 100 })
  })

  it('never produces a zero-sized canvas', () => {
    expect(fitWithin(100000, 10)).toEqual({ width: 1600, height: 1 })
  })
})

describe('needsCompression', () => {
  it('only touches images above the size threshold', () => {
    expect(needsCompression(fakeFile(COMPRESS_ABOVE_BYTES + 1))).toBe(true)
    expect(needsCompression(fakeFile(COMPRESS_ABOVE_BYTES))).toBe(false)
    expect(needsCompression(fakeFile(8_000_000, { type: 'application/pdf' }))).toBe(false)
    expect(needsCompression(null)).toBe(false)
  })
})

describe('compressImage', () => {
  // A stand-in canvas/decoder so the logic runs without a browser.
  const harness = ({ width = 4000, height = 3000, outputBytes = 300_000, toBlob } = {}) => {
    const draw = vi.fn()
    const release = vi.fn()
    const canvasFactory = vi.fn((w, h) => ({
      width: w, height: h,
      getContext: () => ({ drawImage: draw }),
      toBlob: toBlob || ((cb, type, quality) => cb(new Blob([new Uint8Array(outputBytes)], { type }))),
    }))
    const decode = vi.fn(async () => ({ width, height, source: 'bitmap', release }))
    return { draw, release, canvasFactory, decode }
  }

  it('returns small photos untouched, without decoding them', async () => {
    const h = harness()
    const file = fakeFile(400_000)
    expect(await compressImage(file, h)).toBe(file)
    expect(h.decode).not.toHaveBeenCalled()
  })

  it('shrinks a big camera photo to a smaller JPEG', async () => {
    const h = harness()
    const file = fakeFile(9_000_000, { name: 'IMG_2041.HEIC.JPG' })

    const out = await compressImage(file, h)

    expect(out).not.toBe(file)
    expect(out.type).toBe('image/jpeg')
    expect(out.name).toBe('IMG_2041.HEIC.jpg')
    expect(out.size).toBe(300_000)
    expect(h.canvasFactory).toHaveBeenCalledWith(1600, 1200)
    expect(h.draw).toHaveBeenCalledWith('bitmap', 0, 0, 1600, 1200)
    expect(h.release).toHaveBeenCalled()
  })

  it('keeps the original when re-encoding would not make it smaller', async () => {
    const h = harness({ outputBytes: 9_500_000 })
    const file = fakeFile(9_000_000)
    expect(await compressImage(file, h)).toBe(file)
  })

  it('falls back to the original when the image cannot be decoded', async () => {
    const h = harness()
    h.decode.mockRejectedValue(new Error('unsupported image'))
    const file = fakeFile(9_000_000)
    expect(await compressImage(file, h)).toBe(file)
  })

  it('falls back to the original when the canvas cannot export', async () => {
    const h = harness({ toBlob: (cb) => cb(null) })
    const file = fakeFile(9_000_000)
    expect(await compressImage(file, h)).toBe(file)
  })

  it('honours custom limits', async () => {
    const h = harness({ width: 2000, height: 1000 })
    await compressImage(fakeFile(5_000_000), { ...h, maxEdge: 1000 })
    expect(h.canvasFactory).toHaveBeenCalledWith(1000, 500)
  })
})
