import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { useDebounce } from '../../hooks/useDebounce'
import { productService } from '../../services/product.service'

/**
 * SearchAutocomplete
 *
 * Props:
 *  value        — controlled input value
 *  onChange(v)  — called on every keystroke
 *  onSearch(q)  — called when user commits a search (Enter or suggestion click)
 *  placeholder  — input placeholder
 *  darkMode     — use dark (navbar) styles
 *  autoFocus    — focus on mount
 *  className    — wrapper class
 */
export default function SearchAutocomplete({
  value,
  onChange,
  onSearch,
  placeholder = 'Search products…',
  darkMode = false,
  autoFocus = false,
  className = '',
}) {
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const debouncedValue = useDebounce(value, 220)
  const containerRef = useRef()
  const inputRef = useRef()

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  // Fetch suggestions when debounced value changes
  useEffect(() => {
    if (debouncedValue.trim().length < 2) {
      setSuggestions([])
      setOpen(false)
      return
    }
    let cancelled = false
    productService.getSuggestions(debouncedValue)
      .then(res => {
        if (cancelled) return
        const data = res.data?.data || []
        setSuggestions(data)
        setOpen(data.length > 0)
        setActiveIndex(-1)
      })
      .catch(() => { if (!cancelled) setSuggestions([]) })
    return () => { cancelled = true }
  }, [debouncedValue])

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

  const commit = (query) => {
    setOpen(false)
    setActiveIndex(-1)
    onSearch?.(query)
  }

  const handleSelect = (suggestion) => {
    onChange(suggestion.name)
    commit(suggestion.name)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1))
      setOpen(true)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        handleSelect(suggestions[activeIndex])
      } else if (value.trim()) {
        commit(value.trim())
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  const highlightMatch = (text, query) => {
    if (!query || !query.trim()) return text
    const idx = text.toLowerCase().indexOf(query.trim().toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-brand-100 text-brand-900 font-semibold not-italic px-0.5 rounded-sm">
          {text.slice(idx, idx + query.trim().length)}
        </mark>
        {text.slice(idx + query.trim().length)}
      </>
    )
  }

  const inputCls = darkMode
    ? 'bg-earth-800 text-cream placeholder-earth-500 border-earth-700 focus:border-brand-500'
    : 'bg-white text-earth-800 placeholder-earth-400 border-earth-200 shadow-sm focus:ring-2 focus:ring-brand-400 focus:border-transparent'

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Input */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-earth-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => {
            onChange(e.target.value)
            if (e.target.value.trim().length < 2) setOpen(false)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full pl-10 pr-9 py-2.5 border rounded-xl text-sm font-body transition-all focus:outline-none ${inputCls}`}
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); setSuggestions([]); setOpen(false); onSearch?.('') }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-earth-400 hover:text-earth-700 hover:bg-earth-100 transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-earth-200 shadow-[0_8px_32px_rgba(0,0,0,0.12)] z-50 overflow-hidden">
          {suggestions.map((s, i) => (
            <button
              key={s._id}
              type="button"
              onMouseDown={e => { e.preventDefault(); handleSelect(s) }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                i === activeIndex ? 'bg-brand-50' : 'hover:bg-earth-50'
              }`}
            >
              <Search size={13} className="text-earth-300 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-body text-earth-800 leading-snug truncate">
                  {highlightMatch(s.name, value)}
                </p>
                {s.category && (
                  <p className="text-xs text-earth-400 font-body mt-0.5">{s.category}</p>
                )}
              </div>
            </button>
          ))}
          <div className="border-t border-earth-100 px-4 py-2 bg-earth-50/80">
            <p className="text-[11px] text-earth-400 font-body">↵ Enter to search all results</p>
          </div>
        </div>
      )}
    </div>
  )
}
