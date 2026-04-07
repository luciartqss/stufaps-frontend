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
 *
 * @param {string|string[]} models - Model name(s) to listen for (e.g. 'Student', 'Disbursement')
 *                                    Pass '*' to listen for any change.
 * @param {Function} onRefresh - Callback to re-fetch data
 */
export function useRealtime(models, onRefresh) {
  const cbRef = useRef(onRefresh)
  cbRef.current = onRefresh

  const modelsKey = Array.isArray(models) ? models.join(',') : models
  const modelsRef = useRef(models)
  modelsRef.current = models

  useEffect(() => {
    const handler = (event) => {
      const m = modelsRef.current
      const matchAll = m === '*'
      const list = Array.isArray(m) ? m : [m]
      if (matchAll || list.includes(event.model)) {
        cbRef.current()
      }
    }

    listeners.add(handler)

    return () => {
      listeners.delete(handler)
    }
  }, [modelsKey])
}
