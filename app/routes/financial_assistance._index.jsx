import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Typography, Card, Select } from 'antd'
import { TeamOutlined, ContactsOutlined, UserOutlined } from '@ant-design/icons'
import EditSlotsModal from '../components/EditSlotsModal'

const { Title, Text } = Typography
const { Option } = Select

export function meta() {
  return [
    { title: 'Financial Assistances | StuFAPs' },
    { name: 'description', content: 'Manage financial assistance records' },
  ]
}

function StatsCards({ financialAssistances }) {
  const totals = {
    totalSlots: financialAssistances.reduce((sum, p) => sum + (p?.total_slot || 0), 0),
    totalFilled: financialAssistances.reduce((sum, p) => sum + (p?.filled_slot || 0), 0),
    totalUnfilled: financialAssistances.reduce((sum, p) => sum + (p?.unfilled_slot || 0), 0),
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
      title: 'Total Filled Slots',
      value: totals.totalFilled,
      icon: <TeamOutlined />,
      color: '#52c41a',
      bgColor: '#f6ffed',
      percentage: ((totals.totalFilled / (totals.totalSlots || 1)) * 100).toFixed(1),
    },
    {
      title: 'Total Unfilled Slots',
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
              height: '100%',
            }}
          >
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                {stat.title}
              </Text>
              <Text strong style={{ fontSize: 20, color: stat.color, lineHeight: 1.1, display: 'block' }}>
                {stat.value.toLocaleString()}
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

