const CLOUDINARY_UPLOAD_MARKER = '/image/upload/'

export function getOptimizedImageUrl(url, options = {}) {
  if (!url || typeof url !== 'string') return url || null

  const {
    width,
    height,
    fit = 'fill',
    quality = 'auto',
    format = 'auto',
  } = options

  if (!url.includes(CLOUDINARY_UPLOAD_MARKER)) {
    return url
  }

  const transforms = [`f_${format}`, `q_${quality}`]

  if (width) transforms.push(`w_${width}`)
  if (height) transforms.push(`h_${height}`)
  if (width || height) transforms.push(`c_${fit}`)

  const [prefix, suffix] = url.split(CLOUDINARY_UPLOAD_MARKER)
  return `${prefix}${CLOUDINARY_UPLOAD_MARKER}${transforms.join(',')}/${suffix}`
}
