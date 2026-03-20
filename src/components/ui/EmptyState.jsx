import { ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function EmptyState({ icon, title, message, action, actionLabel }) {
  return (
    <div className="card p-12 text-center">
      <div className="flex justify-center mb-4">
        {icon || <ShoppingBag size={40} className="text-earth-300" />}
      </div>
      <p className="font-display text-xl text-earth-700 mb-2">{title}</p>
      {message && <p className="text-earth-400 text-sm mb-6">{message}</p>}
      {action && typeof action === 'string' && (
        <Link to={action} className="btn-primary">{actionLabel || 'Browse'}</Link>
      )}
    </div>
  )
}