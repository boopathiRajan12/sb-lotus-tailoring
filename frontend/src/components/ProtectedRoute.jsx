import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Skeleton } from './ui'

// Shown while the session probe is in flight. Returning null here would flash
// an empty page on every hard load of a protected route.
function RouteLoading() {
  return (
    <div className="container page">
      <Skeleton height={36} width={240} style={{ marginBottom: 24 }} />
      <Skeleton height={320} radius="var(--radius)" />
    </div>
  )
}

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <RouteLoading />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return <Outlet />
}

export function AdminRoute() {
  const { user, loading } = useAuth()

  if (loading) return <RouteLoading />
  if (!user) return <Navigate to="/login" replace />
  if (!user.is_admin) return <Navigate to="/" replace />
  return <Outlet />
}

export function GuestOnlyRoute() {
  const { user, loading } = useAuth()

  if (loading) return <RouteLoading />
  if (user) return <Navigate to={user.is_admin ? '/admin' : '/'} replace />
  return <Outlet />
}
