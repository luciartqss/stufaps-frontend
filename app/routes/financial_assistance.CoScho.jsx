import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../lib/config'

import {
  Card,
  Typography,
  Space,
  Select,
} from 'antd'

import {
  ContactsOutlined,
  TeamOutlined,
  FilterOutlined,
  UserOutlined,
  InfoCircleOutlined,
  ProjectOutlined,
  CheckCircleOutlined,
  FundOutlined,
  FundProjectionScreenOutlined,
  FileProtectOutlined,
  FormOutlined,
  ReadOutlined,
  WarningOutlined,
  ReconciliationOutlined,
  DollarOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons'

const { Text, Title } = Typography
const { Option } = Select
import { Progress } from 'antd'

export function meta() {
  return [
    { title: 'Scholarship Program for Coconut Farmers and Their Families (CoScho) | StuFAPs' },
    { name: 'description', content: 'Manage Estatistikolar records' },
  ]
}

function StatsCards({ financialAssistances = [] }) {

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

export default function FinancialAssistanceCoScho() {
  const [financialAssistances, setFinancialAssistances] = useState([])
  const [expandedSUC, setExpandedSUC] = useState(null);
  const [expandedPrivate, setExpandedPrivate] = useState(null);
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [academicYearFilter, setAcademicYearFilter] = useState('All')
  const [academicYears, setAcademicYears] = useState([])

  useEffect(() => {
    fetch(`${API_BASE}/scholarship_program_records`)
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
  }, [])

  const handleAcademicYearChange = value => { setAcademicYearFilter(value || 'All') }

  if (loading) return <div className="p-8">Loading...</div>
  if (error) return <div className="p-8 text-red-600 bg-red-50 border border-red-300 rounded">Error: {error}</div>
  if (!Array.isArray(financialAssistances) || financialAssistances.length === 0) {
    return <div className="p-8 text-yellow-600 bg-yellow-50 border border-yellow-300 rounded">No scholarship programs found. Make sure your backend is running and database is seeded.</div>
  }

  const filteredcoScho = (Array.isArray(financialAssistances) ? financialAssistances : []).filter(p => {
    if (p?.scholarship_program_name?.toUpperCase() !== 'COSCHO') return false
    if (academicYearFilter && academicYearFilter !== 'All') {
      return (p.academic_year || p.Academic_year) === academicYearFilter
    }
    // Only keep the "All" row when filter is All
    return (p.academic_year || p.Academic_year) === 'All'
  })

  return (
    <div style={{ background: '#fff', margin: -24, minHeight: 'calc(100vh - 72px)' }}>
      {/* Header */}
      <div style={{ padding: '24px', borderBottom: '1px solid #e8eaed' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>CoScho</Title>
            <Text style={{ color: '#6b7280', fontSize: 16 }}>Scholarship Program for Coconut Farmers and Their Families</Text>
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
          </Space>
        </div>
      </div>

      <div style={{ padding: '24px', borderBottom: '1px solid #e8eaed' }}>
        <StatsCards financialAssistances={filteredcoScho} />
      </div>

      <div style={{ padding: '12px 24px 0' }}>
        <Text style={{ color: '#6b7280', fontSize: 16 }}>
          The CoScho Program is open to incoming first-year college students who are qualified coconut
          farmers or their dependents. However, continuing college students who meet the eligibility
          requirements may also apply, provided they are not recipients of any other government scholarship.
        </Text>
      </div>

      {/* Overview */}
      <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
        <Space size={12} align="start">
          <InfoCircleOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Overview
          </Title>
        </Space>
        <Text style={{ display: 'block', marginTop: 8, color: '#6b7280', fontSize: 16 }}>
          The Joint Memorandum Circular No. 01, series of 2023 outlines the implementing guidelines of the
          Scholarship Program for Coconut Farmers and Their Families (CoScho) under the Coconut Farmers
          and Industry Development Plan (CFIDP). It is a joint initiative of the Commission on Higher
          Education (CHED) and the Philippine Coconut Authority (PCA) aimed at providing educational
          opportunities to qualified coconut farmers and their dependents.
        </Text>
      </div>

      {/* Scope and Coverage */}
      <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
        <Space size={12} align="start">
          <ProjectOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Scope and Coverage
          </Title>
        </Space>
        <Text style={{ display: 'block', marginTop: 8, color: '#6b7280', fontSize: 16 }}>
          The CoScho Program covers qualified coconut farmers and their dependents listed in the
          National Coconut Farmers Registry System (NCFRS). It is implemented nationwide in identified
          coconut-producing provinces and applies to undergraduate degree programs offered by SUCs,
          LUCs, and CHED-recognized HEIs.
        </Text>
      </div>

      {/* Application Process */}
      <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
        <Space size={12} align="start">
          <FileProtectOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Application Process (Eligible Applicant)
          </Title>
        </Space>
        <Typography style={{ marginTop: 8, color: '#6b7280', fontSize: 16 }}>
          <ol className="list-decimal">
            <li>Filipino citizen;</li>
            <li>
              Child or dependent of a registered coconut farmer in the National Coconut Farmers Registry System (NCFRS); High school graduate;
            </li>
            <li>Not more than 25 years old (except for senior citizens or special cases);</li>
            <li>Must not have any other government scholarship;</li>
            <li>With good moral character.</li>
          </ol>
        </Typography>
      </div>

      {/* Scholarship Benefits */}
      <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
        <Space size={12} align="start">
          <CheckCircleOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Scholarship Benefits
          </Title>
        </Space>

        <Card
          style={{ borderRadius: 12, border: '1px solid #f0f2f5', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)', marginTop: 12 }}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <FundOutlined style={{ fontSize: 16, color: '#6b7280' }} />
              <Title level={2} style={{ fontSize: 16, margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                SUCs/LUCs
              </Title>
            </div>
          }
        >
          <div style={{ marginBottom: 10 }}>
            <Text style={{ color: '#6b7280', fontSize: 16 }}>
              <strong>Regular Allowances</strong>
            </Text>
          </div>
          <table style={{ width: '100%' }}>
            <thead style={{ backgroundColor: "#3366cc", color: '#FFF' }}>
              <tr>
                <th style={{ border: '1px solid #000', padding: '8px' }}>Item</th>
                <th style={{ border: '1px solid #000', padding: '8px' }}>Per Sem</th>
                <th style={{ border: '1px solid #000', padding: '8px' }}>Per AY</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #000', padding: '8px' }}>TOSF</td>
                <td colSpan={2} style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>Free Higher Education (FHE)</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '8px' }}>Stipend (₱7,000 × 5 months)</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱35,000.00</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱70,000.00</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '8px' }}>Book/Connectivity Allowance</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱5,000.00</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱10,000.00</td>
              </tr>
            </tbody>
            <tfoot style={{ background: '#CED4DA', textAlign: 'center' }}>
              <tr>
                <td style={{ border: '1px solid #000', padding: '8px' }}>Total</td>
                <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>₱40,000.00</td>
                <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>₱80,000.00</td>
              </tr>
            </tfoot>
          </table>
        </Card>

        <Card
          style={{ borderRadius: 12, border: '1px solid #f0f2f5', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)', marginTop: 16 }}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <FundProjectionScreenOutlined style={{ fontSize: 16, color: '#6b7280' }} />
              <Title level={2} style={{ fontSize: 16, margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                Private HEIs
              </Title>
            </div>
          }
        >
          <div style={{ marginBottom: 10 }}>
            <Text style={{ color: '#6b7280', fontSize: 16 }}>
              <strong>Other Allowances</strong>
            </Text>
          </div>
          <table style={{ width: '100%' }}>
            <thead style={{ backgroundColor: "#3366cc", color: '#FFF' }}>
              <tr>
                <th style={{ border: '1px solid #000', padding: '8px' }}>Item</th>
                <th style={{ border: '1px solid #000', padding: '8px' }}>Per Sem</th>
                <th style={{ border: '1px solid #000', padding: '8px' }}>Per AY</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #000', padding: '8px' }}>TOSF</td>
                <td colSpan={2} style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱75,000.00</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '8px' }}>Stipend (₱7,000 × 5 months)</td>
                <td colSpan={2} style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱10,000.00</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '8px' }}>Book/Connectivity Allowance</td>
                <td colSpan={2} style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱30,000.00</td>
              </tr>
            </tbody>
            <tfoot style={{ background: '#CED4DA', textAlign: 'center' }}>
              <tr>
                <td style={{ border: '1px solid #000', padding: '8px' }}>Total</td>
                <td colSpan={2} style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>₱115,000.00</td>
              </tr>
            </tfoot>
          </table>
        </Card>
      </div>

      {/* Direct Payment to Scholars */}
      <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
        <Space size={12} align="start">
          <DollarOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Direct Payment to Scholars
          </Title>
        </Space>
        <Text style={{ display: 'block', marginTop: 8, color: '#6b7280', fontSize: 16 }}>
          CHEDROs shall transfer financial benefits directly to the scholars per semester of academic year until the completion of the degree program by crediting it to the authorized bank account of scholars.
        </Text>
      </div>

      {/* Initial Payment/Requirements */}
      <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
        <Space size={12} align="start">
          <FormOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Initial Payment/Requirements
          </Title>
        </Space>
        <Typography style={{ marginTop: 8, color: '#6b7280', fontSize: 16 }}>
          <ol className="list-disc">
            <li>Certified true copy of the registration form or photocopy verified against the original document by the CHEDRO StuFAPs coordinator.</li>
            <li>Copy of Automated Teller Machine (ATM) card from authorized government banks.</li>
            <li>Copy of school ID for current semester/term.</li>
          </ol>
        </Typography>
      </div>

      {/* Succeeding Payment/Requirements */}
      <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
        <Space size={12} align="start">
          <ReconciliationOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Succeeding Payment/Requirements
          </Title>
        </Space>
        <Typography style={{ marginTop: 8, color: '#6b7280', fontSize: 16 }}>
          <ul className="list-disc">
            <li>Certified true copy of the registration form or photocopy verified against the original document by the CHEDRO StuFAPs coordinator.</li>
            <li>Copy of Automated Teller Machine (ATM) card from authorized government banks.</li>
            <li>Copy of school ID for current semester/term.</li>
          </ul>
        </Typography>
      </div>

      {/* Responsibilities of Scholars */}
      <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
        <Space size={12} align="start">
          <ReadOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Responsibilities of Scholars
          </Title>
        </Space>
        <Typography style={{ marginTop: 8, color: '#6b7280', fontSize: 16 }}>
          <ul className="list-disc">
            <li>Execute a Scholarship Grant Contact (Annex E) with CHEDRO for the scholarship program.</li>
            <li>Enroll in recognized priority programs of Private Higher Education Institutions (PHEIs) or SUCs/LUCs with COPCs.</li>
            <li>Carry a regular load per semester/term as determined by the HEI and complete the degree program within the timeframe required in the curriculum. However, a scholar may be allowed to defer his/her enrolment not exceeding one (1) academic year due to health reasons supported by a medical certificate and/or displacement of residence due to force majeure, threat to safety and security which would prevent him/her from enrolling.</li>
            <li>Maintain a GWA of at least 80% or its equivalent.</li>
            <li>Transfer only to the concerned HEI or shift to other priority program upon written approval of CHEDRO and shall be subject to the originating and receiving HEI's policies.</li>
            <li>Must not avail any other government funded student financial assistance program.</li>
          </ul>
        </Typography>
      </div>

      {/* Grounds for Termination */}
      <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
        <Space size={12} align="start">
          <WarningOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Grounds for Scholarship Termination
          </Title>
        </Space>
        <Typography style={{ marginTop: 8, color: '#6b7280', fontSize: 16 }}>
          <ol className="list-decimal">
            <li>Execute a Scholarship Grant Contact (Annex E) with CHEDRO for the scholarship program.</li>
            <li>Enroll in recognized priority programs of Private Higher Education Institutions (PHEIs) or SUCs/LUCs with COPCs.</li>
            <li>
              Carry a regular load per semester/term as determined by the HEI and complete the degree program within the timeframe required in the curriculum. However, a scholar may be allowed to defer his/her enrolment not exceeding one (1) academic year due to health reasons supported by a medical certificate and/or displacement of residence due to force majeure, threat to safety and security which would prevent him/her from enrolling.
            </li>
            <li>Maintain a GWA of at least 80% or its equivalent.</li>
            <li>
              Transfer only to the concerned HEI or shift to other priority program upon written approval of CHEDRO and shall be subject to the originating and receiving HEI's policies.
            </li>
            <li>Must not avail any other government funded student financial assistance program.</li>
          </ol>
        </Typography>
      </div>

      {/* Replacement */}
      <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
        <Space size={12} align="start">
          <UserSwitchOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Replacement of a Scholar
          </Title>
        </Space>

        <Text strong style={{ display: 'block', marginTop: 8, color: '#6b7280', fontSize: 16 }}>
          Replacement of a scholar may be allowed within a given academic year,
          through any of the following grounds:
        </Text>

        <Typography style={{ color: '#6b7280', fontSize: 16 }}>
          <ol className="list-decimal">
            <li>Failure to confirm acceptance of the award fifteen (15) working days upon receipt of the NOA</li>
            <li>Voluntary withdrawal/Waiver of scholarship grant</li>
            <li>Dropping out from school without notice to CHEDRO</li>
            <li>Termination of scholarship grant on grounds stated in Section 14</li>
          </ol>
        </Typography>

        <Text strong style={{ display: 'block', color: '#6b7280', fontSize: 16 }}>
          A replacement must be chosen based on the definition of "dependent" under this Circular who shall be taken
          from the official rank list of the CHEDRO. The replacement shall avail of the benefits for the remaining duration of the scholarship grant.
        </Text>

        <Text strong style={{ display: 'block', marginTop: 8, color: '#6b7280', fontSize: 16 }}>
          The replaced scholar shall be informed in writing by the concerned CHEDRO stating therein the reason/s for his/her replacement.
          PCA shall be informed of any replacement made for information and record purposes.
        </Text>
      </div>

      <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
        <Space size={12} align="start">
          <WarningOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Issuances
          </Title>
        </Space>
        <Typography style={{ marginTop: 8, color: '#6b7280', fontSize: 16 }}>
          <ul className="list-disc">
            <li>
              <a
                href="https://ched.gov.ph/wp-content/uploads/20230913-JMC-No-01-S-2023-Implementing-Guidelines-of-the-Scholarship-Program-for-Coconut-Farmers-and-their-Families-CoScho.pdf"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                CHED – PCA Joint Memorandum Circular No. 1, series of 2023
              </a>
            </li>
            <br />
            <li>
              <a
                href="https://ched.gov.ph/wp-content/uploads/MOC-CALL-FOR-APPLICATIONS-FOR-THE-SCHOLARSHIP-PROGRAM-FOR-COCONUT-FRAMERS-AND-THEIR-FAMILIES-CoScho-FOR-ACADEMIC-YEAR-AY-2023-2024.pdf.pdf"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Memorandum from the Chairperson – Call for Applications for the Scholarship Program for Coconut Farmers and their Families (CoScho) for AY 2023-2024
              </a>
            </li>
            <br />
            <li>
              <a
                href="https://ched.gov.ph/wp-content/uploads/CAO-NO.-2-S.-2023-Operational-Guidelines-on-the-Implementation-of-the-Scholarship-Program-for-Coconut-Farmers-and-their-Families-for-CHED-Regional-Offices.pdf.pdf"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                CHED Administrative Order No. 02, Series of 2023 – Operational Guidelines on the Implementation of the Scholarship Program for Coconut Farmers and their Families (CoScho) for CHED Regional Offices
              </a>
            </li>
            <br />
            <li>
              <a
                href="https://ched.gov.ph/wp-content/uploads/CMO-No.-17-S.-2023-Operational-Guidelines-on-the-Implementation-of-the-Scholarship-Program-for-Coconut-Farmers-and-their-Families-for-Higher-Education-Institution.pdf"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                CMO No. 17, Series of 2023 – Operational Guidelines on the Implementation of the Scholarship Program for Coconut Farmers and their Families (CoScho) for Participating Higher Education Institutions
              </a>
            </li>
            <br />
            <li>
              <a
                href="https://ched.gov.ph/wp-content/uploads/2024-MOC-COSCHO-CALL-FOR-APPLICATION.pdf"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Memorandum from the Chairperson – Call for Applications for the Scholarship Program for Coconut Farmers and their Families (CoScho) for AY 2024-2025
              </a>
            </li>
            <br />
            <li>
              <a
                href="https://ched.gov.ph/wp-content/uploads/MOED_NO_486_S_2025_CoScho_Call_for_Aplication_AY_25_26.pdf"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Memorandum from  the Office of the Executive Director – Call for Application for the Scholarship Program for Coconut Farmers and their Families (CoScho) for AY 2025-2026
              </a>
            </li>      
          </ul>
        </Typography>
      </div>

    </div>
  );
}
