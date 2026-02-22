import { Link } from 'react-router-dom'
import { useEffect, useState, useMemo } from 'react'
import { Typography, Card, Select, Progress, Spin, Tag, Row, Col, Button, Space } from 'antd'
import {
  TeamOutlined, ContactsOutlined, UserOutlined,
  WarningOutlined, PlusOutlined, EditOutlined,
  RightOutlined, QuestionCircleOutlined, FilterOutlined,
} from '@ant-design/icons'
import EditSlotsModal from '../components/EditSlotsModal'
import UpdateSlotModal from '../components/UpdateSlotModal'

import { API_BASE } from '../lib/config'
import { useAuth } from '../lib/AuthContext'

const { Title, Text } = Typography
const { Option } = Select

export function meta() {
  return [
    { title: 'Financial Assistances | StuFAPs' },
    { name: 'description', content: 'Manage financial assistance records' },
  ]
}

/* Program definitions */
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
    fullName: 'CHED Scholarship for Future Statisticians',
    link: '/financial_assistance/estatistikolar',
    codes: ['FULLESTAT', 'HALFESTAT', 'ESTATISTIKOLAR'],
    color: '#722ed1',
  },
  {
    key: 'coscho',
    label: 'CoScho',
    fullName: 'Coconut Farmers and Farmworkers Scholarship',
    link: '/financial_assistance/CoScho',
    codes: ['COSCHO'],
    color: '#13c2c2',
  },
  {
    key: 'msrs',
    label: 'MSRS',
    fullName: 'Medical Scholarship and Return Service',
    link: '/financial_assistance/msrs',
    codes: ['MSRS'],
    color: '#eb2f96',
  },
  {
    key: 'sida_sgp',
    label: 'SIDA-SGP',
    fullName: 'Sugarcane Industry Development Act Grant',
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
    fullName: 'Medical Technologists and Pharmacists Scholarship',
    link: '/financial_assistance/Mtp_Sp',
    codes: ['MTPSP'],
    color: '#2f54eb',
  },
  {
    key: 'cgms_sucs',
    label: 'CGMS-SUCs',
    fullName: 'Cash Grant to Medical Students in SUCs',
    link: '/financial_assistance/Cgms_Sucs',
    codes: ['CGMSSUCS'],
    color: '#f5222d',
  },
  {
    key: 'snplp',
    label: 'SNPLP',
    fullName: 'Student Nurses Licensure Preparation',
    link: '/financial_assistance/Snplp',
    codes: ['SNPLP'],
    color: '#a0d911',
  },
]

/* Helpers */
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

/* Summary Cards */
function SummaryCards({ data }) {
  const cards = [
    { title: 'Total Slots', value: data.slots, icon: <ContactsOutlined />, color: '#1890ff', bg: '#e6f7ff' },
    { title: 'Filled Slots', value: data.filled, icon: <TeamOutlined />, color: '#52c41a', bg: '#f6ffed', pct: pct(data.filled, data.slots) },
    { title: 'Unfilled Slots', value: data.unfilled, icon: <UserOutlined />, color: '#faad14', bg: '#fffbe6', pct: pct(data.unfilled, data.slots) },
  ]

  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
      {cards.map((c, i) => (
        <Card
          key={i}
          style={{ flex: 1, minWidth: 0, borderRadius: 12, border: 'none', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
          bodyStyle={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{c.title}</Text>
            <Text strong style={{ fontSize: 22, color: c.color, lineHeight: 1.2, display: 'block' }}>
              {c.value.toLocaleString()}
            </Text>
            {c.pct && (
              <>
                <Progress percent={parseFloat(c.pct)} size="small" strokeColor={c.color} showInfo={false} style={{ margin: '6px 0 2px' }} />
                <Text style={{ fontSize: 11, color: '#8c8c8c' }}>{c.pct}% of total</Text>
              </>
            )}
          </div>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: c.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, color: c.color, flexShrink: 0,
          }}>{c.icon}</div>
        </Card>
      ))}
    </div>
  )
}

