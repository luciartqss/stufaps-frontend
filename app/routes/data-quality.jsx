import DataQuality from '../pages/data-quality'
import { useAuth } from '../lib/AuthContext'

export function meta() {
  return [
    { title: 'Data Quality - StuFAPs' },
    { name: 'description', content: 'Review and fix data quality issues' },
  ]
}

export default function DataQualityRoute() {
  const { getAccess } = useAuth()
  const access = getAccess('data-quality-stufaps')
  return <DataQuality readOnly={access === 'read-only'} />
}