export default function Financial_AssistanceIndex() {
  const [financialAssistances, setFinancialAssistances] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [openModal, setOpenModal] = useState(false)
  const [academicYearFilter, setAcademicYearFilter] = useState('All')
  const [academicYears, setAcademicYears] = useState([])

  const fetchPrograms = () => {
    setLoading(true)
    fetch('http://localhost:8000/api/scholarship_program_records')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
        return res.json()
      })
      .then(data => {
        console.log('API Response:', data)
        const programsData = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : []
        setFinancialAssistances(programsData)

        const uniqueYears = [
          ...new Set(
            programsData.map(p => p.academic_year || p.Academic_year).filter(Boolean)
          )
        ]
        
        setAcademicYears(['All', ...uniqueYears.sort()])
        setLoading(false)
      })
      .catch(err => {
        console.error('Fetch Error:', err)
        setError(err.message)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchPrograms()
  }, [])

  const handleAcademicYearChange = value => 
    { 
      setAcademicYearFilter(value || 'All') // default back to All if cleared 
    }

    const filteredAssistances = 
      academicYearFilter && academicYearFilter !== 'All' 
        ? financialAssistances.filter( 
          p => (p.academic_year || p.Academic_year) === academicYearFilter 
          ) 
        : financialAssistances

    const getProgramTotals = (assistances, programName) => {
      const filtered = assistances.filter(p => p.scholarship_program_name === programName)
      return {
        totalSlots: filtered.reduce((sum, p) => sum + (p?.total_slot || 0), 0),
      }
    }

    const cmsTotals = getProgramTotals(filteredAssistances, "CMSP")
    const estatistikolarTotals = getProgramTotals(filteredAssistances, "Estatistikolar")

    const CoSchoTotals = getProgramTotals(filteredAssistances, "COSCHO")
    const MSRSTotals = getProgramTotals(filteredAssistances, "MSRS")

    const SIDA_SGPTotals = getProgramTotals(filteredAssistances, "SIDA-SGP")
    const ACEF_GIAHEPTotals = getProgramTotals(filteredAssistances, "ACEF-GIAHEP")
    const Mtp_SpTotals = getProgramTotals(filteredAssistances, "MTP-SP")

    const CGMS_SUCsTotals = getProgramTotals(filteredAssistances, "CGMS-SUCs")
    const SNPLPTotals = getProgramTotals(filteredAssistances, "SNPLP")

    

  return (
    <div className="flex min-h-screen flex-col">
      <div style={{ padding: '24px' }}>
        <Title level={2}>Financial Assistance Management</Title>
      </div>

      <main className="flex-1 p-8">
        <div>
          <button
            onClick={() => setOpenModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
          >
            Edit Slots
          </button>

          <Select
            placeholder="Academic Year"
            allowClear
            size="middle"
            style={{ width: 130, marginLeft: 12 }}
            onChange={handleAcademicYearChange}
          >
            {academicYears.map(year => (
              <Option key={year} value={year}>
                {year}
              </Option>
            ))}
          </Select>

          <EditSlotsModal
            open={openModal}
            onClose={() => setOpenModal(false)}
            onUpdated={() => {
              fetchPrograms()
            }}
          />
        </div>

        <br />

        <StatsCards financialAssistances={filteredAssistances} />

        {/* Priority Section */}
        <div className="space-y-8">
            
          {/* Top Card */}
          
          
            <Link to="/financial_assistance/cmsp">
              <div className="max-w-sm rounded-lg shadow-lg border border-gray-200 p-6 bg-white">
                <div>
                  <h3 className="text-lg font-bold text-red-700">CMSP</h3>
                  <p className="text-sm text-red-600">CHED Merit Scholarship Program</p>
                </div>
                <div className="mt-6 space-y-2 text-sm text-gray-700">
                  <div>Slots: {cmsTotals.totalSlots}</div>
                  <div>Filled:</div>
                  <div>Unfilled:</div>
                  <div>% of total</div>
                </div>
              </div>
            </Link>
        

        {/* Grid of 8 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Column 1 */}
        
          <div className="space-y-6">
            <Link to="/financial_assistance/estatistikolar">
              <div className="max-w-sm rounded-lg shadow-lg border border-gray-200 p-6 bg-white">
                <h3 className="text-lg font-bold text-red-700">Estatistikolar</h3>
                <p className="text-sm text-red-600">Statistics-focused scholarship</p>
                <div className="mt-6 space-y-2 text-sm text-gray-700">
                  <div>Slots: {estatistikolarTotals.totalSlots}</div>
                  <div>Filled:</div>
                  <div>Unfilled:</div>
                  <div>% of total</div>
                </div>
              </div>
            </Link>


            <Link to="/financial_assistance/CoScho">
            <div className="max-w-sm rounded-lg shadow-lg border border-gray-200 p-6 bg-white">
              <h3 className="text-lg font-bold text-red-700">CoScho</h3>
              <p className="text-sm text-red-600">College Scholarship Program</p>
              <div className="mt-6 space-y-2 text-sm text-gray-700">
                <div>Slots: {CoSchoTotals.totalSlots}</div>
                <div>Filled:</div>
                <div>Unfilled:</div>
                <div>% of total</div>
              </div>
            </div>
            </Link>


            <Link to="/financial_assistance/msrs">
            <div className="max-w-sm rounded-lg shadow-lg border border-gray-200 p-6 bg-white">
              <h3 className="text-lg font-bold text-red-700">MSRS</h3>
              <p className="text-sm text-red-600">Medical Scholarship and Return Service</p>
              <div className="mt-6 space-y-2 text-sm text-gray-700">
                <div>Slots: {MSRSTotals.totalSlots}</div>
                <div>Filled:</div>
                <div>Unfilled:</div>
                <div>% of total</div>
              </div>
            </div>
            </Link>

            <Link to="/financial_assistance/Acef_Giahep">
              <div className="max-w-sm rounded-lg shadow-lg border border-gray-200 p-6 bg-white">
                <h3 className="text-lg font-bold text-red-700">ACEF-GIAHEP</h3>
                <p className="text-sm text-red-600">Agricultural Competitiveness Enhancement Fund</p>
                <div className="mt-6 space-y-2 text-sm text-gray-700">
                  <div>Slots: {ACEF_GIAHEPTotals.totalSlots}</div>
                  <div>Filled:</div>
                  <div>Unfilled:</div>
                  <div>% of total</div>
                </div>
              </div>
            </Link>
          </div>

          {/* Column 2 */}
          <div className="space-y-6">

          <Link to="/financial_assistance/Sida_Sgp">
            <div className="max-w-sm rounded-lg shadow-lg border border-gray-200 p-6 bg-white">
              <h3 className="text-lg font-bold text-red-700">SIDA-SGP</h3>
              <p className="text-sm text-red-600">Sugarcane Industry Devt. Act</p>
              <div className="mt-6 space-y-2 text-sm text-gray-700">
                <div>Slots: {SIDA_SGPTotals.totalSlots}</div>
                <div>Filled:</div>
                <div>Unfilled:</div>
                <div>% of total</div>
              </div>
            </div>
          </Link>

          <Link to="/financial_assistance/Mtp_Sp">
            <div className="max-w-sm rounded-lg shadow-lg border border-gray-200 p-6 bg-white">
              <h3 className="text-lg font-bold text-red-700">MTP-SP</h3>
              <p className="text-sm text-red-600">Maritime Training Program</p>
              <div className="mt-6 space-y-2 text-sm text-gray-700">
                <div>Slots: {Mtp_SpTotals.totalSlots}</div>
                <div>Filled:</div>
                <div>Unfilled:</div>
                <div>% of total</div>
              </div>
            </div>
          </Link>

          <Link to="/financial_assistance/Cgms_Sucs">  
            <div className="max-w-sm rounded-lg shadow-lg border border-gray-200 p-6 bg-white">
              <h3 className="text-lg font-bold text-red-700">CGMS-SUCs</h3>
              <p className="text-sm text-red-600">Cultural and General Management Scholarship for Students</p>
              <div className="mt-6 space-y-2 text-sm text-gray-700">
                <div>Slots: {CGMS_SUCsTotals.totalSlots}</div>
                <div>Filled:</div>
                <div>Unfilled:</div>
                <div>% of total</div>
              </div>
            </div>
          </Link>  

          <Link to="/financial_assistance/Snplp">  
            <div className="max-w-sm rounded-lg shadow-lg border border-gray-200 p-6 bg-white">
              <h3 className="text-lg font-bold text-red-700">SNLP</h3>
              <p className="text-sm text-red-600">Student Loan Program</p>
              <div className="mt-6 space-y-2 text-sm text-gray-700">
                <div>Slots: {SNPLPTotals.totalSlots}</div>
                <div>Filled:</div>
                <div>Unfilled:</div>
                <div>% of total</div>
              </div>
            </div>
          </Link> 

          </div>
        </div>
      </div>               
      </main>
    </div>
  )
}

              