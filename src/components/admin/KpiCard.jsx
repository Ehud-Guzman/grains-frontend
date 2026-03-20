import { Link } from 'react-router-dom'

export default function KpiCard({ icon: Icon, label, value, sub, color = 'brand', link, badge, badgeColor = 'red' }) {
  const colors = {
    brand: 'bg-brand-50 text-brand-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  }
  const badgeColors = {
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
  }

  const content = (
    <div className="bg-white rounded-xl border border-admin-200 p-5 hover:shadow-admin-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon size={20} />
        </div>
        {badge !== undefined && badge > 0 && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeColors[badgeColor]}`}>
            {badge}
          </span>
        )}
      </div>
      <p className="text-2xl font-admin font-bold text-admin-900 leading-tight">{value}</p>
      <p className="text-admin-500 text-sm mt-0.5">{label}</p>
      {sub && <p className="text-admin-400 text-xs mt-1">{sub}</p>}
    </div>
  )

  return link ? <Link to={link}>{content}</Link> : content
}
