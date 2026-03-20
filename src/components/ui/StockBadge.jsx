import { getStockStatus, getStockBadgeClass, getStockLabel } from '../../utils/helpers'
export default function StockBadge({ stock, threshold = 10 }) {
  const status = getStockStatus(stock, threshold)
  return <span className={getStockBadgeClass(status)}>{getStockLabel(status)}</span>
}
