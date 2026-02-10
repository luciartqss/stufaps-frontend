import { Link } from 'react-router-dom'
import { useEffect, useState, useMemo } from 'react'
import { Typography, Card, Select, Progress, Spin, Tag, Row, Col, Button, Space } from 'antd'
import {
  TeamOutlined, ContactsOutlined, UserOutlined,
  WarningOutlined, PlusOutlined, EditOutlined,
  RightOutlined, QuestionCircleOutlined,
} from '@ant-design/icons'
import EditSlotsModal from '../components/EditSlotsModal'
import UpdateSlotModal from '../components/UpdateSlotModal'

const { Title, Text } = Typography
const { Option } = Select

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export function meta() {
  return [
    { title: 'Financial Assistances | StuFAPs' },
    { name: 'description', content: 'Manage financial assistance records' },
  ]
}

/* ─── Program definitions ─── */
const PROGRAMS = [
  {
    key: 'cmsp',
    label: 'CMSP',
    fullName: 'CHED Merit Scholarship Program',
    link: '/financial_assistance/cmsp',
    codes: ['FULLSSP', 'HALFSSP', 'HALFSSPGAD', 'FULLSSPGAD', 'FULLPESFA', 'HALFPESFA', 'HALFPESFAGAD', 'FULLPESFAGAD'],
    color: '#1890ff',
  },
  {
    key: 'estatistikolar',
    label: 'Estatistikolar',
    fullName: 'Statistics-focused Scholarship',
    link: '/financial_assistance/estatistikolar',
    codes: ['FULLESTAT', 'HALFESTAT', 'ESTATISTIKOLAR'],
    color: '#722ed1',
  },
  {
    key: 'coscho',
    label: 'CoScho',
    fullName: 'College Scholarship Program',
    link: '/financial_assistance/CoScho',
    codes: ['COSCHO'],
    color: '#13c2c2',
  },
  {
    key: 'msrs',
    label: 'MSRS',
    fullName: 'Medical Scholarship & Return Service',
    link: '/financial_assistance/msrs',
    codes: ['MSRS'],
    color: '#eb2f96',
  },
  {
    key: 'sida_sgp',
    label: 'SIDA-SGP',
    fullName: 'Sugarcane Industry Dev\'t. Act',
    link: '/financial_assistance/Sida_Sgp',
    codes: ['SIDASGP'],
    color: '#fa8c16',
  },
  {
    key: 'acef_giahep',
    label: 'ACEF-GIAHEP',
    fullName: 'Agricultural Competitiveness Enhancement Fund',
    link: '/financial_assistance/Acef_Giahep',
    codes: ['ACEFGIAHEP'],
    color: '#52c41a',
  },
  {
    key: 'mtp_sp',
    label: 'MTP-SP',
    fullName: 'Maritime Training Program',
    link: '/financial_assistance/Mtp_Sp',
    codes: ['MTPSP'],
    color: '#2f54eb',
  },
  {
    key: 'cgms_sucs',
    label: 'CGMS-SUCs',
    fullName: 'College Grant for Meritorious Students in SUCs',
    link: '/financial_assistance/Cgms_Sucs',
    codes: ['CGMSSUCS'],
    color: '#f5222d',
  },
  {
    key: 'snplp',
    label: 'SNPLP',
    fullName: 'Student Loan Program',
    link: '/financial_assistance/Snplp',
    codes: ['SNPLP'],
    color: '#a0d911',
  },
]

/* ─── Helpers ─── */
function getTotals(assistances, codes) {
  const filtered = assistances.filter(p => codes.includes(p.scholarship_program_name))

  if (filtered.length === 1 && (filtered[0].Academic_year === 'All' || filtered[0].academic_year === 'All')) {
    const r = filtered[0]
    return {
      slots: Number(r?.total_slot) || 0,
      filled: Number(r?.total_students) || 0,
      unfilled: Number(r?.unfilled_slot) || 0,
    }
  }

  return {
    slots: filtered.reduce((s, p) => s + (Number(p?.total_slot) || 0), 0),
    filled: filtered.reduce((s, p) => s + (Number(p?.total_students) || 0), 0),
    unfilled: filtered.reduce((s, p) => s + (Number(p?.unfilled_slot) || 0), 0),
  }
}

function pct(part, whole) {
  return whole > 0 ? ((part / whole) * 100).toFixed(1) : '0.0'
}

