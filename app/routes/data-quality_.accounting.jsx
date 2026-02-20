import DataQualityAccounting from '../pages/data-quality-accounting'
import { useAuth } from '../lib/AuthContext'

export function meta() {
  return [
    { title: 'Data Quality — Accounting - StuFAPs' },
    { name: 'description', content: 'Review and fix data quality issues for Accounting' },
  ]
}

export default function DataQualityAccountingRoute() {
  const { getAccess } = useAuth()
  const access = getAccess('data-quality-accounting')
  return <DataQualityAccounting readOnly={access === 'read-only'} />
}
