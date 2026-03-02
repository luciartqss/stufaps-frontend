import { Link } from 'react-router-dom'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { Typography, Card, Select, Progress, Spin, Tag, Row, Col, Space, InputNumber, message, Popover, Button } from 'antd'
import {
  TeamOutlined, ContactsOutlined, UserOutlined,
  WarningOutlined, EditOutlined, CheckOutlined, CloseOutlined,
  RightOutlined, QuestionCircleOutlined, FilterOutlined,
} from '@ant-design/icons'

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

/* ── Friendly display names for sub-program codes ── */
const CODE_LABELS = {
  FULLSSP: 'Full SSP', HALFSSP: 'Half SSP',
  FULLSSPGAD: 'Full SSP-GAD', HALFSSPGAD: 'Half SSP-GAD',
  FULLPESFA: 'Full PESFA', HALFPESFA: 'Half PESFA',
  FULLPESFAGAD: 'Full PESFA-GAD', HALFPESFAGAD: 'Half PESFA-GAD',
  FULLESTAT: 'Full Estat', HALFESTAT: 'Half Estat', ESTATISTIKOLAR: 'Estatistikolar',
  COSCHO: 'CoScho', MSRS: 'MSRS', SIDASGP: 'SIDA-SGP',
  ACEFGIAHEP: 'ACEF-GIAHEP', MTPSP: 'MTP-SP', CGMSSUCS: 'CGMS-SUCs', SNPLP: 'SNPLP',
}

/* ── Program definitions ── */
const PROGRAMS = [
  { key: 'cmsp', label: 'CMSP', fullName: 'CHED Merit Scholarship Program', link: '/financial_assistance/cmsp', codes: ['FULLSSP', 'HALFSSP', 'HALFSSPGAD', 'FULLSSPGAD', 'FULLPESFA', 'HALFPESFA', 'HALFPESFAGAD', 'FULLPESFAGAD'], color: '#1890ff' },
  { key: 'estatistikolar', label: 'Estatistikolar', fullName: 'CHED Scholarship for Future Statisticians', link: '/financial_assistance/estatistikolar', codes: ['FULL-ESTAT', 'HALF-ESTAT', 'ESTATISTIKOLAR'], color: '#722ed1' },
  { key: 'coscho', label: 'CoScho', fullName: 'Coconut Farmers and Farmworkers Scholarship', link: '/financial_assistance/CoScho', codes: ['COSCHO'], color: '#13c2c2' },
  { key: 'msrs', label: 'MSRS', fullName: 'Medical Scholarship and Return Service', link: '/financial_assistance/msrs', codes: ['MSRS'], color: '#eb2f96' },
  { key: 'sida_sgp', label: 'SIDA-SGP', fullName: 'Sugarcane Industry Development Act Grant', link: '/financial_assistance/Sida_Sgp', codes: ['SIDASGP'], color: '#fa8c16' },
  { key: 'acef_giahep', label: 'ACEF-GIAHEP', fullName: 'Agricultural Competitiveness Enhancement Fund', link: '/financial_assistance/Acef_Giahep', codes: ['ACEFGIAHEP'], color: '#52c41a' },
  { key: 'mtp_sp', label: 'MTP-SP', fullName: 'Medical Technologists and Pharmacists Scholarship', link: '/financial_assistance/Mtp_Sp', codes: ['MTPSP'], color: '#2f54eb' },
  { key: 'cgms_sucs', label: 'CGMS-SUCs', fullName: 'Cash Grant to Medical Students in SUCs', link: '/financial_assistance/Cgms_Sucs', codes: ['CGMSSUCS'], color: '#f5222d' },
  { key: 'snplp', label: 'SNPLP', fullName: 'Student Nurses Licensure Preparation', link: '/financial_assistance/Snplp', codes: ['SNPLP'], color: '#a0d911' },
]

/* ── Helpers ── */
const norm = s => s?.toLowerCase().replace(/[-_ ]/g, '')