/* ─── Components ─── */
function SummaryCards({ data }) {
  const cards = [
    { title: 'Total Slots', value: data.slots, icon: <ContactsOutlined />, color: '#1890ff', bg: '#e6f7ff' },
    { title: 'Filled Slots', value: data.filled, icon: <TeamOutlined />, color: '#52c41a', bg: '#f6ffed', pct: pct(data.filled, data.slots) },
    { title: 'Unfilled Slots', value: data.unfilled, icon: <UserOutlined />, color: '#faad14', bg: '#fffbe6', pct: pct(data.unfilled, data.slots) },
  ]

  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      {cards.map((c, i) => (
        <Col xs={24} sm={8} key={i}>
          <Card
            style={{ borderRadius: 12, border: 'none', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
            bodyStyle={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <div style={{ flex: 1 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>{c.title}</Text>
              <div style={{ fontSize: 24, fontWeight: 700, color: c.color, lineHeight: 1.3 }}>
                {c.value.toLocaleString()}
              </div>
              {c.pct && (
                <>
                  <Progress percent={parseFloat(c.pct)} size="small" strokeColor={c.color} showInfo={false} style={{ margin: '4px 0 2px' }} />
                  <Text style={{ fontSize: 11, color: '#8c8c8c' }}>{c.pct}% of total</Text>
                </>
              )}
            </div>
            <div style={{
              width: 42, height: 42, borderRadius: 10, background: c.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: c.color, flexShrink: 0,
            }}>{c.icon}</div>
          </Card>
        </Col>
      ))}
    </Row>
  )
}

function ProgramCard({ program, totals }) {
  const exceeded = totals.filled > totals.slots && totals.slots > 0
  const fillPct = parseFloat(pct(totals.filled, totals.slots))

  return (
    <Link to={program.link} style={{ textDecoration: 'none' }}>
      <Card
        hoverable
        style={{
          borderRadius: 12,
          border: exceeded ? '1px solid #ff4d4f' : '1px solid #f0f0f0',
          boxShadow: exceeded ? '0 2px 8px rgba(255,77,79,0.12)' : '0 1px 4px rgba(0,0,0,0.04)',
          height: '100%',
          transition: 'all 0.2s ease',
        }}
        bodyStyle={{ padding: 20 }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text strong style={{ fontSize: 16, color: '#1a1a1a' }}>{program.label}</Text>
              {exceeded && (
                <Tag color="error" icon={<WarningOutlined />} style={{ fontSize: 11, margin: 0 }}>
                  Exceeded
                </Tag>
              )}
            </div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>{program.fullName}</Text>
          </div>
          <RightOutlined style={{ color: '#bfbfbf', fontSize: 12 }} />
        </div>

        {/* Progress */}
        <Progress
          percent={Math.min(fillPct, 100)}
          size="small"
          strokeColor={exceeded ? '#ff4d4f' : program.color}
          trailColor="#f0f0f0"
          showInfo={false}
          style={{ marginBottom: 12 }}
        />

        {/* Stats row */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a' }}>{totals.slots}</div>
            <Text type="secondary" style={{ fontSize: 11 }}>Slots</Text>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#52c41a' }}>{totals.filled}</div>
            <Text type="secondary" style={{ fontSize: 11 }}>Filled</Text>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: exceeded ? '#ff4d4f' : '#faad14' }}>{totals.unfilled}</div>
            <Text type="secondary" style={{ fontSize: 11 }}>Unfilled</Text>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: exceeded ? '#ff4d4f' : '#1890ff' }}>{fillPct}%</div>
            <Text type="secondary" style={{ fontSize: 11 }}>Fill Rate</Text>
          </div>
        </div>
      </Card>
    </Link>
  )
}

/* ─── Main Page ─── */
export default function FinancialAssistanceIndex() {
  const [financialAssistances, setFinancialAssistances] = useState([])
  const [loading, setLoading] = useState(true)
  const [openModalAddSlot, setOpenModalAddSlot] = useState(false)
  const [openModalUpdateSlot, setOpenModalUpdateSlot] = useState(false)
  const [academicYearFilter, setAcademicYearFilter] = useState('All')
  const [academicYears, setAcademicYears] = useState([])
  const [othersData, setOthersData] = useState({ total: 0, programs: [] })

  const fetchPrograms = () => {
    setLoading(true)
    Promise.all([
      fetch(`${API_BASE}/scholarship_program_records`).then(r => r.json()),
      fetch(`${API_BASE}/scholarship_program_records/others`).then(r => r.json()).catch(() => ({ total: 0, programs: [] })),
    ]).then(([data, others]) => {
      const programsData = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
      setFinancialAssistances(programsData)

      const uniqueYears = [...new Set(
        programsData.map(p => p.academic_year || p.Academic_year).filter(Boolean)
      )]
      setAcademicYears([...uniqueYears.sort()])
      setOthersData(others)
    }).catch(err => {
      console.error('Fetch Error:', err)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { fetchPrograms() }, [])

  const filteredAssistances = useMemo(() => {
    if (academicYearFilter && academicYearFilter !== 'All') {
      return financialAssistances.filter(
        p => (p.academic_year || p.Academic_year) === academicYearFilter
      )
    }
    return financialAssistances.filter(
      p => (p.academic_year || p.Academic_year) === 'All'
    )
  }, [financialAssistances, academicYearFilter])

  // Grand totals for summary cards
  const grandTotals = useMemo(() => {
    const allCodes = PROGRAMS.flatMap(p => p.codes)
    return getTotals(filteredAssistances, allCodes)
  }, [filteredAssistances])

  // Exceeded programs list for warning banner
  const exceededPrograms = useMemo(() => {
    return PROGRAMS.filter(p => {
      const t = getTotals(filteredAssistances, p.codes)
      return t.filled > t.slots && t.slots > 0
    })
  }, [filteredAssistances])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 120px)' }}>
        <Spin size="large" />
        <Text style={{ marginLeft: 16, fontSize: 15 }}>Loading financial assistance data...</Text>
      </div>
    )
  }

  return (
    <div style={{ background: '#fafbfc', minHeight: '100vh', margin: -24 }}>
      {/* Header */}
      <div style={{ padding: 24, background: '#fff', borderBottom: '1px solid #e8eaed' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0, fontWeight: 600 }}>Financial Assistance</Title>
            <Text type="secondary" style={{ fontSize: 14 }}>Manage scholarship programs, slots, and allocations</Text>
          </div>
          <Space>
            <Select
              value={academicYearFilter}
              onChange={v => setAcademicYearFilter(v || 'All')}
              style={{ width: 150 }}
              allowClear={false}
            >
              <Option value="All">All Years</Option>
              {academicYears.filter(y => y !== 'All').map(y => (
                <Option key={y} value={y}>{y}</Option>
              ))}
            </Select>
            <Button icon={<PlusOutlined />} onClick={() => setOpenModalAddSlot(true)}>
              Add Slots
            </Button>
            <Button icon={<EditOutlined />} onClick={() => setOpenModalUpdateSlot(true)}>
              Update Slots
            </Button>
          </Space>
        </div>
      </div>

      <div style={{ padding: 24 }}>
        {/* Exceeded warning banner */}
        {exceededPrograms.length > 0 && (
          <div style={{
            background: '#fff2f0',
            border: '1px solid #ffccc7',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <WarningOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
            <div>
              <Text strong style={{ color: '#cf1322' }}>Slots Exceeded</Text>
              <Text style={{ color: '#cf1322', marginLeft: 8, fontSize: 13 }}>
                {exceededPrograms.map(p => p.label).join(', ')} — filled slots exceed total allocated slots for the selected period.
              </Text>
            </div>
          </div>
        )}

        {/* Summary */}
        <SummaryCards data={grandTotals} />

        {/* Program Grid */}
        <Row gutter={[16, 16]}>
          {PROGRAMS.map(prog => {
            const totals = getTotals(filteredAssistances, prog.codes)
            return (
              <Col xs={24} sm={12} lg={8} key={prog.key}>
                <ProgramCard program={prog} totals={totals} />
              </Col>
            )
          })}

          {/* Others card */}
          <Col xs={24} sm={12} lg={8}>
            <Card
              style={{
                borderRadius: 12,
                border: '1px dashed #d9d9d9',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                height: '100%',
              }}
              bodyStyle={{ padding: 20 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <QuestionCircleOutlined style={{ color: '#8c8c8c', fontSize: 16 }} />
                    <Text strong style={{ fontSize: 16, color: '#1a1a1a' }}>Others</Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
                    Unclassified scholarship programs
                  </Text>
                </div>
                <Tag color="default" style={{ fontSize: 13, fontWeight: 600, padding: '2px 10px' }}>
                  {othersData.total}
                </Tag>
              </div>

              {othersData.total > 0 ? (
                <div style={{ maxHeight: 100, overflowY: 'auto' }}>
                  {othersData.programs?.map((p, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '4px 0', borderBottom: i < othersData.programs.length - 1 ? '1px solid #f5f5f5' : 'none',
                    }}>
                      <Text style={{ fontSize: 12, color: '#595959' }}>{p.scholarship_program || 'Blank'}</Text>
                      <Tag style={{ fontSize: 11, margin: 0 }}>{p.student_count}</Tag>
                    </div>
                  ))}
                </div>
              ) : (
                <Text type="secondary" style={{ fontSize: 12, display: 'block', textAlign: 'center', padding: '16px 0' }}>
                  All students matched to known programs
                </Text>
              )}
            </Card>
          </Col>
        </Row>
      </div>

      {/* Modals */}
      <EditSlotsModal
        open={openModalAddSlot}
        onClose={() => setOpenModalAddSlot(false)}
        onUpdated={() => fetchPrograms()}
      />
      <UpdateSlotModal
        open={openModalUpdateSlot}
        onClose={() => setOpenModalUpdateSlot(false)}
        onUpdated={() => fetchPrograms()}
      />
    </div>
  )
}
