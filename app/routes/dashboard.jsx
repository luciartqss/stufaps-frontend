import { Card, Row, Col, Typography, Spin, Empty, Select, Space, Button, Badge, Progress, Table, Tag } from 'antd'
import {
  TeamOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  FilterOutlined,
  RightOutlined,
  QuestionCircleOutlined,
  AlertOutlined,
  AuditOutlined,
  FileTextOutlined,
  WalletOutlined,
  SwapOutlined,
  BarChartOutlined,
  UserOutlined,
  BankOutlined,
  LineChartOutlined,
} from '@ant-design/icons'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE as API_URL } from '../lib/config'
import { useRealtime } from '../lib/useRealtime'

const { Title, Text } = Typography

export function meta() {
  return [
    { title: 'Dashboard - StuFAPs' },
    { name: 'description', content: 'Student Financial Assistance Programs Dashboard' },
  ]
}

// ── Program full names for tooltips ──
const PROGRAM_FULL_NAMES = {
  'CMSP': 'CHED Merit Scholarship Program',
  'ESTATISTIKLKOLAR': 'Scholarship for Future Statisticians',
  'CoScho': 'Coconut Farmers & Families Scholarship',
  'MSRS': 'Medical Scholarship & Return Service',
  'SIDA-SGP': 'Sugar Industry Workers Scholarship',
  'ACEF-GIAHEP': 'Agricultural Competitiveness Enhancement Fund',
  'MTP-SP': 'Medical Technologist & Pharmacists Scholarship',
  'SNPLP': 'Study Now Pay Later Program',
  'SMART': 'Student Monetary Assistance for Recovery & Transition',
  'Others': 'Other Programs',
}

// ── Status config ──
const STATUS_CONFIG = [
  { key: 'activeScholars', label: 'Active', color: '#16a34a', bg: '#f0fdf4', icon: <CheckCircleOutlined /> },
  { key: 'graduated', label: 'Graduated', color: '#2563eb', bg: '#eff6ff', icon: <TrophyOutlined /> },
  { key: 'terminated', label: 'Terminated', color: '#dc2626', bg: '#fef2f2', icon: <CloseCircleOutlined /> },
  { key: 'replacement', label: 'Replacement', color: '#7c3aed', bg: '#f5f3ff', icon: <SwapOutlined /> },
  { key: 'others', label: 'Others', color: '#d97706', bg: '#fffbeb', icon: <QuestionCircleOutlined /> },
]

// ── Warning definitions (same order as data-quality page) ──
const WARNING_CONFIG = [
  { key: 'no_award_number', label: 'Missing Award No.', severity: 'medium', color: '#d48806', path: '/data-quality?tab=no_award' },
  { key: 'duplicate_award_numbers', label: 'Duplicate Award No.', severity: 'critical', color: '#cf1322', path: '/data-quality?tab=duplicate_award' },
  { key: 'no_lrn', label: 'Missing LRN', severity: 'medium', color: '#d48806', path: '/data-quality?tab=no_lrn' },
  { key: 'duplicate_lrn', label: 'Duplicate LRN', severity: 'critical', color: '#cf1322', path: '/data-quality?tab=duplicate_lrn' },
  { key: 'no_status', label: 'Missing Status', severity: 'medium', color: '#d48806', path: '/data-quality?tab=no_status' },
  { key: 'no_uii', label: 'Missing UII', severity: 'medium', color: '#d48806', path: '/data-quality?tab=no_uii' },
  { key: 'incomplete_info', label: 'Incomplete Info', severity: 'high', color: '#d4380d', path: '/data-quality?tab=incomplete' },
  { key: 'incomplete_stufaps', label: 'Incomplete StuFAPs Disb.', severity: 'high', color: '#d4380d', path: '/data-quality?tab=incomplete_stufaps_disb' },
  { key: 'incomplete_accounting', label: 'Incomplete Accounting', severity: 'high', color: '#d4380d', path: '/data-quality/accounting' },
  { key: 'incomplete_cashier', label: 'Incomplete Cashier', severity: 'high', color: '#d4380d', path: '/data-quality/cashier' },
]

