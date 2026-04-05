import { LayoutGrid, Rows } from 'lucide-react'

export default function GridToggle({ compact, onChange }) {
  return (
    <div className="flex items-center gap-1 bg-earth-100 p-1 rounded-xl">
      <button
        onClick={() => onChange(false)}
        title="List view"
        className={`p-2 rounded-lg transition-all ${
          !compact
            ? 'bg-white text-earth-900 shadow-sm'
            : 'text-earth-400 hover:text-earth-600'
        }`}
      >
        <Rows size={16} />
      </button>
      <button
        onClick={() => onChange(true)}
        title="Grid view"
        className={`p-2 rounded-lg transition-all ${
          compact
            ? 'bg-white text-earth-900 shadow-sm'
            : 'text-earth-400 hover:text-earth-600'
        }`}
      >
        <LayoutGrid size={16} />
      </button>
    </div>
  )
}
