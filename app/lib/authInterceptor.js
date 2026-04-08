import { API_BASE } from './config'

/**
 * Intercepts all fetch() calls to API endpoints and automatically
 * injects the Authorization: Bearer header from localStorage.
 * Also handles 401 responses by clearing auth state.
 * Call once at app startup.
 */
export function setupAuthInterceptor() {
  const originalFetch = window.fetch

  window.fetch = function (input, init = {}) {
    const url = typeof input === 'string' ? input : input?.url || ''

    // Only add auth header for requests to our API
    if (url.startsWith(API_BASE) || url.includes('/api/')) {
      const token = localStorage.getItem('auth_token')
      if (token) {
        const headers = new Headers(init.headers || {})
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`)
        }
        init = { ...init, headers }
      }
    }

    return originalFetch.call(this, input, init).then((response) => {
      // If API returns 401 (token expired/invalid), clear auth state
      if (response.status === 401 && !url.includes('/auth/login')) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('isAuthenticated')
        localStorage.removeItem('user')
        localStorage.removeItem('permissions')
        window.location.href = '/'
      }
      return response
    })
  }
}
