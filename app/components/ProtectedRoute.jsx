import { Navigate, useLocation } from 'react-router'
import { Spin, Result } from 'antd'
import { useAuth } from '../lib/AuthContext'

/**
 * Maps URL paths to access section keys used by getAccess().
 */
function getSectionForPath(pathname) {
  if (pathname === '/dashboard') return 'dashboard'
  if (pathname.startsWith('/students')) return 'students'
  if (pathname === '/data-quality' || pathname === '/data-quality/stufaps') return 'data-quality-stufaps'
  if (pathname.startsWith('/data-quality/accounting')) return 'data-quality-accounting'
  if (pathname.startsWith('/data-quality/cashier')) return 'data-quality-cashier'
  if (pathname.startsWith('/logs')) return 'logs'
  if (pathname.startsWith('/financial_assistance')) return 'financial_assistance'
  if (pathname.startsWith('/about_us')) return 'about_us'
  if (pathname.startsWith('/account-management')) return 'account-management'
  return null
}

/**
 * Returns the default landing page for a role after login.
 */
function getDefaultRoute(permissions) {
  if (!permissions) return '/dashboard'
  const role = permissions.role
  if (role === 'master_admin' || role === 'stufaps') return '/dashboard'
  if (role === 'accounting') return '/data-quality/accounting'
  if (role === 'cashier') return '/data-quality/cashier'
  return '/dashboard'
}

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, getAccess, permissions } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#f5f5f5',
        }}
      >
        <Spin size="large" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  // Check role-based access for the current route
  const section = getSectionForPath(location.pathname)
  if (section) {
    const access = getAccess(section)
    if (access === 'none') {
      const defaultRoute = getDefaultRoute(permissions)
      if (location.pathname !== defaultRoute) {
        return <Navigate to={defaultRoute} replace />
      }
      return (
        <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f5f5f5' }}>
          <Result status="403" title="Access Denied" subTitle="You don't have permission to access this page." />
        </div>
      )
    }
  }

  return children
}

export { getSectionForPath, getDefaultRoute }
