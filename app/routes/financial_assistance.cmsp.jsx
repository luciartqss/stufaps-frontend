import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Tag, Typography, Space, Select, Row, Col } from 'antd'
// Row/Col kept for StatsCards grid and table layouts
import { API_BASE } from '../lib/config'
import {
  ContactsOutlined,
  RightOutlined,
  SnippetsOutlined,
  TeamOutlined,
  FilterOutlined,
  UserOutlined,
  ProjectOutlined,
  FundOutlined,
  FundProjectionScreenOutlined,
  StopOutlined,
  FileProtectOutlined,
  FormOutlined,
  ReadOutlined,
  WarningOutlined,
  ReconciliationOutlined,
  DollarOutlined,
  AuditOutlined,
  InteractionOutlined,
  ProfileOutlined,
  FileSearchOutlined,
  UserSwitchOutlined,
  SolutionOutlined,
  FileTextOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'
const { Text, Title } = Typography
const { Option } = Select
import { Progress } from 'antd'

export function meta() {
  return [
    { title: 'CHED Merit Scholarship Program (CMSP) | StuFAPs' },
    { name: 'description', content: 'Manage CMSP records' },
  ]
}


function StatsCards({ financialAssistances = [] }) {
  let totals;

  if (
    financialAssistances.length === 1 &&
    (financialAssistances[0].academic_year === 'All' ||
      financialAssistances[0].Academic_year === 'All')
  ) {
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

  const fillPct = totals.totalSlots > 0 ? Math.round((totals.totalFilled / totals.totalSlots) * 100) : 0;
  const exceeded = totals.totalFilled > totals.totalSlots;

  const formatProgramName = name => {
    if (!name) return '';
    return name
      .replace(/SSP/g, '-SSP')       // turn FULLSSP → FULL SSP
      .replace(/PESFA/g, '-PESFA')   // turn FULLPESFA → FULL PESFA
      .replace(/GAD/g, '-GAD')       // turn FULLSSPGAD → FULL SSP GAD
      .trim();
  };

  return (
    <Card
      hoverable
      style={{
        borderRadius: 12,
        border: exceeded ? '1px solid #ff4d4f' : '1px solid #f0f0f0',
        height: '100%',
        transition: 'all 0.2s ease',
      }}
      bodyStyle={{ padding: 20 }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text strong style={{ fontSize: 16, color: '#1a1a1a' }}>
              {formatProgramName(financialAssistances[0]?.scholarship_program_name)}
            </Text>
            {exceeded && (
              <Tag color="error" icon={<WarningOutlined />} style={{ fontSize: 11, margin: 0 }}>
                Exceeded
              </Tag>
            )}
          </div>
        </div>
        <RightOutlined style={{ color: '#bfbfbf', fontSize: 12 }} />
      </div>

      {/* Progress */}
      <Progress
        percent={Math.min(fillPct, 100)}
        size="small"
        strokeColor={exceeded ? '#ff4d4f' : '#1890ff'}
        trailColor="#f0f0f0"
        showInfo={false}
        style={{ marginBottom: 5 }}
      />

      {/* Stats row */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a' }}>{totals.totalSlots}</div>
          <Text type="secondary" style={{ fontSize: 11 }}>Slots</Text>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#52c41a' }}>{totals.totalFilled}</div>
          <Text type="secondary" style={{ fontSize: 11 }}>Filled</Text>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: exceeded ? '#ff4d4f' : '#faad14' }}>{totals.totalUnfilled}</div>
          <Text type="secondary" style={{ fontSize: 11 }}>Unfilled</Text>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: exceeded ? '#ff4d4f' : '#1890ff' }}>{fillPct}%</div>
          <Text type="secondary" style={{ fontSize: 11 }}>Fill Rate</Text>
        </div>
      </div>
    </Card>
  );
}


