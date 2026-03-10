import { Card, Typography, Table, Tag, Spin, Empty, Pagination, Button, Modal, Select, Input, message, Tooltip, Space } from 'antd'
import {
  WarningOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  SwapOutlined,
  EditOutlined,
  ArrowRightOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { API_BASE as API_URL } from '../lib/config'

const { Title, Text } = Typography
const { Option } = Select

// Human-readable field labels — aligned with backend DashboardController $requiredFields
const fieldLabels = {
  surname: 'Surname',
  first_name: 'First Name',
  sex: 'Sex',
  civil_status: 'Civil Status',
  date_of_birth: 'Date of Birth',
  contact_number: 'Contact No.',
  email_address: 'Email',
  street: 'Street',
  brgy_psgc_code: 'Brgy PSGC Code',
  brgy: 'Barangay',
  municipality_psgc_code: 'Municipality PSGC Code',
  municipality: 'Municipality',
  province_psgc_code: 'Province PSGC Code',
  province: 'Province',
  congressional_district: 'District',
  zip_code: 'ZIP Code',
  name_of_institution: 'Institution',
  uii: 'UII',
  institutional_type: 'Inst. Type',
  region: 'Region',
  prio_program_code: 'Priority Program Code',
  degree_program: 'Degree Program',
  discipline_code: 'Discipline Code',
  program_discipline: 'Program Discipline',
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
  // Disbursement (StuFAPs) fields
  nta: 'NTA',
  fund_source: 'Fund Source',
  voucher_tracking_no: 'Voucher Tracking No.',
  mode_of_payment: 'Mode of Payment',
  atm_account_no: 'ATM Account No.',
  date_process: 'Date Processed',
}

const PAGE_SIZE = 15
const GROUPS_PER_PAGE = 5

// Fields that are auto-filled by StudentLookupService — if still missing, source data didn't match
// Issue types in alphabetical order
const ISSUE_TYPES = [
  { key: 'no_award', label: 'Missing Award No.', color: '#8c8c8c', icon: <InfoCircleOutlined /> },
  { key: 'duplicate_award', label: 'Duplicate Award No.', color: '#ff4d4f', icon: <ExclamationCircleOutlined /> },
  { key: 'no_lrn', label: 'Missing LRN', color: '#fa8c16', icon: <WarningOutlined /> },
  { key: 'duplicate_lrn', label: 'Duplicate LRN', color: '#ff4d4f', icon: <ExclamationCircleOutlined /> },
  { key: 'no_status', label: 'Missing Status', color: '#fa8c16', icon: <WarningOutlined /> },
  { key: 'no_uii', label: 'Missing UII', color: '#8c8c8c', icon: <InfoCircleOutlined /> },
  { key: 'incomplete', label: 'Incomplete Info', color: '#fa8c16', icon: <WarningOutlined /> },
  { key: 'incomplete_stufaps_disb', label: 'Incomplete StuFAPs Disb.', color: '#d4380d', icon: <ExclamationCircleOutlined /> },
]

const VALID_TABS = ['no_award', 'duplicate_award', 'no_lrn', 'duplicate_lrn', 'no_status', 'no_uii', 'incomplete', 'incomplete_stufaps_disb']

export default function DataQuality({ readOnly = false, canEdit = false }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = VALID_TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'no_award'
  const [loading, setLoading] = useState(true)

  // Bulk Edit state
  const [bulkEditVisible, setBulkEditVisible] = useState(false)
  const [bulkField, setBulkField] = useState(null)
  const [bulkOldValue, setBulkOldValue] = useState(null)
  const [bulkNewValue, setBulkNewValue] = useState('')
  const [bulkFieldValues, setBulkFieldValues] = useState([]) // [{value, count}]
  const [loadingFieldValues, setLoadingFieldValues] = useState(false)
  const [bulkSubmitting, setBulkSubmitting] = useState(false)

  const bulkFieldOptions = [
    { label: 'Course Name', value: 'degree_program' },
    { label: 'Program Major', value: 'program_major' },
    { label: 'Program Discipline', value: 'program_discipline' },
    { label: 'Program Degree Level', value: 'program_degree_level' },
    { label: 'Institution Name', value: 'name_of_institution' },
    { label: 'Institution Type', value: 'institutional_type' },
    { label: 'Region', value: 'region' },
    { label: 'Province', value: 'province' },
    { label: 'Municipality', value: 'municipality' },
    { label: 'Barangay', value: 'brgy' },
    { label: 'Street', value: 'street' },
    { label: 'Congressional District', value: 'congressional_district' },
    { label: 'Scholarship Program', value: 'scholarship_program' },
    { label: 'Scholarship Status', value: 'scholarship_status' },
    { label: 'Special Group', value: 'special_group' },
    { label: 'Authority Type', value: 'authority_type' },
    { label: 'Authority Number', value: 'authority_number' },
    { label: 'Series', value: 'series' },
    { label: 'Basis CMO', value: 'basis_cmo' },
    { label: 'Termination Reason', value: 'termination_reason' },
    { label: 'Replacement Info', value: 'replacement_info' },
  ]

  const fetchBulkFieldValues = async (fieldName) => {
    setLoadingFieldValues(true)
    setBulkFieldValues([])
    try {
      const res = await fetch(`${API_URL}/students/distinct-values?field=${encodeURIComponent(fieldName)}`)
      if (res.ok) {
        const data = await res.json()
        setBulkFieldValues(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching field values:', error)
    } finally {
      setLoadingFieldValues(false)
    }
  }

  const handleBulkFieldChange = (field) => {
    setBulkField(field)
    setBulkOldValue(null)
    setBulkNewValue('')
    if (field) fetchBulkFieldValues(field)
  }

  const handleBulkOpen = () => {
    setBulkField(null)
    setBulkOldValue(null)
    setBulkNewValue('')
    setBulkFieldValues([])
    setBulkEditVisible(true)
  }

  const selectedCount = useMemo(() => {
    if (!bulkOldValue) return 0
    const match = bulkFieldValues.find(v => v.value === bulkOldValue)
    return match?.count || 0
  }, [bulkOldValue, bulkFieldValues])

  const canSubmitBulk = bulkField && bulkOldValue && bulkNewValue.trim() && bulkNewValue.trim() !== bulkOldValue

  const handleBulkSubmit = async () => {
    if (!canSubmitBulk) return
    setBulkSubmitting(true)
    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
      const res = await fetch(`${API_URL}/students/bulk-update-field`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(storedUser?.id ? { 'X-User-Id': String(storedUser.id) } : {}) },
        body: JSON.stringify({ field: bulkField, old_value: bulkOldValue, new_value: bulkNewValue.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        message.success(`${data.updated_count} record${data.updated_count !== 1 ? 's' : ''} updated`)
        setBulkEditVisible(false)
        fetchCounts()
      } else {
        message.error(data.error || 'Failed to update')
      }
    } catch (error) {
      console.error('Bulk edit error:', error)
      message.error('Failed to update records')
    } finally {
      setBulkSubmitting(false)
    }
  }
  const [counts, setCounts] = useState({
    no_lrn: 0,
    no_status: 0,
    no_uii: 0,
    duplicate_lrn: 0,
    no_award_number: 0,
    duplicate_award_numbers: 0,
    incomplete_info: 0,
    incomplete_stufaps: 0,
  })
  const [totalStudents, setTotalStudents] = useState(0)
  const [activeTab, setActiveTabState] = useState(initialTab)
  const setActiveTab = useCallback((tab) => {
    setActiveTabState(tab)
    setSearchParams({ tab }, { replace: true })
  }, [setSearchParams])

  const [dupAward, setDupAward] = useState({ students: [], total: 0, page: 1, loading: false })
  const [dupLrn, setDupLrn] = useState({ students: [], total: 0, page: 1, loading: false })
  const [noLrn, setNoLrn] = useState({ students: [], total: 0, page: 1, loading: false })
  const [noAward, setNoAward] = useState({ students: [], total: 0, page: 1, loading: false })
  const [noStatus, setNoStatus] = useState({ students: [], total: 0, page: 1, loading: false })
  const [noUii, setNoUii] = useState({ institutions: [], total: 0, page: 1, loading: false })
  const [incomplete, setIncomplete] = useState({ students: [], total: 0, page: 1, loading: false })
  const [incompleteStufapsDisb, setIncompleteStufapsDisb] = useState({ students: [], total: 0, page: 1, loading: false })

  const fetchCounts = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/dashboard/stats`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      const w = data.warnings || {}
      setTotalStudents(data.stats?.totalStudents || 0)
      setCounts({
        no_lrn: w.no_lrn?.count || 0,
        no_status: w.no_status?.count || 0,
        no_uii: w.no_uii?.count || 0,
        duplicate_lrn: w.duplicate_lrn?.count || 0,
        no_award_number: w.no_award_number?.count || 0,
        duplicate_award_numbers: w.duplicate_award_numbers?.count || 0,
        incomplete_info: w.incomplete_info?.count || 0,
        incomplete_stufaps: w.incomplete_stufaps?.count || 0,
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

  const fetchNoUii = useCallback(async (page = 1) => {
    setNoUii(prev => ({ ...prev, loading: true }))
    try {
      const res = await fetch(`${API_URL}/dashboard/warnings/no-uii?page=${page}&per_page=${PAGE_SIZE}`)
      const data = await res.json()
      setNoUii({
        institutions: data.institutions || [],
        total: data.total_institutions || 0,
        page: data.page || page,
        loading: false,
      })
    } catch (err) {
      console.error('Failed to fetch no-uii:', err)
      setNoUii(prev => ({ ...prev, loading: false }))
    }
  }, [])

  const fetchIncompleteStufapsDisb = useCallback(async (page = 1) => {
    setIncompleteStufapsDisb(prev => ({ ...prev, loading: true }))
    try {
      const res = await fetch(`${API_URL}/dashboard/warnings/incomplete-stufaps?page=${page}&per_page=${PAGE_SIZE}`)
      const data = await res.json()
      setIncompleteStufapsDisb({
        students: data.students || [],
        total: data.total || 0,
        page: data.page || page,
        loading: false,
      })
    } catch (err) {
      console.error('Failed to fetch incomplete-stufaps:', err)
      setIncompleteStufapsDisb(prev => ({ ...prev, loading: false }))
    }
  }, [])

  useEffect(() => { fetchCounts() }, [fetchCounts])

  useEffect(() => {
    if (loading) return
    const tabConfig = {
      no_lrn: { count: counts.no_lrn, data: noLrn, endpoint: 'no-lrn', setter: setNoLrn },
      no_award: { count: counts.no_award_number, data: noAward, endpoint: 'no-award-number', setter: setNoAward },
      no_status: { count: counts.no_status, data: noStatus, endpoint: 'no-status', setter: setNoStatus },
      no_uii: { count: counts.no_uii, data: noUii, customFetch: fetchNoUii },
      incomplete: { count: counts.incomplete_info, data: incomplete, endpoint: 'incomplete-info', setter: setIncomplete },
      incomplete_stufaps_disb: { count: counts.incomplete_stufaps, data: incompleteStufapsDisb, customFetch: fetchIncompleteStufapsDisb },
    }
    const cfg = tabConfig[activeTab]
    const hasData = (cfg?.data?.students?.length > 0) || (cfg?.data?.institutions?.length > 0)
    if (cfg && cfg.count > 0 && !hasData) {
      if (cfg.customFetch) {
        cfg.customFetch(1)
      } else {
        fetchPaginated(cfg.endpoint, cfg.setter, 1)
      }
    }
  }, [activeTab, loading])

  const totalIssues = useMemo(() => Object.values(counts).reduce((sum, c) => sum + c, 0), [counts])

  const getCountForTab = useCallback((key) => {
    const map = {
      duplicate_award: counts.duplicate_award_numbers,
      duplicate_lrn: counts.duplicate_lrn,
      no_lrn: counts.no_lrn,
      no_status: counts.no_status,
      no_uii: counts.no_uii,
      no_award: counts.no_award_number,
      incomplete: counts.incomplete_info,
      incomplete_stufaps_disb: counts.incomplete_stufaps,
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
    no_status: [
      nameCol,
      missingTag('Status'),
      { title: 'Award No.', dataIndex: 'award_number', key: 'award_number', ellipsis: true },
      { title: 'Program', dataIndex: 'scholarship_program', key: 'program', ellipsis: true },
      institutionCol,
      viewCol,
    ],
    no_uii: [
      { title: 'Institution', dataIndex: 'institution', key: 'institution', ellipsis: true,
        render: (v) => <Text strong>{v || 'N/A'}</Text> },
      {
        title: 'Students Affected',
        dataIndex: 'student_count',
        key: 'student_count',
        width: 150,
        align: 'center',
        render: (count) => (
          <Tag color="orange" style={{ fontWeight: 600, minWidth: 36, textAlign: 'center' }}>{count}</Tag>
        ),
      },
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
        render: (fields) => {
          const count = (fields || []).length
          if (!count) return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
          const list = fields.map(f => fieldLabels[f] || f).join(', ')
          return (
            <Tooltip title={list}>
              <Tag color="orange" style={{ fontSize: 12, cursor: 'default' }}>
                {count} missing field{count !== 1 ? 's' : ''}
              </Tag>
            </Tooltip>
          )
        },
      },
      statusCol,
      viewCol,
    ],
    incomplete_stufaps_disb: [
      {
        title: 'Name',
        key: 'name',
        render: (_, r) => {
          const name = `${r.surname || ''}, ${r.first_name || ''}`.trim()
          return <a onClick={() => navigate(`/students/${r.student_seq}`)} style={{ color: '#0032a0', fontWeight: 500 }}>{name || 'N/A'}</a>
        },
      },
      { title: 'Program', dataIndex: 'scholarship_program', key: 'program' },
      {
        title: 'Missing Fields',
        dataIndex: 'missing_field_count',
        key: 'missing_field_count',
        width: 140,
        align: 'center',
        render: (count) => (
          <Tag color="orange" style={{ fontWeight: 600, minWidth: 36, textAlign: 'center' }}>{count}</Tag>
        ),
      },
      statusCol,
      {
        title: '',
        key: 'action',
        width: 60,
        render: (_, r) => (
          <a onClick={() => navigate(`/students/${r.student_seq}`)} style={{ color: '#0032a0', fontSize: 13 }}>View</a>
        ),
      },
    ],
  }), [nameCol, statusCol, institutionCol, viewCol, missingTag, navigate])

  // Group duplicate students by shared value for visual clarity
  const groupedDupAward = useMemo(() => {
    const groups = {}
    dupAward.students.forEach(s => {
      if (!groups[s.award_number]) groups[s.award_number] = []
      groups[s.award_number].push(s)
    })
    return Object.entries(groups).map(([award, students]) => ({ award, students }))
  }, [dupAward.students])

  const groupedDupLrn = useMemo(() => {
    const groups = {}
    dupLrn.students.forEach(s => {
      if (!groups[s.learner_reference_number]) groups[s.learner_reference_number] = []
      groups[s.learner_reference_number].push(s)
    })
    return Object.entries(groups).map(([lrn, students]) => ({ lrn, students }))
  }, [dupLrn.students])

  const [dupAwardPage, setDupAwardPage] = useState(1)
  const [dupLrnPage, setDupLrnPage] = useState(1)

  const pagedDupAward = useMemo(() => {
    const start = (dupAwardPage - 1) * GROUPS_PER_PAGE
    return groupedDupAward.slice(start, start + GROUPS_PER_PAGE)
  }, [groupedDupAward, dupAwardPage])

  const pagedDupLrn = useMemo(() => {
    const start = (dupLrnPage - 1) * GROUPS_PER_PAGE
    return groupedDupLrn.slice(start, start + GROUPS_PER_PAGE)
  }, [groupedDupLrn, dupLrnPage])

  const getTabData = useCallback((tabKey) => {
    const map = {
      duplicate_award: { data: dupAward, paginated: false },
      duplicate_lrn: { data: dupLrn, paginated: false },
      no_lrn: { data: noLrn, paginated: true, endpoint: 'no-lrn', setter: setNoLrn },
      no_status: { data: noStatus, paginated: true, endpoint: 'no-status', setter: setNoStatus },
      no_uii: { data: noUii, paginated: true, customFetch: fetchNoUii },
      no_award: { data: noAward, paginated: true, endpoint: 'no-award-number', setter: setNoAward },
      incomplete: { data: incomplete, paginated: true, endpoint: 'incomplete-info', setter: setIncomplete },
      incomplete_stufaps_disb: { data: incompleteStufapsDisb, paginated: true, customFetch: fetchIncompleteStufapsDisb },
    }
    return map[tabKey] || { data: { students: [], total: 0, page: 1, loading: false }, paginated: false }
  }, [dupAward, dupLrn, noLrn, noStatus, noUii, noAward, incomplete, incompleteStufapsDisb, fetchNoUii, fetchIncompleteStufapsDisb])

  const activeIssue = ISSUE_TYPES.find(t => t.key === activeTab)

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 120px)' }}>
        <Spin size="large" />
        <Text style={{ marginLeft: 16, fontSize: 15 }}>Loading data quality report...</Text>
      </div>
    )
  }

  const { data: tabData, paginated, endpoint, setter, customFetch } = getTabData(activeTab)
  const displayData = activeTab === 'no_uii'
    ? tabData.institutions || []
    : paginated
      ? tabData.students
      : tabData.students?.slice((tabData.page - 1) * PAGE_SIZE, tabData.page * PAGE_SIZE) || []

  return (
    <div style={{ background: '#fafbfc', minHeight: '100vh', margin: -24 }}>
      {/* Header — matches dashboard */}
      <div style={{ padding: '24px', borderBottom: '1px solid #e8eaed', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>Data Quality</Title>
            <Text style={{ color: '#6b7280', fontSize: 16 }}>Review and fix data issues across student records</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {!readOnly && canEdit && (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={handleBulkOpen}
              >
                Find & Replace
              </Button>
            )}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: totalIssues > 0 ? '#ff4d4f' : '#52c41a', lineHeight: 1 }}>
                {totalIssues}
              </div>
              <Text style={{ color: '#6b7280', fontSize: 13 }}>Total Issues</Text>
            </div>
          </div>
        </div>
      </div>

      {/* Issue Summary Cards */}
      <div style={{ padding: '24px', background: '#fff', borderBottom: '1px solid #e8eaed' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          {ISSUE_TYPES.map(item => {
            const count = getCountForTab(item.key)
            const isActive = activeTab === item.key
            return (
              <Card
                key={item.key}
                size="small"
                hoverable
                style={{
                  flex: 1,
                  minWidth: 0,
                  borderRadius: 12,
                  cursor: 'pointer',
                  borderColor: isActive ? item.color : '#f0f2f5',
                  borderWidth: isActive ? 2 : 1,
                  background: isActive ? `${item.color}08` : '#fff',
                  boxShadow: isActive ? `0 2px 8px ${item.color}20` : '0 2px 8px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s ease',
                }}
                styles={{ body: { padding: '16px' } }}
                onClick={() => setActiveTab(item.key)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ color: item.color, fontSize: 14 }}>{item.icon}</span>
                  <Text style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.2 }}>{item.label}</Text>
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: count > 0 ? item.color : '#52c41a', lineHeight: 1 }}>
                  {count}
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Table Section */}
      <div style={{ padding: '24px' }}>
        <Card
          style={{
            borderRadius: 12,
            border: '1px solid #e8eaed',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
          styles={{ body: { padding: 0 } }}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
            {(activeTab === 'duplicate_award' || activeTab === 'duplicate_lrn') ? (
              <div style={{ padding: '16px' }}>
                {(() => {
                  const groups = activeTab === 'duplicate_award' ? groupedDupAward : groupedDupLrn
                  const pagedGroups = activeTab === 'duplicate_award' ? pagedDupAward : pagedDupLrn
                  const page = activeTab === 'duplicate_award' ? dupAwardPage : dupLrnPage
                  const setPage = activeTab === 'duplicate_award' ? setDupAwardPage : setDupLrnPage

                  if (groups.length === 0) return <Empty description="No issues found" />

                  return (
                    <>
                      {pagedGroups.map((group, idx) => {
                        const sharedValue = activeTab === 'duplicate_award' ? group.award : group.lrn
                        const label = activeTab === 'duplicate_award' ? 'Award No.' : 'LRN'
                        return (
                          <div
                            key={sharedValue}
                            style={{
                              border: '1px solid #ffe0e0',
                              borderRadius: 10,
                              marginBottom: idx < pagedGroups.length - 1 ? 16 : 0,
                              overflow: 'hidden',
                              background: '#fff',
                            }}
                          >
                            <div style={{
                              background: '#fff1f0',
                              padding: '10px 16px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              borderBottom: '1px solid #ffe0e0',
                            }}>
                              <SwapOutlined style={{ color: '#ff4d4f', fontSize: 14 }} />
                              <Text style={{ fontSize: 13, color: '#8c8c8c' }}>{label}:</Text>
                              <Text strong style={{ color: '#ff4d4f', fontSize: 14 }}>{sharedValue}</Text>
                              <Tag color="red" style={{ marginLeft: 'auto', fontSize: 12 }}>
                                {group.students.length} students share this {label.toLowerCase()}
                              </Tag>
                            </div>
                            <Table
                              dataSource={group.students}
                              columns={[
                                nameCol,
                                { title: 'Program', dataIndex: 'scholarship_program', key: 'program', ellipsis: true },
                                statusCol,
                                viewCol,
                              ]}
                              size="small"
                              pagination={false}
                              rowKey="seq"
                              showHeader={idx === 0}
                              style={{ borderRadius: 0 }}
                            />
                          </div>
                        )
                      })}
                      {groups.length > GROUPS_PER_PAGE && (
                        <div style={{ padding: '12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text type="secondary" style={{ fontSize: 13 }}>
                            {groups.length} duplicate groups &middot; {getCountForTab(activeTab)} students total
                          </Text>
                          <Pagination
                            size="small"
                            current={page}
                            total={groups.length}
                            pageSize={GROUPS_PER_PAGE}
                            onChange={setPage}
                            showSizeChanger={false}
                          />
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            ) : (
              <>
                <Table
                  dataSource={displayData}
                  columns={columnSets[activeTab] || []}
                  size="middle"
                  pagination={false}
                  rowKey={activeTab === 'incomplete_stufaps_disb' ? 'student_seq' : activeTab === 'no_uii' ? 'institution' : 'seq'}
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
                          if (customFetch) {
                            customFetch(page)
                          } else {
                            fetchPaginated(endpoint, setter, page)
                          }
                        }
                      }}
                      showSizeChanger={false}
                    />
                  </div>
                )}
              </>
            )}
          </Spin>
        </Card>
      </div>

      {/* Find & Replace Modal */}
      <Modal
        open={bulkEditVisible}
        onCancel={() => setBulkEditVisible(false)}
        title={null}
        width={560}
        footer={null}
        destroyOnClose
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0f5ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SearchOutlined style={{ fontSize: 18, color: '#2f54eb' }} />
          </div>
          <div>
            <Text strong style={{ fontSize: 16, display: 'block', lineHeight: 1.3 }}>Find & Replace</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>Update a value across all student records</Text>
          </div>
        </div>

        {/* Step 1: Field */}
        <div style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, color: '#8c8c8c', display: 'block', marginBottom: 6 }}>FIELD</Text>
          <Select
            value={bulkField}
            onChange={handleBulkFieldChange}
            style={{ width: '100%' }}
            placeholder="Select a field..."
            showSearch
            optionFilterProp="label"
            options={bulkFieldOptions}
            size="large"
          />
        </div>

        {/* Step 2: Find → Replace */}
        {bulkField && (
          <div style={{
            background: '#fafafa', borderRadius: 10, padding: 16, marginBottom: 16,
            border: '1px solid #f0f0f0',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              {/* Find */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 12, color: '#ff4d4f', fontWeight: 600, display: 'block', marginBottom: 6 }}>FIND</Text>
                <Select
                  value={bulkOldValue}
                  onChange={setBulkOldValue}
                  style={{ width: '100%' }}
                  placeholder="Select current value"
                  showSearch
                  optionFilterProp="label"
                  loading={loadingFieldValues}
                  notFoundContent={loadingFieldValues ? <Spin size="small" /> : 'No values found'}
                >
                  {bulkFieldValues.map(item => (
                    <Option key={item.value} value={item.value} label={item.value}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.value}</span>
                        <Tag style={{ marginLeft: 8, fontSize: 11, lineHeight: '18px', padding: '0 6px', flexShrink: 0 }}>{item.count}</Tag>
                      </div>
                    </Option>
                  ))}
                </Select>
              </div>

              {/* Arrow */}
              <div style={{ paddingTop: 28, flexShrink: 0 }}>
                <ArrowRightOutlined style={{ fontSize: 16, color: '#bfbfbf' }} />
              </div>

              {/* Replace */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 12, color: '#52c41a', fontWeight: 600, display: 'block', marginBottom: 6 }}>REPLACE WITH</Text>
                <Input
                  value={bulkNewValue}
                  onChange={e => setBulkNewValue(e.target.value)}
                  placeholder="Enter new value"
                />
              </div>
            </div>
          </div>
        )}

        {/* Preview / affected count */}
        {bulkOldValue && (
          <div style={{
            background: selectedCount > 0 ? '#f6ffed' : '#fafafa',
            border: `1px solid ${selectedCount > 0 ? '#b7eb8f' : '#f0f0f0'}`,
            borderRadius: 8, padding: '10px 14px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <InfoCircleOutlined style={{ color: selectedCount > 0 ? '#52c41a' : '#8c8c8c', fontSize: 14 }} />
            <Text style={{ fontSize: 13, color: selectedCount > 0 ? '#389e0d' : '#8c8c8c' }}>
              <strong>{selectedCount}</strong> record{selectedCount !== 1 ? 's' : ''} will be affected
            </Text>
          </div>
        )}

        {/* Same-value warning */}
        {bulkOldValue && bulkNewValue.trim() && bulkNewValue.trim() === bulkOldValue && (
          <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8, padding: '8px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <WarningOutlined style={{ color: '#faad14', fontSize: 13 }} />
            <Text style={{ fontSize: 12, color: '#ad6800' }}>New value is the same as the current value</Text>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
          <Button onClick={() => setBulkEditVisible(false)}>Cancel</Button>
          <Button
            type="primary"
            disabled={!canSubmitBulk}
            loading={bulkSubmitting}
            onClick={handleBulkSubmit}
          >
            Replace {selectedCount > 0 ? `(${selectedCount})` : ''}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
