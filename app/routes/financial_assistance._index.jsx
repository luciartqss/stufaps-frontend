import { Link } from 'react-router-dom'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { Typography, Card, Select, Progress, Spin, Tag, Row, Col, Space, InputNumber, message, Button, Modal, Badge, Table, Empty } from 'antd'
import {
  TeamOutlined, ContactsOutlined, UserOutlined,
  WarningOutlined, CheckOutlined,
  RightOutlined, QuestionCircleOutlined, FilterOutlined,
  InfoCircleOutlined, CalendarOutlined, SettingOutlined,
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
  ACEFGIAHEP: 'ACEF-GIAHEP', MTPSP: 'MTP-SP', CGMSSUCS: 'CGMS-SUCs', SMART: 'SMART', SNPLP: 'SNPLP',
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
  { key: 'smart', label: 'SMART', fullName: 'Student Monetary Assistance for Recovery and Transition', link: '/financial_assistance/Cgms_Sucs', codes: ['CGMSSUCS', 'SMART'], color: '#f5222d' },
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

function pct(part, whole) {
  return whole > 0 ? ((part / whole) * 100).toFixed(1) : '0.0'
}

/* ── Summary Cards ── */
function SummaryCards({ data, academicYear, semester }) {
  const isSpecificYear = academicYear && academicYear !== 'All'
  const semShort = { First: '1st Sem', Second: '2nd Sem' }[semester] || semester

  const slotsTitle = isSpecificYear ? 'Annual Slots' : 'Total Slots'
  const filledTitle = `Disbursed (${semShort})`
  const unfilledTitle = `Not Yet Disbursed (${semShort})`

  const cards = [
    { title: slotsTitle, value: data.slots, icon: isSpecificYear ? <CalendarOutlined /> : <ContactsOutlined />, color: '#1890ff', bg: '#e6f7ff' },
    { title: filledTitle, value: data.filled, icon: <TeamOutlined />, color: '#52c41a', bg: '#f6ffed', pct: pct(data.filled, data.slots) },
    { title: unfilledTitle, value: data.unfilled, icon: <UserOutlined />, color: '#faad14', bg: '#fffbe6', pct: pct(data.unfilled, data.slots) },
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
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              {c.title}
            </Text>
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

/* ── Manage Slots Modal ── */
function ManageSlotsModal({ open, onClose, academicYears, allAssistances, onSaved }) {
  const [edits, setEdits] = useState({})
  const [saving, setSaving] = useState(false)

  // Build a matrix: rows = sub-programs (within each parent program), columns = years
  const rows = useMemo(() => {
    const result = []
    for (const prog of PROGRAMS) {
      for (const code of prog.codes) {
        const nc = norm(code)
        result.push({
          key: nc,
          program: prog.label,
          programColor: prog.color,
          subProgram: CODE_LABELS[code.replace(/-/g, '').toUpperCase()] || code,
          code: nc,
        })
      }
    }
    return result
  }, [])

  // Lookup current slot value for a code + year
  const getSlot = useCallback((code, year) => {
    const match = allAssistances.find(
      a => norm(a.scholarship_program_name) === code && (a.Academic_year || a.academic_year) === year
    )
    return match ? Number(match.total_slot) || 0 : null // null = no record exists
  }, [allAssistances])

  const editKey = (code, year) => `${code}__${year}`

  const handleChange = (code, year, value) => {
    setEdits(prev => ({ ...prev, [editKey(code, year)]: value }))
  }

  const getDisplayValue = (code, year) => {
    const ek = editKey(code, year)
    if (ek in edits) return edits[ek]
    return getSlot(code, year)
  }

  // Count how many cells are missing (null = no record, or 0)
  const missingCount = useMemo(() => {
    let count = 0
    for (const row of rows) {
      for (const year of academicYears) {
        const val = getDisplayValue(row.code, year)
        if (val === null || val === 0) count++
      }
    }
    return count
  }, [rows, academicYears, edits, allAssistances])

  const changedEntries = useMemo(() => {
    return Object.entries(edits).filter(([key, val]) => {
      const [code, year] = key.split('__')
      const original = getSlot(code, year)
      return val !== original
    })
  }, [edits, getSlot])

  const handleSave = async () => {
    if (changedEntries.length === 0) return
    setSaving(true)
    try {
      // Find the programName from allAssistances for each code, or use the normalized code
      await Promise.all(changedEntries.map(([key, slots]) => {
        const [code, year] = key.split('__')
        const match = allAssistances.find(a => norm(a.scholarship_program_name) === code)
        const programName = match?.scholarship_program_name || code.toUpperCase()
        return fetch(`${API_BASE}/scholarship_program_records/upsert-slots`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            scholarship_program_name: programName,
            Academic_year: year,
            total_slot: slots ?? 0,
          }),
        }).then(r => { if (!r.ok) throw new Error('Failed') })
      }))
      message.success(`Updated ${changedEntries.length} slot${changedEntries.length > 1 ? 's' : ''}`)
      setEdits({})
      onSaved()
    } catch {
      message.error('Failed to update slots')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      title: 'Program',
      dataIndex: 'program',
      width: 100,
      fixed: 'left',
      onCell: (_, index) => {
        // Merge cells for same parent program
        const row = rows[index]
        const prevRow = index > 0 ? rows[index - 1] : null
        if (prevRow && prevRow.program === row.program) return { rowSpan: 0 }
        let span = 1
        for (let i = index + 1; i < rows.length && rows[i].program === row.program; i++) span++
        return { rowSpan: span }
      },
      render: (text, record) => (
        <Text strong style={{ color: record.programColor, fontSize: 12 }}>{text}</Text>
      ),
    },
    {
      title: 'Sub-Program',
      dataIndex: 'subProgram',
      width: 120,
      fixed: 'left',
      render: text => <Text style={{ fontSize: 12 }}>{text}</Text>,
    },
    ...academicYears.map(year => ({
      title: <Text style={{ fontSize: 12 }}>{year}</Text>,
      key: year,
      width: 110,
      align: 'center',
      render: (_, record) => {
        const val = getDisplayValue(record.code, year)
        const isMissing = val === null || val === 0
        const ek = editKey(record.code, year)
        const isEdited = ek in edits && edits[ek] !== getSlot(record.code, year)
        return (
          <InputNumber
            size="small"
            min={0}
            value={val ?? undefined}
            placeholder="—"
            onChange={v => handleChange(record.code, year, v)}
            controls={false}
            style={{
              width: 80,
              background: isEdited ? '#e6f7ff' : isMissing ? '#fff7e6' : undefined,
              borderColor: isEdited ? '#1890ff' : isMissing ? '#ffc53d' : undefined,
            }}
          />
        )
      },
    })),
  ]

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SettingOutlined />
          <span>Manage Annual Slots</span>
          {missingCount > 0 && (
            <Tag color="warning" style={{ margin: 0, fontSize: 11 }}>
              {missingCount} missing
            </Tag>
          )}
        </div>
      }
      open={open}
      onCancel={onClose}
      width={Math.min(340 + academicYears.length * 120, 900)}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: '#8c8c8c' }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#fff7e6', border: '1px solid #ffc53d', borderRadius: 2, marginRight: 4 }} />No slots</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#e6f7ff', border: '1px solid #1890ff', borderRadius: 2, marginRight: 4 }} />Edited</span>
          </div>
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              type="primary"
              loading={saving}
              disabled={changedEntries.length === 0}
              onClick={handleSave}
              icon={<CheckOutlined />}
            >
              Save {changedEntries.length > 0 ? `(${changedEntries.length})` : ''}
            </Button>
          </Space>
        </div>
      }
    >
      {academicYears.length === 0 ? (
        <Empty description="No academic years found. Add disbursement data first." />
      ) : (
        <Table
          dataSource={rows}
          columns={columns}
          pagination={false}
          size="small"
          bordered
          scroll={{ x: 'max-content' }}
          style={{ marginTop: 8 }}
        />
      )}
    </Modal>
  )
}

