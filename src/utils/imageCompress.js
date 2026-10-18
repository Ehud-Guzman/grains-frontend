// Shrink a camera photo before it is uploaded.
//
// A modern phone camera produces 4-12MB JPEGs; the server accepts 5MB. A driver standing at a customer's
// gate was told "Photo must be under 5 MB" and had no way to shrink it, so proof of delivery was skipped.
// Proof-of-delivery only needs to show the goods and the place, so the long edge is scaled down to
// 1600px and re-encoded as JPEG - typically 250-500KB, which also spends far less of a driver's mobile
// data. Anything that goes wrong (no canvas, undecodable file) falls back to the original file, so
// this can only ever help.

export const MAX_EDGE = 1600
export const JPEG_QUALITY = 0.8
// Photos that are already small are sent untouched - re-encoding would only lose quality.
export const COMPRESS_ABOVE_BYTES = 1024 * 1024

// The size to draw at: the long edge limited to maxEdge, aspect ratio kept, never scaled up.
export const fitWithin = (width, height, maxEdge = MAX_EDGE) => {
  const longest = Math.max(width, height)
  if (!(longest > maxEdge)) return { width, height }
  const scale = maxEdge / longest
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

export const needsCompression = (file) => (
  !!file && typeof file.type === 'string' && file.type.startsWith('image/') && file.size > COMPRESS_ABOVE_BYTES
)

// Decode with the camera's orientation applied, so a portrait photo is not saved sideways.
const decodeImage = async (file) => {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    return { width: bitmap.width, height: bitmap.height, source: bitmap, release: () => bitmap.close?.() }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = reject
      el.src = url
    })
    return { width: img.naturalWidth || img.width, height: img.naturalHeight || img.height, source: img, release: () => {} }
  } finally {
    URL.revokeObjectURL(url)
  }
}

const makeCanvas = (width, height) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

const jpegName = (name) => `${String(name || 'photo').replace(/\.[^./\\]+$/, '')}.jpg`

/**
 * Resolves to a File no bigger than the original: the shrunken JPEG when that is actually smaller,
 * otherwise the original. Never rejects.
 * `decode` / `canvasFactory` are injectable so the logic can be tested without a browser.
 */
export const compressImage = async (file, {
  maxEdge = MAX_EDGE,
  quality = JPEG_QUALITY,
  decode = decodeImage,
  canvasFactory = makeCanvas,
} = {}) => {
  if (!needsCompression(file)) return file

  try {
    const decoded = await decode(file)
    const { width, height } = fitWithin(decoded.width, decoded.height, maxEdge)
    const canvas = canvasFactory(width, height)
    canvas.getContext('2d').drawImage(decoded.source, 0, 0, width, height)
    decoded.release?.()

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], jpegName(file.name), { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    return file
  }
}
