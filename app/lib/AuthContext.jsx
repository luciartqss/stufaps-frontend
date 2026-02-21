import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { API_BASE } from './config'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [permissions, setPermissions] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedAuth = localStorage.getItem('isAuthenticated')
    const storedUser = localStorage.getItem('user')
    const storedPerms = localStorage.getItem('permissions')

    if (storedAuth === 'true' && storedUser) {
      setIsAuthenticated(true)
      setUser(JSON.parse(storedUser))
      if (storedPerms) setPermissions(JSON.parse(storedPerms))
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        return { success: false, message: error.message || 'Invalid credentials' }
      }

      const data = await res.json()
      const userData = data.user || { email }
      const permsData = data.permissions || null

      setIsAuthenticated(true)
      setUser(userData)
      setPermissions(permsData)
      localStorage.setItem('isAuthenticated', 'true')
      localStorage.setItem('user', JSON.stringify(userData))
      if (permsData) localStorage.setItem('permissions', JSON.stringify(permsData))

      return { success: true, user: userData, permissions: permsData }
    } catch (err) {
      return { success: false, message: 'Unable to reach server' }
    }
  }

  const logout = () => {
    setIsAuthenticated(false)
    setUser(null)
    setPermissions(null)
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('user')
    localStorage.removeItem('permissions')
  }

  // Refresh permissions from server (e.g. after admin changes assignments)
  const refreshPermissions = useCallback(async () => {
    if (!user?.id) return
    try {
      const res = await fetch(`${API_BASE}/users/${user.id}/permissions`)
      if (res.ok) {
        const perms = await res.json()
        setPermissions(perms)
        localStorage.setItem('permissions', JSON.stringify(perms))
      }
    } catch (err) {
      console.error('Failed to refresh permissions:', err)
    }
  }, [user?.id])

  /**
   * Check if the user can access a specific section.
   * Sections: 'dashboard', 'students', 'data-quality-stufaps', 'data-quality-accounting',
   *           'data-quality-cashier', 'logs', 'financial_assistance', 'about_us', 'account-management'
   * Returns: 'full' | 'read-only' | 'none'
   */
  const getAccess = useCallback((section) => {
    if (!permissions) return 'none'
    const role = permissions.role

    // Master admin gets full access to everything
    if (role === 'master_admin') return 'full'

    // Accounting role: only data-quality-accounting
    if (role === 'accounting') {
      return section === 'data-quality-accounting' ? 'full' : 'none'
    }

    // Cashier role: only data-quality-cashier
    if (role === 'cashier') {
      return section === 'data-quality-cashier' ? 'full' : 'none'
    }

    // StuFAPs role
    if (role === 'stufaps') {
      // Logs and account management are master_admin only
      if (section === 'account-management' || section === 'logs') return 'none'

      // Data quality sections
      if (section === 'data-quality-accounting') {
        return permissions.accounting_access ? 'full' : 'read-only'
      }
      if (section === 'data-quality-cashier') {
        return permissions.cashier_access ? 'full' : 'read-only'
      }

      // All other sections (dashboard, students, logs, financial assistance, data-quality-stufaps, about_us)
      return permissions.full_access ? 'full' : 'read-only'
    }

    return 'none'
  }, [permissions])

  const value = useMemo(() => ({
    isAuthenticated, user, permissions, login, logout, loading,
    refreshPermissions, getAccess,
  }), [isAuthenticated, user, permissions, loading, refreshPermissions, getAccess])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
