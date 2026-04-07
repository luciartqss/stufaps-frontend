import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

window.Pusher = Pusher

// Derive the WebSocket host from the backend URL so it works on both
// localhost and LAN without extra env vars.
const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
const wsHost = new URL(backendUrl).hostname

const echo = new Echo({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: wsHost,
  wsPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
  wssPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
  forceTLS: false,
  enabledTransports: ['ws'],
})

export default echo
