import { Card, Row, Col, Typography, Table, Tag, Spin, Empty, Progress, Select, Statistic, Divider, Pagination } from 'antd'
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
  UserOutlined,
  LoadingOutlined,
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

  // Paginated warning data states
  const [noUiiData, setNoUiiData] = useState({ students: [], total: 0, page: 1, loading: false })
  const [noLrnData, setNoLrnData] = useState({ students: [], total: 0, page: 1, loading: false })
  const [noAwardNumberData, setNoAwardNumberData] = useState({ students: [], total: 0, page: 1, loading: false })
  const [incompleteInfoData, setIncompleteInfoData] = useState({ students: [], total: 0, page: 1, loading: false })

  // Fetch paginated warning data
  const fetchNoUiiStudents = async (page = 1) => {
    setNoUiiData(prev => ({ ...prev, loading: true }))
    try {
      const response = await fetch(`${API_URL}/dashboard/warnings/no-uii?page=${page}&per_page=5`)
      const data = await response.json()
      setNoUiiData({ students: data.students || [], total: data.total || 0, page: data.page || 1, loading: false })
    } catch (err) {
      console.error('Failed to fetch no UII students:', err)
      setNoUiiData(prev => ({ ...prev, loading: false }))
    }
  }

  const fetchNoLrnStudents = async (page = 1) => {
    setNoLrnData(prev => ({ ...prev, loading: true }))
    try {
      const response = await fetch(`${API_URL}/dashboard/warnings/no-lrn?page=${page}&per_page=5`)
      const data = await response.json()
      setNoLrnData({ students: data.students || [], total: data.total || 0, page: data.page || 1, loading: false })
    } catch (err) {
      console.error('Failed to fetch no LRN students:', err)
      setNoLrnData(prev => ({ ...prev, loading: false }))
    }
  }

  const fetchNoAwardNumberStudents = async (page = 1) => {
    setNoAwardNumberData(prev => ({ ...prev, loading: true }))
    try {
      const response = await fetch(`${API_URL}/dashboard/warnings/no-award-number?page=${page}&per_page=5`)
      const data = await response.json()
      setNoAwardNumberData({ students: data.students || [], total: data.total || 0, page: data.page || 1, loading: false })
    } catch (err) {
      console.error('Failed to fetch no award number students:', err)
      setNoAwardNumberData(prev => ({ ...prev, loading: false }))
    }
  }

  const fetchIncompleteInfoStudents = async (page = 1) => {
    setIncompleteInfoData(prev => ({ ...prev, loading: true }))
    try {
      const response = await fetch(`${API_URL}/dashboard/warnings/incomplete-info?page=${page}&per_page=5`)
      const data = await response.json()
      setIncompleteInfoData({ students: data.students || [], total: data.total || 0, page: data.page || 1, loading: false })
    } catch (err) {
      console.error('Failed to fetch incomplete info students:', err)
      setIncompleteInfoData(prev => ({ ...prev, loading: false }))
    }
  }

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

  // Fetch paginated warnings when counts are available
  useEffect(() => {
    if (dashboardData.warnings.no_uii?.count > 0) {
      fetchNoUiiStudents(1)
    }
    if (dashboardData.warnings.no_lrn?.count > 0) {
      fetchNoLrnStudents(1)
    }
    if (dashboardData.warnings.no_award_number?.count > 0) {
      fetchNoAwardNumberStudents(1)
    }
    if (dashboardData.warnings.incomplete_info?.count > 0) {
      fetchIncompleteInfoStudents(1)
    }
  }, [dashboardData.warnings.no_uii?.count, dashboardData.warnings.no_lrn?.count, dashboardData.warnings.no_award_number?.count, dashboardData.warnings.incomplete_info?.count])

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

  // Warning table columns
  const warningColumns = {
    noUii: [
      {
        title: 'Name',
        key: 'name',
        render: (_, r) => `${r.surname || ''}, ${r.first_name || ''}`.trim() || 'N/A',
      },
      { title: 'Award No.', dataIndex: 'award_number', key: 'award_number', ellipsis: true },
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
      {
        title: '',
        key: 'action',
        width: 60,
        render: (_, r) => (
          <a onClick={() => navigate(`/students/${r.seq}`)} style={{ color: '#0032a0' }}>View</a>
        ),
      },
    ],
    noLrn: [
      {
        title: 'Name',
        key: 'name',
        render: (_, r) => `${r.surname || ''}, ${r.first_name || ''}`.trim() || 'N/A',
      },
      { title: 'Award No.', dataIndex: 'award_number', key: 'award_number', ellipsis: true },
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
      {
        title: '',
        key: 'action',
        width: 60,
        render: (_, r) => (
          <a onClick={() => navigate(`/students/${r.seq}`)} style={{ color: '#0032a0' }}>View</a>
        ),
      },
    ],
    duplicateLrn: [
      { title: 'LRN', dataIndex: 'learner_reference_number', key: 'lrn', width: 120, ellipsis: true },
      {
        title: 'Name',
        key: 'name',
        render: (_, r) => `${r.surname || ''}, ${r.first_name || ''}`.trim() || 'N/A',
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
      {
        title: '',
        key: 'action',
        width: 60,
        render: (_, r) => (
          <a onClick={() => navigate(`/students/${r.seq}`)} style={{ color: '#0032a0' }}>View</a>
        ),
      },
    ],
    noAwardNumber: [
      {
        title: 'Name',
        key: 'name',
        render: (_, r) => `${r.surname || ''}, ${r.first_name || ''}`.trim() || 'N/A',
      },
      { title: 'Program', dataIndex: 'scholarship_program', key: 'program', ellipsis: true },
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
      {
        title: '',
        key: 'action',
        width: 60,
        render: (_, r) => (
          <a onClick={() => navigate(`/students/${r.seq}`)} style={{ color: '#0032a0' }}>View</a>
        ),
      },
    ],
    duplicateAward: [
      { title: 'Award No.', dataIndex: 'award_number', key: 'award_number', width: 120 },
      {
        title: 'Name',
        key: 'name',
        render: (_, r) => `${r.surname || ''}, ${r.first_name || ''}`.trim() || 'N/A',
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
      {
        title: '',
        key: 'action',
        width: 60,
        render: (_, r) => (
          <a onClick={() => navigate(`/students/${r.seq}`)} style={{ color: '#0032a0' }}>View</a>
        ),
      },
    ],
    incompleteInfo: [
      {
        title: 'Name',
        key: 'name',
        render: (_, r) => `${r.surname || ''}, ${r.first_name || ''}`.trim() || 'N/A',
      },
      { 
        title: 'Missing', 
        dataIndex: 'missing_count', 
        key: 'missing_count', 
        width: 70,
        render: (count) => <Tag color="orange">{count} fields</Tag>
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
      {
        title: '',
        key: 'action',
        width: 60,
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

      {/* Data Quality Warnings */}
      {getTotalWarnings() > 0 && (
        <Card
          style={{ ...cardStyle, marginBottom: 24, borderColor: '#ffe58f', backgroundColor: '#fffbe6' }}
          bodyStyle={{ padding: 16 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <WarningOutlined style={{ color: '#faad14', fontSize: 18 }} />
            <Text strong style={{ color: '#d48806', fontSize: 15 }}>
              Data Quality Issues ({getTotalWarnings()} found)
            </Text>
          </div>
          
          <Row gutter={[16, 16]}>
            {/* Duplicate Award Numbers - Violations */}
            {dashboardData.warnings.duplicate_award_numbers?.count > 0 && (
              <Col xs={24} lg={12}>
                <Card
                  size="small"
                  title={
                    <span style={{ color: '#ff4d4f' }}>
                      <ExclamationCircleOutlined /> Duplicate Award Numbers ({dashboardData.warnings.duplicate_award_numbers.count})
                    </span>
                  }
                  extra={<Text type="secondary" style={{ fontSize: 11 }}>Multiple active or reused graduated</Text>}
                  style={{ borderColor: '#ffccc7' }}
                  bodyStyle={{ padding: 0 }}
                >
                  <Table
                    dataSource={dashboardData.warnings.duplicate_award_numbers.students?.slice(0, 6) || []}
                    columns={warningColumns.duplicateAward}
                    size="small"
                    pagination={false}
                    rowKey="seq"
                  />
                  {(dashboardData.warnings.duplicate_award_numbers.students?.length || 0) > 6 && (
                    <div style={{ padding: '8px 16px', borderTop: '1px solid #f0f0f0' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        And {dashboardData.warnings.duplicate_award_numbers.students.length - 6} more...
                      </Text>
                    </div>
                  )}
                </Card>
              </Col>
            )}

            {/* Duplicate LRN */}
            {dashboardData.warnings.duplicate_lrn?.count > 0 && (
              <Col xs={24} lg={12}>
                <Card
                  size="small"
                  title={
                    <span style={{ color: '#ff4d4f' }}>
                      <ExclamationCircleOutlined /> Duplicate LRN ({dashboardData.warnings.duplicate_lrn.count})
                    </span>
                  }
                  style={{ borderColor: '#ffccc7' }}
                  bodyStyle={{ padding: 0 }}
                >
                  <Table
                    dataSource={dashboardData.warnings.duplicate_lrn.students?.slice(0, 6) || []}
                    columns={warningColumns.duplicateLrn}
                    size="small"
                    pagination={false}
                    rowKey="seq"
                  />
                  {(dashboardData.warnings.duplicate_lrn.students?.length || 0) > 6 && (
                    <div style={{ padding: '8px 16px', borderTop: '1px solid #f0f0f0' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        And {dashboardData.warnings.duplicate_lrn.students.length - 6} more...
                      </Text>
                    </div>
                  )}
                </Card>
              </Col>
            )}

            {/* Missing UII */}
            {dashboardData.warnings.no_uii?.count > 0 && (
              <Col xs={24} lg={12}>
                <Card
                  size="small"
                  title={
                    <span style={{ color: '#fa8c16' }}>
                      <ExclamationCircleOutlined /> Missing UII ({dashboardData.warnings.no_uii.count})
                    </span>
                  }
                  style={{ borderColor: '#ffd591' }}
                  bodyStyle={{ padding: 0 }}
                >
                  <Spin spinning={noUiiData.loading} indicator={<LoadingOutlined />}>
                    <Table
                      dataSource={noUiiData.students}
                      columns={warningColumns.noUii}
                      size="small"
                      pagination={false}
                      rowKey="seq"
                      locale={{ emptyText: 'No data' }}
                    />
                  </Spin>
                  {noUiiData.total > 5 && (
                    <div style={{ padding: '8px 16px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Showing {((noUiiData.page - 1) * 5) + 1}-{Math.min(noUiiData.page * 5, noUiiData.total)} of {noUiiData.total}
                      </Text>
                      <Pagination
                        size="small"
                        current={noUiiData.page}
                        total={noUiiData.total}
                        pageSize={5}
                        onChange={(page) => fetchNoUiiStudents(page)}
                        showSizeChanger={false}
                        simple
                      />
                    </div>
                  )}
                </Card>
              </Col>
            )}

            {/* Missing LRN */}
            {dashboardData.warnings.no_lrn?.count > 0 && (
              <Col xs={24} lg={12}>
                <Card
                  size="small"
                  title={
                    <span style={{ color: '#fa8c16' }}>
                      <ExclamationCircleOutlined /> Missing LRN ({dashboardData.warnings.no_lrn.count})
                    </span>
                  }
                  style={{ borderColor: '#ffd591' }}
                  bodyStyle={{ padding: 0 }}
                >
                  <Spin spinning={noLrnData.loading} indicator={<LoadingOutlined />}>
                    <Table
                      dataSource={noLrnData.students}
                      columns={warningColumns.noLrn}
                      size="small"
                      pagination={false}
                      rowKey="seq"
                      locale={{ emptyText: 'No data' }}
                    />
                  </Spin>
                  {noLrnData.total > 5 && (
                    <div style={{ padding: '8px 16px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Showing {((noLrnData.page - 1) * 5) + 1}-{Math.min(noLrnData.page * 5, noLrnData.total)} of {noLrnData.total}
                      </Text>
                      <Pagination
                        size="small"
                        current={noLrnData.page}
                        total={noLrnData.total}
                        pageSize={5}
                        onChange={(page) => fetchNoLrnStudents(page)}
                        showSizeChanger={false}
                        simple
                      />
                    </div>
                  )}
                </Card>
              </Col>
            )}

            {/* Missing Award Number */}
            {dashboardData.warnings.no_award_number?.count > 0 && (
              <Col xs={24} lg={12}>
                <Card
                  size="small"
                  title={
                    <span style={{ color: '#8c8c8c' }}>
                      <InfoCircleOutlined /> Missing Award Number ({dashboardData.warnings.no_award_number.count})
                    </span>
                  }
                  style={{ borderColor: '#d9d9d9' }}
                  bodyStyle={{ padding: 0 }}
                >
                  <Spin spinning={noAwardNumberData.loading} indicator={<LoadingOutlined />}>
                    <Table
                      dataSource={noAwardNumberData.students}
                      columns={warningColumns.noAwardNumber}
                      size="small"
                      pagination={false}
                      rowKey="seq"
                      locale={{ emptyText: 'No data' }}
                    />
                  </Spin>
                  {noAwardNumberData.total > 5 && (
                    <div style={{ padding: '8px 16px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Showing {((noAwardNumberData.page - 1) * 5) + 1}-{Math.min(noAwardNumberData.page * 5, noAwardNumberData.total)} of {noAwardNumberData.total}
                      </Text>
                      <Pagination
                        size="small"
                        current={noAwardNumberData.page}
                        total={noAwardNumberData.total}
                        pageSize={5}
                        onChange={(page) => fetchNoAwardNumberStudents(page)}
                        showSizeChanger={false}
                        simple
                      />
                    </div>
                  )}
                </Card>
              </Col>
            )}

            {/* Incomplete Information */}
            {dashboardData.warnings.incomplete_info?.count > 0 && (
              <Col xs={24} lg={12}>
                <Card
                  size="small"
                  title={
                    <span style={{ color: '#fa8c16' }}>
                      <ExclamationCircleOutlined /> Incomplete Information ({dashboardData.warnings.incomplete_info.count})
                    </span>
                  }
                  extra={<Text type="secondary" style={{ fontSize: 11 }}>Missing required fields</Text>}
                  style={{ borderColor: '#ffd591' }}
                  bodyStyle={{ padding: 0 }}
                >
                  <Spin spinning={incompleteInfoData.loading} indicator={<LoadingOutlined />}>
                    <Table
                      dataSource={incompleteInfoData.students}
                      columns={warningColumns.incompleteInfo}
                      size="small"
                      pagination={false}
                      rowKey="seq"
                      locale={{ emptyText: 'No data' }}
                    />
                  </Spin>
                  {incompleteInfoData.total > 5 && (
                    <div style={{ padding: '8px 16px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Showing {((incompleteInfoData.page - 1) * 5) + 1}-{Math.min(incompleteInfoData.page * 5, incompleteInfoData.total)} of {incompleteInfoData.total}
                      </Text>
                      <Pagination
                        size="small"
                        current={incompleteInfoData.page}
                        total={incompleteInfoData.total}
                        pageSize={5}
                        onChange={(page) => fetchIncompleteInfoStudents(page)}
                        showSizeChanger={false}
                        simple
                      />
                    </div>
                  )}
                </Card>
              </Col>
            )}
          </Row>
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
