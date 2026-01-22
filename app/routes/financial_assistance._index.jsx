import { Link } from 'react-router-dom'

import { useEffect, useState } from 'react'
import { Typography, Row, Col, Card, Statistic } from 'antd'
import { DollarOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'


const { Title } = Typography

export function meta() {
  return [
    { title: 'Financial Assistances | StuFAPs' },
    { name: 'description', content: 'Manage financial assistance records' },
  ]
}

const statsConfig = [
  {
    title: 'Total Disbursements',
    value: 120,
    color: '#1890ff',
    bgColor: '#e6f7ff',
    icon: <DollarOutlined />,
  },
  {
    title: 'Disbursed',
    value: 80,
    color: '#52c41a',
    bgColor: '#f6ffed',
    icon: <CheckCircleOutlined />,
  },
  {
    title: 'Pending',
    value: 40,
    color: '#faad14',
    bgColor: '#fffbe6',
    icon: <ClockCircleOutlined />,
  },
]


// Card component for each scholarship program
function ScholarshipCard({ title, description, to }) {
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
        {/* Top content */}
        <div>
          <h3 className="text-lg font-bold text-red-700">{title}</h3>
          <p className="text-sm text-red-600">{description}</p>
        </div>

        {/* Bottom content */}
        <div className="mt-6 space-y-2 text-sm text-gray-700">
          <div>Slots: placeholder</div>
          <div>Filled: placeholder</div>
          <div>Unfilled: placeholder</div>
        </div>
      </div>
    </Link>
  )
}

const API_URL = 'http://localhost:8000/api'

export default function Financial_AssistanceIndex() {
  const [financialAssistances, setFinancialAssistances] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalStudents: 0,
      activeScholars: 0,
      graduated: 0,
      terminated: 0,
      totalDisbursed: 0,
    },
    scholarshipStatus: [],
    degreeLevels: [],
    recentRegistrations: [],
  })

  return (
    <div className="flex min-h-screen flex-col">
      {/* Page header */}
      <div style={{ padding: '24px' }}>
        <Title level={2}>Financial Assistance Management</Title>
      </div>
      

      {/* Main content */}
      <main className="flex-1 p-8">

        {/* Stats Cards Row */}
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
        
        <div><Title level={3}>Priority</Title></div>
        {/* Grid layout for scholarship cards */}
        <div className="grid gap-12 items-stretch">
           
          <ScholarshipCard
            title="CMSP"
            description="CHED Merit Scholarship Program"
            to="/financial_assistance/cmsp"
          />
        </div>

        <br />

        <Title level={3}>Other Programs</Title>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-stretch">
          
        

          <ScholarshipCard
            title="ESTATISKOLAR"
            description="Scholarship Program for Future Statisticians"
            to="/financial_assistance/estatistikolar"
          />
          <ScholarshipCard
            title="CoScho"
            description="Scholarship Program for Coconut Farmers and their Families"
            to="/financial_assistance/CoScho"
          />
          <ScholarshipCard
            title="MSRS"
            description="Medical Scholarship and Return Service"
            to="/financial_assistance/msrs"
          />
          <ScholarshipCard
            title="SIDA-SGP"
            description="Scholarship for Children and Dependents of Sugarcane Industry Workers and Small Sugarcane Farmers"
            to="/financial_assistance/Sida_Sgp"
          />
          <ScholarshipCard
            title="ACEF-GIAHEP"
            description="Agricultural Competitiveness Enhancement Fund – Grants-in-Aid for Higher Education Program"
            to="/financial_assistance/Acef_Giahep"
          />
          <ScholarshipCard
            title="MTP-SP"
            description="Medical Technologists and Pharmacists Scholarship Program"
            to="/financial_assistance/Mtp_Sp"
          />
          <ScholarshipCard
            title="CGMS-SUCs"
            description="Cash Grant to Medical Students Enrolled in State Universities and Colleges"
            to="/financial_assistance/Cgms_Sucs"
          />
          <ScholarshipCard
            title="SNPLP"

            //not finalized
            description="Cash Grant to Medical Students Enrolled in State Universities and Colleges"
            to="/financial_assistance/Snplp"
            //up to here

          />

        </div>
      </main>
    </div>
  )
}



