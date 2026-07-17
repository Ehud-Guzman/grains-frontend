import { getStatusBadgeClass, getStatusLabel } from '../../utils/helpers'
export default function StatusBadge({ status, deliveryMethod }) {
  return <span className={getStatusBadgeClass(status)}>{getStatusLabel(status, deliveryMethod)}</span>
}
