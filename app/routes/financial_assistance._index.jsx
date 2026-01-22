import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Typography, Card } from 'antd'
import { TeamOutlined, DollarOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

export function meta() {
  return [
    { title: 'Financial Assistances | StuFAPs' },
    { name: 'description', content: 'Manage financial assistance records' },
  ]
}


const routeMap = {
  CMSP: "/financial_assistance/cmsp",
  ESTATISKOLAR: "/financial_assistance/estatistikolar",
  COSCHO: "/financial_assistance/coscho",
  MSRS: "/financial_assistance/msrs",
  "SIDA-SGP": "/financial_assistance/sida_sgp",
  "ACEF-GIAHEP": "/financial_assistance/acef_giahep",
  "MTP-SP": "/financial_assistance/mtp_sp",
  "CGMS-SUCS": "/financial_assistance/cgms_sucs",
  SNPLP: "/financial_assistance/snplp",
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
      icon: <DollarOutlined />,
      color: '#1890ff',
      bgColor: '#e6f7ff',
    },
    {
      title: 'Total Filled Slots',
      value: totals.totalFilled,
      icon: <CheckCircleOutlined />,
      color: '#52c41a',
      bgColor: '#f6ffed',
      percentage: ((totals.totalFilled / (totals.totalSlots || 1)) * 100).toFixed(1),
    },
    {
      title: 'Total Unfilled Slots',
      value: totals.totalUnfilled,
      icon: <ClockCircleOutlined />,
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
                <Text style={{ fontSize: 11, color: '#8c8c8c' }}>{stat.percentage}% of total</Text>
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

function getRoute(programName) {
  return routeMap[programName.toUpperCase()] || "#"
}

function ScholarshipCard({ title, description, to, total, filled, unfilled }) {
  const [active, setActive] = useState(false)

  return (
    <Link to={to} className="block">
      <div
        onMouseEnter={() => setActive(true)}
        onMouseLeave={() => setActive(false)}
        className={`flex flex-col justify-between h-full p-4 rounded shadow cursor-pointer transition
          border-l-4
          ${active ? 'bg-red-300 border-red-700' : 'bg-red-100 border-red-600'}
          hover:bg-red-200 hover:shadow-lg`}
      >
        <div>
          <h3 className="text-lg font-bold text-red-700">{title}</h3>
          <p className="text-sm text-red-600">{description}</p>
        </div>
        <div className="mt-6 space-y-2 text-sm text-gray-700">
          <div>Slots: {total ?? '—'}</div>
          <div>Filled: {filled ?? '—'}</div>
          <div>Unfilled: {unfilled ?? '—'}</div>
        </div>
      </div>
    </Link>
  )
}


export default function Financial_AssistanceIndex() {
  const [financialAssistances, setFinancialAssistances] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('http://localhost:8000/api/scholarship_programs')
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

  const priorityProgram = financialAssistances.find(
    p => p.scholarship_program_name.toUpperCase() === "CMSP"
  )
  const otherPrograms = financialAssistances.filter(
    p => p.scholarship_program_name.toUpperCase() !== "CMSP"
  )

  return (
    <div className="flex min-h-screen flex-col">
      <div style={{ padding: '24px' }}>
        <Title level={2}>Financial Assistance Management</Title>
      </div>

      <main className="flex-1 p-8">
        <StatsCards financialAssistances={financialAssistances} />
        
        {/* Priority Section */}
        <Title level={3}>Priority</Title>
        <div className="grid gap-12 items-stretch">
          {priorityProgram && (
            <ScholarshipCard
              key={priorityProgram.id}
              title={priorityProgram.scholarship_program_name}
              description={priorityProgram.description}
              to={getRoute(priorityProgram.scholarship_program_name)}
              total={priorityProgram.total_slot}
              filled={priorityProgram.filled_slot}
              unfilled={priorityProgram.unfilled_slot}
            />
          )}
        </div>

        <br />

        {/* Other Programs Section */}
        <Title level={3}>Other Programs</Title>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-stretch">
          {otherPrograms.map(program => (
            <ScholarshipCard
              key={program.id}
              title={program.scholarship_program_name}
              description={program.description}
              to={getRoute(program.scholarship_program_name)}
              total={program.total_slot}
              filled={program.filled_slot}
              unfilled={program.unfilled_slot}
            />
          ))}
        </div>
      </main>
    </div>
  )
}
