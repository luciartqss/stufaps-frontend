import { useEffect, useState } from 'react' 
import { Card, Typography } from 'antd' 
import { ContactsOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons'
const { Text } = Typography
import { Progress } from 'antd'

export function meta() {
  return [
    { title: 'SCHOLARSHIP GRANT PROGRAM FOR CHILDREN AND DEPENDENTS OF SUGARCANE INDUSTRY WORKERSAND SMALL SUGARCANE FARMERS (SIDA-SGP) | StuFAPs' },
    { name: 'description', content: 'Manage CMSP records' },
  ]
}

function StatsCards({ financialAssistances }) {
  
  const totals = {
    totalSlots: financialAssistances.reduce((sum, p) => sum + (p.total_slot || 0), 0),
    totalFilled: financialAssistances.reduce((sum, p) => sum + (p.filled_slot || 0), 0),
    totalUnfilled: financialAssistances.reduce((sum, p) => sum + (p.unfilled_slot || 0), 0),
  }

  const statsConfig = [
    {
      title: 'Total Slots',
      value: totals.totalSlots,
      icon: <ContactsOutlined />,
      color: '#1890ff',
      bgColor: '#e6f7ff',
    },
    {
      title: 'Filled Slots',
      value: totals.totalFilled,
      icon: <TeamOutlined />,
      color: '#52c41a',
      bgColor: '#f6ffed',
      percentage: ((totals.totalFilled / (totals.totalSlots || 1)) * 100).toFixed(1),
    },
    {
      title: 'Unfilled Slots',
      value: totals.totalUnfilled,
      icon: <UserOutlined />,
      color: '#faad14',
      bgColor: '#fffbe6',
      percentage: ((totals.totalUnfilled / (totals.totalSlots || 1)) * 100).toFixed(1),
    },
  ]

  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
      {statsConfig.map((stat, index) => (
        <div key={index} style={{ flex: 1, minWidth: 0 }}>
          <Card
            style={{
              borderRadius: 12,
              border: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              height: 96,
            }}
            bodyStyle={{ 
              padding: 16, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              height: '100%'
            }}
          >
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                {stat.title}
              </Text>
              <Text strong style={{ fontSize: 20, color: stat.color, lineHeight: 1.1, display: 'block' }}>
                {stat.prefix || ''}
                {stat.formatter ? stat.formatter(stat.value) : stat.value.toLocaleString()}
              </Text>
              {stat.percentage && (
                  <>
                  <Progress percent={parseFloat(stat.percentage)} 
                  showInfo={false} 
                  strokeColor={stat.color} 
                  style={{ marginBottom: 8 }} 
                  />

                  <Text style={{ fontSize: 12, color: stat.color }}>
                    {stat.percentage}% of total
                  </Text>
                </>   
              )}
            </div>
            <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: stat.bgColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  color: stat.color,
                  flexShrink: 0,
                }}
              >
              {stat.icon}
            </div>
          </Card>
        </div>
      ))}
    </div>
  )
}

export default function FinancialAssistanceSida_Sgp() { 
    const [expandedId, setExpandedId] = useState(null);
    const [financialAssistances, setFinancialAssistances] = useState([])


    const [expandedSUC, setExpandedSUC] = useState(null);
    const [expandedPrivate, setExpandedPrivate] = useState(null);

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

        useEffect(() => {
            fetch('http://localhost:8000/api/scholarship_program_records')
                .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`)
                }
                return res.json()
                })
                .then(data => {
                console.log('API Response:', data)
                const programsData = data.data || data
                console.log('Programs Data:', programsData)
                setFinancialAssistances(Array.isArray(programsData) ? programsData : [])
                setLoading(false)
                })
                .catch(err => {
                console.error('Fetch Error:', err)
                setError(err.message)
                setLoading(false)
                })
            }, [])
        
            if (loading) return <div className="p-8">Loading...</div>
            if (error) return <div className="p-8 text-red-600 bg-red-50 border border-red-300 rounded">Error: {error}</div>
            if (!Array.isArray(financialAssistances) || financialAssistances.length === 0) {
            return <div className="p-8 text-yellow-600 bg-yellow-50 border border-yellow-300 rounded">No scholarship programs found. Make sure your backend is running and database is seeded.</div>
            }
    return (
      <div className="min-h-screen bg-white">
          <main>   </main>

          <StatsCards financialAssistances={(Array.isArray(financialAssistances) ? financialAssistances : []).filter(
                        p => p?.scholarship_program_name?.toUpperCase() === "SNLP"
            )} />

        </div>
    )
}
