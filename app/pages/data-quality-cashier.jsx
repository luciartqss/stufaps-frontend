import { Typography } from 'antd'

const { Title, Text } = Typography

export default function DataQualityCashier({ readOnly = false }) {
  return (
    <div style={{ background: '#fafbfc', minHeight: '100vh', margin: -24 }}>
      <div style={{ padding: '24px', borderBottom: '1px solid #e8eaed', background: '#fff' }}>
        <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
          Data Quality — Cashier
        </Title>
        <Text style={{ color: '#6b7280', fontSize: 16 }}>
          Review and fix data quality issues for Cashier records
        </Text>
      </div>
      {readOnly && (
        <div style={{ padding: '8px 24px', background: '#fff7e6', borderBottom: '1px solid #ffd591', textAlign: 'center' }}>
          <Text style={{ fontSize: 13, color: '#d46b08' }}>You have view-only access to this section. Editing is disabled.</Text>
        </div>
      )}
    </div>
  )
}
