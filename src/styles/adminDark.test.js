import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import fs from 'node:fs'

const require = createRequire(import.meta.url)
const { generate, OUT } = require('../../scripts/generate-admin-dark.cjs')

describe('admin dark-mode stylesheet', () => {
  it('is up to date with the colour classes used in the admin', () => {
    // Fails the first time someone adds, say, `bg-purple-50` to an admin page without a dark
    // counterpart. Fix: run `npm run gen:dark` and commit the result.
    const committed = fs.readFileSync(OUT, 'utf8')
    expect(committed, 'src/styles/admin-dark.generated.css is stale: run `npm run gen:dark`').toBe(generate())
  })

  it('turns pale tints into translucent washes and dark text into light text', () => {
    const css = generate()
    expect(css).toMatch(/\.dark \.bg-amber-50 \{ background-color: rgb\(245 158 11 \/ 0\.1\); \}/)
    expect(css).toMatch(/\.dark \.text-red-700 \{ color: rgb\(252 165 165\); \}/)
    expect(css).toMatch(/\.dark \.border-amber-200 \{ border-color: rgb\(245 158 11 \/ 0\.3\); \}/)
  })

  it('leaves translucent white highlights alone and only restyles opaque white cards', () => {
    const css = generate()
    expect(css).not.toMatch(/\.bg-white\\\/10 /)
    expect(css).toMatch(/\.dark \.bg-white\\\/95 \{ background-color: rgb\(var\(--surface\) \/ 0\.95\); \}/)
  })

  it('is wrapped in @media screen so printing and PDFs stay on white', () => {
    expect(generate()).toContain('@media screen {')
    // vitest runs from the project root
    expect(fs.readFileSync('src/styles/admin-dark.css', 'utf8')).toContain('@media screen {')
  })
})
