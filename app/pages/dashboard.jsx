import { Card, Row, Col, Typography, Table, Tag, Spin, Empty, Progress } from 'antd'
import {
  TeamOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  CalendarOutlined,
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
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useEffect, useState } from 'react'

const { Title, Text } = Typography

// API Base URL
const API_URL = 'http://localhost:8000/api'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalStudents: 0,
      activeScholars: 0,
      graduated: 0,
      terminated: 0,
      totalDisbursed: 0,
    },
    scholarshipStatus: [],
    degreeLevels: [],
    recentRegistrations: [],
  })

  // Fetch dashboard data from Laravel API
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`${API_URL}/dashboard/stats`)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()

        // Handle potential error response
        if (data.error) {
          throw new Error(data.message || 'Unknown error occurred')
        }

        setDashboardData({
          stats: {
            totalStudents: data.total_students || 0,
            activeScholars: data.active_scholars || 0,
            graduated: data.graduated || 0,
            terminated: data.terminated || 0,
            totalDisbursed: data.total_disbursed || 0,
          },
          scholarshipStatus: [
            { name: 'On-going', value: data.active_scholars || 0, color: '#52c41a' },
            { name: 'Graduated', value: data.graduated || 0, color: '#1890ff' },
            { name: 'Terminated', value: data.terminated || 0, color: '#ff4d4f' },
          ],
          degreeLevels: (data.degree_levels || []).map(item => ({
            level: item.level || 'Unknown',
            students: parseInt(item.students) || 0,
          })),
          recentRegistrations: data.recent_registrations || [],
        })
      } catch (err) {
        console.error('Dashboard fetch error:', err)
        setError(err.message)
        
        // Set fallback empty data
        setDashboardData({
          stats: { totalStudents: 0, activeScholars: 0, graduated: 0, terminated: 0, totalDisbursed: 0 },
          scholarshipStatus: [],
          degreeLevels: [],
          recentRegistrations: [],
        })
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

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
      title: 'Active Scholars',
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

  // Recent Registrations Table Columns
  const recentColumns = [
    {
      title: 'Name',
      key: 'name',
      render: (_, record) => {
        const fullName = [
          record.first_name,
          record.middle_name,
          record.surname,
          record.extension
        ].filter(Boolean).join(' ')
        return <Text strong style={{ fontSize: '13px' }}>{fullName}</Text>
      },
    },
    {
      title: 'Program',
      dataIndex: 'degree_program',
      key: 'degree_program',
      ellipsis: true,
      render: (text) => <Text style={{ fontSize: '12px' }}>{text}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'scholarship_status',
      key: 'scholarship_status',
      width: 90,
      render: (status) => {
        const colorMap = {
          'On-going': 'green',
          'Graduated': 'blue',
          'Terminated': 'red',
        }
        return <Tag color={colorMap[status] || 'default'} style={{ fontSize: '11px' }}>{status}</Tag>
      },
    },
  ]

  if (loading) {
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
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {error}
              </Text>
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
    <div style={{ padding: '16px', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#0032a0' }}>
            Dashboard
          </Title>
          <Text type="secondary" style={{ fontSize: '13px' }}>
            Student Financial Assistance Program
          </Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8c8c8c' }}>
          <CalendarOutlined />
          <Text type="secondary" style={{ fontSize: '13px' }}>
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
        </div>
      </div>

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
        <Col xs={24} lg={16} style={{ display: 'flex', flexDirection: 'column' }}>
          <Row gutter={[12, 12]} style={{ flex: 1 }}>
            {/* Scholarship Status Pie Chart */}
            <Col xs={24} md={12} style={{ display: 'flex' }}>
              <Card
                title={<Text strong style={{ fontSize: '14px' }}>Scholarship Status</Text>}
                style={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                }}
                headStyle={{ padding: '12px 16px', minHeight: 'auto' }}
                bodyStyle={{ padding: 16, flex: 1 }}
              >
                {dashboardData.scholarshipStatus.some(item => item.value > 0) ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={dashboardData.scholarshipStatus.filter(item => item.value > 0)}
                        cx="50%"
                        cy="45%"
                        innerRadius="45%"
                        outerRadius="75%"
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {dashboardData.scholarshipStatus
                          .filter(item => item.value > 0)
                          .map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                      </Pie>
                      <Tooltip formatter={(value) => [value, 'Students']} />
                      <Legend 
                        verticalAlign="bottom"
                        wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                        iconSize={10}
                        iconType="circle"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 250 }}>
                    <Empty description="No data available" />
                  </div>
                )}
              </Card>
            </Col>

            {/* Students by Degree Level Bar Chart */}
            <Col xs={24} md={12} style={{ display: 'flex' }}>
              <Card
                title={<Text strong style={{ fontSize: '14px' }}>Students by Degree Level</Text>}
                style={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                }}
                headStyle={{ padding: '12px 16px', minHeight: 'auto' }}
                bodyStyle={{ padding: 16, flex: 1 }}
              >
                {dashboardData.degreeLevels.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={dashboardData.degreeLevels}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis 
                        dataKey="level" 
                        tick={{ fill: '#8c8c8c', fontSize: 11 }} 
                        tickLine={false}
                        axisLine={{ stroke: '#f0f0f0' }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis 
                        tick={{ fill: '#8c8c8c', fontSize: 11 }} 
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '8px', 
                          border: 'none', 
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)' 
                        }}
                      />
                      <Bar dataKey="students" fill="#0032a0" radius={[6, 6, 0, 0]} maxBarSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 250 }}>
                    <Empty description="No data available" />
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </Col>

        {/* Right Column - Tables and Stats */}
        <Col xs={24} lg={8} style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Recent Registrations Table */}
          <Card
            title={<Text strong style={{ fontSize: '14px' }}>Recent Registrations</Text>}
            extra={
              <a href="/students" style={{ color: '#0032a0', fontSize: '12px', fontWeight: 500 }}>
                View All →
              </a>
            }
            style={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              marginBottom: 12,
            }}
            headStyle={{ padding: '12px 16px', minHeight: 'auto' }}
            bodyStyle={{ padding: 0, flex: 1, overflow: 'hidden' }}
          >
            <Table
              columns={recentColumns}
              dataSource={dashboardData.recentRegistrations}
              pagination={false}
              size="small"
              rowKey="student_id"
              locale={{ emptyText: 'No recent registrations' }}
              scroll={{ y: 200 }}
            />
          </Card>

          {/* Quick Stats Summary */}
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
                  <Text style={{ fontSize: '12px' }}>On-going</Text>
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
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}