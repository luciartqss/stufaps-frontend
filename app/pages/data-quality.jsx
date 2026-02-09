import { Card, Row, Col, Typography, Table, Tag, Spin, Empty, Pagination } from 'antd'
import {
  WarningOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const { Title, Text } = Typography

const API_URL = 'http://localhost:8000/api'

// Human-readable field labels — aligned with backend DashboardController $requiredFields
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

// Issue types in requested order
const ISSUE_TYPES = [
  { key: 'duplicate_award', label: 'Duplicate Award No.', color: '#ff4d4f', icon: <ExclamationCircleOutlined /> },
  { key: 'no_award', label: 'Missing Award No.', color: '#8c8c8c', icon: <InfoCircleOutlined /> },
  { key: 'duplicate_lrn', label: 'Duplicate LRN', color: '#ff4d4f', icon: <ExclamationCircleOutlined /> },
  { key: 'no_lrn', label: 'Missing LRN', color: '#fa8c16', icon: <WarningOutlined /> },
  { key: 'no_uii', label: 'Missing UII', color: '#fa8c16', icon: <WarningOutlined /> },
  { key: 'incomplete', label: 'Incomplete Info', color: '#fa8c16', icon: <WarningOutlined /> },
]

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
  const [totalStudents, setTotalStudents] = useState(0)
  const [activeTab, setActiveTab] = useState('duplicate_award')

  const [dupAward, setDupAward] = useState({ students: [], total: 0, page: 1, loading: false })
  const [dupLrn, setDupLrn] = useState({ students: [], total: 0, page: 1, loading: false })
  const [noUii, setNoUii] = useState({ students: [], total: 0, page: 1, loading: false })
  const [noLrn, setNoLrn] = useState({ students: [], total: 0, page: 1, loading: false })
  const [noAward, setNoAward] = useState({ students: [], total: 0, page: 1, loading: false })
  const [incomplete, setIncomplete] = useState({ students: [], total: 0, page: 1, loading: false })

  const fetchCounts = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/dashboard/stats`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      const w = data.warnings || {}
      setTotalStudents(data.stats?.totalStudents || 0)
      setCounts({
        no_uii: w.no_uii?.count || 0,
        no_lrn: w.no_lrn?.count || 0,
        duplicate_lrn: w.duplicate_lrn?.count || 0,
        no_award_number: w.no_award_number?.count || 0,
        duplicate_award_numbers: w.duplicate_award_numbers?.count || 0,
        incomplete_info: w.incomplete_info?.count || 0,
      })
      if (w.duplicate_award_numbers?.students) {
        setDupAward({ students: w.duplicate_award_numbers.students, total: w.duplicate_award_numbers.students.length, page: 1, loading: false })
      }
      if (w.duplicate_lrn?.students) {
        setDupLrn({ students: w.duplicate_lrn.students, total: w.duplicate_lrn.students.length, page: 1, loading: false })
      }
    } catch (err) {
      console.error('Failed to fetch counts:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPaginated = useCallback(async (endpoint, setter, page = 1) => {
    setter(prev => ({ ...prev, loading: true }))
    try {
      const res = await fetch(`${API_URL}/dashboard/warnings/${endpoint}?page=${page}&per_page=${PAGE_SIZE}`)
      const data = await res.json()
      setter({ students: data.students || [], total: data.total || 0, page: data.page || page, loading: false })
    } catch (err) {
      console.error(`Failed to fetch ${endpoint}:`, err)
      setter(prev => ({ ...prev, loading: false }))
    }
  }, [])

  useEffect(() => { fetchCounts() }, [fetchCounts])

  useEffect(() => {
    if (loading) return
    const tabConfig = {
      no_uii: { count: counts.no_uii, data: noUii, endpoint: 'no-uii', setter: setNoUii },
      no_lrn: { count: counts.no_lrn, data: noLrn, endpoint: 'no-lrn', setter: setNoLrn },
      no_award: { count: counts.no_award_number, data: noAward, endpoint: 'no-award-number', setter: setNoAward },
      incomplete: { count: counts.incomplete_info, data: incomplete, endpoint: 'incomplete-info', setter: setIncomplete },
    }
    const cfg = tabConfig[activeTab]
    if (cfg && cfg.count > 0 && cfg.data.students.length === 0) {
      fetchPaginated(cfg.endpoint, cfg.setter, 1)
    }
  }, [activeTab, loading])

  const totalIssues = useMemo(() => Object.values(counts).reduce((sum, c) => sum + c, 0), [counts])

  const getCountForTab = useCallback((key) => {
    const map = {
      duplicate_award: counts.duplicate_award_numbers,
      duplicate_lrn: counts.duplicate_lrn,
      no_uii: counts.no_uii,
      no_lrn: counts.no_lrn,
      no_award: counts.no_award_number,
      incomplete: counts.incomplete_info,
    }
    return map[key] || 0
  }, [counts])

  // Memoized column helpers
  const nameCol = useMemo(() => ({
    title: 'Name',
    key: 'name',
    render: (_, r) => {
      const name = `${r.surname || ''}, ${r.first_name || ''}`.trim()
      return <a onClick={() => navigate(`/students/${r.seq}`)} style={{ color: '#0032a0', fontWeight: 500 }}>{name || 'N/A'}</a>
    },
  }), [navigate])

  const statusCol = useMemo(() => ({
    title: 'Status',
    dataIndex: 'scholarship_status',
    key: 'status',
    width: 120,
    render: (status) => {
      const colorMap = { 'On-going': 'green', Active: 'green', Graduated: 'blue', Terminated: 'red' }
      return <Tag color={colorMap[status] || 'default'}>{status || 'N/A'}</Tag>
    },
  }), [])

  const institutionCol = useMemo(() => ({
    title: 'Institution',
    dataIndex: 'name_of_institution',
    key: 'institution',
    ellipsis: true,
  }), [])

  const viewCol = useMemo(() => ({
    title: '',
    key: 'action',
    width: 60,
    render: (_, r) => (
      <a onClick={() => navigate(`/students/${r.seq}`)} style={{ color: '#0032a0', fontSize: 13 }}>View</a>
    ),
  }), [navigate])

  const missingTag = useCallback((label) => ({
    title: 'Issue',
    key: 'missing',
    width: 150,
    render: () => (
      <Tag color="orange" style={{ fontSize: 12 }}>
        <WarningOutlined style={{ marginRight: 4 }} />{label}
      </Tag>
    ),
  }), [])

  const columnSets = useMemo(() => ({
    duplicate_award: [
      { title: 'Award No.', dataIndex: 'award_number', key: 'award_number', width: 150,
        render: (v) => <Text strong style={{ color: '#ff4d4f' }}>{v}</Text> },
      nameCol,
      { title: 'Program', dataIndex: 'scholarship_program', key: 'program', ellipsis: true },
      statusCol,
      viewCol,
    ],
    no_award: [
      nameCol,
      missingTag('Award No.'),
      { title: 'Program', dataIndex: 'scholarship_program', key: 'program', ellipsis: true },
      institutionCol,
      statusCol,
      viewCol,
    ],
    duplicate_lrn: [
      { title: 'LRN', dataIndex: 'learner_reference_number', key: 'lrn', width: 180,
        render: (v) => <Text strong style={{ color: '#ff4d4f' }}>{v}</Text> },
      nameCol,
      institutionCol,
      statusCol,
      viewCol,
    ],
    no_lrn: [
      nameCol,
      missingTag('LRN'),
      { title: 'Award No.', dataIndex: 'award_number', key: 'award_number', ellipsis: true },
      institutionCol,
      statusCol,
      viewCol,
    ],
    no_uii: [
      nameCol,
      missingTag('UII'),
      { title: 'Award No.', dataIndex: 'award_number', key: 'award_number', ellipsis: true },
      institutionCol,
      statusCol,
      viewCol,
    ],
    incomplete: [
      nameCol,
      {
        title: 'Count',
        dataIndex: 'missing_count',
        key: 'missing_count',
        width: 80,
        align: 'center',
        render: (count) => (
          <Tag color="orange" style={{ fontWeight: 600, minWidth: 36, textAlign: 'center' }}>{count}</Tag>
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
  }), [nameCol, statusCol, institutionCol, viewCol, missingTag])

  const getTabData = useCallback((tabKey) => {
    const map = {
      duplicate_award: { data: dupAward, paginated: false },
      duplicate_lrn: { data: dupLrn, paginated: false },
      no_uii: { data: noUii, paginated: true, endpoint: 'no-uii', setter: setNoUii },
      no_lrn: { data: noLrn, paginated: true, endpoint: 'no-lrn', setter: setNoLrn },
      no_award: { data: noAward, paginated: true, endpoint: 'no-award-number', setter: setNoAward },
      incomplete: { data: incomplete, paginated: true, endpoint: 'incomplete-info', setter: setIncomplete },
    }
    return map[tabKey] || { data: { students: [], total: 0, page: 1, loading: false }, paginated: false }
  }, [dupAward, dupLrn, noUii, noLrn, noAward, incomplete])

  const activeIssue = ISSUE_TYPES.find(t => t.key === activeTab)

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 120px)' }}>
        <Spin size="large" />
        <Text style={{ marginLeft: 16, fontSize: 15 }}>Loading data quality report...</Text>
      </div>
    )
  }

  const { data: tabData, paginated, endpoint, setter } = getTabData(activeTab)
  const displayData = paginated
    ? tabData.students
    : tabData.students.slice((tabData.page - 1) * PAGE_SIZE, tabData.page * PAGE_SIZE)

  return (
    <div style={{ background: '#fafbfc', minHeight: '100vh', margin: -24 }}>
      {/* Header — matches dashboard */}
      <div style={{ padding: '24px', borderBottom: '1px solid #e8eaed', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>Data Quality</Title>
            <Text style={{ color: '#6b7280', fontSize: 16 }}>Review and fix data issues across student records</Text>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: totalIssues > 0 ? '#ff4d4f' : '#52c41a', lineHeight: 1 }}>
              {totalIssues}
            </div>
            <Text style={{ color: '#6b7280', fontSize: 13 }}>Total Issues</Text>
          </div>
        </div>
      </div>

      {/* Issue Summary Cards with Progress */}
      <div style={{ padding: '24px', background: '#fff', borderBottom: '1px solid #e8eaed' }}>
        <Row gutter={[16, 16]}>
          {ISSUE_TYPES.map(item => {
            const count = getCountForTab(item.key)
            const pct = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0
            const isActive = activeTab === item.key
            return (
              <Col xs={12} sm={8} md={4} key={item.key}>
                <Card
                  size="small"
                  hoverable
                  style={{
                    borderRadius: 12,
                    cursor: 'pointer',
                    borderColor: isActive ? item.color : '#f0f2f5',
                    borderWidth: isActive ? 2 : 1,
                    background: isActive ? `${item.color}08` : '#fff',
                    boxShadow: isActive ? `0 2px 8px ${item.color}20` : '0 2px 8px rgba(0,0,0,0.04)',
                    transition: 'all 0.2s ease',
                  }}
                  bodyStyle={{ padding: '16px' }}
                  onClick={() => setActiveTab(item.key)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ color: item.color, fontSize: 14 }}>{item.icon}</span>
                    <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.2 }}>{item.label}</Text>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: count > 0 ? item.color : '#52c41a', lineHeight: 1 }}>
                    {count}
                  </div>
                </Card>
              </Col>
            )
          })}
        </Row>
      </div>

      {/* Table Section */}
      <div style={{ padding: '24px' }}>
        <Card
          style={{
            borderRadius: 12,
            border: '1px solid #e8eaed',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
          bodyStyle={{ padding: 0 }}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: activeIssue?.color, fontSize: 16 }}>{activeIssue?.icon}</span>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{activeIssue?.label}</span>
              <Tag
                style={{
                  backgroundColor: activeIssue?.color,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '0 10px',
                  lineHeight: '22px',
                }}
              >
                {getCountForTab(activeTab)}
              </Tag>
            </div>
          }
        >
          <Spin spinning={tabData.loading} indicator={<LoadingOutlined />}>
            <Table
              dataSource={displayData}
              columns={columnSets[activeTab] || []}
              size="middle"
              pagination={false}
              rowKey="seq"
              locale={{ emptyText: <Empty description="No issues found" /> }}
            />
            {tabData.total > PAGE_SIZE && (
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f0f0f0' }}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {tabData.total} total records
                </Text>
                <Pagination
                  size="small"
                  current={tabData.page}
                  total={tabData.total}
                  pageSize={PAGE_SIZE}
                  onChange={(page) => {
                    if (paginated) {
                      fetchPaginated(endpoint, setter, page)
                    } else {
                      if (activeTab === 'duplicate_award') setDupAward(prev => ({ ...prev, page }))
                      if (activeTab === 'duplicate_lrn') setDupLrn(prev => ({ ...prev, page }))
                    }
                  }}
                  showSizeChanger={false}
                />
              </div>
            )}
          </Spin>
        </Card>
      </div>
    </div>
  )
}
