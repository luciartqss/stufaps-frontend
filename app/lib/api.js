// API Base URL
const API_URL = 'http://localhost:8000'

// Helper function to get cookie value by name
const getCookie = (name) => {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return decodeURIComponent(parts.pop().split(';').shift())
  }
  return null
}

// Get CSRF cookie from Laravel Sanctum
export const getCsrfCookie = async () => {
  await fetch(`${API_URL}/sanctum/csrf-cookie`, {
    method: 'GET',
    credentials: 'include',
  })
}

// Main API request helper with credentials and CSRF token
export const apiRequest = async (endpoint, options = {}) => {
  const xsrfToken = getCookie('XSRF-TOKEN')
  
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`
  
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(xsrfToken && { 'X-XSRF-TOKEN': xsrfToken }),
      ...options.headers,
    },
  })
  
  return response
}

// Convenience methods
export const api = {
  get: (endpoint, options = {}) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, data, options = {}) => apiRequest(endpoint, { ...options, method: 'POST', body: JSON.stringify(data) }),
  put: (endpoint, data, options = {}) => apiRequest(endpoint, { ...options, method: 'PUT', body: JSON.stringify(data) }),
  patch: (endpoint, data, options = {}) => apiRequest(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(data) }),
  delete: (endpoint, options = {}) => apiRequest(endpoint, { ...options, method: 'DELETE' }),
}

export { API_URL }
