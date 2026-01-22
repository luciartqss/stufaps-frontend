import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Typography, Row, Col, Card, Statistic } from 'antd'
import { DollarOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'

const { Title } = Typography

export function meta() {
  return [
    { title: 'Financial Assistances | StuFAPs' },
    { name: 'description', content: 'Manage financial assistance records' },
  ]
}



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

export default function Financial_AssistanceIndex() {
  const [financialAssistances, setFinancialAssistances] = useState([])

  return (
    <div className="flex min-h-screen flex-col">
      {/* Page header */}
      <div style={{ padding: '24px' }}>
        <Title level={2}>Financial Assistance Management</Title>
      </div>

      {/* Main content */}
      <main className="flex-1 p-8">
        
        {/* Grid layout for scholarship cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-stretch">
          <ScholarshipCard
            title="CMSP"
            description="CHED Merit Scholarship Program"
            to="/financial_assistance/cmsp"
          />
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
        </div>
      </main>
    </div>
  )
}