const SEVERITY_TAGS = {
  critical: { color: '#ff4d4f', label: 'CRITICAL' },
  high: { color: '#ff7a45', label: 'HIGH' },
  medium: { color: '#faad14', label: 'MEDIUM' },
  low: { color: '#8c8c8c', label: 'LOW' },
}

// ── Shared styles ──
const cardStyle = {
  borderRadius: 10,
  border: '1px solid #f0f0f0',
  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
  height: '100%',
}

const sectionCardStyle = {
  borderRadius: 12,
  border: '1px solid #e8eaed',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  background: '#fff',
  height: '100%',
}

// ── Program bar chart colors ──
const PROGRAM_COLORS = {
  'CMSP': '#3b82f6',
  'ESTATISTIKLKOLAR': '#8b5cf6',
  'CoScho': '#10b981',
  'MSRS': '#f59e0b',
  'SIDA-SGP': '#ef4444',
  'ACEF-GIAHEP': '#06b6d4',
  'MTP-SP': '#ec4899',
  'SNPLP': '#14b8a6',
  'SMART': '#f97316',
  'Others': '#94a3b8',
}

const formatCompactCurrency = (value) => {
  if (value >= 1_000_000) return '\u20B1' + (value / 1_000_000).toFixed(1) + 'M'
  if (value >= 1_000) return '\u20B1' + (value / 1_000).toFixed(0) + 'K'
  return '\u20B1' + Number(value).toLocaleString()
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ semester: null, academic_year: null })
  const [filterOptions, setFilterOptions] = useState({ semesters: [], academic_years: [] })
  const [analytics, setAnalytics] = useState({
    year_level: [],
    sex: [],
    hei_type: [],
    graduates_count: 0,
    disbursement_by_program: [],
    disbursement_trends: [],
  })
  const [data, setData] = useState({
    stats: { totalStudents: 0, activeScholars: 0, graduated: 0, terminated: 0, replacement: 0, others: 0, totalDisbursed: 0 },
    statusDistribution: [],
    scholarshipPrograms: [],
    dataQuality: {
      total_disbursements: 0,
      stufaps: { total: 0, incomplete: 0, complete: 0 },
      accounting: { total: 0, incomplete: 0, complete: 0 },
      cashier: { total: 0, incomplete: 0, complete: 0 },
    },
    warnings: {},
  })

  const fetchDashboard = async (currentFilters = filters) => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (currentFilters.semester) params.append('semester', currentFilters.semester)
      if (currentFilters.academic_year) params.append('academic_year', currentFilters.academic_year)

      const url = `${API_URL}/dashboard/stats${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url)
      if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + response.statusText)
      const d = await response.json()
      if (d.error) throw new Error(d.message || 'Unknown error')

      if (d.filters) {
        setFilterOptions({ semesters: d.filters.semesters || [], academic_years: d.filters.academic_years || [] })
      }

      setData({
        stats: {
          totalStudents: d.total_students || 0,
          activeScholars: d.active_scholars || 0,
          graduated: d.graduated || 0,
          terminated: d.terminated || 0,
          replacement: d.replacement || 0,
          others: d.others || 0,
          totalDisbursed: d.total_disbursed || 0,
        },
        statusDistribution: (d.status_distribution || []).map(item => ({
          name: item.status || 'Unknown',
          value: item.count || 0,
          color: getStatusColor(item.status),
        })),
        scholarshipPrograms: (d.scholarship_programs || []).map(item => ({
          program: item.scholarship_program || 'Unknown',
          count: parseInt(item.count) || 0,
          fullName: PROGRAM_FULL_NAMES[item.scholarship_program] || item.scholarship_program || 'Unknown',
        })),
        dataQuality: d.data_quality || {
          total_disbursements: 0,
          stufaps: { total: 0, incomplete: 0, complete: 0 },
          accounting: { total: 0, incomplete: 0, complete: 0 },
          cashier: { total: 0, incomplete: 0, complete: 0 },
        },
        warnings: d.warnings || {},
      })
    } catch (err) {
      console.error('Dashboard fetch error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalytics = async (currentFilters = filters) => {
    try {
      const params = new URLSearchParams()
      if (currentFilters.semester) params.append('semester', currentFilters.semester)
      if (currentFilters.academic_year) params.append('academic_year', currentFilters.academic_year)
      const url = `${API_URL}/dashboard/analytics${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url)
      if (!response.ok) return
      const d = await response.json()
      if (!d.error) setAnalytics(d)
    } catch (err) {
      console.error('Analytics fetch error:', err)
    }
  }

  useEffect(() => { fetchDashboard(); fetchAnalytics() }, [])

  useRealtime('*', () => { fetchDashboard(); fetchAnalytics() })

  const handleFilterChange = (key, value) => {
    const f = { ...filters, [key]: value }
    setFilters(f)
    fetchDashboard(f)
    fetchAnalytics(f)
  }

  const clearFilters = () => {
    const f = { semester: null, academic_year: null }
    setFilters(f)
    fetchDashboard(f)
    fetchAnalytics(f)
  }

  function getStatusColor(status) {
    const map = { 'Active': '#16a34a', 'Graduated': '#2563eb', 'Terminated': '#dc2626', 'Replacement': '#7c3aed', 'Others': '#d97706', 'Unknown': '#d9d9d9' }
    return map[status] || map['Others']
  }

  const pct = (v) => data.stats.totalStudents ? ((v / data.stats.totalStudents) * 100).toFixed(1) : '0.0'

  const formatCurrency = (v) => {
    if (v >= 1_000_000) return '\u20B1' + (v / 1_000_000).toFixed(2) + 'M'
    if (v >= 1_000) return '\u20B1' + (v / 1_000).toFixed(1) + 'K'
    return '\u20B1' + Number(v).toLocaleString()
  }

  const totalWarnings = WARNING_CONFIG.reduce((sum, w) => sum + (data.warnings[w.key]?.count || 0), 0)

  // ── Loading / Error states ──
  if (loading && !data.stats.totalStudents) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 120px)' }}>
        <Spin size="large" /><Text style={{ marginLeft: 16 }}>Loading dashboard...</Text>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 120px)' }}>
        <Empty description={<><Text type="danger" strong>Failed to load dashboard</Text><br /><Text type="secondary">{error}</Text></>} />
      </div>
    )
  }

  // ── Custom bar shape with rounded ends ──
  const RoundedBar = (props) => {
    const { x, y, width, height, fill } = props
    if (!height || height <= 0) return null
    const r = Math.min(4, height / 2, width / 2)
    return <rect x={x} y={y} width={width} height={height} rx={r} ry={r} fill={fill} />
  }

  // ── Custom tooltip for program chart ──
  const ProgramTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: '10px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <Text strong style={{ fontSize: 13, display: 'block' }}>{d.program}</Text>
        <Text style={{ fontSize: 12, color: '#8c8c8c', display: 'block', marginBottom: 4 }}>{d.fullName}</Text>
        <Text style={{ fontSize: 14, color: '#1a1a1a' }}>{d.count.toLocaleString()} scholars</Text>
      </div>
    )
  }

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #e8eaed' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>Dashboard</Title>
            <Text style={{ color: '#8c8c8c', fontSize: 14 }}>Scholarship program monitoring and operational overview</Text>
          </div>
          <Space size={10}>
            <FilterOutlined style={{ color: '#8c8c8c' }} />
            <Select placeholder="Academic Year" value={filters.academic_year} onChange={(v) => handleFilterChange('academic_year', v)} allowClear style={{ width: 140 }} size="middle">
              {filterOptions.academic_years.map(ay => <Select.Option key={ay} value={ay}>{ay}</Select.Option>)}
            </Select>
            <Select placeholder="Semester" value={filters.semester} onChange={(v) => handleFilterChange('semester', v)} allowClear style={{ width: 120 }} size="middle">
              {filterOptions.semesters.map(s => <Select.Option key={s} value={s}>{s}</Select.Option>)}
            </Select>
            {(filters.semester || filters.academic_year) && (
              <Button type="text" size="small" onClick={clearFilters} style={{ color: '#ff4d4f' }}>Clear</Button>
            )}
          </Space>
        </div>
      </div>

      {/* ── Summary Card: Scholars + Disbursed ── */}
      <Card style={cardStyle} styles={{ body: { padding: '20px 24px' } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TeamOutlined style={{ fontSize: 24, color: '#3b82f6' }} />
            </div>
            <div>
              <Text style={{ color: '#8c8c8c', fontSize: 13 }}>Total Scholars</Text>
              <Title level={2} style={{ margin: 0, lineHeight: 1.1 }}>{data.stats.totalStudents.toLocaleString()}</Title>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarOutlined style={{ fontSize: 24, color: '#7c3aed' }} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <Text style={{ color: '#8c8c8c', fontSize: 13 }}>Total Disbursed</Text>
              <Title level={2} style={{ margin: 0, lineHeight: 1.1, color: '#7c3aed' }}>{formatCurrency(data.stats.totalDisbursed)}</Title>
            </div>
          </div>
        </div>
        {/* Status breakdown strip */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {STATUS_CONFIG.map(s => {
            const val = data.stats[s.key]
            return (
              <div key={s.key} style={{
                flex: '1 1 0',
                minWidth: 120,
                padding: '10px 14px',
                borderRadius: 8,
                background: s.bg,
                border: '1px solid ' + s.color + '20',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ color: s.color, fontSize: 13 }}>{s.icon}</span>
                  <Text style={{ color: '#595959', fontSize: 12 }}>{s.label}</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <Text strong style={{ fontSize: 20, color: '#1a1a1a', lineHeight: 1.2 }}>{val.toLocaleString()}</Text>
                  <Text style={{ fontSize: 11, color: s.color }}>{pct(val)}%</Text>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
      <div style={{ marginBottom: 16 }} />

      {/* ── Charts: Status + Programs ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={10}>
          <Card
            title={<Text strong style={{ fontSize: 15 }}>Status Composition</Text>}
            style={sectionCardStyle}
            styles={{ body: { padding: '16px 20px' } }}
          >
            {data.statusDistribution.some(item => item.value > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data.statusDistribution.filter(item => item.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius="52%"
                    outerRadius="82%"
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => name + ' ' + (percent * 100).toFixed(0) + '%'}
                    labelLine={{ stroke: '#d9d9d9', strokeWidth: 1 }}
                  >
                    {data.statusDistribution.filter(item => item.value > 0).map((entry, i) => (
                      <Cell key={'cell-' + i} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value, name) => [value.toLocaleString() + ' scholars', name]} />
                  <Legend verticalAlign="bottom" iconSize={8} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280 }}>
                <Empty description="No status data available" />
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card
            title={<Text strong style={{ fontSize: 15 }}>Scholars by Program</Text>}
            extra={<Text type="secondary" style={{ fontSize: 12 }}>{data.scholarshipPrograms.length} programs</Text>}
            style={sectionCardStyle}
            styles={{ body: { padding: '16px 20px' } }}
          >
            {data.scholarshipPrograms.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(280, data.scholarshipPrograms.length * 38)}>
                <BarChart data={data.scholarshipPrograms} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#8c8c8c', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="program"
                    tick={{ fill: '#434343', fontSize: 12 }}
                    width={130}
                    tickLine={false}
                    axisLine={false}
                  />
                  <RechartsTooltip content={<ProgramTooltip />} />
                  <Bar
                    dataKey="count"
                    shape={<RoundedBar />}
                    maxBarSize={24}
                    label={{ position: 'right', fill: '#8c8c8c', fontSize: 11, formatter: (v) => v.toLocaleString() }}
                  >
                    {data.scholarshipPrograms.map((entry, i) => (
                      <Cell key={'bar-' + i} fill={PROGRAM_COLORS[entry.program] || '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280 }}>
                <Empty description="No program data" />
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Annex Analytics: Year Level (F2) + Sex (F3) + HEI Type (F4) ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {/* Year Level Distribution - F2 */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChartOutlined style={{ color: '#3b82f6', fontSize: 16 }} />
                <Text strong style={{ fontSize: 15 }}>Beneficiaries by Year Level</Text>
              </div>
            }
            extra={<Tag color="blue" style={{ fontSize: 11, borderRadius: 4 }}>Annex F-2</Tag>}
            style={sectionCardStyle}
            styles={{ body: { padding: '16px 20px' } }}
          >
            {analytics.year_level.some(d => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analytics.year_level} margin={{ left: 0, right: 20, top: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="year" tick={{ fill: '#434343', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#8c8c8c', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <RechartsTooltip
                    formatter={(value) => [value.toLocaleString() + ' scholars', 'Count']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e8e8e8' }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={48}
                    label={{ position: 'top', fill: '#8c8c8c', fontSize: 11, formatter: (v) => v > 0 ? v.toLocaleString() : '' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280 }}>
                <Empty description="No year level data available" />
              </div>
            )}
          </Card>
        </Col>

        {/* Sex Distribution - F3 */}
        <Col xs={24} lg={7}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserOutlined style={{ color: '#8b5cf6', fontSize: 16 }} />
                <Text strong style={{ fontSize: 15 }}>By Sex</Text>
              </div>
            }
            extra={<Tag color="purple" style={{ fontSize: 11, borderRadius: 4 }}>Annex F-3</Tag>}
            style={sectionCardStyle}
            styles={{ body: { padding: '16px 20px' } }}
          >
            {analytics.sex.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={analytics.sex.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius="48%"
                    outerRadius="78%"
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => name + ' ' + (percent * 100).toFixed(0) + '%'}
                    labelLine={{ stroke: '#d9d9d9', strokeWidth: 1 }}
                  >
                    {analytics.sex.filter(d => d.value > 0).map((entry, i) => (
                      <Cell key={'sex-' + i} fill={entry.name === 'Male' ? '#3b82f6' : entry.name === 'Female' ? '#ec4899' : '#94a3b8'} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value, name) => [value.toLocaleString() + ' scholars', name]} />
                  <Legend verticalAlign="bottom" iconSize={8} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280 }}>
                <Empty description="No sex data available" />
              </div>
            )}
          </Card>
        </Col>

        {/* HEI Type Distribution - F4 */}
        <Col xs={24} lg={7}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BankOutlined style={{ color: '#0891b2', fontSize: 16 }} />
                <Text strong style={{ fontSize: 15 }}>By HEI Type</Text>
              </div>
            }
            extra={<Tag color="cyan" style={{ fontSize: 11, borderRadius: 4 }}>Annex F-4</Tag>}
            style={sectionCardStyle}
            styles={{ body: { padding: '16px 20px' } }}
          >
            {analytics.hei_type.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={analytics.hei_type.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius="48%"
                    outerRadius="78%"
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => name + ' ' + (percent * 100).toFixed(0) + '%'}
                    labelLine={{ stroke: '#d9d9d9', strokeWidth: 1 }}
                  >
                    {analytics.hei_type.filter(d => d.value > 0).map((entry, i) => {
                      const colors = { 'SUCs': '#16a34a', 'LUCs': '#f59e0b', 'Private': '#3b82f6' }
                      return <Cell key={'hei-' + i} fill={colors[entry.name] || '#94a3b8'} />
                    })}
                  </Pie>
                  <RechartsTooltip formatter={(value, name) => [value.toLocaleString() + ' scholars', name]} />
                  <Legend verticalAlign="bottom" iconSize={8} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280 }}>
                <Empty description="No HEI type data available" />
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Disbursement Trends + Disbursement by Program (side by side) ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <LineChartOutlined style={{ color: '#7c3aed', fontSize: 16 }} />
                <Text strong style={{ fontSize: 15 }}>Disbursement Trends</Text>
              </div>
            }
            extra={<Text type="secondary" style={{ fontSize: 12 }}>{analytics.disbursement_trends.length} periods</Text>}
            style={sectionCardStyle}
            styles={{ body: { padding: '16px 20px' } }}
          >
            {analytics.disbursement_trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={analytics.disbursement_trends} margin={{ left: 20, right: 30, top: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#8c8c8c', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    angle={-30}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fill: '#8c8c8c', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => {
                      if (v >= 1_000_000) return '\u20B1' + (v / 1_000_000).toFixed(1) + 'M'
                      if (v >= 1_000) return '\u20B1' + (v / 1_000).toFixed(0) + 'K'
                      return '\u20B1' + v
                    }}
                  />
                  <RechartsTooltip
                    formatter={(value, name) => {
                      if (name === 'total_amount') return ['\u20B1' + Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 }), 'Amount']
                      return [Number(value).toLocaleString(), 'Disbursements']
                    }}
                    labelFormatter={(label) => label}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e8e8e8' }}
                  />
                  <Area type="monotone" dataKey="total_amount" stroke="#7c3aed" strokeWidth={2.5} fill="url(#colorAmount)" dot={{ r: 4, fill: '#7c3aed' }} activeDot={{ r: 6 }} />
                  <Legend verticalAlign="top" formatter={(v) => v === 'total_amount' ? 'Amount Disbursed' : v} iconType="line" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320 }}>
                <Empty description="No disbursement trend data available" />
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <DollarOutlined style={{ color: '#0f766e', fontSize: 16 }} />
                <Text strong style={{ fontSize: 15 }}>Disbursement by Scholarship Program</Text>
              </div>
            }
            extra={<Text type="secondary" style={{ fontSize: 12 }}>{analytics.disbursement_by_program.length} programs</Text>}
            style={sectionCardStyle}
            styles={{ body: { padding: '16px 20px' } }}
          >
            {analytics.disbursement_by_program.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={analytics.disbursement_by_program} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: '#8c8c8c', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatCompactCurrency}
                  />
                  <YAxis
                    type="category"
                    dataKey="program"
                    tick={{ fill: '#434343', fontSize: 12 }}
                    width={150}
                    tickLine={false}
                    axisLine={false}
                  />
                  <RechartsTooltip
                    formatter={(value, name) => {
                      if (name === 'total_amount') {
                        return ['\u20B1' + Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 'Amount']
                      }

                      return [Number(value).toLocaleString(), 'Disbursements']
                    }}
                    labelFormatter={(label) => PROGRAM_FULL_NAMES[label] || label}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e8e8e8' }}
                  />
                  <Bar
                    dataKey="total_amount"
                    shape={<RoundedBar />}
                    maxBarSize={24}
                    label={{ position: 'right', fill: '#8c8c8c', fontSize: 11, formatter: (v) => formatCompactCurrency(v) }}
                  >
                    {analytics.disbursement_by_program.map((entry, i) => (
                      <Cell key={'disb-program-' + i} fill={PROGRAM_COLORS[entry.program] || '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320 }}>
                <Empty description="No program disbursement data available" />
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Data Quality Progress ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {[
          { key: 'stufaps', label: 'StuFAPs', icon: <FileTextOutlined style={{ fontSize: 18, color: '#3b82f6' }} />, color: '#3b82f6', path: '/data-quality' },
          { key: 'accounting', label: 'Accounting', icon: <AuditOutlined style={{ fontSize: 18, color: '#7c3aed' }} />, color: '#7c3aed', path: '/data-quality/accounting' },
          { key: 'cashier', label: 'Cashier', icon: <WalletOutlined style={{ fontSize: 18, color: '#0891b2' }} />, color: '#0891b2', path: '/data-quality/cashier' },
        ].map(({ key, label, icon, color, path }) => {
          const dq = data.dataQuality[key] || { total: 0, incomplete: 0, complete: 0 }
          const p = dq.total > 0 ? Math.round((dq.complete / dq.total) * 100) : 0
          return (
            <Col xs={24} md={8} key={key}>
              <Card style={{ ...sectionCardStyle, cursor: 'pointer' }} styles={{ body: { padding: '20px 24px' } }} onClick={() => navigate(path)} hoverable>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: color + '12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {icon}
                  </div>
                  <Text strong style={{ fontSize: 15 }}>{label}</Text>
                </div>
                <Progress percent={p} strokeColor={color} trailColor="#f0f0f0" format={(p) => p + '%'} />
                <Row gutter={16} style={{ marginTop: 12 }}>
                  <Col span={8}>
                    <Text style={{ color: '#8c8c8c', fontSize: 12, display: 'block' }}>Total</Text>
                    <Text strong style={{ fontSize: 16 }}>{dq.total.toLocaleString()}</Text>
                  </Col>
                  <Col span={8}>
                    <Text style={{ color: '#8c8c8c', fontSize: 12, display: 'block' }}>Complete</Text>
                    <Text strong style={{ fontSize: 16, color: '#16a34a' }}>{dq.complete.toLocaleString()}</Text>
                  </Col>
                  <Col span={8}>
                    <Text style={{ color: '#8c8c8c', fontSize: 12, display: 'block' }}>Incomplete</Text>
                    <Text strong style={{ fontSize: 16, color: '#d4380d' }}>{dq.incomplete.toLocaleString()}</Text>
                  </Col>
                </Row>
              </Card>
            </Col>
          )
        })}
      </Row>

      {/* ── Warnings Table ── */}
      {totalWarnings > 0 && (
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertOutlined style={{ color: '#d48806', fontSize: 16 }} />
              <Text strong style={{ fontSize: 15 }}>Data Quality Alerts</Text>
              <Badge count={totalWarnings} style={{ backgroundColor: '#faad14' }} />
            </div>
          }
          extra={<Button type="link" size="small" onClick={() => navigate('/data-quality')} style={{ padding: 0 }}>View All <RightOutlined style={{ fontSize: 10 }} /></Button>}
          style={{ ...sectionCardStyle, marginBottom: 16 }}
          styles={{ body: { padding: 0 } }}
        >
          <Table
            dataSource={WARNING_CONFIG.filter(w => (data.warnings[w.key]?.count || 0) > 0).map(w => ({
              key: w.key,
              issue: w.label,
              severity: w.severity,
              count: data.warnings[w.key]?.count || 0,
              path: w.path,
            }))}
            columns={[
              {
                title: 'Issue',
                dataIndex: 'issue',
                key: 'issue',
                render: (text, row) => (
                  <Button type="link" style={{ padding: 0, height: 'auto', color: '#1a1a1a', fontWeight: 500 }} onClick={() => navigate(row.path)}>
                    {text}
                  </Button>
                ),
              },
              {
                title: 'Severity',
                dataIndex: 'severity',
                key: 'severity',
                width: 100,
                render: (sev) => {
                  const t = SEVERITY_TAGS[sev]
                  return <Tag color={t.color} style={{ fontSize: 11, fontWeight: 600, borderRadius: 4 }}>{t.label}</Tag>
                },
              },
              {
                title: 'Count',
                dataIndex: 'count',
                key: 'count',
                width: 90,
                align: 'right',
                render: (c) => <Text strong>{c.toLocaleString()}</Text>,
              },
              {
                title: '',
                key: 'action',
                width: 40,
                render: (_, row) => (
                  <Button type="text" size="small" icon={<RightOutlined style={{ fontSize: 10, color: '#8c8c8c' }} />} onClick={() => navigate(row.path)} />
                ),
              },
            ]}
            pagination={false}
            size="small"
            showHeader={true}
          />
        </Card>
      )}
    </div>
  )
}