/* ── Program Card ── */
function ProgramCard({ program, totals }) {
  const exceeded = totals.filled > totals.slots && totals.slots > 0
  const fillPct = parseFloat(pct(totals.filled, totals.slots))
  const noSlots = totals.slots === 0

  return (
    <Card
      style={{
        borderRadius: 12,
        borderLeft: `3px solid ${exceeded ? '#ff4d4f' : noSlots ? '#d9d9d9' : program.color}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        height: '100%',
        transition: 'box-shadow 0.2s ease',
        opacity: noSlots ? 0.7 : 1,
      }}
      bodyStyle={{ padding: '16px 20px' }}
    >
      {/* Title row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Link to={program.link} style={{ textDecoration: 'none', minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text strong style={{ fontSize: 15 }}>{program.label}</Text>
            {exceeded && <Tag color="error" style={{ fontSize: 10, lineHeight: '16px', padding: '0 6px', margin: 0 }}>Exceeded</Tag>}
            {noSlots && <Tag color="default" style={{ fontSize: 10, lineHeight: '16px', padding: '0 6px', margin: 0 }}>No Slots</Tag>}
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
      {!noSlots && (
        <Progress
          percent={Math.min(fillPct, 100)}
          size="small"
          strokeColor={exceeded ? '#ff4d4f' : program.color}
          trailColor="#f0f0f0"
          showInfo={false}
          style={{ marginBottom: 12 }}
        />
      )}

      {/* Stats */}
      <div style={{ display: 'flex', justifyContent: noSlots ? 'center' : 'space-between', textAlign: 'center' }}>
        {noSlots ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {totals.filled > 0 ? `${totals.filled.toLocaleString()} students disbursed` : 'No data yet'}
          </Text>
        ) : (
          <>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>{totals.slots.toLocaleString()}</div>
              <Text type="secondary" style={{ fontSize: 11 }}>Slots</Text>
            </div>
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
          </>
        )}
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
  const [semesterFilter, setSemesterFilter] = useState('First')
  const [academicYears, setAcademicYears] = useState([])
  const [othersData, setOthersData] = useState({ total: 0, programs: [] })
  const [slotsModalOpen, setSlotsModalOpen] = useState(false)

  const fetchPrograms = useCallback(() => {
    setLoading(true)
    const semParam = `?semester=${encodeURIComponent(semesterFilter)}`
    Promise.all([
      fetch(`${API_BASE}/scholarship_program_records${semParam}`).then(r => r.json()),
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
  }, [semesterFilter])

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

  const noSlotsPrograms = useMemo(() => {
    return PROGRAMS.filter(p => {
      const t = getTotals(filteredAssistances, p.codes)
      return t.slots === 0
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
            {isMasterAdmin && (
              <Badge count={noSlotsPrograms.length} size="small" offset={[-4, 0]}>
                <Button
                  icon={<SettingOutlined />}
                  onClick={() => setSlotsModalOpen(true)}
                >
                  Manage Slots
                </Button>
              </Badge>
            )}
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

        {/* No slots warning */}
        {isMasterAdmin && noSlotsPrograms.length > 0 && (
          <div style={{
            background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8,
            padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <InfoCircleOutlined style={{ color: '#faad14', fontSize: 16 }} />
              <Text style={{ color: '#ad6800', fontSize: 13 }}>
                <strong>{noSlotsPrograms.length} program{noSlotsPrograms.length > 1 ? 's' : ''}</strong> with no slots configured{academicYearFilter !== 'All' ? ` for AY ${academicYearFilter}` : ''}: {noSlotsPrograms.map(p => p.label).join(', ')}
              </Text>
            </div>
            <Button size="small" type="link" onClick={() => setSlotsModalOpen(true)} style={{ color: '#ad6800', fontWeight: 500 }}>
              Configure
            </Button>
          </div>
        )}

        {/* Summary */}
        <SummaryCards data={grandTotals} academicYear={academicYearFilter} semester={semesterFilter} />

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
        </Row>

        {/* Others — subtle footer banner */}
        {othersData.total > 0 && (
          <div style={{
            marginTop: 24, padding: '12px 16px', background: '#fafafa', borderRadius: 8,
            border: '1px solid #f0f0f0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: othersData.programs?.length > 0 ? 8 : 0 }}>
              <QuestionCircleOutlined style={{ color: '#8c8c8c', fontSize: 13 }} />
              <Text type="secondary" style={{ fontSize: 13 }}>
                <strong>{othersData.total}</strong> students in unclassified programs
              </Text>
            </div>
            {othersData.programs?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {othersData.programs.map((p, i) => (
                  <Tag key={i} style={{ margin: 0, fontSize: 11 }}>
                    {p.scholarship_program || 'Blank'} ({p.student_count})
                  </Tag>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manage Slots Modal */}
      {isMasterAdmin && (
        <ManageSlotsModal
          open={slotsModalOpen}
          onClose={() => setSlotsModalOpen(false)}
          academicYears={academicYears}
          allAssistances={financialAssistances}
          onSaved={fetchPrograms}
        />
      )}
    </div>
  )
}
