import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, CornerDownLeft, ShoppingCart, Sun, Moon, Monitor } from 'lucide-react'
import Modal from '../ui/Modal'
import { navGroupsFor } from './adminNav'
import { setThemePreference } from './adminTheme'

// Jump-to for the admin panel (Ctrl/⌘ + K): every page this role can open, plus a shortcut
// that searches orders by reference, customer name or phone, plus theme commands. Pages come from the same nav
// data as the sidebar, so the palette can never offer a page the sidebar hides.

const LIST_ID = 'command-palette-list'
const TITLE_ID = 'command-palette-title'

const optionId = (i) => `command-palette-option-${i}`

// Commands (not pages): offered when the text mentions the theme, so "dark" flips it from the keyboard.
const THEME_COMMANDS = [
  { id: 'theme-dark',   icon: Moon,    label: 'Dark theme',          run: () => setThemePreference('dark') },
  { id: 'theme-light',  icon: Sun,     label: 'Light theme',         run: () => setThemePreference('light') },
  { id: 'theme-system', icon: Monitor, label: 'Match this device',   run: () => setThemePreference('system') },
].map(c => ({ ...c, hint: 'Appearance', keywords: 'theme dark light mode appearance night auto system device' }))

export default function CommandPalette({ user, onClose }) {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const q = query.trim()

  const results = useMemo(() => {
    const needle = q.toLowerCase()
    const pages = navGroupsFor(user)
      .flatMap(g => g.items.map(item => ({ ...item, group: g.group })))
      .filter(item => !needle || item.label.toLowerCase().includes(needle) || item.group.toLowerCase().includes(needle))
      .map(item => ({
        id: item.to, icon: item.icon, label: item.label, hint: item.group, to: item.to,
      }))
    const commands = needle.length >= 2
      ? THEME_COMMANDS.filter(c => c.keywords.split(' ').some(k => k.startsWith(needle) || needle.startsWith(k)) || c.label.toLowerCase().includes(needle))
      : []
    const orderSearch = q
      ? [{ id: 'search-orders', icon: ShoppingCart, label: `Search orders for “${q}”`,
          hint: 'Reference, customer or phone', to: `/admin/orders?search=${encodeURIComponent(q)}` }]
      : []
    // Pages first, then commands, then the order search as the catch-all: someone typing
    // "NAI-2026-0140" matches no page, so the order search is simply what is left.
    return [...pages, ...commands, ...orderSearch]
  }, [q, user])

  const current = Math.min(active, Math.max(results.length - 1, 0))

  const choose = (item) => {
    if (!item) return
    onClose()
    if (item.run) item.run()
    else navigate(item.to)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(results.length ? (current + 1) % results.length : 0)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(results.length ? (current - 1 + results.length) % results.length : 0)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(results[current])
    }
  }

  return (
    <Modal onClose={onClose} labelledBy={TITLE_ID} placement="top" initialFocusRef={inputRef}
      backdropClassName="bg-shell-950/50 backdrop-blur-[2px]"
      panelClassName="bg-white w-full sm:max-w-xl sm:mt-[10vh] rounded-b-2xl sm:rounded-2xl shadow-2xl border border-admin-200 max-h-[80vh] pt-safe">
      <h2 id={TITLE_ID} className="sr-only">Search pages and orders</h2>

      <div className="flex items-center gap-3 px-4 border-b-2 border-admin-100 focus-within:border-shell-400 transition-colors flex-shrink-0">
        <Search size={17} className="text-admin-500 flex-shrink-0" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={LIST_ID}
          aria-activedescendant={results.length ? optionId(current) : undefined}
          aria-autocomplete="list"
          aria-label="Search pages and orders"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActive(0) }}
          onKeyDown={onKeyDown}
          placeholder="Go to a page, or search orders…"
          className="flex-1 min-w-0 py-4 text-[15px] font-admin text-admin-900 placeholder:text-admin-500 bg-transparent outline-none focus-visible:outline-none"
        />
        <kbd className="hidden sm:inline text-[11px] font-admin font-medium text-admin-500 border border-admin-200 rounded-md px-1.5 py-0.5">Esc</kbd>
      </div>

      <ul id={LIST_ID} role="listbox" aria-label="Results" className="overflow-y-auto p-2">
        {results.map((item, i) => {
          const Icon = item.icon
          const on = i === current
          return (
            // Keyboard use goes through the combobox input (arrows + Enter); this click is for the mouse.
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events
            <li key={item.id} id={optionId(i)} role="option" aria-selected={on}
              onMouseMove={() => { if (!on) setActive(i) }}
              onClick={() => choose(item)}
              className={`flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl cursor-pointer transition-colors ${
                on ? 'bg-shell-50 text-shell-800' : 'text-admin-700'
              }`}>
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${on ? 'bg-white text-shell-600' : 'bg-admin-100 text-admin-500'}`}>
                <Icon size={15} aria-hidden="true" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-admin font-semibold truncate">{item.label}</span>
                <span className="block text-xs font-admin text-admin-500 truncate">{item.hint}</span>
              </span>
              {on && <CornerDownLeft size={14} className="text-shell-500 flex-shrink-0" aria-hidden="true" />}
            </li>
          )
        })}
        {results.length === 0 && (
          <li role="presentation" className="px-3 py-8 text-center text-sm font-admin text-admin-500">Nothing to show</li>
        )}
      </ul>
    </Modal>
  )
}
