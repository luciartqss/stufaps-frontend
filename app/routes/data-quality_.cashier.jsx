import DataQualityCashier from '../pages/data-quality-cashier'

export function meta() {
  return [
    { title: 'Data Quality — Cashier - StuFAPs' },
    { name: 'description', content: 'Review and fix data quality issues for Cashier' },
  ]
}

export default function DataQualityCashierRoute() {
  return <DataQualityCashier />
}
