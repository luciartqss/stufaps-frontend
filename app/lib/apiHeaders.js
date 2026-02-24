/**
 * Returns common headers for API requests, including the current user's ID.
 */
export function getApiHeaders() {
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
  return {
    'Content-Type': 'application/json',
    ...(storedUser?.id ? { 'X-User-Id': String(storedUser.id) } : {}),
  }
}
