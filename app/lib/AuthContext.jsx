import { createContext, useContext, useState, useEffect } from 'react'
import { apiRequest, getCsrfCookie, API_URL } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check authentication status on mount
  useEffect(() => {
    checkAuth()
  }, [])

  // Check if user is authenticated by calling /api/me
  const checkAuth = async () => {
    try {
      // First get CSRF cookie
      await getCsrfCookie()
      
      const response = await apiRequest(`${API_URL}/api/me`, {
        method: 'GET',
      })

      if (response.ok) {
        const data = await response.json()
        setIsAuthenticated(true)
        setUser(data.user)
      } else {
        // 401 is expected when not logged in, don't log as error
        setIsAuthenticated(false)
        setUser(null)
      }
    } catch (error) {
      // Network errors only
      console.error('Auth check failed:', error)
      setIsAuthenticated(false)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  // Login function - calls Laravel API
  const login = async (username, password) => {
    try {
      // First, get CSRF cookie
      await getCsrfCookie()

      // Then, attempt login
      const response = await apiRequest(`${API_URL}/api/login`, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (response.ok) {
        setIsAuthenticated(true)
        setUser(data.user)
        return { success: true }
      } else {
        return { 
          success: false, 
          message: data.message || data.errors?.username?.[0] || 'Login failed' 
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, message: 'Network error. Please try again.' }
    }
  }

  // Logout function - calls Laravel API
  const logout = async () => {
    try {
      await apiRequest(`${API_URL}/api/logout`, {
        method: 'POST',
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsAuthenticated(false)
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, loading, checkAuth }}>
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
