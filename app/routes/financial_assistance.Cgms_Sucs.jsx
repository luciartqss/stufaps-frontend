import { useEffect, useState, useCallback } from 'react'
import { Card, Typography, Space, Select, Progress } from 'antd'
import {
  ContactsOutlined,
  TeamOutlined,
  UserOutlined,
  FilterOutlined,
  InfoCircleOutlined,
  SolutionOutlined,
  FileProtectOutlined,
  FieldTimeOutlined,
  SwitcherOutlined,
} from '@ant-design/icons'
import { API_BASE } from '../lib/config'

const { Text, Title } = Typography
const { Option } = Select

export function meta() {
  return [
    { title: 'Student Monetary Assistance for Recovery and Transition (SMART) | StuFAPs' },
    { name: 'description', content: 'Manage SMART records' },
  ]
}

function StatsCards({ financialAssistances = [], semester }) {
  const isSpecificSem = true
  const semShort = { First: '1st Sem', Second: '2nd Sem' }[semester] || semester

  let totals;

  if (financialAssistances.length === 1 && (financialAssistances[0].academic_year === 'All' || financialAssistances[0].Academic_year === 'All')) {
    const row = financialAssistances[0];
    totals = {
      totalSlots: Number(row?.total_slot) || 0,
      totalFilled: Number(row?.total_students) || 0,
      totalUnfilled: Number(row?.unfilled_slot) || 0,
    };
  } else {
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
      title: isSpecificSem ? `Disbursed (${semShort})` : 'Filled Slots',
      value: totals.totalFilled,
      icon: <TeamOutlined />,
      color: '#52c41a',
      bgColor: '#f6ffed',
      percentage: ((totals.totalFilled / (totals.totalSlots || 1)) * 100).toFixed(1),
    },
    {
      title: isSpecificSem ? `Not Yet Disbursed (${semShort})` : 'Unfilled Slots',
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
          <Card
            key={index}
            style={{
              flex: 1,
              minWidth: 0,
              borderRadius: 12,
              border: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
            bodyStyle={{
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
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
      ))}
    </div>
  )
}

export default function FinancialAssistancescgms_sucs() {
  const [financialAssistances, setFinancialAssistances] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [academicYearFilter, setAcademicYearFilter] = useState('All')
  const [semesterFilter, setSemesterFilter] = useState('First')
  const [academicYears, setAcademicYears] = useState([])

  const fetchData = useCallback(() => {
    setLoading(true)
    const semParam = `?semester=${encodeURIComponent(semesterFilter)}`
    fetch(`${API_BASE}/scholarship_program_records${semParam}`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        return res.json()
      })
      .then(data => {
        const programsData = data.data || data
        setFinancialAssistances(Array.isArray(programsData) ? programsData : [])

        const uniqueYears = [
          ...new Set(
            programsData.map(p => p.academic_year || p.Academic_year).filter(Boolean)
          )
        ]

        setAcademicYears([...uniqueYears.sort()])
      })
      .catch(err => {
        console.error('Fetch Error:', err)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [semesterFilter])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <div className="p-8">Loading...</div>
  if (error) return <div className="p-8 text-red-600 bg-red-50 border border-red-300 rounded">Error: {error}</div>


  const handleAcademicYearChange = value => { setAcademicYearFilter(value || 'All') }

  const sortedYears = [...academicYears].sort()

  const filteredCgms = (() => {
    const allData = (Array.isArray(financialAssistances) ? financialAssistances : [])
      .filter(p => p?.scholarship_program_name?.toUpperCase() === 'SMART')

    if (academicYearFilter && academicYearFilter !== 'All') {
      const yearIdx = sortedYears.indexOf(academicYearFilter)
      const yearsUpTo = yearIdx >= 0 ? sortedYears.slice(0, yearIdx + 1) : [academicYearFilter]
      const recordsUpTo = allData.filter(p => {
        const ay = p.academic_year || p.Academic_year
        return ay !== 'All' && yearsUpTo.includes(ay)
      })
      const currentRecords = allData.filter(p => (p.academic_year || p.Academic_year) === academicYearFilter)

      const cumSlots = {}
      for (const r of recordsUpTo) {
        const k = r.scholarship_program_name?.toUpperCase().trim()
        cumSlots[k] = (cumSlots[k] || 0) + (Number(r.total_slot) || 0)
      }

      const seen = new Set()
      const result = currentRecords.map(r => {
        const k = r.scholarship_program_name?.toUpperCase().trim()
        seen.add(k)
        const cs = cumSlots[k] || 0
        const filled = Number(r.total_students) || 0
        return { ...r, total_slot: cs, unfilled_slot: Math.max(0, cs - filled) }
      })

      for (const [k, slots] of Object.entries(cumSlots)) {
        if (!seen.has(k) && slots > 0) {
          const s = recordsUpTo.find(r => r.scholarship_program_name?.toUpperCase().trim() === k)
          if (s) result.push({ ...s, academic_year: academicYearFilter, Academic_year: academicYearFilter, total_slot: slots, total_students: 0, unfilled_slot: slots })
        }
      }

      return result
    }

    return allData.filter(p => (p.academic_year || p.Academic_year) === 'All')
  })()

  return (
    <div style={{ background: '#fff', margin: -24, minHeight: 'calc(100vh - 72px)' }}>
      {/* Header */}
      <div style={{ padding: '24px', borderBottom: '1px solid #e8eaed' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>SMART</Title>
            <Text style={{ color: '#6b7280', fontSize: 16 }}>Student Monetary Assistance for Recovery and Transition</Text>
          </div>
          <Space size={12}>
            <FilterOutlined style={{ color: '#6b7280' }} />
            <Select
              value={academicYearFilter}
              allowClear
              size="middle"
              style={{ width: 160 }}
              onChange={handleAcademicYearChange}
            >
              {academicYears.map(year => (
                <Option key={year} value={year}>{year}</Option>
              ))}
            </Select>
            <Select
              value={semesterFilter}
              onChange={v => setSemesterFilter(v)}
              style={{ width: 160 }}
              allowClear={false}
            >
              <Option value="First">1st Semester</Option>
              <Option value="Second">2nd Semester</Option>
            </Select>
          </Space>
        </div>
      </div>

      <div style={{ padding: '24px', borderBottom: '1px solid #e8eaed' }}>
        <StatsCards financialAssistances={filteredCgms} semester={semesterFilter} />
      </div>

      {/* Overview */}
      <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
        <Space size={12} align="start">
          <InfoCircleOutlined style={{ fontSize: 24, color: '#6b7280', marginTop: 6 }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Overview
          </Title>
        </Space>
        <Text style={{ color: '#6b7280', fontSize: 16, display: 'block', marginTop: 8 }}>
          The Implementing Guidelines for the Cash Grants to Medical Students enrolled in
          State Universities and Colleges (CGMS-SUCs) are jointly issued by the Commission on
          Higher Education (CHED) and the Department of Budget and Management (DBM), aims to
          provide tuition fee subsidy and financial assistance to all medical students
          enrolled in identified SUCs offering Doctor of Medicine Program.
        </Text>
      </div>

      {/* Eligibility */}
      <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
        <Space size={12} align="start">
          <SolutionOutlined style={{ fontSize: 24, color: '#6b7280', marginTop: 6 }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Who May Apply
          </Title>
        </Space>
        <Text style={{ color: '#6b7280', fontSize: 16, display: 'block', marginTop: 8 }}>
          The program is intended for all Filipino medical students, both new and continuing,
          who are enrolled in the Doctor of Medicine Program in the following SUCs:
        </Text>
        <Typography style={{ color: '#6b7280', fontSize: 16, marginTop: 8 }}>
          <ol className="list-decimal">
            <li>Bicol University – Daraga, Albay</li>
            <li>Cagayan State University – Carig, Tuguegarao City, Cagayan</li>
            <li>Mariano Marcos State University – Quiling Sur, City of Batac, Ilocos Norte</li>
            <li>Mindanao State University – Marawi City, Lanao Del Sur</li>
            <li>University of Northern Philippines – Tamag, Vigan City, Ilocos Sur</li>
            <li>University of the Philippines Manila College of Medicine – Pedro Gil, Manila</li>
            <li>University of the Philippines Manila School of Health Sciences – Palo, Leyte</li>
            <li>West Visayas State University – Luna Street, La Paz, Iloilo City</li>
          </ol>
        </Typography>
      </div>

      {/* Application Process */}
      <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
        <Space size={12} align="start">
          <FileProtectOutlined style={{ fontSize: 24, color: '#6b7280', marginTop: 6 }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Application Process
          </Title>
        </Space>
        <Text strong style={{ color: '#6b7280', fontSize: 16, display: 'block', marginTop: 8 }}>
          Where to secure and file application:
        </Text>
        <Text style={{ color: '#6b7280', fontSize: 16, display: 'block', marginTop: 4 }}>
          Participating SUCs offering Doctor of Medicine programs
        </Text>
        <Typography style={{ color: '#6b7280', fontSize: 16, marginTop: 8 }}>
          <ul className="list-disc">
            <li>
              Applicant submits the accomplished CGMS-SUCs Application Form (Annex "A") directly to the SUC concerned together with the required documents before the start of academic year applied
            </li>
            <li>SUC evaluates the documents of applicants</li>
            <li>SUC issues Notice of Award (NOA) using Annex "B"</li>
            <li>Applicant accepts NOA</li>
          </ul>
        </Typography>
      </div>

      {/* Schedule */}
      <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
        <Space size={12} align="start">
          <FieldTimeOutlined style={{ fontSize: 24, color: '#6b7280', marginTop: 6 }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Schedule of Application
          </Title>
        </Space>
        <Text style={{ color: '#6b7280', fontSize: 16, display: 'block', marginTop: 8 }}>
          Before the start of Academic Year (AY) applied
        </Text>
      </div>

      {/* Contact */}
      <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
        <Text style={{ color: '#6b7280', fontSize: 16 }}>
          For queries, call (02) 8988-0001 or email osds-lsad@ched.gov.ph
        </Text>
      </div>

      {/* Reference Materials */}
      <div style={{ padding: '12px 24px 24px' }}>
        <Space size={12} align="start">
          <SwitcherOutlined style={{ fontSize: 24, color: '#6b7280', marginTop: 6 }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            CGMS-SUCs Reference Materials
          </Title>
        </Space>
        <Typography style={{ color: '#6b7280', fontSize: 16, marginTop: 8 }}>
          <ul className="list-disc">
            <li>
              <a
                href="https://ched.gov.ph/wp-content/uploads/CGMS-SUCs-Application-Form.pdf"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                CGMS-SUCs Application Form
              </a>
            </li>
            <li>
              <a
                href="https://ched.gov.ph/wp-content/uploads/CGMS-SUCs-Flyer.png"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                CGMS-SUCs Flyer
              </a>
            </li>
            <li>
              <a
                href="https://ched.gov.ph/wp-content/uploads/Implementing-Guidelines-for-the-Cash-Grants-to-Medical-Students-Enrolled-in-SUCs-Pursuant-to-Special-Provision-Applicable-to-SUCs-RA-No.-10964.pdf"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Implementing Guidelines for the Cash Grants to Medical Students Enrolled in SUCs, Pursuant to Special Provision Applicable to SUCs, RA No. 10964
              </a>
            </li>
            <li>
              <a
                href="https://ched.gov.ph/wp-content/uploads/AMENDM1.pdf"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Amendments to CHED and DBM JMC No. 2018-1
              </a>
            </li>
          </ul>
        </Typography>
      </div>
    </div>
  )
}
