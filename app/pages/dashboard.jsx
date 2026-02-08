import { Card, Row, Col, Typography, Table, Tag, Spin, Empty, Progress, Select, Statistic, Divider } from 'antd'
import {
  TeamOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  CalendarOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  FilterOutlined,
  UserOutlined,
  RightOutlined,
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

const API_URL = 'http://localhost:8000/api'

// Consistent card style
const cardStyle = {
  borderRadius: 8,
  border: '1px solid #f0f0f0',
  boxShadow: 'none',
}

const cardHeadStyle = {
  padding: '12px 16px',
  minHeight: 'auto',
  borderBottom: '1px solid #f0f0f0',
}

const cardBodyStyle = {
  padding: 16,
}

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
      no_lrn: { count: 0, students: [] },
      duplicate_lrn: { count: 0, duplicates: [], students: [] },
      no_award_number: { count: 0, students: [] },
      duplicate_award_numbers: { count: 0, students: [] },
      incomplete_info: { count: 0, students: [] },
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
          no_lrn: { count: 0, students: [] },
          duplicate_lrn: { count: 0, duplicates: [], students: [] },
          no_award_number: { count: 0, students: [] },
          duplicate_award_numbers: { count: 0, students: [] },
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
    if (dashboardData.stats.totalStudents === 0) return 0
    return ((value / dashboardData.stats.totalStudents) * 100).toFixed(1)
  }

  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `₱${(value / 1000000).toFixed(2)}M`
    } else if (value >= 1000) {
      return `₱${(value / 1000).toFixed(1)}K`
    }
    return `₱${value.toLocaleString()}`
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

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#0032a0' }}>Dashboard</Title>
          <Text type="secondary">Student Financial Assistance Program Overview</Text>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FilterOutlined style={{ color: '#8c8c8c' }} />
          <Select
            placeholder="Academic Year"
            value={filters.academic_year}
            onChange={(v) => handleFilterChange('academic_year', v)}
            allowClear
            style={{ width: 140 }}
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
          >
            {filterOptions.semesters.map(sem => (
              <Select.Option key={sem} value={sem}>{sem}</Select.Option>
            ))}
          </Select>
          {(filters.semester || filters.academic_year) && (
            <a onClick={clearFilters} style={{ color: '#ff4d4f' }}>Clear</a>
          )}
          <Divider type="vertical" />
          <CalendarOutlined style={{ color: '#8c8c8c' }} />
          <Text type="secondary">
            {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
          </Text>
        </div>
      </div>

      {/* Statistics Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={4}>
          <Card style={cardStyle} bodyStyle={{ padding: 16, textAlign: 'center' }}>
            <Statistic
              title={<Text type="secondary">Total Students</Text>}
              value={dashboardData.stats.totalStudents}
              prefix={<TeamOutlined style={{ color: '#0032a0' }} />}
              valueStyle={{ color: '#0032a0', fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card style={cardStyle} bodyStyle={{ padding: 16, textAlign: 'center' }}>
            <Statistic
              title={<Text type="secondary">Active</Text>}
              value={dashboardData.stats.activeScholars}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a', fontSize: 24 }}
              suffix={<Text type="secondary" style={{ fontSize: 12 }}>({getPercentage(dashboardData.stats.activeScholars)}%)</Text>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card style={cardStyle} bodyStyle={{ padding: 16, textAlign: 'center' }}>
            <Statistic
              title={<Text type="secondary">Graduated</Text>}
              value={dashboardData.stats.graduated}
              prefix={<TrophyOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff', fontSize: 24 }}
              suffix={<Text type="secondary" style={{ fontSize: 12 }}>({getPercentage(dashboardData.stats.graduated)}%)</Text>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card style={cardStyle} bodyStyle={{ padding: 16, textAlign: 'center' }}>
            <Statistic
              title={<Text type="secondary">Terminated</Text>}
              value={dashboardData.stats.terminated}
              prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f', fontSize: 24 }}
              suffix={<Text type="secondary" style={{ fontSize: 12 }}>({getPercentage(dashboardData.stats.terminated)}%)</Text>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card style={cardStyle} bodyStyle={{ padding: 16, textAlign: 'center' }}>
            <Statistic
              title={<Text type="secondary">Others</Text>}
              value={dashboardData.stats.others}
              prefix={<UserOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14', fontSize: 24 }}
              suffix={<Text type="secondary" style={{ fontSize: 12 }}>({getPercentage(dashboardData.stats.others)}%)</Text>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card style={cardStyle} bodyStyle={{ padding: 16, textAlign: 'center' }}>
            <Statistic
              title={<Text type="secondary">Total Disbursed</Text>}
              value={formatCurrency(dashboardData.stats.totalDisbursed)}
              prefix={<DollarOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1', fontSize: 20 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Data Quality Summary */}
      {getTotalWarnings() > 0 && (
        <Card
          style={{ ...cardStyle, marginBottom: 24, borderColor: '#ffe58f', cursor: 'pointer' }}
          bodyStyle={{ padding: '12px 16px' }}
          onClick={() => navigate('/data-quality')}
          hoverable
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <WarningOutlined style={{ color: '#faad14', fontSize: 18 }} />
              <Text strong style={{ color: '#d48806', fontSize: 14 }}>
                {getTotalWarnings()} Data Quality Issues
              </Text>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {dashboardData.warnings.duplicate_award_numbers?.count > 0 && (
                  <Tag color="red">{dashboardData.warnings.duplicate_award_numbers.count} Dup. Award #</Tag>
                )}
                {dashboardData.warnings.duplicate_lrn?.count > 0 && (
                  <Tag color="red">{dashboardData.warnings.duplicate_lrn.count} Dup. LRN</Tag>
                )}
                {dashboardData.warnings.no_uii?.count > 0 && (
                  <Tag color="orange">{dashboardData.warnings.no_uii.count} Missing UII</Tag>
                )}
                {dashboardData.warnings.no_lrn?.count > 0 && (
                  <Tag color="orange">{dashboardData.warnings.no_lrn.count} Missing LRN</Tag>
                )}
                {dashboardData.warnings.no_award_number?.count > 0 && (
                  <Tag>{dashboardData.warnings.no_award_number.count} Missing Award #</Tag>
                )}
                {dashboardData.warnings.incomplete_info?.count > 0 && (
                  <Tag color="orange">{dashboardData.warnings.incomplete_info.count} Incomplete</Tag>
                )}
              </div>
            </div>
            <RightOutlined style={{ color: '#8c8c8c' }} />
          </div>
        </Card>
      )}

      {/* Charts Grid - 2x2 Symmetric Layout */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Status Distribution */}
        <Col xs={24} md={12}>
          <Card
            title={<Text strong>Scholarship Status Distribution</Text>}
            style={cardStyle}
            headStyle={cardHeadStyle}
            bodyStyle={cardBodyStyle}
          >
            {dashboardData.statusDistribution.some(item => item.value > 0) ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={dashboardData.statusDistribution.filter(item => item.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius="40%"
                    outerRadius="70%"
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {dashboardData.statusDistribution
                      .filter(item => item.value > 0)
                      .map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                  </Pie>
                  <RechartsTooltip formatter={(value, name) => [value, name]} />
                  <Legend verticalAlign="bottom" iconSize={10} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
                <Empty description="No data" />
              </div>
            )}
          </Card>
        </Col>

        {/* Scholarship Programs */}
        <Col xs={24} md={12}>
          <Card
            title={<Text strong>By Scholarship Program</Text>}
            style={cardStyle}
            headStyle={cardHeadStyle}
            bodyStyle={cardBodyStyle}
          >
            {dashboardData.scholarshipPrograms.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dashboardData.scholarshipPrograms.slice(0, 6)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#8c8c8c', fontSize: 11 }} />
                  <YAxis 
                    type="category" 
                    dataKey="program" 
                    tick={{ fill: '#595959', fontSize: 11 }} 
                    width={100}
                    tickLine={false}
                  />
                  <RechartsTooltip />
                  <Bar dataKey="count" fill="#0032a0" radius={[0, 4, 4, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
                <Empty description="No data" />
              </div>
            )}
          </Card>
        </Col>

        {/* Degree Levels */}
        <Col xs={24} md={12}>
          <Card
            title={<Text strong>By Degree Level</Text>}
            style={cardStyle}
            headStyle={cardHeadStyle}
            bodyStyle={cardBodyStyle}
          >
            {dashboardData.degreeLevels.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dashboardData.degreeLevels}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis 
                    dataKey="level" 
                    tick={{ fill: '#595959', fontSize: 11 }} 
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis tick={{ fill: '#8c8c8c', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <RechartsTooltip />
                  <Bar dataKey="students" fill="#52c41a" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
                <Empty description="No data" />
              </div>
            )}
          </Card>
        </Col>

        {/* Institution Types */}
        <Col xs={24} md={12}>
          <Card
            title={<Text strong>By Institution Type</Text>}
            style={cardStyle}
            headStyle={cardHeadStyle}
            bodyStyle={cardBodyStyle}
          >
            {dashboardData.institutionTypes.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={dashboardData.institutionTypes}
                    cx="50%"
                    cy="50%"
                    outerRadius="65%"
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
                <Empty description="No data" />
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Bottom Row - Recent & Progress */}
      <Row gutter={[16, 16]}>
        {/* Recent Registrations */}
        <Col xs={24} md={12}>
          <Card
            title={<Text strong>Recent Registrations</Text>}
            extra={
              <a onClick={() => navigate('/students')} style={{ color: '#0032a0' }}>
                View All →
              </a>
            }
            style={cardStyle}
            headStyle={cardHeadStyle}
            bodyStyle={{ padding: 0 }}
          >
            <Table
              columns={[
                {
                  title: 'Name',
                  key: 'name',
                  render: (_, record) => {
                    const fullName = [record.first_name, record.surname].filter(Boolean).join(' ')
                    return <Text style={{ fontSize: 13 }}>{fullName || 'N/A'}</Text>
                  },
                },
                {
                  title: 'Program',
                  dataIndex: 'degree_program',
                  key: 'program',
                  ellipsis: true,
                  render: (text) => <Text type="secondary" style={{ fontSize: 12 }}>{text || 'N/A'}</Text>
                },
                {
                  title: 'Status',
                  dataIndex: 'scholarship_status',
                  key: 'status',
                  width: 90,
                  render: (status) => {
                    const colorMap = { 'Active': 'green', 'Graduated': 'blue', 'Terminated': 'red' }
                    return <Tag color={colorMap[status] || 'default'}>{status || 'N/A'}</Tag>
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
        </Col>

        {/* Status Progress */}
        <Col xs={24} md={12}>
          <Card
            title={<Text strong>Status Overview</Text>}
            style={cardStyle}
            headStyle={cardHeadStyle}
            bodyStyle={cardBodyStyle}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text>Active</Text>
                  <Text strong style={{ color: '#52c41a' }}>
                    {dashboardData.stats.activeScholars} ({getPercentage(dashboardData.stats.activeScholars)}%)
                  </Text>
                </div>
                <Progress 
                  percent={parseFloat(getPercentage(dashboardData.stats.activeScholars))} 
                  showInfo={false}
                  strokeColor="#52c41a"
                  trailColor="#f0f0f0"
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text>Graduated</Text>
                  <Text strong style={{ color: '#1890ff' }}>
                    {dashboardData.stats.graduated} ({getPercentage(dashboardData.stats.graduated)}%)
                  </Text>
                </div>
                <Progress 
                  percent={parseFloat(getPercentage(dashboardData.stats.graduated))} 
                  showInfo={false}
                  strokeColor="#1890ff"
                  trailColor="#f0f0f0"
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text>Terminated</Text>
                  <Text strong style={{ color: '#ff4d4f' }}>
                    {dashboardData.stats.terminated} ({getPercentage(dashboardData.stats.terminated)}%)
                  </Text>
                </div>
                <Progress 
                  percent={parseFloat(getPercentage(dashboardData.stats.terminated))} 
                  showInfo={false}
                  strokeColor="#ff4d4f"
                  trailColor="#f0f0f0"
                />
              </div>
              {dashboardData.stats.others > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text>Others</Text>
                    <Text strong style={{ color: '#faad14' }}>
                      {dashboardData.stats.others} ({getPercentage(dashboardData.stats.others)}%)
                    </Text>
                  </div>
                  <Progress 
                    percent={parseFloat(getPercentage(dashboardData.stats.others))} 
                    showInfo={false}
                    strokeColor="#faad14"
                    trailColor="#f0f0f0"
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
