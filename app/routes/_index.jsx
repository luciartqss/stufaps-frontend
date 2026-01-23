import Dashboard from '../pages/dashboard'

export function meta() {
  return [
    { title: 'Dashboard - StuFAPs' },
    { name: 'description', content: 'Student Financial Assistance Programs Dashboard' },
  ]
}

export default function Home() {
  return <Dashboard />
}
