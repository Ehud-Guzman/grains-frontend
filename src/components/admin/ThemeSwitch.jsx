import { Sun, Moon, Monitor } from 'lucide-react'
import { useAdminTheme } from './adminTheme'

// The theme control that lives in the sidebar footer (the sidebar is dark in both themes, so
// this is styled once). Expanded: a three-way segmented switch. Collapsed: one button that flips
// between light and dark.

const OPTIONS = [
  { value: 'light',  label: 'Light', icon: Sun },
  { value: 'dark',   label: 'Dark',  icon: Moon },
  { value: 'system', label: 'Auto',  icon: Monitor },
]

// `compact` drops the words and keeps the icons (the label stays as the accessible name and the tooltip), so the
// switch can share a row with the collapse button on the desktop sidebar.
export default function ThemeSwitch({ collapsed, compact = false }) {
  const { preference, resolved, setPreference } = useAdminTheme()

  if (collapsed) {
    const next = resolved === 'dark' ? 'light' : 'dark'
    const Icon = resolved === 'dark' ? Moon : Sun
    return (
      <button type="button" onClick={() => setPreference(next)}
        aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`}
        className="flex items-center justify-center rounded-lg text-shell-300/70 hover:text-white hover:bg-white/[.06]
          w-full min-h-[40px] transition-colors">
        <Icon size={16} aria-hidden="true" />
      </button>
    )
  }

  return (
    <div role="group" aria-label="Colour theme"
      className="flex-1 min-w-0 flex items-center rounded-lg bg-white/[.05] ring-1 ring-inset ring-white/[.06] p-0.5">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const on = preference === value
        return (
          <button key={value} type="button" onClick={() => setPreference(value)}
            aria-pressed={on} aria-label={label}
            title={value === 'system' ? 'Follow this device' : `${label} theme`}
            className={`flex-1 flex items-center justify-center gap-1.5 min-h-[32px] rounded-md text-[11.5px] font-admin font-medium
              transition-colors ${on ? 'bg-shell-700 text-white shadow-sm' : 'text-shell-300/70 hover:text-white'}`}>
            <Icon size={compact ? 14 : 13} aria-hidden="true" />
            {!compact && <span>{label}</span>}
          </button>
        )
      })}
    </div>
  )
}
