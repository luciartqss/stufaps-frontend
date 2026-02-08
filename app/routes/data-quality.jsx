import DataQuality from '../pages/data-quality'

export function meta() {
  return [
    { title: 'Data Quality - StuFAPs' },
    { name: 'description', content: 'Review and fix data quality issues' },
  ]
}

export default function DataQualityRoute() {
  return <DataQuality />
}
