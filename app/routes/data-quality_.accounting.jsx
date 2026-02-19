import DataQualityAccounting from '../pages/data-quality-accounting'

export function meta() {
  return [
    { title: 'Data Quality — Accounting - StuFAPs' },
    { name: 'description', content: 'Review and fix data quality issues for Accounting' },
  ]
}

export default function DataQualityAccountingRoute() {
  return <DataQualityAccounting />
}
