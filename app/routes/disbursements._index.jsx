import { useEffect, useState } from 'react'
import { Typography, Table, Card, Input, Space, Select, DatePicker, Tag, Button, Statistic, Row, Col } from 'antd'
import { SearchOutlined, DollarOutlined, CheckCircleOutlined, ClockCircleOutlined, ExportOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const { Title } = Typography
const { Search } = Input
const { Option } = Select
const { RangePicker } = DatePicker

export function meta() {
  return [
    { title: 'Disbursements | StuFAPs' },
    { name: 'description', content: 'Manage disbursement records' },
  ]
}

export default function DisbursementsIndex() {
  const [disbursements, setDisbursements] = useState([])
  const [filteredDisbursements, setFilteredDisbursements] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    disbursed: 0,
    pending: 0,
    totalAmount: 0
  })

  useEffect(() => {
    // Fetch disbursements from the backend API
    fetch('http://localhost:8000/api/disbursements') // Create this endpoint
      .then((response) => response.json())
      .then((data) => {
        const records = data.data || []
        setDisbursements(records)
        setFilteredDisbursements(records)
        calculateStats(records)
        setLoading(false)
      })
      .catch((error) => {
        console.error('Error fetching disbursements:', error)
        setLoading(false)
      })
  }, [])

  const calculateStats = (records) => {
    const total = records.length
    const disbursed = records.filter(r => r.disbursement_status === 'Disbursed').length
    const pending = records.filter(r => r.disbursement_status === 'Pending').length
    const totalAmount = records.reduce((sum, r) => sum + (parseFloat(r.disbursed_amount) || 0), 0)
    
    setStats({ total, disbursed, pending, totalAmount })
  }

  // Format date helper
  const formatDate = (date) => {
    if (!date) return 'N/A'
    return dayjs(date).format('MMMM D, YYYY')
  }

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return '₱0.00'
    return `₱${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Disbursed':
        return 'green'
      case 'Pending':
        return 'orange'
      case 'Failed':
        return 'red'
      default:
        return 'default'
    }
  }

  // Handle search
  const handleSearch = (value) => {
    const filtered = disbursements.filter((d) => {
      const studentName = `${d.student_surname}, ${d.student_first_name}`.toLowerCase()
      const voucherNumber = d.voucher_no?.toLowerCase() || ''
      const ntaNumber = d.nta?.toLowerCase() || ''
      
      return (
        studentName.includes(value.toLowerCase()) ||
        voucherNumber.includes(value.toLowerCase()) ||
        ntaNumber.includes(value.toLowerCase())
      )
    })
    setFilteredDisbursements(filtered)
    calculateStats(filtered)
  }

  // Handle filter by status
  const handleStatusFilter = (status) => {
    if (!status) {
      setFilteredDisbursements(disbursements)
      calculateStats(disbursements)
      return
    }
    
    const filtered = disbursements.filter(d => d.disbursement_status === status)
    setFilteredDisbursements(filtered)
    calculateStats(filtered)
  }

  // Handle date range filter
  const handleDateRangeFilter = (dates) => {
    if (!dates || dates.length === 0) {
      setFilteredDisbursements(disbursements)
      calculateStats(disbursements)
      return
    }

    const [start, end] = dates
    const filtered = disbursements.filter(d => {
      if (!d.disbursement_date) return false
      const date = dayjs(d.disbursement_date)
      return date.isAfter(start) && date.isBefore(end)
    })
    setFilteredDisbursements(filtered)
    calculateStats(filtered)
  }

  // Define table columns
  const columns = [
    {
      title: 'Student Name',
      key: 'student_name',
      width: 200,
      render: (_, record) => `${record.student_surname}, ${record.student_first_name}`,
    },
    {
      title: 'Award Number',
      dataIndex: 'award_number',
      key: 'award_number',
      width: 150,
    },
    {
      title: 'Academic Year',
      dataIndex: 'school_academic_year',
      key: 'school_academic_year',
      width: 120,
      align: 'center',
    },
    {
      title: 'Semester',
      dataIndex: 'semester',
      key: 'semester',
      width: 100,
      align: 'center',
      render: (semester) => (semester === '1' ? '1st' : '2nd'),
    },
    {
      title: 'NTA Number',
      dataIndex: 'nta',
      key: 'nta',
      width: 150,
    },
    {
      title: 'Voucher Number',
      dataIndex: 'voucher_no',
      key: 'voucher_no',
      width: 150,
    },
    {
      title: 'NTA Amount',
      dataIndex: 'nta_amount',
      key: 'nta_amount',
      width: 130,
      align: 'right',
      render: (amount) => formatCurrency(amount),
    },
    {
      title: 'Disbursed Amount',
      dataIndex: 'disbursed_amount',
      key: 'disbursed_amount',
      width: 150,
      align: 'right',
      render: (amount) => <strong>{formatCurrency(amount)}</strong>,
    },
    {
      title: 'Disbursement Date',
      dataIndex: 'disbursement_date',
      key: 'disbursement_date',
      width: 150,
      align: 'center',
      render: (date) => formatDate(date),
    },
    {
      title: 'Payment Mode',
      dataIndex: 'mode_of_payment',
      key: 'mode_of_payment',
      width: 120,
      align: 'center',
    },
    {
      title: 'Status',
      dataIndex: 'disbursement_status',
      key: 'disbursement_status',
      width: 120,
      align: 'center',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status || 'Pending'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Button type="link" size="small">
          View Details
        </Button>
      ),
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Disbursement Management</Title>

      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Disbursements"
              value={stats.total}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Disbursed"
              value={stats.disbursed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Pending"
              value={stats.pending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Amount"
              value={stats.totalAmount}
              prefix="₱"
              precision={2}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space wrap>
              <Search
                placeholder="Search by student name, NTA, or voucher number"
                allowClear
                enterButton={<SearchOutlined />}
                size="large"
                onSearch={handleSearch}
                style={{ width: 400 }}
              />
              <Select
                placeholder="Filter by Status"
                allowClear
                size="large"
                style={{ width: 200 }}
                onChange={handleStatusFilter}
              >
                <Option value="Disbursed">Disbursed</Option>
                <Option value="Pending">Pending</Option>
                <Option value="Failed">Failed</Option>
              </Select>
              <RangePicker
                size="large"
                onChange={handleDateRangeFilter}
                placeholder={['Start Date', 'End Date']}
              />
            </Space>
            <Button type="primary" size="large" icon={<ExportOutlined />}>
              Export Report
            </Button>
          </Space>
        </Space>
      </Card>

      {/* Disbursements Table */}
      <Card>
        <Table
          bordered
          loading={loading}
          dataSource={filteredDisbursements}
          columns={columns}
          rowKey="record_id"
          scroll={{ x: 1500 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} disbursements`,
          }}
        />
      </Card>
    </div>
  )
}