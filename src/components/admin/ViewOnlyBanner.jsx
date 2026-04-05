import { Eye } from 'lucide-react'

export default function ViewOnlyBanner() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 mb-5 bg-amber-50 border border-amber-200
      rounded-xl text-amber-800">
      <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Eye size={14} className="text-amber-600" />
      </div>
      <div>
        <p className="text-sm font-admin font-bold leading-tight">Superadmin — View Only</p>
        <p className="text-xs font-admin text-amber-600 mt-0.5">
          You can read all business data but cannot perform operations. Use branch staff accounts for day-to-day actions.
        </p>
      </div>
    </div>
  )
}
