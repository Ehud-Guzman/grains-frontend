// Generates src/styles/admin-dark.generated.css: the dark-mode counterpart of every coloured
// Tailwind class the admin UI actually uses (bg-amber-50, text-red-700, border-brand-200 …).
//
// Why generated: the neutral greys (admin-*, earth-*, canvas) flip through CSS variables, but the
// coloured tints are fixed Tailwind colours that cannot. A pale `bg-amber-50` with `text-amber-800`
// is a light-mode idea; in dark mode the tint has to become a translucent wash and the text a light
// tone. Writing ~200 such rules by hand would drift the first time someone adds a class, so this
// script reads the source, and a unit test fails if the committed file is stale.
//
//   npm run gen:dark          write the file
//   npm run gen:dark -- --check   exit 1 if the committed file is out of date
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'src')
const OUT = path.join(SRC, 'styles', 'admin-dark.generated.css')

// Storefront / driver / customer areas never run in dark mode, so their classes are not scanned.
const SKIP_DIRS = ['pages/public', 'pages/customer', 'pages/driver', 'components/layout', 'components/products',
  'components/cart', 'components/checkout', 'components/driver', 'components/lists', 'styles']

// rgb triplets: [300, 400, 500] of each Tailwind hue (brand/shell are this project's own scales).
const HUES = {
  red:     ['252 165 165', '248 113 113', '239 68 68'],
  rose:    ['253 164 175', '251 113 133', '244 63 94'],
  orange:  ['253 186 116', '251 146 60', '249 115 22'],
  amber:   ['252 211 77', '251 191 36', '245 158 11'],
  yellow:  ['253 224 71', '250 204 21', '234 179 8'],
  green:   ['134 239 172', '74 222 128', '34 197 94'],
  emerald: ['110 231 183', '52 211 153', '16 185 129'],
  sky:     ['125 211 252', '56 189 248', '14 165 233'],
  blue:    ['147 197 253', '96 165 250', '59 130 246'],
  indigo:  ['165 180 252', '129 140 248', '99 102 241'],
  violet:  ['196 181 253', '167 139 250', '139 92 246'],
  purple:  ['216 180 254', '192 132 252', '168 85 247'],
  brand:   ['236 173 122', '224 138 74', '196 98 45'],
  shell:   ['143 187 164', '94 156 125', '63 128 95'],
}

// Translucent wash behind a pale tint, by the light-mode shade it replaces.
const BG_ALPHA = { 50: 0.1, 100: 0.16, 200: 0.24 }
const LINE_ALPHA = { 50: 0.18, 100: 0.2, 200: 0.3, 300: 0.4 }

const walk = (dir, out = []) => {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name)
    const rel = path.relative(SRC, full).split(path.sep).join('/')
    if (name.isDirectory()) {
      if (!SKIP_DIRS.some(d => rel === d || rel.startsWith(`${d}/`))) walk(full, out)
    } else if (/\.(jsx?|css)$/.test(name.name) && !/\.test\.jsx?$/.test(name.name) && !SKIP_DIRS.some(d => rel.startsWith(`${d}/`))) {
      out.push(full)
    }
  }
  return out
}

const TOKEN = new RegExp(
  '(?<![\\w:/\\[-])((?:hover:|focus:|group-hover:)?)(bg|text|border|divide|ring)-(' +
  [...Object.keys(HUES), 'white'].join('|') + ')(?:-(50|100|200|300|400|500|600|700|800|900))?(?:/(\\d{1,3}))?(?![\\w-])', 'g')

const esc = (cls) => cls.replace(/[:/.[\]%]/g, m => `\\${m}`)

// The dark-mode declaration for one class, or null when light-mode's value already works on dark.
const declaration = (type, hue, shade, alpha) => {
  const a = alpha === undefined ? 1 : alpha / 100
  if (hue === 'white') {
    // Only a (near) opaque white is a "card" surface. bg-white/10 is a translucent highlight on a
    // dark panel and must stay white.
    if (type !== 'bg' || a < 0.5) return null
    return `background-color: rgb(var(--surface) / ${a})`
  }
  const [c300, c400, c500] = HUES[hue]
  const s = Number(shade)
  if (type === 'bg') {
    if (!BG_ALPHA[s]) return null           // 400+ are solid accents (dots, buttons): unchanged
    return `background-color: rgb(${c500} / ${+(BG_ALPHA[s] * a).toFixed(3)})`
  }
  if (type === 'text') {
    if (s <= 400) return null
    return `color: rgb(${s >= 700 ? c300 : hue === 'brand' || hue === 'shell' ? c300 : c400})`
  }
  // border / divide / ring
  if (!LINE_ALPHA[s]) return null
  const colour = `rgb(${c500} / ${+(LINE_ALPHA[s] * a).toFixed(3)})`
  return type === 'border' ? `border-color: ${colour}` : type === 'ring' ? `--tw-ring-color: ${colour}` : `border-color: ${colour}`
}

const selectorFor = (prefix, type, cls) => {
  const base = esc(cls)
  const target = prefix === 'hover:' ? `.dark .${base}:hover`
    : prefix === 'focus:' ? `.dark .${base}:focus`
    : prefix === 'group-hover:' ? `.dark .group:hover .${base}`
    : `.dark .${base}`
  return type === 'divide' ? `${target} > :not([hidden]) ~ :not([hidden])` : target
}

const generate = () => {
  const used = new Map()
  for (const file of walk(SRC)) {
    const text = fs.readFileSync(file, 'utf8')
    for (const m of text.matchAll(TOKEN)) {
      const [whole, prefix, type, hue, shade, alpha] = m
      if (hue !== 'white' && !shade) continue
      used.set(whole, { prefix, type, hue, shade, alpha: alpha === undefined ? undefined : Number(alpha) })
    }
  }
  const rules = []
  for (const [cls, { prefix, type, hue, shade, alpha }] of [...used].sort(([a], [b]) => a.localeCompare(b))) {
    const bare = cls.slice(prefix.length)
    const decl = declaration(type, hue, shade, alpha)
    if (!decl) continue
    // bg-white / hover:bg-white etc. are hand-written in admin-dark.css only when un-suffixed;
    // everything else comes from here.
    rules.push(`${selectorFor(prefix, type, bare)} { ${decl}; }`)
  }
  return [
    '/* GENERATED by scripts/generate-admin-dark.cjs — do not edit by hand.',
    '   Run `npm run gen:dark` after adding a coloured class; a unit test fails while this file is stale. */',
    '@media screen {',
    ...rules.map(r => `  ${r}`),
    '}',
    '',
  ].join('\n')
}

if (require.main === module) {
  const next = generate()
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : ''
    if (current !== next) { console.error('admin-dark.generated.css is out of date: run `npm run gen:dark`'); process.exit(1) }
    console.log('admin-dark.generated.css is up to date')
  } else {
    fs.mkdirSync(path.dirname(OUT), { recursive: true })
    fs.writeFileSync(OUT, next)
    console.log(`wrote ${path.relative(ROOT, OUT)} (${next.split('\n').length - 5} rules)`)
  }
}

module.exports = { generate, OUT }
