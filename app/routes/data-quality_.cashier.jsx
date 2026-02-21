import DataQualityCashier from '../pages/data-quality-cashier'
import { useAuth } from '../lib/AuthContext'

export function meta() {
  return [
    { title: 'Data Quality — Cashier - StuFAPs' },
    { name: 'description', content: 'Review and fix data quality issues for Cashier' },
  ]
}

export default function DataQualityCashierRoute() {
  const { getAccess } = useAuth()
  const access = getAccess('data-quality-cashier')
  return <DataQualityCashier readOnly={access === 'read-only'} />
}
