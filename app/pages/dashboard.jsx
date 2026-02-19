import { Card, Row, Col, Typography, Table, Tag, Spin, Empty, Progress, Select, Statistic, Space, Button } from 'antd'
import {
  TeamOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  CalendarOutlined,
  WarningOutlined,
  FilterOutlined,
  UserOutlined,
  RightOutlined,
  ReloadOutlined,
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
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE as API_URL } from '../lib/config'

const { Title, Text } = Typography

// Clean card styles
const cardStyle = {
  borderRadius: 12,
  border: '1px solid #f0f2f5',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
  transition: 'all 0.3s ease',
}

const mainCardStyle = {
  borderRadius: 16,
  border: '1px solid #e8eaed',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  background: '#fff',
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
    <div style={{ background: '#fafbfc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '24px', borderBottom: '1px solid #e8eaed', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>Dashboard</Title>
            <Text style={{ color: '#6b7280', fontSize: 16 }}>Student Financial Assistance Overview</Text>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Space size={12}>
              <FilterOutlined style={{ color: '#6b7280' }} />
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
                <Button type="text" onClick={clearFilters} style={{ color: '#ef4444' }}>
                  Clear
                </Button>
              )}
            </Space>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div style={{ padding: '24px', background: '#fff' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8} xl={4}>
            <Card style={cardStyle} bodyStyle={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ marginBottom: 12 }}>
                <TeamOutlined style={{ fontSize: 32, color: '#3b82f6' }} />
              </div>
              <Statistic
                title={<Text style={{ color: '#6b7280', fontSize: 14 }}>Total Students</Text>}
                value={dashboardData.stats.totalStudents}
                valueStyle={{ color: '#1a1a1a', fontSize: 28, fontWeight: 600 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8} xl={4}>
            <Card style={cardStyle} bodyStyle={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ marginBottom: 12 }}>
                <CheckCircleOutlined style={{ fontSize: 32, color: '#10b981' }} />
              </div>
              <Statistic
                title={<Text style={{ color: '#6b7280', fontSize: 14 }}>Active</Text>}
                value={dashboardData.stats.activeScholars}
                valueStyle={{ color: '#1a1a1a', fontSize: 28, fontWeight: 600 }}
                suffix={<Text style={{ color: '#6b7280', fontSize: 14 }}>({getPercentage(dashboardData.stats.activeScholars)}%)</Text>}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8} xl={4}>
            <Card style={cardStyle} bodyStyle={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ marginBottom: 12 }}>
                <TrophyOutlined style={{ fontSize: 32, color: '#3b82f6' }} />
              </div>
              <Statistic
                title={<Text style={{ color: '#6b7280', fontSize: 14 }}>Graduated</Text>}
                value={dashboardData.stats.graduated}
                valueStyle={{ color: '#1a1a1a', fontSize: 28, fontWeight: 600 }}
                suffix={<Text style={{ color: '#6b7280', fontSize: 14 }}>({getPercentage(dashboardData.stats.graduated)}%)</Text>}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8} xl={4}>
            <Card style={cardStyle} bodyStyle={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ marginBottom: 12 }}>
                <CloseCircleOutlined style={{ fontSize: 32, color: '#ef4444' }} />
              </div>
              <Statistic
                title={<Text style={{ color: '#6b7280', fontSize: 14 }}>Terminated</Text>}
                value={dashboardData.stats.terminated}
                valueStyle={{ color: '#1a1a1a', fontSize: 28, fontWeight: 600 }}
                suffix={<Text style={{ color: '#6b7280', fontSize: 14 }}>({getPercentage(dashboardData.stats.terminated)}%)</Text>}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8} xl={4}>
            <Card style={cardStyle} bodyStyle={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ marginBottom: 12 }}>
                <UserOutlined style={{ fontSize: 32, color: '#f59e0b' }} />
              </div>
              <Statistic
                title={<Text style={{ color: '#6b7280', fontSize: 14 }}>Others</Text>}
                value={dashboardData.stats.others}
                valueStyle={{ color: '#1a1a1a', fontSize: 28, fontWeight: 600 }}
                suffix={<Text style={{ color: '#6b7280', fontSize: 14 }}>({getPercentage(dashboardData.stats.others)}%)</Text>}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8} xl={4}>
            <Card style={cardStyle} bodyStyle={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ marginBottom: 12 }}>
                <DollarOutlined style={{ fontSize: 32, color: '#8b5cf6' }} />
              </div>
              <Statistic
                title={<Text style={{ color: '#6b7280', fontSize: 14 }}>Total Disbursed</Text>}
                value={formatCurrency(dashboardData.stats.totalDisbursed)}
                valueStyle={{ color: '#1a1a1a', fontSize: 24, fontWeight: 600 }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* Data Quality Alert */}
      {getTotalWarnings() > 0 && (
        <div style={{ padding: '0 24px 24px' }}>
          <Card
            style={{ 
              ...cardStyle, 
              borderColor: '#f59e0b', 
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              cursor: 'pointer' 
            }}
            bodyStyle={{ padding: '16px 20px' }}
            onClick={() => navigate('/data-quality')}
            hoverable
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <WarningOutlined style={{ color: '#d97706', fontSize: 20 }} />
                <div>
                  <Text strong style={{ color: '#92400e', fontSize: 16 }}>
                    {getTotalWarnings()} Data Quality Issues Found
                  </Text>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {dashboardData.warnings.duplicate_award_numbers?.count > 0 && (
                      <Tag color="red">{dashboardData.warnings.duplicate_award_numbers.count} Duplicate Awards</Tag>
                    )}
                    {dashboardData.warnings.duplicate_lrn?.count > 0 && (
                      <Tag color="red">{dashboardData.warnings.duplicate_lrn.count} Duplicate LRN</Tag>
                    )}
                    {dashboardData.warnings.no_uii?.count > 0 && (
                      <Tag color="orange">{dashboardData.warnings.no_uii.count} Missing UII</Tag>
                    )}
                    {dashboardData.warnings.no_lrn?.count > 0 && (
                      <Tag color="orange">{dashboardData.warnings.no_lrn.count} Missing LRN</Tag>
                    )}
                    {dashboardData.warnings.incomplete_info?.count > 0 && (
                      <Tag color="volcano">{dashboardData.warnings.incomplete_info.count} Incomplete Info</Tag>
                    )}
                    {dashboardData.warnings.no_award_number?.count > 0 && (
                      <Tag color="orange">{dashboardData.warnings.no_award_number.count} Missing Award #</Tag>
                    )}
                  </div>
                </div>
              </div>
              <RightOutlined style={{ color: '#92400e' }} />
            </div>
          </Card>
        </div>
      )}

      {/* Main Content Grid - Symmetric 3 Columns */}
      <div style={{ padding: '0 24px 24px' }}>
        <Row gutter={[24, 24]}>
          {/* Left Column */}
          <Col xs={24} lg={8}>
            <Card
              title={<Text strong style={{ color: '#1a1a1a', fontSize: 16 }}>Status Distribution</Text>}
              style={mainCardStyle}
              bodyStyle={{ padding: '20px' }}
            >
              {dashboardData.statusDistribution.some(item => item.value > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dashboardData.statusDistribution.filter(item => item.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius="50%"
                      outerRadius="85%"
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {dashboardData.statusDistribution
                        .filter(item => item.value > 0)
                        .map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend verticalAlign="bottom" iconSize={8} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                  <Empty description="No data available" />
                </div>
              )}
            </Card>
          </Col>

          {/* Center Column */}
          <Col xs={24} lg={8}>
            <Card
              title={<Text strong style={{ color: '#1a1a1a', fontSize: 16 }}>Scholarship Programs</Text>}
              style={mainCardStyle}
              bodyStyle={{ padding: '20px' }}
            >
              {dashboardData.scholarshipPrograms.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dashboardData.scholarshipPrograms.slice(0, 6)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="program" tick={{ fill: '#374151', fontSize: 12 }} width={80} tickLine={false} axisLine={false} />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 6, 6, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                  <Empty description="No program data" />
                </div>
              )}
            </Card>
          </Col>

          {/* Right Column */}
          <Col xs={24} lg={8}>
            <Card
              title={<Text strong style={{ color: '#1a1a1a', fontSize: 16 }}>Degree Levels</Text>}
              style={mainCardStyle}
              bodyStyle={{ padding: '20px' }}
            >
              {dashboardData.degreeLevels.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dashboardData.degreeLevels}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="level" tick={{ fill: '#374151', fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} axisLine={false} />
                    <RechartsTooltip />
                    <Bar dataKey="students" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                  <Empty description="No degree data" />
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </div>

      {/* Bottom Section - Progress Overview */}
      <div style={{ padding: '0 24px 24px' }}>
        <Card
          title={<Text strong style={{ color: '#1a1a1a', fontSize: 16 }}>Progress Overview</Text>}
          style={mainCardStyle}
          bodyStyle={{ padding: '24px' }}
        >
          <Row gutter={[32, 24]}>
            <Col xs={24} sm={12} lg={6}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#6b7280' }}>Active Students</Text>
                  <Text strong style={{ color: '#10b981' }}>
                    {dashboardData.stats.activeScholars} ({getPercentage(dashboardData.stats.activeScholars)}%)
                  </Text>
                </div>
                <Progress 
                  percent={parseFloat(getPercentage(dashboardData.stats.activeScholars))} 
                  showInfo={false}
                  strokeColor="#10b981"
                  trailColor="#f3f4f6"
                  strokeWidth={8}
                />
              </div>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#6b7280' }}>Graduated</Text>
                  <Text strong style={{ color: '#3b82f6' }}>
                    {dashboardData.stats.graduated} ({getPercentage(dashboardData.stats.graduated)}%)
                  </Text>
                </div>
                <Progress 
                  percent={parseFloat(getPercentage(dashboardData.stats.graduated))} 
                  showInfo={false}
                  strokeColor="#3b82f6"
                  trailColor="#f3f4f6"
                  strokeWidth={8}
                />
              </div>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#6b7280' }}>Terminated</Text>
                  <Text strong style={{ color: '#ef4444' }}>
                    {dashboardData.stats.terminated} ({getPercentage(dashboardData.stats.terminated)}%)
                  </Text>
                </div>
                <Progress 
                  percent={parseFloat(getPercentage(dashboardData.stats.terminated))} 
                  showInfo={false}
                  strokeColor="#ef4444"
                  trailColor="#f3f4f6"
                  strokeWidth={8}
                />
              </div>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#6b7280' }}>Others</Text>
                  <Text strong style={{ color: '#f59e0b' }}>
                    {dashboardData.stats.others} ({getPercentage(dashboardData.stats.others)}%)
                  </Text>
                </div>
                <Progress 
                  percent={parseFloat(getPercentage(dashboardData.stats.others))} 
                  showInfo={false}
                  strokeColor="#f59e0b"
                  trailColor="#f3f4f6"
                  strokeWidth={8}
                />
              </div>
            </Col>
          </Row>
        </Card>
      </div>
    </div>
  )
}