function getTotals(assistances, codes) {
  const normalizedCodes = codes.map(norm)
  const filtered = assistances.filter(p => normalizedCodes.includes(norm(p.scholarship_program_name)))

  if (filtered.length === 1 && (filtered[0].Academic_year === 'All' || filtered[0].academic_year === 'All')) {
    const r = filtered[0]
    return { slots: Number(r?.total_slot) || 0, filled: Number(r?.total_students) || 0, unfilled: Number(r?.unfilled_slot) || 0 }
  }

  return {
    slots: filtered.reduce((s, p) => s + (Number(p?.total_slot) || 0), 0),
    filled: filtered.reduce((s, p) => s + (Number(p?.total_students) || 0), 0),
    unfilled: filtered.reduce((s, p) => s + (Number(p?.unfilled_slot) || 0), 0),
  }
}

function getSubPrograms(assistances, codes) {
  return codes.map(code => {
    const nc = norm(code)
    const match = assistances.find(p => norm(p.scholarship_program_name) === nc)
    return {
      code: nc.toUpperCase(),
      label: CODE_LABELS[code.replace(/-/g, '').toUpperCase()] || code,
      slots: Number(match?.total_slot) || 0,
      filled: Number(match?.total_students) || 0,
      unfilled: Number(match?.unfilled_slot) || 0,
      programName: match?.scholarship_program_name || code.replace(/-/g, '').toUpperCase(),
    }
  })
}

function pct(part, whole) {
  return whole > 0 ? ((part / whole) * 100).toFixed(1) : '0.0'
}

/* ── Summary Cards ── */
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

/* ── Inline Slot Editor (popover content) ── */
function SlotEditor({ subPrograms, academicYear, onSaved }) {
  const [edits, setEdits] = useState({})
  const [saving, setSaving] = useState(false)

  const handleChange = (programName, value) => {
    setEdits(prev => ({ ...prev, [programName]: value }))
  }

  const hasChanges = Object.keys(edits).some(k => {
    const sp = subPrograms.find(s => s.programName === k)
    return sp && edits[k] !== sp.slots
  })

  const handleSave = async () => {
    const changes = Object.entries(edits).filter(([k, v]) => {
      const sp = subPrograms.find(s => s.programName === k)
      return sp && v !== sp.slots
    })
    if (changes.length === 0) return

    setSaving(true)
    try {
      await Promise.all(changes.map(([programName, slots]) =>
        fetch(`${API_BASE}/scholarship_program_records/upsert-slots`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ scholarship_program_name: programName, Academic_year: academicYear, total_slot: slots }),
        }).then(r => { if (!r.ok) throw new Error('Failed') })
      ))
      message.success('Slots updated')
      setEdits({})
      onSaved()
    } catch {
      message.error('Failed to update slots')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minWidth: 260 }}>
      <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
        Edit Slots — {academicYear}
      </Text>
      {subPrograms.map(sp => (
        <div key={sp.programName} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Text style={{ fontSize: 12, color: '#595959', flex: 1, minWidth: 0 }} ellipsis>{sp.label}</Text>
          <InputNumber
            size="small"
            min={0}
            value={edits[sp.programName] ?? sp.slots}
            onChange={v => handleChange(sp.programName, v)}
            style={{ width: 80 }}
            controls={false}
          />
          <Text style={{ fontSize: 11, color: '#8c8c8c', width: 50, textAlign: 'right' }}>{sp.filled} filled</Text>
        </div>
      ))}
      {hasChanges && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, gap: 6 }}>
          <Button size="small" onClick={() => setEdits({})} icon={<CloseOutlined />}>Cancel</Button>
          <Button size="small" type="primary" loading={saving} onClick={handleSave} icon={<CheckOutlined />}>Save</Button>
        </div>
      )}
    </div>
  )
}

