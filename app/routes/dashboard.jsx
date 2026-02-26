import { Card, Row, Col, Typography, Table, Tag, Spin, Empty, Select, Statistic, Space, Button, Badge, Tooltip } from 'antd'
import {
  TeamOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  WarningOutlined,
  FilterOutlined,
  RightOutlined,
  ExclamationCircleOutlined,
  AlertOutlined,
  BankOutlined,
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
} from 'recharts'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE as API_URL } from '../lib/config'

const { Title, Text } = Typography

export function meta() {
  return [
    { title: 'Dashboard - StuFAPs' },
    { name: 'description', content: 'Student Financial Assistance Programs Dashboard' },
  ]
}

// Shared card styles
const kpiCardStyle = {
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

// Warning definitions ordered by severity (critical first)
const WARNING_CONFIG = [
  { key: 'duplicate_award_numbers', label: 'Duplicate Award Numbers', severity: 'critical', color: '#cf1322', bg: '#fff1f0', border: '#ffa39e' },
  { key: 'duplicate_lrn', label: 'Duplicate LRN', severity: 'critical', color: '#cf1322', bg: '#fff1f0', border: '#ffa39e' },
  { key: 'incomplete_info', label: 'Incomplete Records', severity: 'high', color: '#d4380d', bg: '#fff2e8', border: '#ffbb96' },
  { key: 'no_award_number', label: 'Missing Award Number', severity: 'medium', color: '#d48806', bg: '#fffbe6', border: '#ffe58f' },
  { key: 'no_lrn', label: 'Missing LRN', severity: 'medium', color: '#d48806', bg: '#fffbe6', border: '#ffe58f' },
  { key: 'no_uii', label: 'Missing UII (Institutions)', severity: 'low', color: '#7c7c7c', bg: '#fafafa', border: '#d9d9d9' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    semester: null,
    academic_year: null,
  })
  const [filterOptions, setFilterOptions] = useState({
    semesters: [],
    academic_years: [],
  })
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalStudents: 0,
      activeScholars: 0,
      graduated: 0,
      terminated: 0,
      others: 0,
      totalDisbursed: 0,
    },
    statusDistribution: [],
    scholarshipPrograms: [],
    institutionTypes: [],
    recentRegistrations: [],
    warnings: {
      no_uii: { count: 0 },
      no_lrn: { count: 0 },
      duplicate_lrn: { count: 0, duplicates: [], students: [] },
      no_award_number: { count: 0 },
      duplicate_award_numbers: { count: 0, students: [] },
      incomplete_info: { count: 0 },
    },
  })

  const fetchDashboardData = async (currentFilters = filters) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (currentFilters.semester) params.append('semester', currentFilters.semester)
      if (currentFilters.academic_year) params.append('academic_year', currentFilters.academic_year)

      const url = `${API_URL}/dashboard/stats${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.message || 'Unknown error occurred')
      }

      if (data.filters) {
        setFilterOptions({
          semesters: data.filters.semesters || [],
          academic_years: data.filters.academic_years || [],
        })
      }

      setDashboardData({
        stats: {
          totalStudents: data.total_students || 0,
          activeScholars: data.active_scholars || 0,
          graduated: data.graduated || 0,
          terminated: data.terminated || 0,
          others: data.others || 0,
          totalDisbursed: data.total_disbursed || 0,
        },
        statusDistribution: (data.status_distribution || []).map(item => ({
          name: item.status || 'Unknown',
          value: item.count || 0,
          color: getStatusColor(item.status),
        })),
        scholarshipPrograms: (data.scholarship_programs || []).map(item => ({
          program: item.scholarship_program || 'Unknown',
          count: parseInt(item.count) || 0,
        })),
        institutionTypes: (data.institution_types || []).map(item => ({
          type: item.institutional_type || 'Unknown',
          count: parseInt(item.count) || 0,
        })),
        recentRegistrations: data.recent_registrations || [],
        warnings: data.warnings || {
          no_uii: { count: 0 },
          no_lrn: { count: 0 },
          duplicate_lrn: { count: 0, duplicates: [], students: [] },
          no_award_number: { count: 0 },
          duplicate_award_numbers: { count: 0, students: [] },
          incomplete_info: { count: 0 },
        },
      })
    } catch (err) {
      console.error('Dashboard fetch error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    fetchDashboardData(newFilters)
  }

  const clearFilters = () => {
    const newFilters = { semester: null, academic_year: null }
    setFilters(newFilters)
    fetchDashboardData(newFilters)
  }

  function getStatusColor(status) {
    const colors = {
      'Active': '#52c41a',
      'Graduated': '#1890ff',
      'Terminated': '#ff4d4f',
      'Others': '#faad14',
      'Unknown': '#d9d9d9',
    }
    return colors[status] || colors['Others']
  }

  const getPercentage = (value) => {
    if (dashboardData.stats.totalStudents === 0) return '0.0'
    return ((value / dashboardData.stats.totalStudents) * 100).toFixed(1)
  }

  const formatCurrency = (value) => {
    if (value >= 1000000) return `₱${(value / 1000000).toFixed(2)}M`
    if (value >= 1000) return `₱${(value / 1000).toFixed(1)}K`
    return `₱${Number(value).toLocaleString()}`
  }

  const getTotalWarnings = () => {
    const w = dashboardData.warnings
    return (w.no_uii?.count || 0) +
           (w.no_lrn?.count || 0) +
           (w.duplicate_lrn?.count || 0) +
           (w.no_award_number?.count || 0) +
           (w.duplicate_award_numbers?.count || 0) +
           (w.incomplete_info?.count || 0)
  }

  const getActiveWarnings = () => {
    return WARNING_CONFIG.filter(w => (dashboardData.warnings[w.key]?.count || 0) > 0)
  }

  const formatStudentName = (record) => {
    const parts = [record.surname, record.first_name]
    if (record.middle_name) parts.push(record.middle_name.charAt(0) + '.')
    if (record.extension) parts.push(record.extension)
    return parts.join(', ')
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Recent registrations table columns
  const recentColumns = [
    {
      title: 'Name',
      key: 'name',
      ellipsis: true,
      render: (_, r) => <Text strong style={{ fontSize: 13 }}>{formatStudentName(r)}</Text>,
    },
    {
      title: 'Program',
      dataIndex: 'degree_program',
      key: 'degree_program',
      ellipsis: true,
      render: (v) => <Text style={{ fontSize: 13, color: '#595959' }}>{v || '—'}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'scholarship_status',
      key: 'status',
      width: 100,
      render: (status) => {
        const colorMap = { Active: 'green', Graduated: 'blue', Terminated: 'red' }
        return <Tag color={colorMap[status] || 'default'} style={{ margin: 0 }}>{status || 'Unknown'}</Tag>
      },
    },
    {
      title: 'Added',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (v) => <Text style={{ fontSize: 12, color: '#8c8c8c' }}>{formatDate(v)}</Text>,
    },
  ]

  if (loading && !dashboardData.stats.totalStudents) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 120px)' }}>
        <Spin size="large" />
        <Text style={{ marginLeft: 16 }}>Loading dashboard...</Text>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 120px)' }}>
        <Empty
          description={
            <div style={{ textAlign: 'center' }}>
              <Text type="danger" strong>Failed to load dashboard</Text>
              <br />
              <Text type="secondary">{error}</Text>
            </div>
          }
        />
      </div>
    )
  }

  const totalWarnings = getTotalWarnings()
  const activeWarnings = getActiveWarnings()

  return (
    <div>
      {/* ── Header with Filters ── */}
      <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #e8eaed' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>Dashboard</Title>
            <Text style={{ color: '#8c8c8c', fontSize: 14 }}>Scholarship program monitoring and operational overview</Text>
          </div>
          <Space size={10}>
            <FilterOutlined style={{ color: '#8c8c8c' }} />
            <Select
              placeholder="Academic Year"
              value={filters.academic_year}
              onChange={(v) => handleFilterChange('academic_year', v)}
              allowClear
              style={{ width: 140 }}
              size="middle"
            >
              {filterOptions.academic_years.map(ay => (
                <Select.Option key={ay} value={ay}>{ay}</Select.Option>
              ))}
            </Select>
            <Select
              placeholder="Semester"
              value={filters.semester}
              onChange={(v) => handleFilterChange('semester', v)}
              allowClear
              style={{ width: 120 }}
              size="middle"
            >
              {filterOptions.semesters.map(sem => (
                <Select.Option key={sem} value={sem}>{sem}</Select.Option>
              ))}
            </Select>
            {(filters.semester || filters.academic_year) && (
              <Button type="text" size="small" onClick={clearFilters} style={{ color: '#ff4d4f' }}>Clear</Button>
            )}
          </Space>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={8} xl={4}>
          <Card style={kpiCardStyle} styles={{ body: { padding: '16px 20px' } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <TeamOutlined style={{ fontSize: 20, color: '#3b82f6' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <Text style={{ color: '#8c8c8c', fontSize: 12, display: 'block' }}>Total Scholars</Text>
                <Text strong style={{ fontSize: 22, color: '#1a1a1a', lineHeight: 1.2 }}>{dashboardData.stats.totalStudents.toLocaleString()}</Text>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={12} md={8} xl={4}>
          <Card style={kpiCardStyle} styles={{ body: { padding: '16px 20px' } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircleOutlined style={{ fontSize: 20, color: '#16a34a' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <Text style={{ color: '#8c8c8c', fontSize: 12, display: 'block' }}>Active</Text>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <Text strong style={{ fontSize: 22, color: '#1a1a1a', lineHeight: 1.2 }}>{dashboardData.stats.activeScholars.toLocaleString()}</Text>
                  <Text style={{ fontSize: 12, color: '#16a34a' }}>{getPercentage(dashboardData.stats.activeScholars)}%</Text>
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={12} md={8} xl={4}>
          <Card style={kpiCardStyle} styles={{ body: { padding: '16px 20px' } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <TrophyOutlined style={{ fontSize: 20, color: '#2563eb' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <Text style={{ color: '#8c8c8c', fontSize: 12, display: 'block' }}>Graduated</Text>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <Text strong style={{ fontSize: 22, color: '#1a1a1a', lineHeight: 1.2 }}>{dashboardData.stats.graduated.toLocaleString()}</Text>
                  <Text style={{ fontSize: 12, color: '#2563eb' }}>{getPercentage(dashboardData.stats.graduated)}%</Text>
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={12} md={8} xl={4}>
          <Card style={kpiCardStyle} styles={{ body: { padding: '16px 20px' } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CloseCircleOutlined style={{ fontSize: 20, color: '#dc2626' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <Text style={{ color: '#8c8c8c', fontSize: 12, display: 'block' }}>Terminated</Text>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <Text strong style={{ fontSize: 22, color: '#1a1a1a', lineHeight: 1.2 }}>{dashboardData.stats.terminated.toLocaleString()}</Text>
                  <Text style={{ fontSize: 12, color: '#dc2626' }}>{getPercentage(dashboardData.stats.terminated)}%</Text>
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={12} md={8} xl={4}>
          <Card style={kpiCardStyle} styles={{ body: { padding: '16px 20px' } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ExclamationCircleOutlined style={{ fontSize: 20, color: '#d97706' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <Text style={{ color: '#8c8c8c', fontSize: 12, display: 'block' }}>Others</Text>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <Text strong style={{ fontSize: 22, color: '#1a1a1a', lineHeight: 1.2 }}>{dashboardData.stats.others.toLocaleString()}</Text>
                  <Text style={{ fontSize: 12, color: '#d97706' }}>{getPercentage(dashboardData.stats.others)}%</Text>
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} xl={4}>
          <Card style={{ ...kpiCardStyle, background: '#fafaff' }} styles={{ body: { padding: '16px 20px' } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <DollarOutlined style={{ fontSize: 20, color: '#7c3aed' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <Text style={{ color: '#8c8c8c', fontSize: 12, display: 'block' }}>Total Disbursed</Text>
                <Text strong style={{ fontSize: 20, color: '#1a1a1a', lineHeight: 1.2 }}>{formatCurrency(dashboardData.stats.totalDisbursed)}</Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* ── Data Quality Alerts ── */}
      {totalWarnings > 0 && (
        <Card
          style={{ ...sectionCardStyle, marginBottom: 20, borderColor: '#ffd666' }}
          styles={{ body: { padding: '16px 20px' } }}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertOutlined style={{ color: '#d48806', fontSize: 16 }} />
              <Text strong style={{ fontSize: 15 }}>Attention Required</Text>
              <Badge count={totalWarnings} style={{ backgroundColor: '#faad14' }} />
            </div>
          }
          extra={
            <Button type="link" size="small" onClick={() => navigate('/data-quality')} style={{ padding: 0 }}>
              View All <RightOutlined style={{ fontSize: 10 }} />
            </Button>
          }
        >
          <Row gutter={[12, 10]}>
            {activeWarnings.map((w) => {
              const count = dashboardData.warnings[w.key]?.count || 0
              return (
                <Col xs={24} sm={12} md={8} key={w.key}>
                  <div
                    onClick={() => navigate('/data-quality')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: w.bg,
                      border: `1px solid ${w.border}`,
                      cursor: 'pointer',
                      transition: 'opacity 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <WarningOutlined style={{ color: w.color, fontSize: 14, flexShrink: 0 }} />
                      <Text style={{ color: w.color, fontSize: 13, fontWeight: 500 }} ellipsis>{w.label}</Text>
                    </div>
                    <Badge
                      count={count}
                      style={{
                        backgroundColor: w.severity === 'critical' ? '#ff4d4f' : w.severity === 'high' ? '#ff7a45' : '#faad14',
                        fontSize: 11,
                        flexShrink: 0,
                      }}
                    />
                  </div>
                </Col>
              )
            })}
          </Row>
        </Card>
      )}

      {/* ── Distribution Analysis (2 columns) ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* Status Composition */}
        <Col xs={24} lg={10}>
          <Card
            title={<Text strong style={{ fontSize: 15 }}>Scholar Status Composition</Text>}
            style={sectionCardStyle}
            styles={{ body: { padding: '16px 20px' } }}
          >
            {dashboardData.statusDistribution.some(item => item.value > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={dashboardData.statusDistribution.filter(item => item.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius="52%"
                    outerRadius="82%"
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: '#d9d9d9', strokeWidth: 1 }}
                  >
                    {dashboardData.statusDistribution
                      .filter(item => item.value > 0)
                      .map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value, name) => [`${value.toLocaleString()} scholars`, name]}
                  />
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

        {/* Scholarship Programs */}
        <Col xs={24} lg={14}>
          <Card
            title={<Text strong style={{ fontSize: 15 }}>Scholars by Program</Text>}
            extra={<Text type="secondary" style={{ fontSize: 12 }}>Top {Math.min(dashboardData.scholarshipPrograms.length, 8)}</Text>}
            style={sectionCardStyle}
            styles={{ body: { padding: '16px 20px' } }}
          >
            {dashboardData.scholarshipPrograms.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dashboardData.scholarshipPrograms.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#8c8c8c', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="program" tick={{ fill: '#434343', fontSize: 12 }} width={90} tickLine={false} axisLine={false} />
                  <RechartsTooltip formatter={(value) => [`${value.toLocaleString()} scholars`, 'Count']} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={22} />
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

      {/* ── Bottom Panel: Institution Types + Recent Activity ── */}
      <Row gutter={[16, 16]}>
        {/* Institution Type Distribution */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BankOutlined style={{ color: '#8c8c8c', fontSize: 14 }} />
                <Text strong style={{ fontSize: 15 }}>By Institution Type</Text>
              </div>
            }
            style={sectionCardStyle}
            styles={{ body: { padding: '16px 20px' } }}
          >
            {dashboardData.institutionTypes.length > 0 ? (
              <div>
                {dashboardData.institutionTypes.slice(0, 6).map((item, idx) => {
                  const max = Math.max(...dashboardData.institutionTypes.map(i => i.count))
                  const pct = max > 0 ? (item.count / max) * 100 : 0
                  return (
                    <div key={idx} style={{ marginBottom: idx < dashboardData.institutionTypes.length - 1 ? 14 : 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 13, color: '#434343' }} ellipsis>{item.type}</Text>
                        <Text strong style={{ fontSize: 13, color: '#1a1a1a', flexShrink: 0, marginLeft: 8 }}>{item.count.toLocaleString()}</Text>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: '#f5f5f5', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: '#36cfc9', transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <Empty description="No institution data" style={{ padding: '40px 0' }} />
            )}
          </Card>
        </Col>

        {/* Recent Registrations */}
        <Col xs={24} lg={14}>
          <Card
            title={<Text strong style={{ fontSize: 15 }}>Recent Registrations</Text>}
            extra={
              <Button type="link" size="small" onClick={() => navigate('/students')} style={{ padding: 0 }}>
                View All <RightOutlined style={{ fontSize: 10 }} />
              </Button>
            }
            style={sectionCardStyle}
            styles={{ body: { padding: '4px 0 0' } }}
          >
            {dashboardData.recentRegistrations.length > 0 ? (
              <Table
                dataSource={dashboardData.recentRegistrations}
                columns={recentColumns}
                rowKey="student_id"
                pagination={false}
                size="small"
                style={{ cursor: 'default' }}
                onRow={(record) => ({
                  onClick: () => navigate(`/students/${record.student_id}`),
                  style: { cursor: 'pointer' },
                })}
              />
            ) : (
              <Empty description="No recent registrations" style={{ padding: '40px 0' }} />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
