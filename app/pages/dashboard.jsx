import { Card, Row, Col, Typography, Table, Tag, Spin, Empty, Progress, Select, Alert, Collapse } from 'antd'
import {
  TeamOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  CalendarOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  FilterOutlined,
  BankOutlined,
  BookOutlined,
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

const { Title, Text } = Typography
const { Panel } = Collapse

// API Base URL
const API_URL = 'http://localhost:8000/api'

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
    degreeLevels: [],
    scholarshipPrograms: [],
    institutionTypes: [],
    recentRegistrations: [],
    warnings: {
      no_uii: { count: 0, students: [] },
      duplicate_award_numbers: { count: 0, duplicates: [], students: [] },
      no_authority: { count: 0, students: [] },
      incomplete_info: { count: 0, students: [] },
    },
  })

  // Fetch dashboard data from Laravel API
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

      // Set filter options (only on first load)
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
        degreeLevels: (data.degree_levels || []).map(item => ({
          level: item.level || 'Unknown',
          students: parseInt(item.students) || 0,
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
          no_uii: { count: 0, students: [] },
          duplicate_award_numbers: { count: 0, duplicates: [], students: [] },
          no_authority: { count: 0, students: [] },
          incomplete_info: { count: 0, students: [] },
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

  // Get color for status
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

  // Calculate percentages for quick stats
  const getPercentage = (value) => {
    if (dashboardData.stats.totalStudents === 0) return 0
    return ((value / dashboardData.stats.totalStudents) * 100).toFixed(1)
  }

  // Format currency
  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
    return value.toLocaleString()
  }

  // Get total warnings count
  const getTotalWarnings = () => {
    const w = dashboardData.warnings
    return (w.no_uii?.count || 0) + 
           (w.duplicate_award_numbers?.count || 0) + 
           (w.no_authority?.count || 0) + 
           (w.incomplete_info?.count || 0)
  }

  // Stats Cards Configuration
  const statsConfig = [
    {
      title: 'Total Students',
      value: dashboardData.stats.totalStudents,
      icon: <TeamOutlined />,
      color: '#0032a0',
      bgColor: '#e6edfa',
    },
    {
      title: 'Active',
      value: dashboardData.stats.activeScholars,
      icon: <CheckCircleOutlined />,
      color: '#52c41a',
      bgColor: '#f6ffed',
      percentage: getPercentage(dashboardData.stats.activeScholars),
    },
    {
      title: 'Graduated',
      value: dashboardData.stats.graduated,
      icon: <TrophyOutlined />,
      color: '#1890ff',
      bgColor: '#e6f7ff',
      percentage: getPercentage(dashboardData.stats.graduated),
    },
    {
      title: 'Terminated',
      value: dashboardData.stats.terminated,
      icon: <CloseCircleOutlined />,
      color: '#ff4d4f',
      bgColor: '#fff2f0',
      percentage: getPercentage(dashboardData.stats.terminated),
    },
    {
      title: 'Total Disbursed',
      value: dashboardData.stats.totalDisbursed,
      icon: <DollarOutlined />,
      color: '#722ed1',
      bgColor: '#f9f0ff',
      prefix: '₱',
      formatter: formatCurrency,
    },
  ]

  // Warning columns for tables
  const warningColumns = {
    noUii: [
      {
        title: 'Name',
        key: 'name',
        render: (_, r) => `${r.surname || ''}, ${r.first_name || ''}`.trim() || 'N/A',
      },
      { title: 'Award No.', dataIndex: 'award_number', key: 'award_number', ellipsis: true },
      { title: 'Institution', dataIndex: 'name_of_institution', key: 'institution', ellipsis: true },
      {
        title: 'Action',
        key: 'action',
        width: 80,
        render: (_, r) => (
          <a onClick={() => navigate(`/students/${r.seq}`)} style={{ color: '#0032a0' }}>View</a>
        ),
      },
    ],
    duplicateAward: [
      { title: 'Award No.', dataIndex: 'award_number', key: 'award_number' },
      {
        title: 'Name',
        key: 'name',
        render: (_, r) => `${r.surname || ''}, ${r.first_name || ''}`.trim() || 'N/A',
      },
      { title: 'Program', dataIndex: 'scholarship_program', key: 'program', ellipsis: true },
      {
        title: 'Action',
        key: 'action',
        width: 80,
        render: (_, r) => (
          <a onClick={() => navigate(`/students/${r.seq}`)} style={{ color: '#0032a0' }}>View</a>
        ),
      },
    ],
    noAuthority: [
      {
        title: 'Name',
        key: 'name',
        render: (_, r) => `${r.surname || ''}, ${r.first_name || ''}`.trim() || 'N/A',
      },
      { title: 'UII', dataIndex: 'uii', key: 'uii', width: 80 },
      { title: 'Degree Program', dataIndex: 'degree_program', key: 'program', ellipsis: true },
      {
        title: 'Action',
        key: 'action',
        width: 80,
        render: (_, r) => (
          <a onClick={() => navigate(`/students/${r.seq}`)} style={{ color: '#0032a0' }}>View</a>
        ),
      },
    ],
  }

  if (loading && !dashboardData.stats.totalStudents) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 120px)' }}>
        <Spin size="large" />
        <Text style={{ marginLeft: '16px' }}>Loading dashboard data...</Text>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 120px)' }}>
        <Empty 
          description={
            <div style={{ textAlign: 'center' }}>
              <Text type="danger" strong>Failed to load dashboard data</Text>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>{error}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Make sure Laravel server is running on localhost:8000
              </Text>
            </div>
          }
        />
      </div>
    )
  }

  return (
    <div style={{ padding: '16px', minHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header with Filters */}
      <div style={{ marginBottom: '16px' }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Title level={3} style={{ margin: 0, color: '#0032a0' }}>Dashboard</Title>
            <Text type="secondary" style={{ fontSize: '13px' }}>
              Student Financial Assistance Program
            </Text>
          </Col>
          
          <Col>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* Filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f5f5f5', padding: '8px 12px', borderRadius: '8px' }}>
                <FilterOutlined style={{ color: '#8c8c8c' }} />
                <Select
                  placeholder="Academic Year"
                  value={filters.academic_year}
                  onChange={(v) => handleFilterChange('academic_year', v)}
                  allowClear
                  style={{ width: 130 }}
                  size="small"
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
                  style={{ width: 110 }}
                  size="small"
                >
                  {filterOptions.semesters.map(sem => (
                    <Select.Option key={sem} value={sem}>{sem}</Select.Option>
                  ))}
                </Select>
                {(filters.semester || filters.academic_year) && (
                  <a onClick={clearFilters} style={{ fontSize: '12px', color: '#ff4d4f' }}>Clear</a>
                )}
              </div>
              
              {/* Date */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8c8c8c' }}>
                <CalendarOutlined />
                <Text type="secondary" style={{ fontSize: '13px' }}>
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </Text>
              </div>
            </div>
          </Col>
        </Row>
      </div>

      {/* Data Quality Warnings */}
      {getTotalWarnings() > 0 && (
        <Collapse 
          ghost 
          style={{ marginBottom: '16px', background: '#fffbe6', borderRadius: '8px', border: '1px solid #ffe58f' }}
        >
          <Panel
            header={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <WarningOutlined style={{ color: '#faad14' }} />
                <Text strong style={{ color: '#d48806' }}>
                  Data Quality Warnings ({getTotalWarnings()} issues found)
                </Text>
              </div>
            }
            key="warnings"
          >
            <Row gutter={[16, 16]}>
              {/* No UII Warning */}
              {dashboardData.warnings.no_uii?.count > 0 && (
                <Col xs={24} md={12}>
                  <Card 
                    size="small" 
                    title={
                      <span style={{ color: '#ff4d4f' }}>
                        <ExclamationCircleOutlined /> Missing UII ({dashboardData.warnings.no_uii.count})
                      </span>
                    }
                    style={{ borderColor: '#ffccc7' }}
                  >
                    <Table
                      dataSource={dashboardData.warnings.no_uii.students.slice(0, 5)}
                      columns={warningColumns.noUii}
                      size="small"
                      pagination={false}
                      rowKey="seq"
                    />
                    {dashboardData.warnings.no_uii.count > 5 && (
                      <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: '8px' }}>
                        And {dashboardData.warnings.no_uii.count - 5} more...
                      </Text>
                    )}
                  </Card>
                </Col>
              )}

              {/* Duplicate Award Numbers */}
              {dashboardData.warnings.duplicate_award_numbers?.count > 0 && (
                <Col xs={24} md={12}>
                  <Card 
                    size="small" 
                    title={
                      <span style={{ color: '#fa8c16' }}>
                        <ExclamationCircleOutlined /> Duplicate Award Numbers ({dashboardData.warnings.duplicate_award_numbers.count})
                      </span>
                    }
                    style={{ borderColor: '#ffd591' }}
                  >
                    <Table
                      dataSource={dashboardData.warnings.duplicate_award_numbers.students.slice(0, 6)}
                      columns={warningColumns.duplicateAward}
                      size="small"
                      pagination={false}
                      rowKey="seq"
                    />
                    {dashboardData.warnings.duplicate_award_numbers.students.length > 6 && (
                      <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: '8px' }}>
                        And more duplicates...
                      </Text>
                    )}
                  </Card>
                </Col>
              )}

              {/* No Authority Info */}
              {dashboardData.warnings.no_authority?.count > 0 && (
                <Col xs={24} md={12}>
                  <Card 
                    size="small" 
                    title={
                      <span style={{ color: '#1890ff' }}>
                        <InfoCircleOutlined /> Missing Authority Info ({dashboardData.warnings.no_authority.count})
                      </span>
                    }
                    style={{ borderColor: '#91d5ff' }}
                  >
                    <Table
                      dataSource={dashboardData.warnings.no_authority.students.slice(0, 5)}
                      columns={warningColumns.noAuthority}
                      size="small"
                      pagination={false}
                      rowKey="seq"
                    />
                    {dashboardData.warnings.no_authority.count > 5 && (
                      <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: '8px' }}>
                        And {dashboardData.warnings.no_authority.count - 5} more...
                      </Text>
                    )}
                  </Card>
                </Col>
              )}

              {/* Incomplete Info */}
              {dashboardData.warnings.incomplete_info?.count > 0 && (
                <Col xs={24} md={12}>
                  <Alert
                    type="info"
                    showIcon
                    message={`${dashboardData.warnings.incomplete_info.count} students have incomplete personal information`}
                    description="Missing surname, first name, date of birth, or contact number"
                  />
                </Col>
              )}
            </Row>
          </Panel>
        </Collapse>
      )}

      {/* Stats Cards Row */}
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
                  <Text style={{ fontSize: 11, color: '#8c8c8c' }}>{stat.percentage}% of total</Text>
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

      {/* Main Content Row */}
      <Row gutter={[12, 12]} style={{ flex: 1, minHeight: 0 }}>
        {/* Left Column - Charts */}
        <Col xs={24} lg={16}>
          <Row gutter={[12, 12]}>
            {/* Scholarship Status Pie Chart */}
            <Col xs={24} md={12}>
              <Card
                title={<Text strong style={{ fontSize: '14px' }}>Scholarship Status</Text>}
                style={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                }}
                headStyle={{ padding: '12px 16px', minHeight: 'auto' }}
                bodyStyle={{ padding: 16 }}
              >
                {dashboardData.statusDistribution.some(item => item.value > 0) ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={dashboardData.statusDistribution.filter(item => item.value > 0)}
                        cx="50%"
                        cy="45%"
                        innerRadius="45%"
                        outerRadius="75%"
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {dashboardData.statusDistribution
                          .filter(item => item.value > 0)
                          .map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                      </Pie>
                      <RechartsTooltip formatter={(value, name) => [value, name]} />
                      <Legend 
                        verticalAlign="bottom"
                        wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                        iconSize={10}
                        iconType="circle"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220 }}>
                    <Empty description="No data available" />
                  </div>
                )}
              </Card>
            </Col>

            {/* Students by Scholarship Program */}
            <Col xs={24} md={12}>
              <Card
                title={<Text strong style={{ fontSize: '14px' }}>By Scholarship Program</Text>}
                style={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                }}
                headStyle={{ padding: '12px 16px', minHeight: 'auto' }}
                bodyStyle={{ padding: 16 }}
              >
                {dashboardData.scholarshipPrograms.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={dashboardData.scholarshipPrograms} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#8c8c8c', fontSize: 11 }} />
                      <YAxis 
                        type="category" 
                        dataKey="program" 
                        tick={{ fill: '#8c8c8c', fontSize: 10 }} 
                        width={80}
                        tickLine={false}
                      />
                      <RechartsTooltip />
                      <Bar dataKey="count" fill="#0032a0" radius={[0, 4, 4, 0]} maxBarSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220 }}>
                    <Empty description="No data available" />
                  </div>
                )}
              </Card>
            </Col>

            {/* Students by Degree Level */}
            <Col xs={24} md={12}>
              <Card
                title={<Text strong style={{ fontSize: '14px' }}><BookOutlined /> By Degree Level</Text>}
                style={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                }}
                headStyle={{ padding: '12px 16px', minHeight: 'auto' }}
                bodyStyle={{ padding: 16 }}
              >
                {dashboardData.degreeLevels.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={dashboardData.degreeLevels}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis 
                        dataKey="level" 
                        tick={{ fill: '#8c8c8c', fontSize: 10 }} 
                        tickLine={false}
                        axisLine={{ stroke: '#f0f0f0' }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis tick={{ fill: '#8c8c8c', fontSize: 11 }} tickLine={false} axisLine={false} />
                      <RechartsTooltip />
                      <Bar dataKey="students" fill="#52c41a" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220 }}>
                    <Empty description="No data available" />
                  </div>
                )}
              </Card>
            </Col>

            {/* Students by Institution Type */}
            <Col xs={24} md={12}>
              <Card
                title={<Text strong style={{ fontSize: '14px' }}><BankOutlined /> By Institution Type</Text>}
                style={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                }}
                headStyle={{ padding: '12px 16px', minHeight: 'auto' }}
                bodyStyle={{ padding: 16 }}
              >
                {dashboardData.institutionTypes.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={dashboardData.institutionTypes}
                        cx="50%"
                        cy="45%"
                        outerRadius="70%"
                        dataKey="count"
                        nameKey="type"
                        label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {dashboardData.institutionTypes.map((entry, index) => {
                          const colors = ['#0032a0', '#52c41a', '#faad14', '#722ed1', '#eb2f96']
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        })}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220 }}>
                    <Empty description="No data available" />
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </Col>

        {/* Right Column - Recent & Overview */}
        <Col xs={24} lg={8}>
          {/* Recent Registrations */}
          <Card
            title={<Text strong style={{ fontSize: '14px' }}>Recent Registrations</Text>}
            extra={
              <a onClick={() => navigate('/students')} style={{ color: '#0032a0', fontSize: '12px', fontWeight: 500 }}>
                View All →
              </a>
            }
            style={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              marginBottom: 12,
            }}
            headStyle={{ padding: '12px 16px', minHeight: 'auto' }}
            bodyStyle={{ padding: 0 }}
          >
            <Table
              columns={[
                {
                  title: 'Name',
                  key: 'name',
                  render: (_, record) => {
                    const fullName = [record.first_name, record.surname].filter(Boolean).join(' ')
                    return <Text strong style={{ fontSize: '12px' }}>{fullName || 'N/A'}</Text>
                  },
                },
                {
                  title: 'Status',
                  dataIndex: 'scholarship_status',
                  key: 'status',
                  width: 80,
                  render: (status) => {
                    const colorMap = { 'Active': 'green', 'Graduated': 'blue', 'Terminated': 'red' }
                    return <Tag color={colorMap[status] || 'default'} style={{ fontSize: '10px' }}>{status || 'N/A'}</Tag>
                  },
                },
              ]}
              dataSource={dashboardData.recentRegistrations}
              pagination={false}
              size="small"
              rowKey="student_id"
              locale={{ emptyText: 'No recent registrations' }}
              onRow={(record) => ({
                onClick: () => navigate(`/students/${record.student_id}`),
                style: { cursor: 'pointer' }
              })}
            />
          </Card>

          {/* Status Overview */}
          <Card
            title={<Text strong style={{ fontSize: '14px' }}>Status Overview</Text>}
            style={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            }}
            headStyle={{ padding: '12px 16px', minHeight: 'auto' }}
            bodyStyle={{ padding: 16 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <Text style={{ fontSize: '12px' }}>Active</Text>
                  <Text strong style={{ fontSize: '12px', color: '#52c41a' }}>
                    {dashboardData.stats.activeScholars} ({getPercentage(dashboardData.stats.activeScholars)}%)
                  </Text>
                </div>
                <Progress 
                  percent={parseFloat(getPercentage(dashboardData.stats.activeScholars))} 
                  showInfo={false}
                  strokeColor="#52c41a"
                  size="small"
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <Text style={{ fontSize: '12px' }}>Graduated</Text>
                  <Text strong style={{ fontSize: '12px', color: '#1890ff' }}>
                    {dashboardData.stats.graduated} ({getPercentage(dashboardData.stats.graduated)}%)
                  </Text>
                </div>
                <Progress 
                  percent={parseFloat(getPercentage(dashboardData.stats.graduated))} 
                  showInfo={false}
                  strokeColor="#1890ff"
                  size="small"
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <Text style={{ fontSize: '12px' }}>Terminated</Text>
                  <Text strong style={{ fontSize: '12px', color: '#ff4d4f' }}>
                    {dashboardData.stats.terminated} ({getPercentage(dashboardData.stats.terminated)}%)
                  </Text>
                </div>
                <Progress 
                  percent={parseFloat(getPercentage(dashboardData.stats.terminated))} 
                  showInfo={false}
                  strokeColor="#ff4d4f"
                  size="small"
                />
              </div>
              {dashboardData.stats.others > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <Text style={{ fontSize: '12px' }}>Others</Text>
                    <Text strong style={{ fontSize: '12px', color: '#faad14' }}>
                      {dashboardData.stats.others} ({getPercentage(dashboardData.stats.others)}%)
                    </Text>
                  </div>
                  <Progress 
                    percent={parseFloat(getPercentage(dashboardData.stats.others))} 
                    showInfo={false}
                    strokeColor="#faad14"
                    size="small"
                  />
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}