import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Typography, Card, Select, Progress } from 'antd'
import { TeamOutlined, ContactsOutlined, UserOutlined } from '@ant-design/icons'
import EditSlotsModal from '../components/EditSlotsModal'

import UpdateSlotModal from '../components/UpdateSlotModal'

const { Title, Text } = Typography
const { Option } = Select

export function meta() {
  return [
    { title: 'Financial Assistances | StuFAPs' },
    { name: 'description', content: 'Manage financial assistance records' },
  ]
}

function StatsCards({ financialAssistances }) {
  let totals;

  if (financialAssistances.length === 1 && (financialAssistances[0].academic_year === 'All' || financialAssistances[0].Academic_year === 'All')) {
    // Use backend values directly for the "All" row
    const row = financialAssistances[0];
    totals = {
      totalSlots: Number(row?.total_slot) || 0,
      totalFilled: Number(row?.total_students) || 0,
      totalUnfilled: Number(row?.unfilled_slot) || 0,
    };
  } else {
    // Sum across rows for a specific year
    totals = {
      totalSlots: financialAssistances.reduce((sum, p) => sum + (Number(p?.total_slot) || 0), 0),
      totalFilled: financialAssistances.reduce((sum, p) => sum + (Number(p?.total_students) || 0), 0),
      totalUnfilled: financialAssistances.reduce((sum, p) => sum + (Number(p?.unfilled_slot) || 0), 0),
    };
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
                <>
                  <Text style={{ fontSize: 11, color: '#8c8c8c' }}
                  >
                    {stat.percentage}% of total
                  </Text>

                  <Progress
                    percent={parseFloat(stat.percentage)}
                    size="small"
                    strokeColor={stat.color}
                    showInfo={false} // hide the number since you already show it above
                    style={{ marginTop: 4 }}
                  />
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
            > {stat.icon}
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
  const [openModalAddSlot, setOpenModalAddSlot] = useState(false)
  const [openModalUpdateSlot, setOpenModalUpdateSlot] = useState(false)
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

        setAcademicYears([...uniqueYears.sort()])
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

  const handleAcademicYearChange = value => {
    setAcademicYearFilter(value || null) // default back to All if cleared 
  }

  const filteredAssistances =
    academicYearFilter && academicYearFilter !== 'All'
      ? financialAssistances.filter(
        p => (p.academic_year || p.Academic_year) === academicYearFilter
      )
      : financialAssistances.filter(
        p => (p.academic_year || p.Academic_year) === 'All'
      )

  const getProgramTotals = (assistances, programName) => {
  const filtered = Array.isArray(programName)
    ? assistances.filter(p => programName.includes(p.scholarship_program_name))
    : assistances.filter(p => p.scholarship_program_name === programName)

  if (
    filtered.length === 1 &&
    (filtered[0].academic_year === 'All' || filtered[0].Academic_year === 'All')
  ) {
    const row = filtered[0]
    return {
      totalSlots: Number(row?.total_slot) || 0,
      totalFilled: Number(row?.total_students) || 0,
      totalUnfilled: Number(row?.unfilled_slot) || 0,
      percentage:
        row?.total_slot > 0
          ? ((Number(row?.total_students) / Number(row?.total_slot)) * 100).toFixed(1)
          : 0,
    }
  } else {
    const totalSlots = filtered.reduce((sum, p) => sum + (Number(p?.total_slot) || 0), 0)
    const totalFilled = filtered.reduce((sum, p) => sum + (Number(p?.total_students) || 0), 0)
    const totalUnfilled = filtered.reduce((sum, p) => sum + (Number(p?.unfilled_slot) || 0), 0)

    return {
      totalSlots,
      totalFilled,
      totalUnfilled,
      percentage: totalSlots > 0 ? ((totalFilled / totalSlots) * 100).toFixed(1) : 0,
    }
  }
}

  const cmsTotals = getProgramTotals(filteredAssistances, 
  [
    'FULLSSP', 'HALFSSP', 'HALFSSPGAD', 'FULLSSPGAD',
    'FULLPESFA', 'HALFPESFA', 'HALFPESFAGAD', 'FULLPESFAGAD'
  ]);

  const estatistikolarTotals = getProgramTotals(filteredAssistances, ['FULLESTAT','HALFESTAT', 'ESTATISTIKOLAR'])

  const CoSchoTotals = getProgramTotals(filteredAssistances, "COSCHO")
  const MSRSTotals = getProgramTotals(filteredAssistances, "MSRS")
  const SIDA_SGPTotals = getProgramTotals(filteredAssistances, "SIDASGP")
  const ACEF_GIAHEPTotals = getProgramTotals(filteredAssistances, "ACEFGIAHEP")
  const Mtp_SpTotals = getProgramTotals(filteredAssistances, "MTPSP")
  const CGMS_SUCsTotals = getProgramTotals(filteredAssistances, "CGMSSUCS")
  const SNPLPTotals = getProgramTotals(filteredAssistances, "SNPLP")

  return (
    <div className="flex min-h-screen flex-col">
      <div style={{ padding: '24px' }}>
        <Title level={2}>Financial Assistance Management</Title>
      </div>

      <main className="flex-1 p-8">
        <div>
          <button
            onClick={() => setOpenModalAddSlot(true)}
            onUpdated={() => fetchPrograms()}
            className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
          >
            Add Slots
          </button>

          <button
            onClick={() => setOpenModalUpdateSlot(true)}
            onUpdated={() => fetchPrograms()}
            className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
          >
            Update Slots
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
            open={openModalAddSlot}
            onClose={() => setOpenModalAddSlot(false)}
            onUpdated={(updatedProgram) => {
              setFinancialAssistances(prev =>
                // Replace the updated program if it exists, otherwise add it
                prev.some(p => p.id === updatedProgram.id)
                  ? prev.map(p => p.id === updatedProgram.id ? updatedProgram : p)
                  : [...prev, updatedProgram]
              )
            }}
          />

          <UpdateSlotModal
            open={openModalUpdateSlot}
            onClose={() => setOpenModalUpdateSlot(false)}
            onUpdated={(updatedProgram) => {
              setFinancialAssistances(prev =>
                // Replace the updated program if it exists, otherwise add it
                prev.some(p => p.id === updatedProgram.id)
                  ? prev.map(p => p.id === updatedProgram.id ? updatedProgram : p)
                  : [...prev, updatedProgram]
              )
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
                <div>Filled: {cmsTotals.totalFilled}</div>
                <div>Unfilled: {cmsTotals.totalUnfilled}</div>
                <div>% of total: {cmsTotals.percentage}%</div>
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
                    <div>Filled: {estatistikolarTotals.totalFilled}</div>
                    <div>Unfilled: {estatistikolarTotals.totalUnfilled}</div>
                    <div>% of total: {estatistikolarTotals.percentage}%</div>
                  </div>
                </div>
              </Link>


              <Link to="/financial_assistance/CoScho">
                <div className="max-w-sm rounded-lg shadow-lg border border-gray-200 p-6 bg-white">
                  <h3 className="text-lg font-bold text-red-700">CoScho</h3>
                  <p className="text-sm text-red-600">College Scholarship Program</p>
                  <div className="mt-6 space-y-2 text-sm text-gray-700">
                    <div>Slots: {CoSchoTotals.totalSlots}</div>
                    <div>Filled: {CoSchoTotals.totalFilled}</div>
                    <div>Unfilled: {CoSchoTotals.totalUnfilled}</div>
                    <div>% of total: {CoSchoTotals.percentage}%</div>
                  </div>
                </div>
              </Link>


              <Link to="/financial_assistance/msrs">
                <div className="max-w-sm rounded-lg shadow-lg border border-gray-200 p-6 bg-white">
                  <h3 className="text-lg font-bold text-red-700">MSRS</h3>
                  <p className="text-sm text-red-600">Medical Scholarship and Return Service</p>
                  <div className="mt-6 space-y-2 text-sm text-gray-700">
                    <div>Slots: {MSRSTotals.totalSlots}</div>
                    <div>Filled: {MSRSTotals.totalFilled}</div>
                    <div>Unfilled: {MSRSTotals.totalUnfilled}</div>
                    <div>% of total: {MSRSTotals.percentage}%</div>
                  </div>
                </div>
              </Link>

              <Link to="/financial_assistance/Acef_Giahep">
                <div className="max-w-sm rounded-lg shadow-lg border border-gray-200 p-6 bg-white">
                  <h3 className="text-lg font-bold text-red-700">ACEF-GIAHEP</h3>
                  <p className="text-sm text-red-600">Agricultural Competitiveness Enhancement Fund</p>
                  <div className="mt-6 space-y-2 text-sm text-gray-700">
                    <div>Slots: {ACEF_GIAHEPTotals.totalSlots}</div>
                    <div>Filled: {ACEF_GIAHEPTotals.totalFilled}</div>
                    <div>Unfilled: {ACEF_GIAHEPTotals.totalUnfilled}</div>
                    <div>% of total: {ACEF_GIAHEPTotals.percentage}%</div>
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
                    <div>Filled: {SIDA_SGPTotals.totalFilled}</div>
                    <div>Unfilled: {SIDA_SGPTotals.totalUnfilled}</div>
                    <div>% of total: {SIDA_SGPTotals.percentage}%</div>
                  </div>
                </div>
              </Link>

              <Link to="/financial_assistance/Mtp_Sp">
                <div className="max-w-sm rounded-lg shadow-lg border border-gray-200 p-6 bg-white">
                  <h3 className="text-lg font-bold text-red-700">MTP-SP</h3>
                  <p className="text-sm text-red-600">Maritime Training Program</p>
                  <div className="mt-6 space-y-2 text-sm text-gray-700">
                    <div>Slots: {Mtp_SpTotals.totalSlots}</div>
                    <div>Filled: {Mtp_SpTotals.totalFilled}</div>
                    <div>Unfilled: {Mtp_SpTotals.totalUnfilled}</div>
                    <div>% of total: {Mtp_SpTotals.percentage}%</div>
                  </div>
                </div>
              </Link>

              <Link to="/financial_assistance/Cgms_Sucs">
                <div className="max-w-sm rounded-lg shadow-lg border border-gray-200 p-6 bg-white">
                  <h3 className="text-lg font-bold text-red-700">CGMS-SUCs</h3>
                  <p className="text-sm text-red-600">Cultural and General Management Scholarship for Students</p>
                  <div className="mt-6 space-y-2 text-sm text-gray-700">
                    <div>Slots: {CGMS_SUCsTotals.totalSlots}</div>
                    <div>Filled: {CGMS_SUCsTotals.totalFilled}</div>
                    <div>Unfilled: {CGMS_SUCsTotals.totalUnfilled}</div>
                    <div>% of total: {CGMS_SUCsTotals.percentage}%</div>
                  </div>
                </div>
              </Link>

              <Link to="/financial_assistance/Snplp">
                <div className="max-w-sm rounded-lg shadow-lg border border-gray-200 p-6 bg-white">
                  <h3 className="text-lg font-bold text-red-700">SNLP</h3>
                  <p className="text-sm text-red-600">Student Loan Program</p>
                  <div className="mt-6 space-y-2 text-sm text-gray-700">
                    <div>Slots: {SNPLPTotals.totalSlots}</div>
                    <div>Filled: {SNPLPTotals.totalFilled}</div>
                    <div>Unfilled: {SNPLPTotals.totalUnfilled}</div>
                    <div>% of total: {SNPLPTotals.percentage}%</div>
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

