import { Card, Row, Col, Typography, Table, Tag, Spin, Empty, Tabs, Input, Pagination, Badge, Statistic } from 'antd'
import {
  WarningOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  SearchOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const { Title, Text } = Typography

const API_URL = 'http://localhost:8000/api'

// Human-readable field labels
const fieldLabels = {
  surname: 'Surname',
  first_name: 'First Name',
  sex: 'Sex',
  date_of_birth: 'Date of Birth',
  contact_number: 'Contact No.',
  email_address: 'Email',
  street_brgy: 'Street/Brgy',
  municipality_city: 'City/Municipality',
  province: 'Province',
  congressional_district: 'District',
  zip_code: 'ZIP Code',
  name_of_institution: 'Institution',
  uii: 'UII',
  institutional_type: 'Inst. Type',
  region: 'Region',
  degree_program: 'Degree Program',
  program_degree_level: 'Degree Level',
  in_charge: 'In-Charge',
  award_year: 'Award Year',
  scholarship_program: 'Scholarship Program',
  award_number: 'Award No.',
  authority_type: 'Authority Type',
  authority_number: 'Authority No.',
  series: 'Series',
  scholarship_status: 'Status',
  learner_reference_number: 'LRN',
  basis_cmo: 'Basis (CMO)',
}

const PAGE_SIZE = 15

export default function DataQuality() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({
    no_uii: 0,
    no_lrn: 0,
    duplicate_lrn: 0,
    no_award_number: 0,
    duplicate_award_numbers: 0,
    incomplete_info: 0,
  })
  const [activeTab, setActiveTab] = useState('duplicate_award')

  // Paginated data for each warning type
  const [dupAward, setDupAward] = useState({ students: [], total: 0, page: 1, loading: false })
  const [dupLrn, setDupLrn] = useState({ students: [], total: 0, page: 1, loading: false })
  const [noUii, setNoUii] = useState({ students: [], total: 0, page: 1, loading: false })
  const [noLrn, setNoLrn] = useState({ students: [], total: 0, page: 1, loading: false })
  const [noAward, setNoAward] = useState({ students: [], total: 0, page: 1, loading: false })
  const [incomplete, setIncomplete] = useState({ students: [], total: 0, page: 1, loading: false })

  // Fetch overall counts from dashboard stats
  const fetchCounts = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/dashboard/stats`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      const w = data.warnings || {}
      setCounts({
        no_uii: w.no_uii?.count || 0,
        no_lrn: w.no_lrn?.count || 0,
        duplicate_lrn: w.duplicate_lrn?.count || 0,
        no_award_number: w.no_award_number?.count || 0,
        duplicate_award_numbers: w.duplicate_award_numbers?.count || 0,
        incomplete_info: w.incomplete_info?.count || 0,
      })

      // For duplicate types that come inline with stats, store them directly
      if (w.duplicate_award_numbers?.students) {
        setDupAward({
          students: w.duplicate_award_numbers.students,
          total: w.duplicate_award_numbers.students.length,
          page: 1,
          loading: false,
        })
      }
      if (w.duplicate_lrn?.students) {
        setDupLrn({
          students: w.duplicate_lrn.students,
          total: w.duplicate_lrn.students.length,
          page: 1,
          loading: false,
        })
      }
    } catch (err) {
      console.error('Failed to fetch counts:', err)
    } finally {
      setLoading(false)
    }
  }

  // Generic paginated fetcher
  const fetchPaginated = async (endpoint, setter, page = 1) => {
    setter(prev => ({ ...prev, loading: true }))
    try {
      const res = await fetch(`${API_URL}/dashboard/warnings/${endpoint}?page=${page}&per_page=${PAGE_SIZE}`)
      const data = await res.json()
      setter({
        students: data.students || [],
        total: data.total || 0,
        page: data.page || page,
        loading: false,
      })
    } catch (err) {
      console.error(`Failed to fetch ${endpoint}:`, err)
      setter(prev => ({ ...prev, loading: false }))
    }
  }

  useEffect(() => {
    fetchCounts()
  }, [])

  // Fetch data for the active tab when it changes or counts load
  useEffect(() => {
    if (loading) return
    switch (activeTab) {
      case 'no_uii':
        if (counts.no_uii > 0 && noUii.students.length === 0) fetchPaginated('no-uii', setNoUii, 1)
        break
      case 'no_lrn':
        if (counts.no_lrn > 0 && noLrn.students.length === 0) fetchPaginated('no-lrn', setNoLrn, 1)
        break
      case 'no_award':
        if (counts.no_award_number > 0 && noAward.students.length === 0) fetchPaginated('no-award-number', setNoAward, 1)
        break
      case 'incomplete':
        if (counts.incomplete_info > 0 && incomplete.students.length === 0) fetchPaginated('incomplete-info', setIncomplete, 1)
        break
    }
  }, [activeTab, loading])

  const totalIssues = Object.values(counts).reduce((sum, c) => sum + c, 0)

  // Common column helpers
  const nameCol = {
    title: 'Name',
    key: 'name',
    render: (_, r) => {
      const name = `${r.surname || ''}, ${r.first_name || ''}`.trim()
      return <a onClick={() => navigate(`/students/${r.seq}`)} style={{ color: '#0032a0' }}>{name || 'N/A'}</a>
    },
  }
  const statusCol = {
    title: 'Status',
    dataIndex: 'scholarship_status',
    key: 'status',
    width: 110,
    render: (status) => {
      const colorMap = { 'On-going': 'green', 'Active': 'green', 'Graduated': 'blue', 'Terminated': 'red' }
      return <Tag color={colorMap[status] || 'default'}>{status || 'N/A'}</Tag>
    },
  }
  const institutionCol = {
    title: 'Institution',
    dataIndex: 'name_of_institution',
    key: 'institution',
    ellipsis: true,
  }
  const viewCol = {
    title: '',
    key: 'action',
    width: 60,
    render: (_, r) => (
      <a onClick={() => navigate(`/students/${r.seq}`)} style={{ color: '#0032a0', fontSize: 12 }}>View</a>
    ),
  }

  // Missing field indicator column
  const missingCol = (fieldName, label) => ({
    title: 'Missing',
    key: 'missing',
    width: 130,
    render: () => (
      <Tag color="orange" style={{ fontSize: 12 }}>
        <WarningOutlined style={{ marginRight: 4 }} />{label}
      </Tag>
    ),
  })

  // Tab-specific columns
  const columnSets = {
    duplicate_award: [
      { title: 'Award No.', dataIndex: 'award_number', key: 'award_number', width: 140,
        render: (v) => <Text strong style={{ color: '#ff4d4f' }}>{v}</Text> },
      nameCol,
      { title: 'Program', dataIndex: 'scholarship_program', key: 'program', ellipsis: true },
      statusCol,
      viewCol,
    ],
    duplicate_lrn: [
      { title: 'LRN', dataIndex: 'learner_reference_number', key: 'lrn', width: 160, ellipsis: true,
        render: (v) => <Text strong style={{ color: '#ff4d4f' }}>{v}</Text> },
      nameCol,
      institutionCol,
      statusCol,
      viewCol,
    ],
    no_uii: [
      nameCol,
      missingCol('uii', 'UII'),
      { title: 'Award No.', dataIndex: 'award_number', key: 'award_number', ellipsis: true },
      institutionCol,
      statusCol,
      viewCol,
    ],
    no_lrn: [
      nameCol,
      missingCol('learner_reference_number', 'LRN'),
      { title: 'Award No.', dataIndex: 'award_number', key: 'award_number', ellipsis: true },
      institutionCol,
      statusCol,
      viewCol,
    ],
    no_award: [
      nameCol,
      missingCol('award_number', 'Award No.'),
      { title: 'Program', dataIndex: 'scholarship_program', key: 'program', ellipsis: true },
      institutionCol,
      statusCol,
      viewCol,
    ],
    incomplete: [
      nameCol,
      {
        title: 'Missing',
        dataIndex: 'missing_count',
        key: 'missing_count',
        width: 80,
        align: 'center',
        render: (count) => (
          <Tag color="orange" style={{ fontWeight: 600, minWidth: 40, textAlign: 'center' }}>{count}</Tag>
        ),
      },
      {
        title: 'Missing Fields',
        dataIndex: 'missing_fields',
        key: 'missing_fields',
        render: (fields) => (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {(fields || []).map(f => (
              <Tag key={f} color="orange" style={{ fontSize: 11, margin: 0 }}>
                {fieldLabels[f] || f}
              </Tag>
            ))}
          </div>
        ),
      },
      statusCol,
      viewCol,
    ],
  }

  // Get data + config for current tab
  const getTabData = (tabKey) => {
    switch (tabKey) {
      case 'duplicate_award': return { data: dupAward, paginated: false }
      case 'duplicate_lrn': return { data: dupLrn, paginated: false }
      case 'no_uii': return { data: noUii, paginated: true, endpoint: 'no-uii', setter: setNoUii }
      case 'no_lrn': return { data: noLrn, paginated: true, endpoint: 'no-lrn', setter: setNoLrn }
      case 'no_award': return { data: noAward, paginated: true, endpoint: 'no-award-number', setter: setNoAward }
      case 'incomplete': return { data: incomplete, paginated: true, endpoint: 'incomplete-info', setter: setIncomplete }
      default: return { data: { students: [], total: 0, page: 1, loading: false }, paginated: false }
    }
  }

  const renderTable = (tabKey) => {
    const { data, paginated, endpoint, setter } = getTabData(tabKey)
    const columns = columnSets[tabKey] || []
    const displayData = paginated ? data.students : data.students.slice((data.page - 1) * PAGE_SIZE, data.page * PAGE_SIZE)

    return (
      <Spin spinning={data.loading} indicator={<LoadingOutlined />}>
        <Table
          dataSource={displayData}
          columns={columns}
          size="small"
          pagination={false}
          rowKey="seq"
          locale={{ emptyText: <Empty description="No issues found" /> }}
          style={{ marginBottom: data.total > PAGE_SIZE ? 0 : 16 }}
        />
        {data.total > PAGE_SIZE && (
          <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f0f0f0' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {data.total} total records
            </Text>
            <Pagination
              size="small"
              current={data.page}
              total={data.total}
              pageSize={PAGE_SIZE}
              onChange={(page) => {
                if (paginated) {
                  fetchPaginated(endpoint, setter, page)
                } else {
                  // For inline data (duplicates), just change page locally
                  if (tabKey === 'duplicate_award') setDupAward(prev => ({ ...prev, page }))
                  if (tabKey === 'duplicate_lrn') setDupLrn(prev => ({ ...prev, page }))
                }
              }}
              showSizeChanger={false}
            />
          </div>
        )}
      </Spin>
    )
  }

  const issueTypes = [
    { key: 'duplicate_award', label: 'Duplicate Award #', count: counts.duplicate_award_numbers, color: '#ff4d4f', icon: <ExclamationCircleOutlined /> },
    { key: 'duplicate_lrn', label: 'Duplicate LRN', count: counts.duplicate_lrn, color: '#ff4d4f', icon: <ExclamationCircleOutlined /> },
    { key: 'no_uii', label: 'Missing UII', count: counts.no_uii, color: '#fa8c16', icon: <WarningOutlined /> },
    { key: 'no_lrn', label: 'Missing LRN', count: counts.no_lrn, color: '#fa8c16', icon: <WarningOutlined /> },
    { key: 'no_award', label: 'Missing Award #', count: counts.no_award_number, color: '#8c8c8c', icon: <InfoCircleOutlined /> },
    { key: 'incomplete', label: 'Incomplete Info', count: counts.incomplete_info, color: '#fa8c16', icon: <WarningOutlined /> },
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 120px)' }}>
        <Spin size="large" />
        <Text style={{ marginLeft: 16 }}>Loading data quality report...</Text>
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#0032a0' }}>Data Quality</Title>
          <Text type="secondary">Review and fix data issues across student records</Text>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Statistic
            title="Total Issues"
            value={totalIssues}
            valueStyle={{ color: totalIssues > 0 ? '#ff4d4f' : '#52c41a', fontSize: 28 }}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
        {issueTypes.map(item => (
          <Col xs={12} sm={8} md={4} key={item.key}>
            <Card
              size="small"
              style={{
                borderRadius: 8,
                cursor: 'pointer',
                borderColor: activeTab === item.key ? item.color : '#f0f0f0',
                borderWidth: activeTab === item.key ? 2 : 1,
                background: activeTab === item.key ? `${item.color}08` : 'white',
              }}
              bodyStyle={{ padding: '12px 16px', textAlign: 'center' }}
              onClick={() => setActiveTab(item.key)}
            >
              <div style={{ fontSize: 22, fontWeight: 700, color: item.count > 0 ? item.color : '#52c41a' }}>
                {item.count}
              </div>
              <Text style={{ fontSize: 11, color: '#8c8c8c' }}>{item.label}</Text>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Active Tab Content */}
      <Card
        style={{ borderRadius: 8, border: '1px solid #f0f0f0' }}
        bodyStyle={{ padding: 0 }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {issueTypes.find(t => t.key === activeTab)?.icon}
            <span>{issueTypes.find(t => t.key === activeTab)?.label}</span>
            <Badge
              count={issueTypes.find(t => t.key === activeTab)?.count || 0}
              style={{ backgroundColor: issueTypes.find(t => t.key === activeTab)?.color }}
            />
          </div>
        }
      >
        {renderTable(activeTab)}
      </Card>

      {/* Legend */}
      <div style={{ marginTop: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>Legend:</Text>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Tag color="#ff4d4f" style={{ fontSize: 11, margin: 0 }}>Duplicate</Tag>
          <Text type="secondary" style={{ fontSize: 11 }}>Duplicate values (critical)</Text>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Tag color="orange" style={{ fontSize: 11, margin: 0 }}>Missing</Tag>
          <Text type="secondary" style={{ fontSize: 11 }}>Empty or missing data</Text>
        </div>
      </div>
    </div>
  )
}
