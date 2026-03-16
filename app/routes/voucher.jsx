import { Typography } from 'antd'

const { Title, Text } = Typography

export default function Voucher() {
  return (
    <div style={{ padding: 24 }}>
      <Title level={2} style={{ margin: 0 }}>Voucher</Title>
      <Text style={{ color: '#6b7280' }}>Voucher management page</Text>
    </div>
  )
}