/* ── Program Card ── */
function ProgramCard({ program, totals, subPrograms, canEdit, academicYear, onSaved }) {
  const exceeded = totals.filled > totals.slots && totals.slots > 0
  const fillPct = parseFloat(pct(totals.filled, totals.slots))
  const isSpecificYear = academicYear && academicYear !== 'All'

  const slotsContent = (
    <div>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>{totals.slots.toLocaleString()}</div>
      <Text type="secondary" style={{ fontSize: 11 }}>Slots</Text>
    </div>
  )

  return (
    <Card
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
        <Link to={program.link} style={{ textDecoration: 'none', minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text strong style={{ fontSize: 15 }}>{program.label}</Text>
            {exceeded && <Tag color="error" style={{ fontSize: 10, lineHeight: '16px', padding: '0 6px', margin: 0 }}>Exceeded</Tag>}
          </div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {program.fullName}
          </Text>
        </Link>
        <Link to={program.link} style={{ textDecoration: 'none' }}>
          <RightOutlined style={{ color: '#bfbfbf', fontSize: 12, flexShrink: 0 }} />
        </Link>
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
        {/* Slots — editable via popover when admin + specific AY selected */}
        {canEdit && isSpecificYear && subPrograms.length > 0 ? (
          <Popover
            trigger="click"
            placement="bottom"
            content={<SlotEditor subPrograms={subPrograms} academicYear={academicYear} onSaved={onSaved} />}
          >
            <div style={{ cursor: 'pointer', position: 'relative' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1890ff' }}>
                {totals.slots.toLocaleString()}
                <EditOutlined style={{ fontSize: 10, marginLeft: 4, color: '#bfbfbf' }} />
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>Slots</Text>
            </div>
          </Popover>
        ) : slotsContent}

        {[
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
  )
}

/* ── Main Page ── */
export default function FinancialAssistanceIndex() {
  const { permissions } = useAuth()
  const isMasterAdmin = permissions?.role === 'master_admin'
  const [financialAssistances, setFinancialAssistances] = useState([])
  const [loading, setLoading] = useState(true)
  const [academicYearFilter, setAcademicYearFilter] = useState('All')
  const [academicYears, setAcademicYears] = useState([])
  const [othersData, setOthersData] = useState({ total: 0, programs: [] })

  const fetchPrograms = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch(`${API_BASE}/scholarship_program_records`).then(r => r.json()),
      fetch(`${API_BASE}/scholarship_program_records/others`).then(r => r.json()).catch(() => ({ total: 0, programs: [] })),
      fetch(`${API_BASE}/scholarship_program_records/academic-years`).then(r => r.json()).catch(() => []),
    ]).then(([data, others, years]) => {
      const programsData = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
      setFinancialAssistances(programsData)
      setAcademicYears(Array.isArray(years) ? years : [])
      setOthersData(others)
    }).catch(err => {
      console.error('Fetch Error:', err)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchPrograms() }, [fetchPrograms])

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
            <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>CMOs</Title>
            <Text style={{ color: '#6b7280', fontSize: 14 }}>CHED Memorandum Order</Text>
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
              {academicYears.map(y => (
                <Option key={y} value={y}>{y}</Option>
              ))}
            </Select>
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

        {/* Admin hint */}
        {isMasterAdmin && academicYearFilter === 'All' && (
          <div style={{
            background: '#f0f5ff', border: '1px solid #d6e4ff', borderRadius: 8,
            padding: '8px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <EditOutlined style={{ color: '#1890ff', fontSize: 13 }} />
            <Text style={{ color: '#1d39c4', fontSize: 13 }}>
              Select a specific academic year to edit slot counts inline.
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
            const subPrograms = getSubPrograms(filteredAssistances, prog.codes)
            return (
              <Col xs={24} sm={12} lg={8} key={prog.key}>
                <ProgramCard
                  program={prog}
                  totals={totals}
                  subPrograms={subPrograms}
                  canEdit={isMasterAdmin}
                  academicYear={academicYearFilter}
                  onSaved={fetchPrograms}
                />
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
    </div>
  )
}
