import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../lib/config'

import { 
  Card, 
  Typography, 
  Space, 
  Select, 
  Row, 
  Col 
} from 'antd'

import {
  ContactsOutlined,
  TeamOutlined,
  FilterOutlined,
  UserOutlined,
  EyeOutlined,
  ProjectOutlined,
  CheckCircleOutlined,
  FundOutlined,
  FundProjectionScreenOutlined,
  FileExcelOutlined,
  FileProtectOutlined,
  SwitcherOutlined,
  ReadOutlined,
  ExclamationOutlined,
  ReconciliationOutlined,
  DollarOutlined,
  FieldTimeOutlined,
  InteractionOutlined,
  ProfileOutlined,
  FileSearchOutlined,
  UserSwitchOutlined,
  SolutionOutlined,
  DeliveredProcedureOutlined,
  AuditOutlined
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
    <div style={{ background: '#fafbfc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '24px', borderBottom: '1px solid #e8eaed', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

          <div>
            <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>CoScho</Title>
            <Text style={{ color: '#6b7280', fontSize: 16 }}>Scholarship Program for Coconut Farmers and Their Families</Text>

          </div>

          {/* dropdown*/}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
      </div>

      <div style={{ padding: '24px', borderBottom: '1px solid #e8eaed', background: '#fff' }}>
        <StatsCards financialAssistances={filteredcoScho} />
      </div>

      <div style={{ background: '#fff' }}>
        <div style={{ paddingRight: '24px', paddingTop: '12px', paddingLeft: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#6b7280', fontSize: 16 }}>
              The CoScho Program is open to incoming first-year college students who are qualified coconut
              farmers or their dependents. However, continuing college students who meet the eligibility
              requirements may also apply, provided they are not recipients of any other government scholarship.
            </Text>
          </div>
        </div>
      </div>

      {/* Overview */}
      <div style={{ background: '#fff' }}>
        <div style={{ paddingRight: '24px', paddingTop: '12px', paddingLeft: '24px' }}>
          <div style={{ paddingBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e8eaed' }}>
            <div>
              <Space size={12}>
                <EyeOutlined style={{ paddingBottom: '10px', fontSize: 24, color: '#6b7280' }} />
                <Title level={2} style={{ paddingBottom: '1px', color: '#1a1a1a', fontWeight: 600 }}>
                  Overview
                </Title>
              </Space>
              <br />

              <Text style={{ color: '#6b7280', fontSize: 16 }}>
                The Joint Memorandum Circular No. 01, series of 2023 outlines the implementing guidelines of the
                Scholarship Program for Coconut Farmers and Their Families (CoScho) under the Coconut Farmers
                and Industry Development Plan (CFIDP). It is a joint initiative of the Commission on Higher
                Education (CHED) and the Philippine Coconut Authority (PCA) aimed at providing educational
                opportunities to qualified coconut farmers and their dependents.

              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* Scope and Coverage */}
      <div style={{ background: '#fff' }}>
        <div style={{ paddingRight: '24px', paddingTop: '12px', paddingLeft: '24px' }}>
          <div style={{ paddingBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e8eaed' }}>
            <div>
              <Space size={12}>
                <ProjectOutlined style={{ paddingBottom: '10px', fontSize: 24, color: '#6b7280' }} />
                <Title level={2} style={{ paddingBottom: '1px', color: '#1a1a1a', fontWeight: 600 }}>
                  Scope and Coverage
                </Title>
              </Space>
              <br />

              <Text style={{ color: '#6b7280', fontSize: 16 }}>
                The CoScho Program covers qualified coconut farmers and their dependents listed in the
                National Coconut Farmers Registry System (NCFRS). It is implemented nationwide in identified
                coconut-producing provinces and applies to undergraduate degree programs offered by SUCs,
                LUCs, and CHED-recognized HEIs.
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* Application Process */}
      <div style={{ background: '#fff' }}>
        <div style={{ paddingRight: '24px', paddingTop: '12px', paddingLeft: '24px' }}>
          <div style={{ paddingBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e8eaed' }}>
            <div>
              <Space size={12}>
                <FileProtectOutlined style={{ paddingBottom: '10px', fontSize: 24, color: '#6b7280' }} />
                <Title level={2} style={{ paddingBottom: '1px', color: '#1a1a1a', fontWeight: 600 }}>
                  Application Process (Eligible Applicant)
                </Title>
              </Space>
              <br />

              <Typography style={{ color: '#6b7280', fontSize: 16 }}>
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
          </div>
        </div>
      </div>

      {/* Financial Assistance Tables */}
      <div style={{ background: '#fff' }}>
        <div style={{ paddingRight: '24px', paddingTop: '12px', paddingLeft: '24px' }}>
          <div style={{ paddingBottom: '24px', borderBottom: '1px solid #e8eaed' }}>

            <div>
              <Space size={12}>
                <CheckCircleOutlined style={{ paddingBottom: '10px', fontSize: 24, color: '#6b7280' }} />
                <Title level={2} style={{ color: '#1a1a1a', fontWeight: 600 }}>
                  Scholarship Benefits
                </Title>
              </Space>
              <br />
              <Typography level={5} style={{ fontWeight: 500, }}>

                <Row gutter={[24]}>
                  <Col span={24}>
                    <Card
                      style={{
                        borderRadius: 12,
                        border: '1px solid #f0f2f5',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                        transition: 'all 0.3s ease',
                      }}
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

                      <div>
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

                          <tfoot style={{ background: '#CED4DA' }}>
                            <tr>
                              <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Total</td>
                              <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold', textAlign: 'center' }}>₱40,000.00</td>
                              <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold', textAlign: 'center' }}>₱80,000.00</td>
                            </tr>
                          </tfoot>

                        </table>
                      </div>
                    </Card>
                  </Col>

                </Row>
              </Typography>
            </div>

            <br />

            <div>

              <Typography level={5} style={{ color: '#1a1a1a', fontWeight: 500, }}>
                <Row gutter={[24]}>
                  <Col span={24}>
                    <Card style={
                      {
                        borderRadius: 12,
                        border: '1px solid #f0f2f5',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                        transition: 'all 0.3s ease',
                      }
                    }
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

                      <div>
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

                          <tfoot style={{ background: '#CED4DA' }}>
                            <tr>
                              <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Total</td>
                              <td colSpan={2} style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold', textAlign: 'center' }}>₱115,000.00</td>
                            </tr>
                          </tfoot>

                        </table>
                      </div>
                    </Card>
                  </Col>
                </Row>
              </Typography>
            </div>
          </div>
        </div>
      </div>

      {/* Direct Payment to Scholars */}
      <div style={{ background: '#fff' }}>
        <div style={{ paddingRight: '24px', paddingTop: '12px', paddingLeft: '24px' }}>
          <div style={{ paddingBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e8eaed' }}>
            <div>
              <Space size={12}>
                <DollarOutlined style={{ paddingBottom: '10px', fontSize: 24, color: '#6b7280' }} />
                <Title level={2} style={{ paddingBottom: '1px', color: '#1a1a1a', fontWeight: 600 }}>
                  Direct Payment to Scholars
                </Title>
              </Space>
              <br />

              <Text style={{ color: '#6b7280', fontSize: 16 }}>
                CHEDROs shall transfer financial benefits directly to the scholars per semester of academic year until the completion of the degree program by crediting it to the authorized bank account of scholars.
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* Initial Payment/Requirements */}
      <div style={{ background: '#fff' }}>
        <div style={{ paddingRight: '24px', paddingTop: '12px', paddingLeft: '24px' }}>
          <div style={{ paddingBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e8eaed' }}>
            <div>
              <Space size={12}>
                <SwitcherOutlined style={{ paddingBottom: '10px', fontSize: 24, color: '#6b7280' }} />
                <Title level={2} style={{ color: '#1a1a1a', fontWeight: 600 }}>
                  Initial Payment/Requirements
                </Title>
              </Space>
              <br />

              <Typography style={{ color: '#6b7280', fontSize: 16 }}>
                <ol className="list-disc">
                  <li>Certified true copy of the registration form or photocopy verified against the original document by the CHEDRO StuFAPs coordinator.</li>
                  <li>Copy of Automated Teller Machine (ATM) card from authorized government banks.</li>
                  <li>Copy of school ID for current semester/term.</li>
                </ol>
              </Typography>
            </div>
          </div>
        </div>
      </div>

      {/* Succeeding Payment/Requirements */}
      <div style={{ background: '#fff' }}>
        <div style={{ paddingRight: '24px', paddingTop: '12px', paddingLeft: '24px' }}>
          <div style={{ paddingBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e8eaed' }}>
            <div>
              <Space size={12}>
                <ReconciliationOutlined style={{ paddingBottom: '10px', fontSize: 24, color: '#6b7280' }} />
                <Title level={2} style={{ color: '#1a1a1a', fontWeight: 600 }}>
                  Succeeding Payment/Requirements
                </Title>
              </Space>
              <br />

              <Typography style={{ color: '#6b7280', fontSize: 16 }}>
                <ul className="list-disc">
                  <li>Certified true copy of the registration form or photocopy verified against the original document by the CHEDRO StuFAPs coordinator.</li>
                  <li>Copy of Automated Teller Machine (ATM) card from authorized government banks.</li>
                  <li>Copy of school ID for current semester/term.</li>
                </ul>
              </Typography>
            </div>
          </div>
        </div>
      </div>

      {/* Responsibilities of Scholars */}
      <div style={{ background: '#fff' }}>
        <div style={{ paddingRight: '24px', paddingTop: '12px', paddingLeft: '24px' }}>
          <div style={{ paddingBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e8eaed' }}>
            <div>
              <Space size={12}>
                <ReadOutlined style={{ paddingBottom: '10px', fontSize: 24, color: '#6b7280' }} />
                <Title level={2} style={{ color: '#1a1a1a', fontWeight: 600 }}>
                  Responsibilities of Scholars
                </Title>
              </Space>
              <br />

              <Typography style={{ color: '#6b7280', fontSize: 16 }}>
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
          </div>
        </div>
      </div>

      {/* Grounds for Termination */}
      <div style={{ background: '#fff' }}>
        <div style={{ paddingRight: '24px', paddingTop: '12px', paddingLeft: '24px' }}>
          <div style={{ paddingBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e8eaed' }}>
            <div>
              <Space size={12}>
                <ExclamationOutlined style={{ paddingBottom: '10px', fontSize: 24, color: '#6b7280' }} />
                <Title level={2} style={{ color: '#1a1a1a', fontWeight: 600 }}>
                  Grounds for Scholarship Termination
                </Title>
              </Space>
              <br />

              <Typography style={{ color: '#6b7280', fontSize: 16 }}>
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
          </div>
        </div>
      </div>

      {/* Replacement */}
      <div style={{ background: '#fff' }}>
        <div style={{ paddingRight: '24px', paddingTop: '12px', paddingLeft: '24px' }}>
          <div style={{ paddingBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e8eaed' }}>
            <div>
              <Space size={12}>
                <UserSwitchOutlined style={{ paddingBottom: '10px', fontSize: 24, color: '#6b7280' }} />
                <Title level={2} style={{ paddingBottom: '1px', color: '#1a1a1a', fontWeight: 600 }}>
                  Replacement of a Scholar
                </Title>
              </Space>
              <br />

              <Text style={{ color: '#6b7280', fontSize: 16 }}>
                <strong>Replacement of a scholar may be allowed within a given academic year,
                  through any of the following grounds:</strong>
              </Text>

              <Typography style={{ color: '#6b7280', fontSize: 16 }}>
                <ol class="list-decimal">
                  <li>Failure to confirm acceptance of the award fifteen (15) working days upon receipt of the NOA</li>
                  <li>Voluntary withdrawal/Waiver of scholarship grant</li>
                  <li>Dropping out from school without notice to CHEDRO</li>
                  <li>Termination of scholarship grant on grounds stated in Section 14</li>
                </ol>
              </Typography>

              <div>
                <Text style={{ color: '#6b7280', fontSize: 16 }}>
                  <strong>A replacement must be chosen based on the definition of "dependent" under this Circular who shall be taken
                    from the official rank list of the CHEDRO. The replacement shall avail of the benefits for the remaining duration of the scholarship grant.
                  </strong>
                </Text>
              </div>
              <br />
              <div>
                <Text style={{ color: '#6b7280', fontSize: 16 }}>
                  <strong>
                    The replaced scholar shall be informed in writing by the concerned CHEDRO stating therein the reason/s for his/her replacement.
                    PCA shall be informed of any replacement made for information and record purposes.
                  </strong>
                </Text>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