/* Program Card */
function ProgramCard({ program, totals }) {
  const exceeded = totals.filled > totals.slots && totals.slots > 0
  const fillPct = parseFloat(pct(totals.filled, totals.slots))

  return (
    <Link to={program.link} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      <Card
        hoverable
        style={{
          borderRadius: 12,
          borderLeft: `3px solid ${exceeded ? '#ff4d4f' : program.color}`,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          height: '100%',
          transition: 'box-shadow 0.2s ease',
        }}
        bodyStyle={{ padding: '16px 20px' }}
      >
        {/* Title row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text strong style={{ fontSize: 15 }}>{program.label}</Text>
              {exceeded && <Tag color="error" style={{ fontSize: 10, lineHeight: '16px', padding: '0 6px', margin: 0 }}>Exceeded</Tag>}
            </div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {program.fullName}
            </Text>
          </div>
          <RightOutlined style={{ color: '#bfbfbf', fontSize: 12, flexShrink: 0 }} />
        </div>

        {/* Fill bar */}
        <Progress
          percent={Math.min(fillPct, 100)}
          size="small"
          strokeColor={exceeded ? '#ff4d4f' : program.color}
          trailColor="#f0f0f0"
          showInfo={false}
          style={{ marginBottom: 12 }}
        />

        {/* Stats */}
        <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
          {[
            { label: 'Slots', value: totals.slots, color: '#1a1a1a' },
            { label: 'Filled', value: totals.filled, color: '#52c41a' },
            { label: 'Unfilled', value: totals.unfilled, color: exceeded ? '#ff4d4f' : '#faad14' },
            { label: 'Fill Rate', value: `${fillPct}%`, color: exceeded ? '#ff4d4f' : '#1890ff' },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 15, fontWeight: 600, color: s.color }}>{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</div>
              <Text type="secondary" style={{ fontSize: 11 }}>{s.label}</Text>
            </div>
          ))}
        </div>
      </Card>
    </Link>
  )
}

/* Main Page */
export default function FinancialAssistanceIndex() {
  const { permissions } = useAuth()
  const isMasterAdmin = permissions?.role === 'master_admin'
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

  const grandTotals = useMemo(() => {
    const allCodes = PROGRAMS.flatMap(p => p.codes)
    return getTotals(filteredAssistances, allCodes)
  }, [filteredAssistances])

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
    <div style={{ background: '#fff', minHeight: 'calc(100vh - 72px)', margin: -24 }}>
      {/* Header */}
      <div style={{ padding: '24px', borderBottom: '1px solid #e8eaed' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>Financial Assistance</Title>
            <Text style={{ color: '#6b7280', fontSize: 14 }}>Manage scholarship programs, slots, and allocations</Text>
          </div>
          <Space size={12}>
            <FilterOutlined style={{ color: '#6b7280' }} />
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
            {isMasterAdmin && (
              <>
                <Button icon={<PlusOutlined />} onClick={() => setOpenModalAddSlot(true)}>Add Slots</Button>
                <Button icon={<EditOutlined />} onClick={() => setOpenModalUpdateSlot(true)}>Update Slots</Button>
              </>
            )}
          </Space>
        </div>
      </div>

      <div style={{ padding: '24px' }}>
        {/* Exceeded warning */}
        {exceededPrograms.length > 0 && (
          <div style={{
            background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 8,
            padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <WarningOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />
            <Text style={{ color: '#cf1322', fontSize: 13 }}>
              <strong>Slots Exceeded:</strong> {exceededPrograms.map(p => p.label).join(', ')}
            </Text>
          </div>
        )}

        {/* Summary */}
        <SummaryCards data={grandTotals} />

        {/* Section label */}
        <Text strong style={{ fontSize: 14, color: '#6b7280', display: 'block', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Scholarship Programs
        </Text>

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
          {othersData.total > 0 && (
            <Col xs={24} sm={12} lg={8}>
              <Card
                style={{ borderRadius: 12, borderLeft: '3px solid #d9d9d9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', height: '100%' }}
                bodyStyle={{ padding: '16px 20px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <QuestionCircleOutlined style={{ color: '#8c8c8c', fontSize: 15 }} />
                      <Text strong style={{ fontSize: 15 }}>Others</Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>Unclassified programs</Text>
                  </div>
                  <Tag style={{ fontSize: 13, fontWeight: 600, padding: '2px 10px', margin: 0 }}>{othersData.total}</Tag>
                </div>
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
              </Card>
            </Col>
          )}
        </Row>
      </div>

      {/* Modals */}
      <EditSlotsModal open={openModalAddSlot} onClose={() => setOpenModalAddSlot(false)} onUpdated={() => fetchPrograms()} />
      <UpdateSlotModal open={openModalUpdateSlot} onClose={() => setOpenModalUpdateSlot(false)} onUpdated={() => fetchPrograms()} />
    </div>
  )
}
