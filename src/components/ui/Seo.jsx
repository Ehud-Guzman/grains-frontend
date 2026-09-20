import { useEffect } from 'react'
import { SITE_URL, absoluteUrl } from '../../utils/site'

// ── Seo ───────────────────────────────────────────────────────────────────────
// Before this component the app had ZERO `document.title` assignments in ~27,800
// lines: all 62 routes served the single <title>/description baked into
// index.html, so browser tabs and bookmarks were indistinguishable, product
// pages could never rank for their own names, and a WhatsApp share of
// /shop/<id> showed the generic home card — in a business whose main
// acquisition channel is WhatsApp.
//
// Implemented imperatively (no head-management dependency) following the same
// pattern ProductPage already used for JSON-LD injection, including cleanup.
//
// On unmount it RESTORES the previous values rather than deleting the tags.
// That is deliberate: index.html ships static og:*/twitter:* tags as the
// fallback for crawlers and non-JS clients, and removing them would leave those
// clients with no metadata at all.

const MANAGED = 'data-seo-managed'

function upsertMeta(attr, key, content) {
  if (!content) return null
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  let previous = null
  if (el) {
    previous = { el, value: el.getAttribute('content') }
  } else {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    el.setAttribute(MANAGED, 'true')
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
  return previous
}

function upsertLink(rel, href) {
  if (!href) return null
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  let previous = null
  if (el) {
    previous = { el, value: el.getAttribute('href') }
  } else {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    el.setAttribute(MANAGED, 'true')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
  return previous
}

function restore(previous) {
  if (!previous) return
  const { el, value } = previous
  if (value == null) el.remove()
  else if (el.tagName === 'META') el.setAttribute('content', value)
  else if (el.tagName === 'LINK') el.setAttribute('href', value)
}

/**
 * @param {object} props
 * @param {string} props.title      Page title (site name is appended automatically)
 * @param {string} [props.description]
 * @param {string} [props.path]     Site-relative path for canonical/og:url. Omit to use the current URL.
 * @param {string} [props.image]    Absolute or site-relative OG image.
 * @param {'website'|'product'|'article'} [props.type]
 * @param {boolean} [props.noindex] Emit robots noindex,nofollow (private/transactional routes)
 * @param {object} [props.jsonLd]   Structured-data object, injected as its own managed <script>
 */
export default function Seo({
  title,
  description,
  path,
  image,
  type = 'website',
  noindex = false,
  jsonLd,
}) {
  useEffect(() => {
    const previousTitle = document.title
    const restoreFns = []

    if (title) document.title = title.includes('Vittorios') ? title : `${title} | Vittorios Grains & Cereals`

    const resolvedPath = path ?? (typeof window !== 'undefined' ? window.location.pathname : '/')
    const canonical = absoluteUrl(resolvedPath)
    const resolvedImage = image
      ? (image.startsWith('http') ? image : absoluteUrl(image))
      : `${SITE_URL}/og-image.jpeg`

    restoreFns.push(upsertMeta('name', 'description', description))
    restoreFns.push(upsertLink('canonical', canonical))
    restoreFns.push(upsertMeta('property', 'og:title', document.title))
    restoreFns.push(upsertMeta('property', 'og:description', description))
    restoreFns.push(upsertMeta('property', 'og:url', canonical))
    restoreFns.push(upsertMeta('property', 'og:type', type))
    restoreFns.push(upsertMeta('property', 'og:image', resolvedImage))
    restoreFns.push(upsertMeta('name', 'twitter:title', document.title))
    restoreFns.push(upsertMeta('name', 'twitter:description', description))
    restoreFns.push(upsertMeta('name', 'twitter:image', resolvedImage))
    if (noindex) restoreFns.push(upsertMeta('name', 'robots', 'noindex, nofollow'))

    let script = null
    if (jsonLd) {
      script = document.createElement('script')
      script.type = 'application/ld+json'
      script.setAttribute(MANAGED, 'true')
      script.text = JSON.stringify(jsonLd)
      document.head.appendChild(script)
    }

    return () => {
      document.title = previousTitle
      restoreFns.forEach(restore)
      if (script && script.parentNode) script.parentNode.removeChild(script)
    }
  }, [title, description, path, image, type, noindex, jsonLd])

  return null
}
