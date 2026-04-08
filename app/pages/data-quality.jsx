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
  SaveOutlined,
} from '@ant-design/icons'
import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { API_BASE as API_URL } from '../lib/config'
import { useRealtime } from '../lib/useRealtime'
import { useReferenceData } from '../lib/useReferenceData'

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
  { key: 'incomplete_stufaps_disb', label: 'Incomplete Disb.', color: '#d4380d', icon: <ExclamationCircleOutlined /> },
]

const VALID_TABS = ['no_award', 'duplicate_award', 'no_lrn', 'duplicate_lrn', 'no_status', 'no_uii', 'incomplete', 'incomplete_stufaps_disb']

// CSS for clean table styling
const tableStyles = `
  .data-quality-table .ant-table {
    font-size: 13px;
  }
  .data-quality-table .ant-table-thead > tr > th {
    background: #fafafa !important;
    font-weight: 600;
    padding: 8px 12px !important;
    border-bottom: 2px solid #e0e0e0;
    text-align: left !important;
    white-space: nowrap;
  }
  .data-quality-table .ant-table-tbody > tr > td {
    padding: 6px 12px !important;
    border-bottom: 1px solid #f0f0f0;
    vertical-align: middle;
  }
  .data-quality-table .ant-table-tbody > tr:nth-child(even) > td {
    background: #fafbfc;
  }
  .data-quality-table .ant-table-tbody > tr:hover > td {
    background: #e6f4ff !important;
  }
  .data-quality-table .ant-table-cell {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`

