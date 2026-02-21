import DataQuality from '../pages/data-quality'
import { useAuth } from '../lib/AuthContext'

export function meta() {
  return [
    { title: 'Data Quality - StuFAPs' },
    { name: 'description', content: 'Review and fix data quality issues' },
  ]
}

export default function DataQualityRoute() {
  const { getAccess, permissions } = useAuth()
  const access = getAccess('data-quality-stufaps')
  const canEdit = permissions?.role === 'master_admin' || (permissions?.assigned_programs?.length > 0)
  return <DataQuality readOnly={access === 'read-only'} canEdit={canEdit} />
}
