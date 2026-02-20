import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Typography, Space, Select, Row, Col, Tag } from 'antd'
import { API_BASE } from '../lib/config'
import {
  ContactsOutlined,
  TeamOutlined,
  FilterOutlined,
  UserOutlined,
  FileAddOutlined,
  ProjectOutlined,
  FundOutlined,
  FundProjectionScreenOutlined,
  FileExcelOutlined,
  FileProtectOutlined,
  SwitcherOutlined,
  ReadOutlined,
  ExclamationOutlined,
  ReconciliationOutlined,
  DollarOutlined,
  WarningOutlined,
  FieldTimeOutlined,
  InteractionOutlined,
  ProfileOutlined,
  FileSearchOutlined,
  UserSwitchOutlined,
  EyeOutlined,
  SolutionOutlined,
  DeliveredProcedureOutlined,
  AuditOutlined,
  RightOutlined
} from '@ant-design/icons'
const { Text, Title } = Typography
const { Option } = Select
import { Progress } from 'antd'

export function meta() {
  return [
    { title: 'CHED Scholarship for Future Statisticians (Estatistikolar) | StuFAPs' },
    { name: 'description', content: 'Manage Estatistikolar records' },
  ]
}

function StatsCards({ financialAssistances = [] }) {
  const formatProgramName = name => {
    if (!name) return '';
    return name
      .replace(/ESTAT/g, ' ESTAT')
      .trim();
  };

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

  // Calculate fill percentage and exceeded status
  const fillPct = Math.round((totals.totalFilled / (totals.totalSlots || 1)) * 100);
  const exceeded = totals.totalFilled > totals.totalSlots;

  // Check if we have data to display
  if (!financialAssistances || financialAssistances.length === 0) {
    return null;
  }

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

export default function FinancialAssistanceEstatistikolar() {
  const [financialAssistances, setFinancialAssistances] = useState([])
  const [expandedSUC, setExpandedSUC] = useState(null);
  const [expandedPrivate, setExpandedPrivate] = useState(null);
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [programFilter, setProgramFilter] = useState('All')
  const [programs, setPrograms] = useState([])

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

        const uniquePrograms = [
          ...new Set(
            programsData
              .filter(p => p.description === 'Statistics-focused scholarship')
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

  if (loading) return <div className="p-8">Loading...</div>
  if (error) return <div className="p-8 text-red-600 bg-red-50 border border-red-300 rounded">Error: {error}</div>
  if (!Array.isArray(financialAssistances) || financialAssistances.length === 0) {
    return <div className="p-8 text-yellow-600 bg-yellow-50 border border-yellow-300 rounded">No scholarship programs found. Make sure your backend is running and database is seeded.</div>
  }

  const allowedPrograms =
    [
      'FULLESTAT',
      'HALFESTAT',
      'ESTATISTIKOLAR'
    ];

  const formatProgramName = name => {
    if (!name) return '';
    return name
      .replace(/ESTAT/g, ' ESTAT')       // turn FULLSSP → FULL SSP
      .trim();
  };


  const filteredestatistikolar = (Array.isArray(financialAssistances) ? financialAssistances : []).filter
    (p => {

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

  // Separate filters for FULL-ESTAT and HALF-ESTAT
  const filterByProgram = (data, programType) => {
    return (Array.isArray(data) ? data : []).filter(p => {
      const programName = p?.scholarship_program_name?.toUpperCase().trim();
      if (programType === 'FULL' && programName === 'FULLESTAT') return true;
      if (programType === 'HALF' && programName === 'HALFESTAT') return true;
      return false;
    });
  };

  const fullEstatData = filterByProgram(filteredestatistikolar, 'FULL');
  const halfEstatData = filterByProgram(filteredestatistikolar, 'HALF');

  return (
    <div style={{ background: '#fafbfc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '24px', borderBottom: '1px solid #e8eaed', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

          <div>
            <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>Estatistikolar</Title>
            <Text style={{ color: '#6b7280', fontSize: 16 }}>CHED Scholarship for Future Statisticians</Text>

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
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            {fullEstatData.length > 0 && <StatsCards financialAssistances={fullEstatData} />}
          </Col>
          <Col xs={24} md={12}>
            {halfEstatData.length > 0 && <StatsCards financialAssistances={halfEstatData} />}
          </Col>
        </Row>
      </div>   

      <div style={{ background: '#fff' }}>
        <div style={{ paddingRight: '24px', paddingTop: '12px', paddingLeft: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#6b7280', fontSize: 16 }}>
              The CHED Estatistikolar Program aims to address the shortage of statisticians in the
              Philippines by supporting qualified students in Statistics programs under
              CHED’s mandate in RA 7722.
            </Text>
          </div>
        </div>
      </div>

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
                The CHED shall  provide a scholarship to qualified students who will or are enrolled in 1 Bachelor of Science (BS)
                in Statistics, BS in Applied Statistics, and programs identified by Philippine Statistics Authority (PSA),
                with Government Recognition (GR)
                or Certificate of Program Compliance (COPC)
                2 Private Higher Education Institutions (PHEIs)
                with GR or State Universities and Colleges (SUCs)
                or Local Universities and Colleges (LUCs)
                with Institutional Recognition (IR).

              </Text>
            </div>
          </div>
        </div>
      </div>

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
                Open to all Filipino college students, regardless of personal background or status.
                Extra ranking points are given to those belonging to special equity groups—including underprivileged or homeless citizens, PWDs, solo parents, senior citizens, and Indigenous Peoples, as well as first-generation college students.
              </Text>
            </div>
          </div>
        </div>
      </div>

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
                  <li><strong>Filipino citizen.</strong></li>
                  <li>
                    Graduate of a Senior High School in the Philippines with a minimum GWA of 85% or its equivalent.
                  </li>
                  <li>
                    For second- to fourth-year college students, a minimum GWA of 80% or its equivalent.
                  </li>
                  <li>
                    Combined annual gross income of parents or legal guardians should not exceed Five Hundred Thousand Pesos (Php500,000.00).
                  </li>
                </ol>
              </Typography>
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff' }}>
        <div style={{ paddingRight: '24px', paddingTop: '12px', paddingLeft: '24px' }}>
          <div style={{ paddingBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e8eaed' }}>
            <div>

              <Space size={12}>
                <FileExcelOutlined style={{ paddingBottom: '10px', fontSize: 24, color: '#6b7280' }} />
                <Title level={2} style={{ paddingBottom: '1px', color: '#1a1a1a', fontWeight: 600 }}>
                  Ineligible Applicant
                </Title>
              </Space>
              <br />
              <Typography style={{ color: '#6b7280', fontSize: 16 }}>
                <ol className="ist-decimal">
                  <li><strong>Foreign students.</strong></li>
                  <li>
                    Applicants who will or are enrolled in priority programs but not granted government recognition or certification by CHED.
                  </li>
                  <li>Applicants who will or are enrolled in a non-priority program.</li>
                  <li>Transferees and Shiftees with credited units as determined by admitting HEIs.</li>
                  <li>
                    An existing recipient of any nationally government-funded scholarships or grants including Tertiary Education Subsidy (TES) or Tulong Dunong Program (TDP).
                    Grantees under the One-time Grants are exempted.
                  </li>
                  <li>Applicants who have completed an undergraduate degree program or are second course takers.</li>
                  <li>
                    Applicants who submitted tampered and/or falsified application documents, including documentary requirements.
                  </li>
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
                <FundOutlined style={{ paddingBottom: '10px', fontSize: 24, color: '#6b7280' }} />
                <Title level={2} style={{ color: '#1a1a1a', fontWeight: 600 }}>
                  SUCs/LUCs
                </Title>
              </Space>
              <br />
              <Typography level={5} style={{ fontWeight: 500, }}>

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
                      title="Full-SSP"
                    >

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
                  </Col>

                </Row>
              </Typography>
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff' }}>
        <div style={{ paddingRight: '24px', paddingTop: '12px', paddingLeft: '24px' }}>
          <div style={{ paddingBottom: '24px', borderBottom: '1px solid #e8eaed' }}>

            <div>
              <Space size={12}>
                <FundProjectionScreenOutlined style={{ paddingBottom: '10px', fontSize: 24, color: '#6b7280' }} />
                <Title level={2} style={{ color: '#1a1a1a', fontWeight: 600 }}>
                  Private HEIs
                </Title>
              </Space>
              <br />

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
                      title="Full-PESFA"
                    >

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
                </Row>
              </Typography>
            </div>
          </div>
        </div>
      </div>

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
                <strong>CHEDROs may directly pay scholars under any of the following conditions</strong>
              </Text>

              <Typography style={{ color: '#6b7280', fontSize: 16 }}>
                <ol className="list-[lower-alpha]">
                  <li>HEI has no Memorandum of Agreement (MOA) Annex J with CHEDRO;</li>
                  <li>HEI has fewer than ten (10) scholars;</li>
                  <li>HEI has unliquidated balances or transferred funds; or</li>
                  <li>HEI has verified StuFAPs-related complaints/issues</li>
                </ol>
              </Typography>

            </div>
          </div>
        </div>
      </div>

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

              <Text style={{ color: '#6b7280', fontSize: 16 }}>
                <strong>Payment Type</strong>
              </Text>

              <Typography style={{ color: '#6b7280', fontSize: 16 }}>
                <ol className="list-decimal">
                  <li>
                    Certified true copy of Certificate of Registration/Enrollment (COR/COE) or
                    system-generated registration document signed by registrar/authorized official
                  </li>
                  <li>
                    College ID or any government-issued ID with signature, certification from the school
                  </li>
                  <li>
                    Photocopy of active Landbank ATM card
                  </li>
                </ol>
              </Typography>
            </div>
          </div>
        </div>
      </div>

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
                <ol className="list-decimal">
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
                </ol>
              </Typography>

            </div>
          </div>
        </div>
      </div>

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
                <ol className="list-decimal">
                  <li>
                    Adhere to the provisions of the scholarship contract (Annex B-2) and other applicable guidelines.
                  </li>
                  <li>
                    Enroll in BS in Statistics, BS in Applied Statistics programs, or programs identified by PSA offered in PHEIs with GR, SUCs or LUCs with COPC.
                  </li>
                  <li>
                    Maintain a GWA of at least 80% or its equivalent.
                  </li>
                  <li>
                    Enroll the required regular academic load based on the curriculum, for each school semester/trimester or term, except when the subjects are the last remaining subjects to complete the degree program.
                  </li>
                  <li>
                    Complete the degree program within the number of years or period as prescribed in the curriculum.
                  </li>
                  <li>
                    <strong>The scholar must secure a written approval of the concerned CHEDRO using Annex H prior to:</strong>
                    <ol className="list-[lower-alpha] list-inside">
                      <li>Transfer to another HEI;</li>
                      <li>Shift to another recognized or certified priority programs; or</li>
                      <li>
                        Leave of absence (LOA) which is allowed only once for a maximum of one (1) academic year but he/she is not eligible to claim financial benefits while on leave.
                      </li>
                    </ol>
                  </li>
                  <li>
                    Refund to CHED the total financial benefits received if the scholarship has been terminated based on any grounds enumerated in Section 26.
                  </li>
                  <li>
                    Exhibit good moral character and comply with the rules and regulations of CHED and HEI.
                  </li>
                  <li>
                    Inform CHEDRO promptly on any changes in academic status, program, HEI, personal circumstances that may affect the scholarship eligibility.
                  </li>
                  <li>
                    Submit required reports and documents within the deadline set in this PSG.
                  </li>
                  <li>
                    Submit an accomplished graduate exit form using Annex I.
                  </li>
                </ol>
              </Typography>

            </div>
          </div>
        </div>
      </div>

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
                  <li>Breach of contract.</li>
                  <li>Availment of another National Government funded scholarship program.</li>
                  <li>Enrollment in non-recognized program of PHEIs or SUCs or non-certified program of LUCs.</li>
                  <li>Enrollment in non-priority programs.</li>
                  <li>Failure to maintain the required GWA.</li>
                  <li>Failure to enroll the required regular load based on approved curriculum of the HEI.</li>
                  <li>Dropping out.</li>
                  <li>LOA of scholar must not be more than one (1) academic year.</li>
                  <li>Shifting to another program or transferring to another HEI without approval from concerned CHEDRO.</li>
                  <li>Any acts inimical to the government and/or CHED.</li>
                  <li>Prima facie evidence of participation or involvement in hazing related activities.</li>
                  <li>
                    Transfer of HEI that involves a change of scholarship program from: Full-SSP (State Scholarship Program)
                    to Full-PESFA (Private Education Student Financial Assistance), or vice versa, shall result in the automatic
                    termination of the scholarship.
                  </li>
                </ol>
              </Typography>

            </div>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff' }}>
        <div style={{ paddingRight: '24px', paddingTop: '12px', paddingLeft: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

            <div>
              <Space size={12}>
                <FieldTimeOutlined style={{ paddingBottom: '10px', fontSize: 24, color: '#6b7280' }} />
                <Title level={2} style={{ color: '#1a1a1a', fontWeight: 600 }}>
                  Appeal
                </Title>
              </Space>
              <br />

              <Text style={{ color: '#6b7280', fontSize: 16 }}>
                A scholar may submit a written appeal for reconsideration within seven (7) working days from receipt of the termination notice.
                The appeal must include reasons and supporting documents.
              </Text>
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff' }}>
        <div style={{ paddingRight: '24px', paddingTop: '12px', paddingLeft: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

            <div>
              <Space size={12}>
                <UserSwitchOutlined style={{ paddingBottom: '10px', fontSize: 24, color: '#6b7280' }} />
                <Title level={2} style={{ paddingBottom: '1px', color: '#1a1a1a', fontWeight: 600 }}>
                  Replacement
                </Title>
              </Space>
              <br />
              <Text style={{ color: '#6b7280', fontSize: 16 }}>
                Scholars who fail to confirm their Notice of Award (NOA) within fifteen (15) working days will be
                replaced by applicants from the Official Ranklist. Terminated scholars may also be replaced by the next eligible applicant with a GWA of at least 85% (Full) or 80% (Half).
              </Text>
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff' }}>
        <div style={{ paddingRight: '24px', paddingTop: '12px', paddingLeft: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

            <div>
              <Space size={12}>
                <FileAddOutlined style={{ paddingBottom: '10px', fontSize: 24, color: '#6b7280' }} />
                <Title level={2} style={{ color: '#1a1a1a', fontWeight: 600 }}>
                  Extension of Scholarship
                </Title>
              </Space>
              <br />
              <Text style={{ color: '#6b7280', fontSize: 16 }}>
                Scholars who become irregular due to LOA may continue once re-enrolled.
                Extensions beyond the program duration are allowed only for exceptional reasons
                upon CHEDRO approval with documentation.
              </Text>
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff' }}>
        <div style={{ paddingRight: '24px', paddingTop: '12px', paddingLeft: '24px' }}>
          <div style={{ paddingBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e8eaed' }}>

            <div>
              <Space size={12}>
                <ProfileOutlined style={{ paddingBottom: '10px', fontSize: 24, color: '#6b7280' }} />
                <Title level={2} style={{ paddingBottom: '1px', color: '#1a1a1a', fontWeight: 600 }}>
                  Transferee/Shiftee
                </Title>
              </Space>
              <br />

              <Text style={{ color: '#6b7280', fontSize: 16 }}>
                A scholar who requested to transfer or shift and was
                approved by the CHEDRO can continue their scholarship for the semester even underload,
                provided with certification from the Dean of College on the units the scholar can only take, but
                for the succeeding semester, the scholar must take a regular load, or else the scholar will be
                terminated.
              </Text>
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff' }}>
        <div style={{ paddingRight: '24px', paddingTop: '12px', paddingLeft: '24px' }}>
          <div style={{ paddingBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e8eaed' }}>
            <div>
              <Space size={12}>
                <InteractionOutlined style={{ paddingBottom: '10px', fontSize: 24, color: '#6b7280' }} />
                <Title level={2} style={{ paddingBottom: '1px', color: '#1a1a1a', fontWeight: 600 }}>
                  Refund
                </Title>
              </Space>
              <br />

              <Text style={{ color: '#6b7280', fontSize: 16 }}>
                <strong>The total financial grant received under this CMO shall be refunded to CHED if the scholarship has been terminated on the following grounds:</strong>
              </Text>

              <Typography style={{ color: '#6b7280', fontSize: 16 }}>
                <ol className="list-decimal">
                  <li>Enrollment in non-recognized program of PHEIs or SUCs or non-certified programof LUCs.</li>
                  <li>Enrollment in non-priority programs.</li>
                  <li>Any acts inimical to the government and/or CHED.</li>
                  <li>Prima facie evidence of participation or involvement in hazing related activities.</li>
                </ol>
              </Typography>
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff' }}>
        <div style={{ paddingRight: '24px', paddingTop: '12px', paddingLeft: '24px' }}>
          <div style={{ paddingBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e8eaed' }}>
            <div>

              <Space size={12}>
                <FileSearchOutlined style={{ paddingBottom: '10px', fontSize: 24, color: '#6b7280' }} />
                <Title level={2} style={{ paddingBottom: '1px', color: '#1a1a1a', fontWeight: 600 }}>
                  Procedures for Refund
                </Title>
              </Space>
              <br />

              <Text style={{ color: '#6b7280', fontSize: 16 }}>
                <strong>The total financial grant received under this CMO shall be refunded to CHED if the scholarship has been terminated on the following grounds:</strong>
              </Text>

              <Typography style={{ color: '#6b7280', fontSize: 16 }}>
                <ol className="list-decimal">
                  <li>
                    Upon finding of any existence of ground for termination as enumerated in Section
                    26 hereof, a scholar shall, after due process, refund the full amount defrayed by
                    CHED for his/her scholarship under this CMO, within sixty (60) days from notice of
                    the demand letter to refund issued by CHEDRO;
                  </li>
                  <li>
                    In case of failure of the scholar to make the refund within the period prescribed,
                    the concerned CHEDRO shall make the corresponding report/endorsement on the
                    matter with recommendations to the CEB for its appropriate action
                  </li>
                  <li>
                    The obligation to refund on the part of the scholar shall be specified in the NOA
                    (Annex B-1) which is treated as a supplemental scholarship contract for purposes
                    of this CMO.
                  </li>
                </ol>
              </Typography>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}