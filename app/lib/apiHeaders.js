/**
 * Returns common headers for API requests, including auth token and current user's ID.
 */
export function getApiHeaders() {
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
  const token = localStorage.getItem('auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(storedUser?.id ? { 'X-User-Id': String(storedUser.id) } : {}),
  }
}
