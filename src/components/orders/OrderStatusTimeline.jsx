import { formatDateTime, getStatusLabel } from '../../utils/helpers'
import { Check, Clock } from 'lucide-react'

export function OrderStatusTimeline({ history = [], currentStatus }) {
  return (
    <div className="space-y-3">
      {[...history].reverse().map((entry, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0
              ${i === 0 ? 'bg-brand-500' : 'bg-earth-100'}`}>
              {i === 0
                ? <Check size={13} className="text-white" />
                : <Clock size={13} className="text-earth-400" />
              }
            </div>
            {i < history.length - 1 && (
              <div className="w-0.5 bg-earth-200 flex-1 mt-1 min-h-[16px]" />
            )}
          </div>
          <div className="pb-3">
            <p className={`text-sm font-medium ${i === 0 ? 'text-brand-700' : 'text-earth-700'}`}>
              {getStatusLabel(entry.status)}
            </p>
            {entry.note && <p className="text-xs text-earth-500 mt-0.5">{entry.note}</p>}
            <p className="text-xs text-earth-400 mt-0.5">{formatDateTime(entry.changedAt)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