export default function FinancialAssistanceCmsp() {
  const [financialAssistances, setFinancialAssistances] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedSUC, setExpandedSUC] = useState(null)
  const [academicYearFilter, setAcademicYearFilter] = useState('All')
  const [programFilter, setProgramFilter] = useState('All')

  const [academicYears, setAcademicYears] = useState([])
  const [programs, setPrograms] = useState([])

  const [expandedPrivate, setExpandedPrivate] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/scholarship_program_records`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
        return res.json()
      })
      .then(data => {
        console.log('API Response:', data)
        const programsData = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
        setFinancialAssistances(programsData)

        const uniqueYears = [
          ...new Set(
            programsData.map(p => p.academic_year || p.Academic_year).filter(Boolean)
          )
        ]

        const uniquePrograms = [
          ...new Set(
            programsData
              .filter(p => p.description === 'CHED Merit Scholarship Program')
              .map(p => p.scholarship_program_name)
              .filter(Boolean)
          )]

        setPrograms([...uniquePrograms.sort()])
        setAcademicYears([...uniqueYears.sort()])
        setLoading(false)
      })
      .catch(err => {
        console.error('Fetch Error:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const handleAcademicYearChange = value => {
    setAcademicYearFilter(value || 'All')
  }

  const handleProgramChange = value => {
    setProgramFilter(value)
  }

  if (loading) return <div>Loading CMSP data...</div>
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>

  const allowedPrograms = [
    'FULLSSP', 'HALFSSP', 'HALFSSPGAD', 'FULLSSPGAD',
    'FULLPESFA', 'HALFPESFA', 'HALFPESFAGAD', 'FULLPESFAGAD'
  ];


  const filteredCms = (Array.isArray(financialAssistances) ? financialAssistances : []).filter(p => {
    const programName = p?.scholarship_program_name?.toUpperCase().trim();

    // Only keep allowed programs
    if (!allowedPrograms.includes(programName)) return false;

    // Apply program filter if not "All"
    if (programFilter && programFilter !== 'All') {
      if (programName !== programFilter.toUpperCase().trim()) return false;
    }

    // Apply academic year filter if not "All"
    if (academicYearFilter && academicYearFilter !== 'All') {
      return (p.academic_year || p.Academic_year) === academicYearFilter;
    }

    // Default: keep "All" row when year filter is All
    return (p.academic_year || p.Academic_year) === 'All';
  });

  return (
    <div style={{ background: '#fff', margin: -24, minHeight: 'calc(100vh - 72px)' }}>
      {/* Header */}
      <div style={{ padding: '24px', borderBottom: '1px solid #e8eaed' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>CMSP</Title>
            <Text style={{ color: '#6b7280', fontSize: 16 }}>CHED Merit Scholarship Program</Text>
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
        <Row gutter={[16, 16]}>
          {allowedPrograms.map((program, index) => {
            const programData = filteredCms.filter(p => p.scholarship_program_name === program);
            return (
              <Col key={index} span={6}>
                <StatsCards financialAssistances={programData} />
              </Col>
            );
          })}
        </Row>
      </div>

      <div style={{ padding: '12px 24px 0' }}>
        <Text style={{ color: '#6b7280', fontSize: 16 }}>
          The CHED Merit Scholarship Program (CMSP) is a competitive grant by the
          Commission on Higher Education for academically talented Filipino students.
          It is open to incoming or current first-year.
        </Text>
      </div>

      <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
        <Space size={12} align="start">
          <ProjectOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Scope & Coverage
          </Title>
        </Space>
        <Text style={{ display: 'block', marginTop: 8, color: '#6b7280', fontSize: 16 }}>
          The CMSP is open to all incoming or current first-year students regardless of background or status.
          Additional ranking points are granted to applicants from special equity groups under the following laws:
          RA 7279 (Urban Development and Housing Act of 1992), RA 11291 (Magna Carta of the Poor),
          RA 7277 (Magna Carta for Persons with Disabilities), as amended, RA 11861 (Expanded Solo Parents Welfare Act), as amended,
          RA 9994 (Expanded Senior Citizens Act of 2010), and
          RA 8371 (Indigenous Peoples’ Rights Act of 1997), as well as other relevant legislation prioritizing marginalized sectors, including first-generation college students.
        </Text>
      </div>

      <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
        <Space size={12} align="start">
          <SnippetsOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Priority programs
          </Title>
        </Space>
        <Typography style={{ color: '#6b7280' }}>

        <ol>  
            <li style={{fontSize: 22}}>National
              <ul className="list-disc">
                <li style={{fontSize: 14}}>
                  <a
                    href="https://ched.gov.ph/wp-content/uploads/CMO-NO.-7-S.-2023.pdf"
                    className="text-blue-600 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    CHED Memorandum Order No. 7, series of 2023 – List of Identified Priority Programs for CHED Merit Scholarship Program (CMSP) for Academic Years (AY) 2023-2024 to 2027-2028
                  </a>
                </li>
              </ul>
            </li>

            <li style={{fontSize: 22}}>Regional
              <ul className="list-disc">
                <li style={{fontSize: 14}}>
                  <a
                    href="https://ched.gov.ph/wp-content/uploads/Regional-Priority-Courses-for-CHED-Scholarship-Prograrms-CSPs-Effective-Academic-Year-2021-2022-4.pdf"
                    className="text-blue-600 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Memorandum from the Chairperson -Regional Priority Courses for CHED Scholarship Programs (CSPs) Effective Academic Year 2021-2022
                  </a>
                </li>
              </ul>
            </li>

            <li style={{fontSize: 22}}>Gender and Development (GAD)
              <ul className="list-disc">
                <li style={{fontSize: 14}}>
                  <a
                    href="https://ched.gov.ph/wp-content/uploads/2011-April-4-Gender-and-Development-STUFAPs-Slot-Allocation-for-AY-2011-2012.pdf"
                    className="text-blue-600 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Memorandum from the Chairperson – Gender and Development STUFAPs Slot Allocation for AY 2011-2012
                  </a>
                </li>
              </ul>
            </li>
        </ol>  
        </Typography>

      </div>

      <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
        <Space size={12} align="start">
          <FileProtectOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Application Process (Eligible Applicant)
          </Title>
        </Space>
        <Text style={{ display: 'block', marginTop: 8, color: '#6b7280', fontSize: 16 }}>
          Filipino citizen, Graduate of a Senior High School in the Philippines with a minimum GWA of 93% or its equivalent,
          Combined annual gross income of parents or legal guardians must not exceed ₱500,000.00.
        </Text>
      </div>

      <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
        <Space size={12} align="start">
          <StopOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Ineligible Applicant
          </Title>
        </Space>
        <Typography style={{ marginTop: 8, color: '#6b7280', fontSize: 16 }}>
          <ul>
            <li className="font-medium">Foreign students</li>
            <li>Applicants who are not incoming or current first-year undergraduate students</li>
            <li>Applicants who will or are enrolled in priority programs but not granted government recognition or certification by CHED</li>
            <li>Applicants who will or intend to enroll in a non-priority program</li>
            <li>Transferees and shiftees with credited units as determined by admitting HEIs</li>
            <li>Existing recipients of any nationally government-funded scholarships or grants (TES, TDP); grantees under the One-time Grants are exempted</li>
            <li>Applicants who have completed an undergraduate degree program or are second-course takers</li>
            <li>Applicants who submitted tampered and/or falsified application documents</li>
          </ul>
        </Typography>
      </div>

      {/* Financial Assistance Tables */}
      <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
        <Space size={12} align="start">
          <FundOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            SUCs/LUCs
          </Title>
        </Space>
        <Row gutter={[24]} style={{ marginTop: 12 }}>
          <Col span={12}>
            <Card style={{ borderRadius: 12, border: '1px solid #f0f2f5', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }} title="Full-SSP">
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
                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>₱20,000.00</td>
                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>₱80,000.00</td>
                  </tr>
                </tfoot>
              </table>
            </Card>
          </Col>
          <Col span={12}>
            <Card style={{ borderRadius: 12, border: '1px solid #f0f2f5', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }} title="Half-SSP">
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
                    <td style={{ border: '1px solid #000', padding: '8px' }}>Stipend (₱7,500 × 5 months)</td>
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱17,500.00</td>
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱35,000.00</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '8px' }}>Book/Connectivity Allowance</td>
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱2,500.00</td>
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱5,000.00</td>
                  </tr>
                </tbody>
                <tfoot style={{ background: '#CED4DA', textAlign: 'center' }}>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '8px' }}>Total</td>
                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>₱20,000.00</td>
                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>₱40,000.00</td>
                  </tr>
                </tfoot>
              </table>
            </Card>
          </Col>
        </Row>
      </div>

      <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
        <Space size={12} align="start">
          <FundProjectionScreenOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Private HEIs
          </Title>
        </Space>
        <Row gutter={[24, 24]} style={{ marginTop: 12 }}>
          <Col span={12}>
            <Card style={{ borderRadius: 12, border: '1px solid #f0f2f5', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }} title="Full-PESFA">
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
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱20,000.00</td>
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱40,000.00</td>
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
                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>₱60,000.00</td>
                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>₱120,000.00</td>
                  </tr>
                </tfoot>
              </table>
            </Card>
          </Col>
          <Col span={12}>
            <Card style={{ borderRadius: 12, border: '1px solid #f0f2f5', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }} title="Half-PESFA">
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
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱10,000.00</td>
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱20,000.00</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '8px' }}>Stipend (₱7,500 × 5 months)</td>
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱17,500.00</td>
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱35,000.00</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '8px' }}>Book/Connectivity Allowance</td>
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱2,500.00</td>
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱5,000.00</td>
                  </tr>
                </tbody>
                <tfoot style={{ background: '#CED4DA', textAlign: 'center' }}>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '8px' }}>Total</td>
                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>₱30,000.00</td>
                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>₱60,000.00</td>
                  </tr>
                </tfoot>
              </table>
            </Card>
          </Col>
        </Row>
      </div>

      <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
        <Space size={12} align="start">
          <DollarOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Direct Payment to Scholars
          </Title>
        </Space>
        <Typography style={{ marginTop: 8, color: '#6b7280', fontSize: 16 }}>
          <ul>
            <li>HEI has no Memorandum of Agreement (MOA) Annex J with CHEDRO;</li>
            <li>HEI has fewer than ten (10) scholars;</li>
            <li>HEI has unliquidated balances or transferred funds; or</li>
            <li>HEI has verified StuFAPs-related complaints/issues</li>
          </ul>
        </Typography>
      </div>

      <div style={{ padding: '12px 24px 0' }}>
        <Space size={12} align="start">
          <FormOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Initial Payment/Requirements
          </Title>
        </Space>
        <Text className="font-medium" style={{ display: 'block', marginTop: 8, color: '#6b7280', fontSize: 16 }}>Payment Type</Text>
        <Typography style={{ color: '#6b7280', fontSize: 16 }}>
          <ul className="list-decimal">
            <li>Certified true copy of Certificate of Registration/Enrollment (COR/COE)
              or system-generated registration document signed by registrar/authorized official</li>
            <li>College ID or any government-issued ID with signature, certification from the school</li>
            <li>Photocopy of active Landbank ATM card</li>
          </ul>
        </Typography>
      </div>

      <div style={{ padding: '12px 24px 0' }}>
        <Space size={12} align="start">
          <ReconciliationOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Succeeding Payment/Requirements
          </Title>
        </Space>
        <Typography style={{ marginTop: 8, color: '#6b7280', fontSize: 16 }}>
          <ul className="list-decimal">
            <li>
              Certified true copy of Certificate of Registration/Enrollment (COR/COE) or
              system-generated registration document signed by registrar/authorized official
            </li>
            <li>
              Certified true copy of grades with GWA from previous semester/term signed by
              registrar/authorized official; Certification from HEI that the scholar is not a
              recipient of other national-funded scholarships for the current academic year
              (signed by Scholarship Coordinator or Registrar; submitted every start of the
              academic year)
            </li>
          </ul>
        </Typography>
      </div>

      <div style={{ padding: '12px 24px 0' }}>
        <Space size={12} align="start">
          <ReadOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Responsibilities of Scholars
          </Title>
        </Space>
        <Typography style={{ marginTop: 8, color: '#6b7280', fontSize: 16 }}>
          <ol className="list-decimal">
            <li>Adhere to the provisions of the scholarship contract (Annex B-2)</li>
            <li>Enroll in CHED-identified priority programs of PHEIs with GR, SUCs, or LUCs with COPC</li>
            <li>Maintain a GWA of at least 85% (full scholars) or 80% (half scholars);</li>
            <li>Enroll the required regular academic load per semester/trimester/term, except when only a few subjects remain to complete the program;</li>
            <li>Complete the degree within the prescribed period in the curriculum;</li>
            <li>
              <strong>Secure written approval from CHEDRO (Annex H) before: </strong>
              <ol className="list-[lower-alpha]">
                <li>Transferring to another HEI;</li>
                <li>Shifting to another recognized/certified priority program; or</li>
                <li>Filing a Leave of Absence (LOA) — allowed only once for one (1) academic year, without financial benefits during the LOA;</li>
              </ol>
            </li>
            <li>Refund to CHED all financial benefits if the scholarship is terminated for reasons under Section 26;</li>
            <li>Exhibit good moral character and follow CHED/HEI rules and regulations;</li>
            <li>Inform CHEDRO of any changes in status, program, HEI, or personal circumstances affecting eligibility;</li>
            <li>Submit required reports/documents within the deadlines;</li>
            <li>Submit an accomplished graduate exit form (Annex I).</li>
          </ol>
        </Typography>
      </div>

      <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
        <Space size={12} align="start">
          <WarningOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Grounds for Scholarship Termination
          </Title>
        </Space>
        <Typography style={{ marginTop: 8, color: '#6b7280', fontSize: 16 }}>
          <ol className="list-decimal">
            <li>Any violation of the provisions of these guidelines;</li>
            <li>Breach of contract;</li>
            <li>Availment of another National Government funded scholarship program;</li>
            <li>Enrollment in non-recognized program of PHEIs or SUCs or non-certified program of LUCs;</li>
            <li>Enrollment in non-priority programs;</li>
            <li>Failure to maintain the required GWA;</li>
            <li>Failure to enroll the required regular load based on approved curriculum of the HEI;</li>
            <li>Dropping out;</li>
            <li>LOA of scholar must not be more than one (1) academic year;</li>
            <li>Shifting to another program or transferring to another HEI without approval from concerned CHEDRO;</li>
            <li>Any acts inimical to the government and/or CHED;</li>
            <li>Prima facie evidence of participation or involvement in hazing related activities; and</li>
            <li>
              Transfer of HEI that involves a change of scholarship program from: Full-SSP to Full-PESFA, or vice versa,
              shall result in the automatic termination of the scholarship.
            </li>
          </ol>
        </Typography>
      </div>

      <div style={{ padding: '12px 24px 0' }}>
        <Space size={12} align="start">
          <AuditOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Appeal
          </Title>
        </Space>
        <Text style={{ display: 'block', marginTop: 8, color: '#6b7280', fontSize: 16 }}>
          A scholar may submit a written appeal for reconsideration within seven (7) working days from receipt of the termination notice.
          The appeal must include reasons and supporting documents
        </Text>
      </div>

      <div style={{ padding: '12px 24px 0' }}>
        <Space size={12} align="start">
          <FileTextOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Procedures for Appeal
          </Title>
        </Space>
        <Text style={{ display: 'block', marginTop: 8, color: '#6b7280', fontSize: 16 }}>
          CHEDRO shall review and decide on the appeal within fifteen (15) days and update the database (Annex E-2).
        </Text>
      </div>

      <div style={{ padding: '12px 24px 0' }}>
        <Space size={12} align="start">
          <UserSwitchOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Replacement
          </Title>
        </Space>
        <Text style={{ display: 'block', marginTop: 8, color: '#6b7280', fontSize: 16 }}>
          Scholars who fail to confirm their Notice of Award (NOA) within fifteen (15) working days will be replaced by applicants from the Official Ranklist. Terminated scholars may also be replaced by the next eligible applicant with a GWA of at least 85% (Full) or 80% (Half).
        </Text>
      </div>

      <div style={{ padding: '12px 24px 0' }}>
        <Space size={12} align="start">
          <SolutionOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Leave of Absence (LOA) Guidelines
          </Title>
        </Space>
        <Text style={{ display: 'block', marginTop: 8, color: '#6b7280', fontSize: 16 }}>
          A scholar may apply for LOA for a maximum of one (1) academic year.
          Valid reasons include illness, family emergencies, or force majeure.
          The request and documents must be submitted to CHEDRO for approval (Annex H).
          No financial benefits are granted during LOA.
        </Text>
      </div>

      <div style={{ padding: '12px 24px 0' }}>
        <Space size={12} align="start">
          <ProfileOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Transferee/Shiftee
          </Title>
        </Space>
        <Text style={{ display: 'block', marginTop: 8, color: '#6b7280', fontSize: 16 }}>
          Scholars who transfer or shift with CHEDRO approval may continue their scholarship.
          If enrolled with reduced units, they must take a full load in the next semester to retain eligibility.
          or proven participation or involvement in hazing-related activities.
        </Text>
      </div>

      <div style={{ padding: '12px 24px 0' }}>
        <Space size={12} align="start">
          <InteractionOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Refund
          </Title>
        </Space>
        <Text style={{ display: 'block', marginTop: 8, color: '#6b7280', fontSize: 16 }}>
          Scholars are required to refund all financial grants received under the scholarship program if their
          scholarship is terminated due to specific grounds, including enrollment in non-recognized or non
          priority programs, engagement in acts that are inimical to the government or CHED.
        </Text>
      </div>

      <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
        <Space size={12} align="start">
          <FileSearchOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Procedures for Refund
          </Title>
        </Space>
        <Text style={{ display: 'block', marginTop: 8, color: '#6b7280', fontSize: 16 }}>
          Scholarship within sixty (60) days from the date of the notice of demand issued by CHEDRO.
          Failure to comply with this requirement will result in CHEDRO endorsing the case to higher
          authorities for appropriate action.
        </Text>
      </div>

      <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
        <Space size={12} align="start">
          <AuditOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Maintaining GWA
          </Title>
        </Space>
        <Card style={{ marginTop: 12, borderRadius: 12, border: '1px solid #f0f2f5', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}>
          <table style={{ width: '100%', textAlign: 'center' }}>
            <thead style={{ backgroundColor: "#3366cc", color: '#FFF' }}>
              <tr>
                <th style={{ border: '1px solid #000', padding: '8px' }}>Program</th>
                <th style={{ border: '1px solid #000', padding: '8px' }}>Maintaining Average</th>
              </tr>
            </thead>
            <tbody style={{ background: '#CED4DA' }}>
              <tr>
                <td style={{ border: '1px solid #000', padding: '8px' }}>Full-SSP & Full PESFA</td>
                <td style={{ border: '1px solid #000', padding: '8px' }}>At least <strong>85%</strong> or <strong>2.00</strong></td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '8px' }}>Half-SSP & Half PESFA</td>
                <td style={{ border: '1px solid #000', padding: '8px' }}>At least <strong>80%</strong> or <strong>2.50</strong></td>
              </tr>
            </tbody>
          </table>
        </Card>
      </div>

      <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
        <Space size={12} align="start">
          <WarningOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
          <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
            Forms
          </Title>
        </Space>
        <Typography style={{ marginTop: 8, color: '#6b7280', fontSize: 16 }}>
          <ul className="list-disc">
            <li>
              <a
                href="https://ched.gov.ph/wp-content/uploads/Annex-A_CMSP-Application-Form.pdf"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Annex A – Scholarship Application Form (front) | data privacy consent (back)
              </a>
            </li>
            <li>
              <a
                href="https://ched.gov.ph/wp-content/uploads/Annex-B-1_CMSP-NOA.pdf"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Annex B-1 – Notice of Award (NOA)
              </a>
            </li>
            <li>
              <a
                href="https://ched.gov.ph/wp-content/uploads/Annex-B-2_CMSP-Contract.pdf"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Annex B-2 – Scholarship Contract
              </a>
            </li>
            <li>
              <a
                href="https://ched.gov.ph/wp-content/uploads/Annex-C_CMSP-Ranklist.pdf"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Annex C – Official Ranklist
              </a>
            </li>
            <li>
              <a
                href="https://ched.gov.ph/wp-content/uploads/Annex-D_CMSP-Masterlist.pdf"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Annex D – Masterlist
              </a>
            </li>
            <li>
              <a
                href="https://ched.gov.ph/wp-content/uploads/Annex-E-1_CMSP-Database-of-Beneficiaries.pdf"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Annex E-1 – Database of Beneficiaries
              </a>
            </li>
            <li>
              <a
                href="https://ched.gov.ph/wp-content/uploads/Annex-E-2_CMSP-Transaction-and-Monitoring.pdf"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Annex E-2 – Database for Transaction and Monitoring
              </a>
            </li>
            <li>
              <a
                href="https://ched.gov.ph/wp-content/uploads/Annex-F_StuFAPs-CMSP-Forms.pdf"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Annex F – StuFAP Forms  
              </a> 
              (by status, cy level, sex, type of HEI, special group, graduates, liquidation report form)
            </li>
            <li>
              <a
                href="https://ched.gov.ph/wp-content/uploads/Annex-G_CMSP-HEIs-Billing-Statement.pdf"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Annex G – HEIs Billing Statement Form
              </a>
            </li>
            <li>
              <a
                href="https://ched.gov.ph/wp-content/uploads/Annex-H_CMSP-Template-Request-Form.pdf"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Annex H – Template Request Form
              </a>
            </li>
            <li>
              <a
                href="https://ched.gov.ph/wp-content/uploads/Annex-I_CMSP-Graduate-Exit-Form.pdf"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Annex I – Graduate Exit Form
              </a>
            </li>
            <li>
              <a
                href="https://ched.gov.ph/wp-content/uploads/Annex-J_CMSP-MOA.pdf"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Annex J – Memorandum of Agreement (MOA)
              </a>
            </li>
            <li>
              <a
                href="https://ched.gov.ph/wp-content/uploads/Annex-K_CMSP-Template-letter-to-scholar.pdf"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Annex K – Template Letter to Scholar
              </a>
            </li>
            
          </ul>
        </Typography>
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
                href="https://ched.gov.ph/wp-content/uploads/MOED-NO.-336-S.-2025.pdf"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Memorandum from the Office of the Executive Director No. 336, series of 2025 – Call for Application for the CHED Merit Scholarship Program (CMSP) for Academic Year (AY) 2025-2026
              </a>
            </li>
            <br />
            <li>
              <a
                href="https://ched.gov.ph/wp-content/uploads/CMO-NO.-13-S.-2025.pdf"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                CHED Memorandum Order No. 13, series of 2025 – Revised Policies and Guidelines for the CHED Merit Scholarship Program (CMSP)
              </a>
            </li>
            
            
          </ul>
        </Typography>
      </div>

    </div>
  );
}
