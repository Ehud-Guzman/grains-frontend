import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Spinner from '../components/ui/Spinner'

export default function ProtectedRoute({ children, requireRole, requirePermission }) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const hasRole = !requireRole || requireRole.includes(user?.role)
  const hasPermission = requirePermission &&
    (user?.role === 'superadmin' || user?.customPermissions?.includes(requirePermission))

  if (requireRole && !hasRole && !hasPermission) {
    return <Navigate to="/" replace />
  }

  return children
}
