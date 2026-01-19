import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router'
import Layout from './components/Layout'

import './app.css'

export const links = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
  },
]

export function HtmlLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export { HtmlLayout as Layout }

export default function App() {
  return <Layout />
}

export function ErrorBoundary({ error }) {
  let message = 'Oops!'
  let details = 'An unexpected error occurred.'
  let stack

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error'
    details =
      error.status === 404
        ? 'The requested page could not be found.'
        : error.statusText || details
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message
    stack = error.stack
  }

  return (
    <Layout>
      <main
        style={{
          padding: '64px 24px',
          textAlign: 'center',
          backgroundColor: '#f5f5f5',
          minHeight: '100vh',
        }}
      >
        <h1
          style={{
            fontSize: '48px',
            color: '#ff4d4f',
            marginBottom: '16px',
          }}
        >
          {message}
        </h1>
        <p style={{ color: '#8c8c8c', marginBottom: '24px' }}>{details}</p>
        {stack && (
          <pre
            style={{
              textAlign: 'left',
              backgroundColor: '#fff',
              padding: '16px',
              borderRadius: '8px',
              overflow: 'auto',
              border: '1px solid #f0f0f0',
            }}
          >
            <code>{stack}</code>
          </pre>
        )}
      </main>
    </Layout>
  )
}
