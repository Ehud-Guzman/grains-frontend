import { getStatusBadgeClass, getStatusLabel } from '../../utils/helpers'
export default function StatusBadge({ status }) {
  return <span className={getStatusBadgeClass(status)}>{getStatusLabel(status)}</span>
}
