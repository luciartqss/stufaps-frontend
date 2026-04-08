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
 * Debounced so bulk operations only trigger once after the storm settles.
 *
 * The callback receives `true` when triggered by a real-time event,
 * allowing fetch functions to skip loading states for seamless updates.
 * When called normally (initial load, user action), the arg is undefined/falsy.
 *
 * @param {string|string[]} models     Model name(s) to listen for, or '*' for any.
 * @param {Function}        onRefresh  Callback to re-fetch data. Receives (silent: boolean).
 * @param {number}          [delay=1500]  Debounce delay in milliseconds.
 */
export function useRealtime(models, onRefresh, delay = 1500) {
  const cbRef = useRef(onRefresh)
  cbRef.current = onRefresh

  const modelsRef = useRef(models)
  modelsRef.current = models

  const modelsKey = Array.isArray(models) ? models.join(',') : models
  const timerRef = useRef(null)

  useEffect(() => {
    const handler = (event) => {
      const m = modelsRef.current
      const matchAll = m === '*'
      const list = Array.isArray(m) ? m : [m]
      if (matchAll || list.includes(event.model)) {
        clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
          cbRef.current(true)
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
