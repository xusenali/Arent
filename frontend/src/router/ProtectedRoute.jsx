import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore.js'

export default function ProtectedRoute({ allowedRole }) {
  const user = useAuthStore((state) => state.user)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role !== allowedRole) {
    const fallback = user.role === 'super_admin' ? '/admin/dashboard' : '/worker/dashboard'
    return <Navigate to={fallback} replace />
  }

  return <Outlet />
}
