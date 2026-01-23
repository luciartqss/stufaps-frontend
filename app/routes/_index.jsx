import Login from '../pages/login'

export function meta() {
  return [
    { title: 'Login - StuFAPs' },
    { name: 'description', content: 'Student Financial Assistance Programs Login' },
  ]
}

export default function Home() {
  return <Login />
}
