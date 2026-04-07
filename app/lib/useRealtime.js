import { useEffect, useRef } from 'react'
import echo from './echo'

// Single global channel subscription — never leaves.
// Multiple useRealtime hooks share this one subscription.
const channel = echo.channel('app-data')
const listeners = new Set()

channel.listen('.data.changed', (event) => {
  listeners.forEach((fn) => {
    try { fn(event) } catch (e) { console.error('useRealtime listener error:', e) }
  })
})

/**
 * Listen for real-time data changes on the 'app-data' channel.
 * Calls `onRefresh` when a matching model change is detected.
 * Debounced so bulk operations (e.g. importing 600 students) only
 * trigger one refetch after the storm settles.
 *
 * @param {string|string[]} models - Model name(s) to listen for (e.g. 'Student', 'Disbursement')
 *                                    Pass '*' to listen for any change.
 * @param {Function} onRefresh - Callback to re-fetch data
 * @param {number} [delay=1500] - Debounce delay in ms
 */
export function useRealtime(models, onRefresh, delay = 1500) {
  const cbRef = useRef(onRefresh)
  cbRef.current = onRefresh

  const modelsKey = Array.isArray(models) ? models.join(',') : models
  const modelsRef = useRef(models)
  modelsRef.current = models

  const timerRef = useRef(null)

  useEffect(() => {
    const handler = (event) => {
      const m = modelsRef.current
      const matchAll = m === '*'
      const list = Array.isArray(m) ? m : [m]
      if (matchAll || list.includes(event.model)) {
        // Debounce: reset timer on every matching event,
        // only fire once after events stop for `delay` ms
        clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
          cbRef.current()
        }, delay)
      }
    }

    listeners.add(handler)

    return () => {
      listeners.delete(handler)
      clearTimeout(timerRef.current)
    }
  }, [modelsKey, delay])
}