export default function DataQuality({ readOnly = false, canEdit = false }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = VALID_TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'no_award'
  const [loading, setLoading] = useState(true)

  // Reference data for institution dropdown
  const refData = useReferenceData(true)

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
    searchRef.current = ''
    setSearchDisplay('')
  }, [setSearchParams])

  const [dupAward, setDupAward] = useState({ students: [], total: 0, page: 1, loading: false })
  const [dupLrn, setDupLrn] = useState({ students: [], total: 0, page: 1, loading: false })
  const [noLrn, setNoLrn] = useState({ students: [], total: 0, page: 1, loading: false })
  const [noAward, setNoAward] = useState({ students: [], total: 0, page: 1, loading: false })
  const [noStatus, setNoStatus] = useState({ students: [], total: 0, page: 1, loading: false })
  const [noUii, setNoUii] = useState({ institutions: [], total: 0, page: 1, loading: false })
  const [incomplete, setIncomplete] = useState({ students: [], total: 0, page: 1, loading: false })
  const [incompleteStufapsDisb, setIncompleteStufapsDisb] = useState({ students: [], total: 0, page: 1, loading: false })

  const searchRef = useRef('')
  const [searchDisplay, setSearchDisplay] = useState('')
  const SEARCHABLE_TABS = ['no_award', 'no_lrn', 'no_status', 'incomplete', 'incomplete_stufaps_disb']

  const fetchCounts = useCallback(async (silent) => {
    try {
      if (!silent) setLoading(true)
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
      if (!silent) setLoading(false)
    }
  }, [])

  const fetchPaginated = useCallback(async (endpoint, setter, page = 1, search = searchRef.current) => {
    setter(prev => ({ ...prev, loading: true }))
    try {
      const params = new URLSearchParams({ page, per_page: PAGE_SIZE })
      if (search) params.set('search', search)
      const res = await fetch(`${API_URL}/dashboard/warnings/${endpoint}?${params}`)
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

  const fetchIncompleteStufapsDisb = useCallback(async (page = 1, search = searchRef.current) => {
    setIncompleteStufapsDisb(prev => ({ ...prev, loading: true }))
    try {
      const params = new URLSearchParams({ page, per_page: PAGE_SIZE })
      if (search) params.set('search', search)
      const res = await fetch(`${API_URL}/dashboard/warnings/incomplete-stufaps?${params}`)
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

  useRealtime(['Student', 'Disbursement'], (silent) => {
    fetchCounts(silent)
    const s = searchRef.current
    const tabRefresh = {
      no_lrn: () => fetchPaginated('no-lrn', setNoLrn, noLrn.page, s),
      no_award: () => fetchPaginated('no-award-number', setNoAward, noAward.page, s),
      no_status: () => fetchPaginated('no-status', setNoStatus, noStatus.page, s),
      no_uii: () => fetchNoUii(noUii.page),
      incomplete: () => fetchPaginated('incomplete-info', setIncomplete, incomplete.page, s),
      incomplete_stufaps_disb: () => fetchIncompleteStufapsDisb(incompleteStufapsDisb.page, s),
    }
    tabRefresh[activeTab]?.()
  })

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
        cfg.customFetch(1, searchRef.current)
      } else {
        fetchPaginated(cfg.endpoint, cfg.setter, 1, searchRef.current)
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
    width: 180,
    render: (_, r) => {
      const name = `${r.surname || ''}, ${r.first_name || ''}`.trim()
      return <a onClick={() => navigate(`/students/${r.seq}`)} style={{ color: '#0032a0', fontWeight: 500 }}>{name || 'N/A'}</a>
    },
  }), [navigate])

  const statusCol = useMemo(() => ({
    title: 'Status',
    dataIndex: 'scholarship_status',
    key: 'status',
    width: 100,
    render: (status) => {
      const colorMap = { 'On-going': 'green', Active: 'green', Graduated: 'blue', Terminated: 'red' }
      return <Tag color={colorMap[status] || 'default'}>{status || 'N/A'}</Tag>
    },
  }), [])

  const institutionCol = useMemo(() => ({
    title: 'Institution',
    dataIndex: 'name_of_institution',
    key: 'institution',
    width: 200,
    ellipsis: true,
  }), [])

  const viewCol = useMemo(() => ({
    title: '',
    key: 'action',
    width: 45,
    render: (_, r) => (
      <a onClick={() => navigate(`/students/${r.seq}`)} style={{ color: '#0032a0' }}>View</a>
    ),
  }), [navigate])

  const missingTag = useCallback((label) => ({
    title: 'Issue',
    key: 'missing',
    width: 130,
    render: () => (
      <Tag color="orange" style={{ fontSize: 12 }}>
        <WarningOutlined style={{ marginRight: 4 }} />{label}
      </Tag>
    ),
  }), [])

  // Bulk Award Number editing state
  const [pendingAwards, setPendingAwards] = useState({}) // { seq: awardValue }
  const [savingBulkAward, setSavingBulkAward] = useState(false)

  // Bulk LRN editing state (must be before columnSets)
  const [pendingLrns, setPendingLrns] = useState({}) // { seq: lrnValue }
  const [savingBulkLrn, setSavingBulkLrn] = useState(false)

  // Bulk Status editing state
  const [pendingStatuses, setPendingStatuses] = useState({}) // { seq: statusValue }
  const [savingBulkStatus, setSavingBulkStatus] = useState(false)

  const pendingAwardCount = useMemo(() => {
    return Object.values(pendingAwards).filter(v => v.trim()).length
  }, [pendingAwards])

  const pendingLrnCount = useMemo(() => {
    return Object.values(pendingLrns).filter(v => v.trim()).length
  }, [pendingLrns])

  const pendingStatusCount = useMemo(() => {
    return Object.values(pendingStatuses).filter(v => v).length
  }, [pendingStatuses])

  const handleAwardChange = useCallback((seq, value) => {
    setPendingAwards(prev => ({ ...prev, [seq]: value }))
  }, [])

  const handleBulkAwardSave = useCallback(async () => {
    const updates = Object.entries(pendingAwards)
      .filter(([, value]) => value.trim())
      .map(([seq, award_number]) => ({ seq: parseInt(seq), award_number: award_number.trim() }))
    
    if (updates.length === 0) {
      message.warning('No Award Numbers to save')
      return
    }
    
    setSavingBulkAward(true)
    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
      const res = await fetch(`${API_URL}/students/bulk-update-award-number`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(storedUser?.id ? { 'X-User-Id': String(storedUser.id) } : {}) },
        body: JSON.stringify({ updates }),
      })
      const data = await res.json()
      if (res.ok) {
        message.success(`Award No. updated for ${data.updated_count} student${data.updated_count !== 1 ? 's' : ''}`)
        setPendingAwards({})
        fetchPaginated('no-award-number', setNoAward, noAward.page)
        fetchCounts()
      } else {
        message.error(data.error || 'Failed to update Award Numbers')
      }
    } catch (err) {
      console.error('Bulk Award save error:', err)
      message.error('Failed to update Award Numbers')
    } finally {
      setSavingBulkAward(false)
    }
  }, [pendingAwards, fetchPaginated, fetchCounts, noAward.page])

  const handleLrnChange = useCallback((seq, value) => {
    setPendingLrns(prev => ({ ...prev, [seq]: value }))
  }, [])

  const handleBulkLrnSave = useCallback(async () => {
    const updates = Object.entries(pendingLrns)
      .filter(([, value]) => value.trim())
      .map(([seq, lrn]) => ({ seq: parseInt(seq), learner_reference_number: lrn.trim() }))
    
    if (updates.length === 0) {
      message.warning('No LRNs to save')
      return
    }
    
    setSavingBulkLrn(true)
    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
      const res = await fetch(`${API_URL}/students/bulk-update-lrn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(storedUser?.id ? { 'X-User-Id': String(storedUser.id) } : {}) },
        body: JSON.stringify({ updates }),
      })
      const data = await res.json()
      if (res.ok) {
        message.success(`LRN updated for ${data.updated_count} student${data.updated_count !== 1 ? 's' : ''}`)
        setPendingLrns({})
        fetchPaginated('no-lrn', setNoLrn, noLrn.page)
        fetchCounts()
      } else {
        message.error(data.error || 'Failed to update LRNs')
      }
    } catch (err) {
      console.error('Bulk LRN save error:', err)
      message.error('Failed to update LRNs')
    } finally {
      setSavingBulkLrn(false)
    }
  }, [pendingLrns, fetchPaginated, fetchCounts, noLrn.page])

  const handleStatusChange = useCallback((seq, value) => {
    setPendingStatuses(prev => ({ ...prev, [seq]: value }))
  }, [])

  const handleBulkStatusSave = useCallback(async () => {
    const updates = Object.entries(pendingStatuses)
      .filter(([, value]) => value)
      .map(([seq, status]) => ({ seq: parseInt(seq), scholarship_status: status }))
    
    if (updates.length === 0) {
      message.warning('No statuses to save')
      return
    }
    
    setSavingBulkStatus(true)
    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
      const res = await fetch(`${API_URL}/students/bulk-update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(storedUser?.id ? { 'X-User-Id': String(storedUser.id) } : {}) },
        body: JSON.stringify({ updates }),
      })
      const data = await res.json()
      if (res.ok) {
        message.success(`Status updated for ${data.updated_count} student${data.updated_count !== 1 ? 's' : ''}`)
        setPendingStatuses({})
        fetchPaginated('no-status', setNoStatus, noStatus.page)
        fetchCounts()
      } else {
        message.error(data.error || 'Failed to update statuses')
      }
    } catch (err) {
      console.error('Bulk status save error:', err)
      message.error('Failed to update statuses')
    } finally {
      setSavingBulkStatus(false)
    }
  }, [pendingStatuses, fetchPaginated, fetchCounts, noStatus.page])

  // Expanded institution students state (no_uii tab)
  const [expandedInstitutions, setExpandedInstitutions] = useState({}) // { institutionName: { students, total, page, loading } }
  const [expandedRowKeys, setExpandedRowKeys] = useState([])

  const fetchInstitutionStudents = useCallback(async (institution, page = 1) => {
    setExpandedInstitutions(prev => ({
      ...prev,
      [institution]: { ...prev[institution], loading: true, page },
    }))
    try {
      const params = new URLSearchParams({ institution, page, per_page: 10 })
      const res = await fetch(`${API_URL}/dashboard/warnings/no-uii-students?${params}`)
      const data = await res.json()
      setExpandedInstitutions(prev => ({
        ...prev,
        [institution]: {
          students: data.students || [],
          total: data.total || 0,
          page: data.page || page,
          loading: false,
        },
      }))
    } catch (err) {
      console.error('Failed to fetch institution students:', err)
      setExpandedInstitutions(prev => ({
        ...prev,
        [institution]: { ...prev[institution], loading: false },
      }))
    }
  }, [])

  // Bulk Institution rename state
  const [pendingInstitutionRenames, setPendingInstitutionRenames] = useState({}) // { oldInstitutionName: newInstitutionName }
  const [savingBulkInstitution, setSavingBulkInstitution] = useState(false)

  const pendingInstitutionCount = useMemo(() => {
    return Object.values(pendingInstitutionRenames).filter(v => v).length
  }, [pendingInstitutionRenames])

  // Institution options from HEI reference data
  const institutionOptions = useMemo(() => {
    if (!refData.institutions) return []
    return refData.institutions.map(h => ({ label: h.name, value: h.name, uii: h.uii }))
  }, [refData.institutions])

  const handleInstitutionRenameChange = useCallback((oldName, newName) => {
    setPendingInstitutionRenames(prev => {
      if (newName) {
        return { ...prev, [oldName]: newName }
      } else {
        const updated = { ...prev }
        delete updated[oldName]
        return updated
      }
    })
  }, [])

  const handleBulkInstitutionSave = useCallback(async () => {
    const updates = Object.entries(pendingInstitutionRenames)
      .filter(([, newName]) => newName)
      .map(([oldName, newName]) => {
        const inst = refData.institutions?.find(h => h.name === newName)
        return {
          old_name: oldName,
          new_name: newName,
          uii: inst?.uii || null,
        }
      })
    
    if (updates.length === 0) {
      message.warning('No institutions to rename')
      return
    }
    
    setSavingBulkInstitution(true)
    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
      const res = await fetch(`${API_URL}/students/bulk-update-institution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(storedUser?.id ? { 'X-User-Id': String(storedUser.id) } : {}) },
        body: JSON.stringify({ updates }),
      })
      const data = await res.json()
      if (res.ok) {
        message.success(`Institution renamed for ${data.updated_count} student${data.updated_count !== 1 ? 's' : ''}`)
        setPendingInstitutionRenames({})
        fetchNoUii(noUii.page)
        fetchCounts()
      } else {
        message.error(data.error || 'Failed to rename institutions')
      }
    } catch (err) {
      console.error('Bulk institution rename error:', err)
      message.error('Failed to rename institutions')
    } finally {
      setSavingBulkInstitution(false)
    }
  }, [pendingInstitutionRenames, refData.institutions, fetchNoUii, fetchCounts, noUii.page])

  const columnSets = useMemo(() => ({
    duplicate_award: [
      nameCol,
      { title: 'Scholarship Program', dataIndex: 'scholarship_program', key: 'program', width: 200, ellipsis: true },
      { title: 'LRN', dataIndex: 'learner_reference_number', key: 'lrn', width: 150, render: (v) => v || <Text type="secondary">—</Text> },
      viewCol,
    ],
    no_award: [
      nameCol,
      { title: 'Scholarship Program', dataIndex: 'scholarship_program', key: 'program', width: 160, ellipsis: true },
      { title: 'LRN', dataIndex: 'learner_reference_number', key: 'lrn', width: 120, render: (v) => v || <Text type="secondary">—</Text> },
      {
        title: 'Award No.',
        key: 'award_number',
        width: 180,
        render: (_, r) => (
          <Input
            size="small"
            value={pendingAwards[r.seq] ?? ''}
            onChange={e => handleAwardChange(r.seq, e.target.value)}
            placeholder="Enter Award No."
            style={{ fontSize: 12 }}
            disabled={savingBulkAward}
          />
        ),
      },
      viewCol,
    ],
    duplicate_lrn: [
      nameCol,
      { title: 'Scholarship Program', dataIndex: 'scholarship_program', key: 'program', width: 200, ellipsis: true },
      { title: 'Award No.', dataIndex: 'award_number', key: 'award_number', width: 150, render: (v) => v || <Text type="secondary">—</Text> },
      viewCol,
    ],
    no_lrn: [
      nameCol,
      { title: 'Award No.', dataIndex: 'award_number', key: 'award_number', width: 150 },
      { title: 'Scholarship Program', dataIndex: 'scholarship_program', key: 'program', width: 160, ellipsis: true },
      {
        title: 'LRN',
        key: 'lrn',
        width: 180,
        render: (_, r) => (
          <Input
            size="small"
            value={pendingLrns[r.seq] ?? ''}
            onChange={e => handleLrnChange(r.seq, e.target.value)}
            placeholder="Enter LRN"
            style={{ fontSize: 12 }}
            disabled={savingBulkLrn}
          />
        ),
      },
      viewCol,
    ],
    no_status: [
      nameCol,
      { title: 'Award No.', dataIndex: 'award_number', key: 'award_number', width: 150 },
      { title: 'Scholarship Program', dataIndex: 'scholarship_program', key: 'program', width: 160, ellipsis: true },
      { title: 'LRN', dataIndex: 'learner_reference_number', key: 'lrn', width: 120, render: (v) => v || <Text type="secondary">—</Text> },
      {
        title: 'Status',
        key: 'status',
        width: 140,
        render: (_, r) => (
          <Select
            size="small"
            value={pendingStatuses[r.seq] || undefined}
            onChange={v => handleStatusChange(r.seq, v)}
            placeholder="Select status"
            style={{ width: '100%', fontSize: 12 }}
            disabled={savingBulkStatus}
            allowClear
          >
            <Option value="Active">Active</Option>
            <Option value="Terminated">Terminated</Option>
            <Option value="Graduated">Graduated</Option>
            <Option value="Replacement">Replacement</Option>
          </Select>
        ),
      },
      viewCol,
    ],
    no_uii: [
      {
        title: 'Affected',
        dataIndex: 'student_count',
        key: 'student_count',
        width: 80,
        render: (count) => (
          <Tag color="orange" style={{ fontWeight: 600 }}>{count}</Tag>
        ),
      },
      { title: 'Institution', dataIndex: 'institution', key: 'institution', ellipsis: true,
        render: (v) => <Text strong>{v || 'N/A'}</Text> },
      {
        title: 'Rename To',
        key: 'rename',
        width: 280,
        render: (_, r) => (
          <Select
            size="small"
            value={pendingInstitutionRenames[r.institution] || undefined}
            onChange={v => handleInstitutionRenameChange(r.institution, v)}
            placeholder="Select HEI"
            style={{ width: '100%', fontSize: 12 }}
            disabled={savingBulkInstitution}
            allowClear
            showSearch
            optionFilterProp="label"
            options={institutionOptions}
          />
        ),
      },
    ],
    incomplete: [
      nameCol,
      { title: 'Award No.', dataIndex: 'award_number', key: 'award_number', width: 150, render: (v) => v || <Text type="secondary">—</Text> },
      { title: 'Scholarship Program', dataIndex: 'scholarship_program', key: 'program', width: 160, ellipsis: true },
      { title: 'LRN', dataIndex: 'learner_reference_number', key: 'lrn', width: 100, render: (v) => v || <Text type="secondary">—</Text> },
      {
        title: 'Missing Fields',
        dataIndex: 'missing_fields',
        key: 'missing_fields',
        width: 100,
        render: (fields) => {
          const count = (fields || []).length
          if (!count) return <Text type="secondary">—</Text>
          const list = fields.map(f => fieldLabels[f] || f).join(', ')
          return (
            <Tooltip title={list} placement="topLeft">
              <Tag color="orange" style={{ cursor: 'pointer' }}>{count} field{count !== 1 ? 's' : ''}</Tag>
            </Tooltip>
          )
        },
      },
      viewCol,
    ],
    incomplete_stufaps_disb: [
      {
        title: 'Name',
        key: 'name',
        width: 180,
        render: (_, r) => {
          const name = `${r.surname || ''}, ${r.first_name || ''}`.trim()
          return <a onClick={() => navigate(`/students/${r.student_seq}`)} style={{ color: '#0032a0', fontWeight: 500 }}>{name || 'N/A'}</a>
        },
      },
      { title: 'Award No.', dataIndex: 'award_number', key: 'award_number', width: 150, render: (v) => v || <Text type="secondary">—</Text> },
      { title: 'Scholarship Program', dataIndex: 'scholarship_program', key: 'program', width: 160, ellipsis: true },
      { title: 'LRN', dataIndex: 'learner_reference_number', key: 'lrn', width: 100, render: (v) => v || <Text type="secondary">—</Text> },
      {
        title: 'Missing Fields',
        key: 'missing_fields',
        width: 100,
        render: (_, r) => {
          const fields = r.missing_fields || []
          const totalCount = r.missing_field_count || fields.length
          if (!totalCount) return <Text type="secondary">—</Text>
          const list = fields.map(f => fieldLabels[f] || f).join(', ')
          return (
            <Tooltip title={`${list} (across all disbursements)`} placement="topLeft">
              <Tag color="orange" style={{ cursor: 'pointer' }}>{totalCount} field{totalCount !== 1 ? 's' : ''}</Tag>
            </Tooltip>
          )
        },
      },
      {
        title: '',
        key: 'action',
        width: 50,
        render: (_, r) => (
          <a onClick={() => navigate(`/students/${r.student_seq}`)} style={{ color: '#0032a0', fontSize: 13 }}>View</a>
        ),
      },
    ],
  }), [nameCol, statusCol, institutionCol, viewCol, missingTag, navigate, pendingAwards, savingBulkAward, handleAwardChange, pendingLrns, savingBulkLrn, handleLrnChange, pendingStatuses, savingBulkStatus, handleStatusChange, pendingInstitutionRenames, savingBulkInstitution, handleInstitutionRenameChange, institutionOptions])

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
      <style>{tableStyles}</style>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
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
              {activeTab === 'no_award' && pendingAwardCount > 0 && (
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleBulkAwardSave}
                  loading={savingBulkAward}
                  style={{ background: '#52c41a', borderColor: '#52c41a' }}
                >
                  Save All ({pendingAwardCount})
                </Button>
              )}
              {activeTab === 'no_lrn' && pendingLrnCount > 0 && (
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleBulkLrnSave}
                  loading={savingBulkLrn}
                  style={{ background: '#52c41a', borderColor: '#52c41a' }}
                >
                  Save All ({pendingLrnCount})
                </Button>
              )}
              {activeTab === 'no_status' && pendingStatusCount > 0 && (
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleBulkStatusSave}
                  loading={savingBulkStatus}
                  style={{ background: '#52c41a', borderColor: '#52c41a' }}
                >
                  Save All ({pendingStatusCount})
                </Button>
              )}
              {activeTab === 'no_uii' && pendingInstitutionCount > 0 && (
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleBulkInstitutionSave}
                  loading={savingBulkInstitution}
                  style={{ background: '#52c41a', borderColor: '#52c41a' }}
                >
                  Save All ({pendingInstitutionCount})
                </Button>
              )}
            </div>
          }
        >
          {SEARCHABLE_TABS.includes(activeTab) && (
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
              <Input.Search
                placeholder="Search by name or award number..."
                allowClear
                value={searchDisplay}
                onChange={e => setSearchDisplay(e.target.value)}
                onSearch={(value) => {
                  searchRef.current = value
                  const tabActions = {
                    no_lrn: () => fetchPaginated('no-lrn', setNoLrn, 1, value),
                    no_award: () => fetchPaginated('no-award-number', setNoAward, 1, value),
                    no_status: () => fetchPaginated('no-status', setNoStatus, 1, value),
                    incomplete: () => fetchPaginated('incomplete-info', setIncomplete, 1, value),
                    incomplete_stufaps_disb: () => fetchIncompleteStufapsDisb(1, value),
                  }
                  tabActions[activeTab]?.()
                }}
                style={{ maxWidth: 340 }}
                size="middle"
              />
            </div>
          )}
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
                              columns={activeTab === 'duplicate_award' ? [
                                nameCol,
                                { title: 'Scholarship Program', dataIndex: 'scholarship_program', key: 'program', width: 200, ellipsis: true },
                                { title: 'LRN', dataIndex: 'learner_reference_number', key: 'lrn', width: 150, render: (v) => v || <Text type="secondary">—</Text> },
                                viewCol,
                              ] : [
                                nameCol,
                                { title: 'Scholarship Program', dataIndex: 'scholarship_program', key: 'program', width: 200, ellipsis: true },
                                { title: 'Award No.', dataIndex: 'award_number', key: 'award_number', width: 150, render: (v) => v || <Text type="secondary">—</Text> },
                                viewCol,
                              ]}
                              size="small"
                              pagination={false}
                              rowKey="seq"
                              showHeader={idx === 0}
                              className="data-quality-table"
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
                  size="small"
                  pagination={false}
                  rowKey={activeTab === 'incomplete_stufaps_disb' ? 'student_seq' : activeTab === 'no_uii' ? 'institution' : 'seq'}
                  locale={{ emptyText: <Empty description="No issues found" /> }}
                  className="data-quality-table"
                  {...(activeTab === 'no_uii' ? {
                    expandable: {
                      expandedRowKeys,
                      onExpand: (expanded, record) => {
                        if (expanded) {
                          setExpandedRowKeys(prev => [...prev, record.institution])
                          if (!expandedInstitutions[record.institution]?.students) {
                            fetchInstitutionStudents(record.institution)
                          }
                        } else {
                          setExpandedRowKeys(prev => prev.filter(k => k !== record.institution))
                        }
                      },
                      expandedRowRender: (record) => {
                        const instData = expandedInstitutions[record.institution] || {}
                        const students = instData.students || []
                        return (
                          <div style={{ padding: '4px 0' }}>
                            <Spin spinning={!!instData.loading} indicator={<LoadingOutlined />}>
                              <Table
                                dataSource={students}
                                columns={[
                                  {
                                    title: 'Name', key: 'name', width: 180,
                                    render: (_, r) => {
                                      const name = `${r.surname || ''}, ${r.first_name || ''}`.trim()
                                      return <a onClick={() => navigate(`/students/${r.seq}`)} style={{ color: '#0032a0', fontWeight: 500 }}>{name || 'N/A'}</a>
                                    },
                                  },
                                  { title: 'Award No.', dataIndex: 'award_number', key: 'award_number', width: 150, render: (v) => v || <Text type="secondary">—</Text> },
                                  { title: 'Scholarship', dataIndex: 'scholarship_program', key: 'program', width: 160, ellipsis: true },
                                  { title: 'LRN', dataIndex: 'learner_reference_number', key: 'lrn', width: 120, render: (v) => v || <Text type="secondary">—</Text> },
                                  {
                                    title: '', key: 'action', width: 45,
                                    render: (_, r) => <a onClick={() => navigate(`/students/${r.seq}`)} style={{ color: '#0032a0' }}>View</a>,
                                  },
                                ]}
                                size="small"
                                pagination={false}
                                rowKey="seq"
                                className="data-quality-table"
                                locale={{ emptyText: <Empty description="No students found" /> }}
                              />
                              {(instData.total || 0) > 10 && (
                                <div style={{ padding: '8px 0 0', display: 'flex', justifyContent: 'flex-end' }}>
                                  <Pagination
                                    size="small"
                                    current={instData.page || 1}
                                    total={instData.total}
                                    pageSize={10}
                                    onChange={(p) => fetchInstitutionStudents(record.institution, p)}
                                    showSizeChanger={false}
                                  />
                                </div>
                              )}
                            </Spin>
                          </div>
                        )
                      },
                    },
                  } : {})}
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
                            customFetch(page, searchRef.current)
                          } else {
                            fetchPaginated(endpoint, setter, page, searchRef.current)
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
