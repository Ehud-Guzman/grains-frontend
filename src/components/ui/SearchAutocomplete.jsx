import { useState, useEffect, useId, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { useDebounce } from '../../hooks/useDebounce'
import { useApiQuery } from '../../hooks/useApiQuery'
import { productService } from '../../services/product.service'

/**
 * SearchAutocomplete — accessible typeahead.
 *
 * ARIA wiring added: the input is now a real `combobox` (role, aria-expanded,
 * aria-controls, aria-autocomplete, aria-activedescendant), the dropdown is a
 * `listbox` and each suggestion is an `option` with `aria-selected`. Before
 * this, ArrowUp/ArrowDown/Enter worked but nothing was announced, so a screen
 * reader user had no idea a suggestion list had appeared or which item was
 * highlighted — on the app's primary product-discovery control.
 *
 * Suggestions are fetched through useApiQuery now, so the request is cancelled
 * on every keystroke and stale responses are discarded (previously a fast typist
 * could see results for an earlier query).
 *
 * Props:
 *  value        — controlled input value
 *  onChange(v)  — called on every keystroke
 *  onSearch(q)  — called when user commits a search (Enter or suggestion click)
 *  placeholder  — input placeholder
 *  darkMode     — use dark (navbar) styles
 *  autoFocus    — focus on mount
 *  label        — accessible name when there is no visible <label>
 *  className    — wrapper class
 */
export default function SearchAutocomplete({
  value,
  onChange,
  onSearch,
  placeholder = 'Search products…',
  darkMode = false,
  autoFocus = false,
  label = 'Search products',
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const debouncedValue = useDebounce(value, 220)
  const containerRef = useRef()
  const inputRef = useRef()

  const reactId = useId()
  const listboxId = `search-listbox-${reactId}`
  const optionId = (i) => `search-option-${reactId}-${i}`

  const query = debouncedValue.trim()
  const { data: suggestions } = useApiQuery(
    ({ signal }) => {
      if (query.length < 2) return Promise.resolve(null)
      return productService.getSuggestions(query, { signal })
    },
    [query],
    { enabled: query.length >= 2, initialData: [] },
  )
  const results = suggestions || []

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  // Open/close the listbox as results arrive, and reset the highlight whenever
  // the query changes so Enter can't commit a stale suggestion.
  useEffect(() => {
    setActiveIndex(-1)
    setOpen(query.length >= 2 && results.length > 0)
  }, [query, results.length])

  // Close dropdown on outside click
  useEffect(() => {
    const fn = e => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const commit = (nextQuery) => {
    setOpen(false)
    setActiveIndex(-1)
    onSearch?.(nextQuery)
  }

  const handleSelect = (suggestion) => {
    onChange(suggestion.name)
    commit(suggestion.name)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, results.length - 1))
      setOpen(true)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && results[activeIndex]) {
        handleSelect(results[activeIndex])
      } else if (value.trim()) {
        commit(value.trim())
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  const highlightMatch = (text, matchQuery) => {
    if (!matchQuery || !matchQuery.trim()) return text
    const idx = text.toLowerCase().indexOf(matchQuery.trim().toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-brand-100 text-brand-900 font-semibold not-italic px-0.5 rounded-sm">
          {text.slice(idx, idx + matchQuery.trim().length)}
        </mark>
        {text.slice(idx + matchQuery.trim().length)}
      </>
    )
  }

  const inputCls = darkMode
    ? 'bg-earth-800 text-cream placeholder-earth-500 border-earth-700 focus:border-brand-500'
    : 'bg-white text-earth-800 placeholder-earth-400 border-earth-200 shadow-sm focus:ring-2 focus:ring-brand-400 focus:border-transparent'

  const showListbox = open && results.length > 0

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Input */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-earth-400 pointer-events-none" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label={label}
          aria-expanded={showListbox}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={showListbox && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          value={value}
          onChange={e => {
            onChange(e.target.value)
            if (e.target.value.trim().length < 2) setOpen(false)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setOpen(true) }}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full pl-10 pr-12 py-2.5 border rounded-xl text-sm font-body transition-all focus:outline-none ${inputCls}`}
        />
        {value && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => { onChange(''); setOpen(false); onSearch?.('') }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 min-w-[36px] min-h-[36px]
              flex items-center justify-center rounded-full text-earth-400 hover:text-earth-700
              hover:bg-earth-100 transition-colors"
          >
            <X size={13} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showListbox && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Search suggestions"
          className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-earth-200
            shadow-[0_8px_32px_rgba(0,0,0,0.12)] z-50 overflow-hidden list-none m-0 p-0"
        >
          {results.map((s, i) => (
            <li
              key={s._id}
              id={optionId(i)}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={e => { e.preventDefault(); handleSelect(s) }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer transition-colors ${
                i === activeIndex ? 'bg-brand-50' : 'hover:bg-earth-50'
              }`}
            >
              <Search size={13} className="text-earth-300 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-body text-earth-800 leading-snug truncate">
                  {highlightMatch(s.name, value)}
                </p>
                {s.category && (
                  <p className="text-xs text-earth-400 font-body mt-0.5">{s.category}</p>
                )}
              </div>
            </li>
          ))}
          <li className="border-t border-earth-100 px-4 py-2 bg-earth-50/80 list-none">
            <p className="text-[11px] text-earth-400 font-body">↵ Enter to search all results</p>
          </li>
        </ul>
      )}
    </div>
  )
}

