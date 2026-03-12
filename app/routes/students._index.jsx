import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Typography, Table, Button, Input, Space, Select, Tag, message, Popover, Popconfirm, Drawer, Tooltip, Dropdown, Modal, Form, Alert, AutoComplete } from 'antd'
import { InfoCircleOutlined, FileExcelOutlined, FilePdfOutlined, FilterOutlined, CheckCircleOutlined, SortAscendingOutlined, PlusOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import * as XLSX from 'xlsx-js-style'
import { API_BASE } from '../lib/config'
import { useAuth } from '../lib/AuthContext'

const { Title } = Typography
const { Search } = Input
const { Option } = Select

// Debounce hook for search
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

// Shared schema copied from students.bulk for consistent Excel structure
const SEM_FIELDS = [
  { key: 'nta', label: 'NTA' },
  { key: 'fundSource', label: 'FUND SOURCE' },
  { key: 'voucherTrackingNo', label: 'VOUCHER TRACKING NO.' },
  { key: 'modeOfPayment', label: 'MODE OF PAYMENT' },
  { key: 'atmAccountNo', label: 'ATM ACCOUNT NO.' },
  { key: 'dateProcess', label: 'DATE PROCESS' },
  { key: 'voucherNo', label: 'VOUCHER NO.' },
  { key: 'voucherDate', label: 'VOUCHER DATE' },
  { key: 'accountCheckNo', label: 'ACCOUNT/CHECK NO.' },
  { key: 'amount', label: 'AMOUNT' },
  { key: 'lddapNo', label: 'LDDAP NO.' },
  { key: 'disbursementDate', label: 'DISBURSEMENT DATE' },
  { key: 'status', label: 'STATUS' },
  { key: 'remarks', label: 'REMARKS' },
]

const STATIC_SCHEMA = [
  { key: 'seq', label: 'SEQ', rowSpan: 3 },
  { key: 'inCharge', label: 'IN-CHARGE', rowSpan: 3 },
  { key: 'awardYear', label: 'AWARD YEAR', rowSpan: 3 },
  { key: 'scholarshipProgram', label: 'SCHOLARSHIP PROGRAM', rowSpan: 3 },
  { key: 'awardNumber', label: 'AWARD NUMBER', rowSpan: 3 },
  { key: 'learnerReferenceNumber', label: 'LEARNER REFERENCE NUMBER (LRN)', rowSpan: 3 },
  {
    label: 'NAME OF GRANTEE',
    colSpan: 4,
    children: [
      { key: 'surname', label: 'SURNAME' },
      { key: 'firstName', label: 'FIRST NAME' },
      { key: 'middleName', label: 'MIDDLE NAME' },
      { key: 'extension', label: 'EXTENSION' },
    ],
  },
  { key: 'sex', label: 'SEX', rowSpan: 3 },
  { key: 'civilStatus', label: 'CIVIL STATUS', rowSpan: 3 },
  { key: 'dateOfBirth', label: 'DATE OF BIRTH', rowSpan: 3 },
  {
    label: 'CONTACT DETAILS',
    colSpan: 2,
    children: [
      { key: 'contactNumber', label: 'CONTACT NUMBER' },
      { key: 'emailAddress', label: 'EMAIL ADDRESS' },
    ],
  },
  {
    label: 'COMPLETE ADDRESS',
    colSpan: 9,
    children: [
      { key: 'street', label: 'STREET' },
      { key: 'brgyPsgcCode', label: 'BRGY PSGC CODE' },
      { key: 'brgy', label: 'BRGY' },
      { key: 'municipalityPsgcCode', label: 'MUNICIPALITY PSGC CODE' },
      { key: 'municipality', label: 'MUNICIPALITY' },
      { key: 'provincePsgcCode', label: 'PROVINCE PSGC CODE' },
      { key: 'province', label: 'PROVINCE' },
      { key: 'congressionalDistrict', label: 'CONGRESSIONAL DISTRICT' },
      { key: 'zipCode', label: 'ZIP CODE' },
    ],
  },
  { key: 'specialGroup', label: 'SPECIAL GROUP', rowSpan: 3 },
  { key: 'certificationNumber', label: 'CERTIFICATION NUMBER (If Applicable)', rowSpan: 3 },
  { key: 'nameOfInstitution', label: 'NAME OF INSTITUTION', rowSpan: 3 },
  { key: 'uii', label: 'UII', rowSpan: 3 },
  { key: 'institutionalType', label: 'INSTITUTIONAL TYPE', rowSpan: 3 },
  { key: 'regionSchoolLocated', label: 'REGION WHERE THE SCHOOL IS LOCATED', rowSpan: 3 },
  { key: 'prioProgramCode', label: 'PRIORITY PROGRAM CODE', rowSpan: 3 },
  { key: 'degreeProgram', label: 'DEGREE PROGRAM', rowSpan: 3 },
  { key: 'programMajor', label: 'PROGRAM MAJOR', rowSpan: 3 },
  { key: 'disciplineCode', label: 'DISCIPLINE CODE', rowSpan: 3 },
  { key: 'programDiscipline', label: 'PROGRAM DISCIPLINE', rowSpan: 3 },
  { key: 'programDegreeLevel', label: 'PROGRAM DEGREE LEVEL', rowSpan: 3 },
  {
    label: 'GOVERNMENT AUTHORITY',
    colSpan: 3,
    children: [
      { key: 'authorityType', label: 'AUTHORITY TYPE' },
      { key: 'authorityNumber', label: 'AUTHORITY NUMBER' },
      { key: 'series', label: 'SERIES' },
    ],
  },
  {
    label: 'PRIORITY PROGRAM',
    colSpan: 2,
    children: [
      { key: 'priority', label: 'PRIORITY' },
      { key: 'basisCmo', label: 'BASIS (CMO)' },
    ],
  },
  { key: 'scholarshipStatus', label: 'SCHOLARSHIP STATUS', rowSpan: 3 },
  {
    label: 'REMARKS',
    colSpan: 2,
    children: [
      { key: 'replacement', label: 'REPLACEMENT' },
      { key: 'reason', label: 'REASON' },
    ],
  },
]

const sanitize = (str = '') => str.toLowerCase().replace(/[^a-z0-9]/g, '')
const makeAyId = (label) => `ay_${sanitize(label) || Date.now()}`

const sortAcademicYears = (list = []) =>
  [...list].sort((a, b) => {
    const aYear = parseInt(String(a.label).slice(0, 4), 10)
    const bYear = parseInt(String(b.label).slice(0, 4), 10)
    if (Number.isNaN(aYear) || Number.isNaN(bYear)) return a.label.localeCompare(b.label)
    return aYear - bYear
  })

const buildHeaders = (academicYears) => {
  const row1 = []
  const row2 = []
  const row3 = []
  const leafFields = []

  STATIC_SCHEMA.forEach(col => {
    if (col.children) {
      row1.push({ ...col })
      col.children.forEach(child => {
        row2.push({ ...child, rowSpan: 2 })
        leafFields.push({ ...child, topLabel: col.label, midLabel: child.label, bottomLabel: '' })
      })
    } else {
      row1.push({ ...col })
      leafFields.push({ ...col, topLabel: col.label, midLabel: '', bottomLabel: '' })
    }
  })
  
  academicYears.forEach((ay) => {
    const ayId = ay.id
    const semFirst = SEM_FIELDS.map(f => ({ ...f, key: `${ayId}__first__${f.key}`, semester: 'First', ayId }))
    const semSecond = SEM_FIELDS.map(f => ({ ...f, key: `${ayId}__second__${f.key}`, semester: 'Second', ayId }))
    const cylKey = `${ayId}__cyl`

    row1.push({ label: `AY ${ay.label}`, colSpan: 1 + semFirst.length + semSecond.length, ayId })

    row2.push({ label: 'CURRICULUM YEAR LEVEL', key: cylKey, rowSpan: 2, ayId })
    row2.push({ label: 'FIRST SEMESTER', colSpan: semFirst.length, ayId, semester: 'First' })
    row2.push({ label: 'SECOND SEMESTER', colSpan: semSecond.length, ayId, semester: 'Second' })

    semFirst.forEach(f => row3.push(f))
    semSecond.forEach(f => row3.push(f))

    leafFields.push({ key: cylKey, label: `CYL (${ay.label})`, ayId, topLabel: `AY ${ay.label}`, midLabel: 'CURRICULUM YEAR LEVEL', bottomLabel: '' })
    semFirst.forEach(f => leafFields.push({ ...f, topLabel: `AY ${ay.label}`, midLabel: 'FIRST SEMESTER', bottomLabel: f.label }))
    semSecond.forEach(f => leafFields.push({ ...f, topLabel: `AY ${ay.label}`, midLabel: 'SECOND SEMESTER', bottomLabel: f.label }))
  })

  return { row1, row2, row3, leafFields }
}

const STUDENT_TO_EXPORT = {
  seq: 'seq',
  inCharge: 'in_charge',
  awardYear: 'award_year',
  scholarshipProgram: 'scholarship_program',
  awardNumber: 'award_number',
  learnerReferenceNumber: 'learner_reference_number',
  surname: 'surname',
  firstName: 'first_name',
  middleName: 'middle_name',
  extension: 'extension',
  sex: 'sex',
  civilStatus: 'civil_status',
  dateOfBirth: 'date_of_birth',
  contactNumber: 'contact_number',
  emailAddress: 'email_address',
  street: 'street',
  brgyPsgcCode: 'brgy_psgc_code',
  brgy: 'brgy',
  municipalityPsgcCode: 'municipality_psgc_code',
  municipality: 'municipality',
  provincePsgcCode: 'province_psgc_code',
  province: 'province',
  congressionalDistrict: 'congressional_district',
  zipCode: 'zip_code',
  specialGroup: 'special_group',
  certificationNumber: 'certification_number',
  nameOfInstitution: 'name_of_institution',
  uii: 'uii',
  institutionalType: 'institutional_type',
  regionSchoolLocated: 'region',
  prioProgramCode: 'prio_program_code',
  degreeProgram: 'degree_program',
  programMajor: 'program_major',
  disciplineCode: 'discipline_code',
  programDiscipline: 'program_discipline',
  programDegreeLevel: 'program_degree_level',
  authorityType: 'authority_type',
  authorityNumber: 'authority_number',
  series: 'series',
  priority: 'is_priority',
  basisCmo: 'basis_cmo',
  scholarshipStatus: 'scholarship_status',
  replacement: 'replacement_info',
  reason: 'termination_reason',
}

const DISB_FIELD_MAP = {
  nta: 'nta',
  fundSource: 'fund_source',
  voucherTrackingNo: 'voucher_tracking_no',
  modeOfPayment: 'mode_of_payment',
  atmAccountNo: 'atm_account_no',
  dateProcess: 'date_process',
  voucherNo: 'voucher_no',
  voucherDate: 'voucher_date',
  accountCheckNo: 'account_check_no',
  amount: 'amount',
  lddapNo: 'lddap_no',
  disbursementDate: 'disbursement_date',
  status: 'status',
  remarks: 'remarks',
}

const normalizeSemester = (sem = '') => {
  const val = String(sem || '').toLowerCase()
  if (val.includes('1')) return 'first'
  if (val.includes('2')) return 'second'
  if (val.includes('first')) return 'first'
  if (val.includes('second')) return 'second'
  return null
}

const buildHeaderRowsWithMerges = (leafFields) => {
  const totalCols = leafFields.length
  const headerRows = [Array(totalCols).fill(''), Array(totalCols).fill(''), Array(totalCols).fill('')]
  const merges = []

  const topRow = headerRows[0]
  const midRow = headerRows[1]
  const botRow = headerRows[2]

  leafFields.forEach((leaf, idx) => {
    topRow[idx] = leaf.topLabel || leaf.label
    midRow[idx] = leaf.midLabel || ''
    botRow[idx] = leaf.bottomLabel || ''
  })

  const addHorizontalMerges = (row, rIndex) => {
    let start = 0
    while (start < row.length) {
      const label = row[start]
      let end = start
      while (end + 1 < row.length && row[end + 1] === label) {
        end += 1
      }
      if (label && end > start) {
        merges.push({ s: { r: rIndex, c: start }, e: { r: rIndex, c: end } })
      }
      start = end + 1
    }
  }

  addHorizontalMerges(topRow, 0)
  addHorizontalMerges(midRow, 1)
  addHorizontalMerges(botRow, 2)

  leafFields.forEach((leaf, idx) => {
    const hasMid = Boolean(leaf.midLabel)
    const hasBot = Boolean(leaf.bottomLabel)

    if (!hasMid && !hasBot) {
      merges.push({ s: { r: 0, c: idx }, e: { r: 2, c: idx } })
    } else if (hasMid && !hasBot) {
      merges.push({ s: { r: 1, c: idx }, e: { r: 2, c: idx } })
    }
  })

  return { headerRows, merges }
}

export function meta() {
  return [
    { title: 'Students | StuFAPs' },
    { name: 'description', content: 'Manage student records' },
  ]
}

export default function StudentsIndex() {
  const { getAccess, permissions } = useAuth()
  const canAdd = getAccess('students-add') === 'full'
  const canAddDisbursements = getAccess('disbursements-add') === 'full'
  const isMasterAdmin = permissions?.role === 'master_admin'
  const assignedPrograms = permissions?.assigned_programs || []
  const assignedYears = permissions?.assigned_years || []
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterOptions, setFilterOptions] = useState({})
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false)

  // Bulk disbursement modal state
  const [bulkDisbOpen, setBulkDisbOpen] = useState(false)
  const [bulkDisbForm] = Form.useForm()
  const [bulkDisbLoading, setBulkDisbLoading] = useState(false)
  const [bulkDisbPreview, setBulkDisbPreview] = useState(null) // { eligible, skipped }
  const [bulkDisbPreviewLoading, setBulkDisbPreviewLoading] = useState(false)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Initialize filter state from URL search params so filters survive navigation
  const [searchValue, setSearchValue] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || null)
  const [programFilter, setProgramFilter] = useState(searchParams.get('program') || null)
  const [academicYearFilter, setAcademicYearFilter] = useState(searchParams.get('academicYear') || null)
  const [semesterFilter, setSemesterFilter] = useState(searchParams.get('semester') || null)
  const [courseFilter, setCourseFilter] = useState(searchParams.get('course') || null)
  const [regionFilter, setRegionFilter] = useState(searchParams.get('region') || null)
  const [provinceFilter, setProvinceFilter] = useState(searchParams.get('province') || null)
  const [cityFilter, setCityFilter] = useState(searchParams.get('city') || null)
  const [schoolFilter, setSchoolFilter] = useState(searchParams.get('school') || null)
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority') || null)
  const [specialGroupFilter, setSpecialGroupFilter] = useState(searchParams.get('specialGroup') || null)
  const [authorityTypeFilter, setAuthorityTypeFilter] = useState(searchParams.get('authorityType') || null)
  const [awardYearFilter, setAwardYearFilter] = useState(searchParams.get('awardYear') || null)
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'name_asc')
  const [pagination, setPagination] = useState({
    current: parseInt(searchParams.get('page'), 10) || 1,
    pageSize: parseInt(searchParams.get('pageSize'), 10) || 10,
    total: 0,
  })

  // Debounced search value for API calls
  const debouncedSearch = useDebounce(searchValue, 300)

  // Helper: pick override value if key is explicitly present, else fall back to state.
  // Using 'in' instead of ?? so that clearing a filter (undefined/null) takes effect
  // instead of silently falling back to the stale state value.
  const pick = (overrides, key, fallback) =>
    key in overrides ? overrides[key] : fallback

  // Sync filter state to URL search params
  const syncSearchParams = (overrides = {}) => {
    const filters = {
      search: pick(overrides, 'search', searchValue),
      status: pick(overrides, 'status', statusFilter),
      program: pick(overrides, 'program', programFilter),
      academicYear: pick(overrides, 'academicYear', academicYearFilter),
      semester: pick(overrides, 'semester', semesterFilter),
      course: pick(overrides, 'course', courseFilter),
      region: pick(overrides, 'region', regionFilter),
      province: pick(overrides, 'province', provinceFilter),
      city: pick(overrides, 'city', cityFilter),
      school: pick(overrides, 'school', schoolFilter),
      priority: pick(overrides, 'priority', priorityFilter),
      specialGroup: pick(overrides, 'specialGroup', specialGroupFilter),
      authorityType: pick(overrides, 'authorityType', authorityTypeFilter),
      awardYear: pick(overrides, 'awardYear', awardYearFilter),
      sortBy: pick(overrides, 'sortBy', sortBy),
      page: pick(overrides, 'page', pagination.current),
      pageSize: pick(overrides, 'pageSize', pagination.pageSize),
    }
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '' && value !== 1 && key !== 'pageSize') {
        // Don't persist default sort
        if (key === 'sortBy' && value === 'name_asc') return
        params.set(key, value)
      }
      // Always keep pageSize if not default
      if (key === 'pageSize' && value && value !== 10) {
        params.set(key, value)
      }
      // Always keep page if not 1
      if (key === 'page' && value && value !== 1) {
        params.set(key, value)
      }
    })
    setSearchParams(params, { replace: true })
  }

  useEffect(() => {
    fetchFilterOptions()
    fetchStudents()
  }, [])

  // Auto-search when debounced search value changes
  const initialMount = useRef(true)
  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false
      return
    }
    syncSearchParams({ search: debouncedSearch, page: 1 })
    fetchStudents({ search: debouncedSearch, page: 1 })
  }, [debouncedSearch])

  // Fetch filter options once on mount
  const fetchFilterOptions = async () => {
    try {
      const response = await fetch(`${API_BASE}/students/filter-options`)
      if (response.ok) {
        const data = await response.json()
        setFilterOptions(data)
      }
    } catch (error) {
      console.error('Error fetching filter options:', error)
    }
  }

  // Build query params from current filters
  const buildQueryParams = (overrides = {}) => {
    const params = new URLSearchParams()
    
    const currentFilters = {
      search: pick(overrides, 'search', searchValue),
      status: pick(overrides, 'status', statusFilter),
      program: pick(overrides, 'program', programFilter),
      academicYear: pick(overrides, 'academicYear', academicYearFilter),
      semester: pick(overrides, 'semester', semesterFilter),
      course: pick(overrides, 'course', courseFilter),
      region: pick(overrides, 'region', regionFilter),
      province: pick(overrides, 'province', provinceFilter),
      city: pick(overrides, 'city', cityFilter),
      school: pick(overrides, 'school', schoolFilter),
      priority: pick(overrides, 'priority', priorityFilter),
      specialGroup: pick(overrides, 'specialGroup', specialGroupFilter),
      authorityType: pick(overrides, 'authorityType', authorityTypeFilter),
      awardYear: pick(overrides, 'awardYear', awardYearFilter),
      sortBy: pick(overrides, 'sortBy', sortBy),
      page: pick(overrides, 'page', pagination.current),
      pageSize: pick(overrides, 'pageSize', pagination.pageSize),
    }

    Object.entries(currentFilters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value)
      }
    })

    return params.toString()
  }

  const fetchStudents = async (overrides = {}) => {
    setLoading(true)
    try {
      const queryString = buildQueryParams(overrides)
      const response = await fetch(`${API_BASE}/students?${queryString}`)
      if (!response.ok) {
        throw new Error('Failed to fetch students')
      }
      const data = await response.json()
      setStudents(data.data || [])
      setPagination(prev => ({
        ...prev,
        current: data.page || 1,
        total: data.total || 0,
      }))
    } catch (error) {
      console.error('Error fetching students:', error)
      message.error('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = (overrides = {}) => {
    // Reset to page 1 when filters change
    fetchStudents({ ...overrides, page: 1 })
  }

  // Cell renderer: max 3 lines, auto-shrink font to fit — NO ellipsis
  const ClampedCell = ({ text, empty = '—', maxLines = 3 }) => {
    const val = text || ''
    if (!val) return <span style={{ color: '#bfbfbf', fontSize: 13 }}>{empty}</span>
    const len = val.length
    // Shrink font based on length and allowed lines
    let fontSize = 14
    const threshold = maxLines * 25
    if (len > threshold * 2) fontSize = 10
    else if (len > threshold * 1.5) fontSize = 11
    else if (len > threshold) fontSize = 12
    return (
      <div style={{
        overflow: 'hidden',
        maxHeight: `${maxLines * 1.45}em`,
        lineHeight: '1.45',
        fontSize,
        wordBreak: 'break-word',
      }}>
        {val}
      </div>
    )
  }

  // Uniform nowrap cell — single line, shrink font if needed
  const NowrapCell = ({ text, empty = '—', bold = false, emptyColor = '#bfbfbf' }) => {
    const val = text || ''
    if (!val) return <span style={{ color: emptyColor, fontSize: 13 }}>{empty}</span>
    let fontSize = 14
    if (val.length > 30) fontSize = 11
    else if (val.length > 20) fontSize = 12
    else if (val.length > 15) fontSize = 13
    return (
      <span style={{ whiteSpace: 'nowrap', fontSize, fontWeight: bold ? 500 : 'normal', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
        {val}
      </span>
    )
  }

  // Auto-fit cell — shrinks font and truncates with tooltip for long values
  const AutoFitCell = ({ text, empty = '—', bold = false }) => {
    const val = text || ''
    if (!val) return <span style={{ color: '#bfbfbf', fontSize: 13 }}>{empty}</span>
    let fontSize = 14
    if (val.length > 20) fontSize = 11
    else if (val.length > 16) fontSize = 12
    else if (val.length > 12) fontSize = 13
    return (
      <Tooltip placement="topLeft" title={val}>
        <span style={{ whiteSpace: 'nowrap', fontSize, fontWeight: bold ? 500 : 'normal', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
          {val}
        </span>
      </Tooltip>
    )
  }

  // Define table columns
  const columns = [
    {
      title: '#',
      key: 'seq',
      render: (_, __, index) => {
        const page = (pagination?.current || 1)
        const pageSize = (pagination?.pageSize || 10)
        return <span style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{(page - 1) * pageSize + index + 1}</span>
      },
      width: '3%',
      align: 'center',
    },
    {
      title: 'Award No.',
      dataIndex: 'award_number',
      key: 'award_number',
      width: '11%',
      ellipsis: { showTitle: false },
      render: (text) => <AutoFitCell text={text} bold />,
    },
    {
      title: 'Full Name',
      key: 'full_name',
      width: '15%',
      ellipsis: { showTitle: false },
      render: (_, student) => {
        const surname = student.surname || ''
        const firstName = student.first_name || ''
        const middleName = student.middle_name || ''
        const extension = student.extension || ''
        const otherParts = [firstName, middleName, extension].filter(Boolean).join(' ')
        const name = surname && otherParts ? `${surname}, ${otherParts}` : (surname || otherParts)
        if (!name) return <span style={{ color: '#bfbfbf', fontSize: 13 }}>—</span>
        let fontSize = 14
        if (name.length > 35) fontSize = 12
        else if (name.length > 25) fontSize = 13
        return (
          <Tooltip placement="topLeft" title={name}>
            <a
              onClick={() => navigate(`/students/${student.seq}`)}
              style={{ fontSize, fontWeight: 500, color: '#1677ff', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
            >
              {name}
            </a>
          </Tooltip>
        )
      },
    },
    {
      title: 'LRN',
      dataIndex: 'learner_reference_number',
      key: 'learner_reference_number',
      width: '9%',
      ellipsis: { showTitle: false },
      render: (text) => <AutoFitCell text={text} />,
    },
    {
      title: 'Contact',
      dataIndex: 'contact_number',
      key: 'contact_number',
      width: '10%',
      ellipsis: { showTitle: false },
      render: (text) => (
        <Tooltip placement="topLeft" title={text || '—'}>
          <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{text || <span style={{ color: '#bfbfbf' }}>—</span>}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email_address',
      key: 'email_address',
      width: '14%',
      ellipsis: { showTitle: false },
      render: (text) => (
        <Tooltip placement="topLeft" title={text || '—'}>
          <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{text || <span style={{ color: '#bfbfbf' }}>—</span>}</span>
        </Tooltip>
      ),
    },
    {
      title: 'School',
      dataIndex: 'name_of_institution',
      key: 'name_of_institution',
      width: '13%',
      ellipsis: { showTitle: false },
      render: (text) => (
        <Tooltip placement="topLeft" title={text || '—'}>
          <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{text || <span style={{ color: '#bfbfbf' }}>—</span>}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Degree Program',
      dataIndex: 'degree_program',
      key: 'degree_program',
      width: '11%',
      ellipsis: { showTitle: false },
      render: (text) => (
        <Tooltip placement="topLeft" title={text || '—'}>
          <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{text || <span style={{ color: '#bfbfbf' }}>—</span>}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Program',
      dataIndex: 'scholarship_program',
      key: 'scholarship_program',
      width: '8%',
      align: 'center',
      ellipsis: { showTitle: false },
      render: (text) => (
        <Tooltip placement="topLeft" title={text || '—'}>
          <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{text || <span style={{ color: '#bfbfbf' }}>—</span>}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: '6%',
      align: 'center',
      render: (_, student) => (
        <Tag
          color={getStatusColor(student.scholarship_status)}
          style={{ margin: 0, fontSize: 12, lineHeight: '20px', padding: '1px 8px', whiteSpace: 'nowrap' }}
        >
          {student.scholarship_status}
        </Tag>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: '6%',
      align: 'center',
      render: (_, student) => (
        <Space size={4} split={<span style={{ color: '#d9d9d9' }}>|</span>}>
          <Button size="small" type="link" style={{ fontSize: 13, padding: 0 }} onClick={() => handleViewMore(student)}>
            View
          </Button>
          {(isMasterAdmin || assignedPrograms.includes('ALL') || assignedPrograms.includes(student.scholarship_program)) && (
            <Popconfirm
              title="Delete student"
              description="Are you sure you want to delete this student? This action cannot be undone."
              onConfirm={() => handleDeleteStudent(student)}
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" type="link" danger style={{ fontSize: 13, padding: 0 }}>
                Delete
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  // Handle "View More" button click
  const handleViewMore = (student) => {
    navigate(`/students/${student.seq}`) // Use `seq` as the unique identifier
  }

  // Handle delete student
  const handleDeleteStudent = async (student) => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
      const response = await fetch(`${API_BASE}/students/${student.seq}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...(storedUser?.id ? { 'X-User-Id': String(storedUser.id) } : {}) },
      })
      if (!response.ok) throw new Error('Failed to delete student')
      message.success('Student deleted successfully')
      fetchStudents()
    } catch (error) {
      console.error('Error deleting student:', error)
      message.error('Failed to delete student')
    }
  }

  // Handle "Add Student" button click
  const handleAddStudent = async () => {
    navigate('/students/bulk')
  }

  // Build rows for export
  const buildExportRows = (data, academicYears, leafFields) => {
    const rows = []

    data.forEach((student, idx) => {
      const row = {}

      // Static fields
      Object.entries(STUDENT_TO_EXPORT).forEach(([exportKey, sourceKey]) => {
        row[exportKey] = student[sourceKey] ?? ''
      })
      if (!row.seq) row.seq = student.seq ?? idx + 1

      // Disbursements -> dynamic columns
      const disbList = Array.isArray(student.disbursements) ? student.disbursements : []
      disbList.forEach((d) => {
        const ayLabel = d.academic_year
        if (!ayLabel) return
        const ay = academicYears.find((a) => a.label === ayLabel)
        if (!ay) return

        const sem = normalizeSemester(d.semester)
        const cylKey = `${ay.id}__cyl`
        if (d.curriculum_year_level) {
          row[cylKey] = d.curriculum_year_level
        }

        if (!sem) return
        const semPrefix = `${ay.id}__${sem}__`
        Object.entries(DISB_FIELD_MAP).forEach(([exportKey, sourceKey]) => {
          const value = d[sourceKey]
          if (value !== undefined && value !== null && value !== '') {
            row[`${semPrefix}${exportKey}`] = value
          }
        })
      })

      // Ensure all fields exist in order
      leafFields.forEach((f, leafIdx) => {
        if (row[f.key] === undefined || row[f.key] === null) {
          row[f.key] = ''
        }
        // Also ensure seq fallback when merged headers reorder
        if (f.key === 'seq' && !row.seq) row.seq = idx + 1
      })

      rows.push(row)
    })

    return rows
  }

  // Handle "Extract Excel" button click - build XLSX with merged headers like bulk import
  const handleExtractExcel = async () => {
    message.loading({ content: 'Preparing export...', key: 'export' })
    
    try {
      // Fetch ALL matching students (with current filters, no pagination) from the export endpoint
      const queryString = buildQueryParams({ page: undefined, pageSize: undefined })
      const params = new URLSearchParams(queryString)
      params.delete('page')
      params.delete('pageSize')
      const res = await fetch(`${API_BASE}/students/export?${params}`)
      if (!res.ok) throw new Error('Failed to fetch students for export')
      const exportStudents = await res.json()

      if (!exportStudents.length) {
        message.info({ content: 'No students to export', key: 'export' })
        return
      }

      // Build academic years from current data
      const labels = new Set()
      exportStudents.forEach((s) => {
        (s.disbursements || []).forEach((d) => {
          if (d.academic_year) labels.add(d.academic_year)
        })
      })
      const academicYears = sortAcademicYears(Array.from(labels).map((label) => ({ id: makeAyId(label), label })))
      
      const { leafFields } = buildHeaders(academicYears)
      const { headerRows, merges } = buildHeaderRowsWithMerges(leafFields)

      const rows = buildExportRows(exportStudents, academicYears, leafFields)
      const dataRows = rows.map((r) => leafFields.map((f) => r[f.key] ?? ''))

    const sheet = XLSX.utils.aoa_to_sheet([...headerRows, ...dataRows])
    sheet['!merges'] = merges

    // Define header styles (cyan gradient colors matching the UI)
    const headerStyle1 = {
      fill: { fgColor: { rgb: "0E7490" } }, // cyan-700
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "0891B2" } },
        bottom: { style: "thin", color: { rgb: "0891B2" } },
        left: { style: "thin", color: { rgb: "0891B2" } },
        right: { style: "thin", color: { rgb: "0891B2" } }
      }
    }

    const headerStyle2 = {
      fill: { fgColor: { rgb: "0891B2" } }, // cyan-600
      font: { bold: true, color: { rgb: "F0FDFA" }, sz: 10 },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "06B6D4" } },
        bottom: { style: "thin", color: { rgb: "06B6D4" } },
        left: { style: "thin", color: { rgb: "06B6D4" } },
        right: { style: "thin", color: { rgb: "06B6D4" } }
      }
    }

    const headerStyle3 = {
      fill: { fgColor: { rgb: "06B6D4" } }, // cyan-500
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "22D3EE" } },
        bottom: { style: "thin", color: { rgb: "22D3EE" } },
        left: { style: "thin", color: { rgb: "22D3EE" } },
        right: { style: "thin", color: { rgb: "22D3EE" } }
      }
    }

    const dataStyle = {
      alignment: { horizontal: "left", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "E2E8F0" } },
        bottom: { style: "thin", color: { rgb: "E2E8F0" } },
        left: { style: "thin", color: { rgb: "E2E8F0" } },
        right: { style: "thin", color: { rgb: "E2E8F0" } }
      }
    }

    // Apply styles to header rows
    const range = XLSX.utils.decode_range(sheet['!ref'])
    
    // Row 1 (top header)
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C })
      if (!sheet[cellAddress]) continue
      sheet[cellAddress].s = headerStyle1
    }

    // Row 2 (mid header)
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 1, c: C })
      if (!sheet[cellAddress]) continue
      sheet[cellAddress].s = headerStyle2
    }

    // Row 3 (bottom header)
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 2, c: C })
      if (!sheet[cellAddress]) continue
      sheet[cellAddress].s = headerStyle3
    }

    // Apply styles to data rows and calculate column widths
    const colWidths = leafFields.map(() => ({ wch: 12 })) // Default width

    for (let R = 3; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
        if (!sheet[cellAddress]) continue
        
        sheet[cellAddress].s = dataStyle
        
        // Calculate column width based on content
        const cellValue = sheet[cellAddress].v ? String(sheet[cellAddress].v) : ''
        const cellWidth = Math.max(cellValue.length + 2, 8)
        if (cellWidth > colWidths[C].wch) {
          colWidths[C].wch = Math.min(cellWidth, 50) // Max width 50
        }
      }
    }

    // Set column widths based on header labels too
    leafFields.forEach((field, idx) => {
      const headerWidth = Math.max(
        (field.topLabel || field.label || '').length,
        (field.midLabel || '').length,
        (field.bottomLabel || '').length
      ) + 2
      if (headerWidth > colWidths[idx].wch) {
        colWidths[idx].wch = Math.min(headerWidth, 50)
      }
    })

    sheet['!cols'] = colWidths

    // Set row heights for headers
    sheet['!rows'] = [
      { hpt: 30 }, // Row 1 height
      { hpt: 25 }, // Row 2 height
      { hpt: 25 }, // Row 3 height
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, sheet, 'Students')
    XLSX.writeFile(wb, 'students-export.xlsx', { cellStyles: true })
    message.success({ content: 'Export completed!', key: 'export' })
    } catch (error) {
      console.error('Error exporting:', error)
      message.error({ content: 'Failed to export students', key: 'export' })
    }
  }

  // Get color for status
  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
      case 'active':
        return 'green'
      case 'Graduated':
        return 'blue'
      case 'Terminated':
        return 'red'
      default:
        return 'orange'
    }
  }

  // Handle immediate search (on button click or enter)
  const handleSearch = (value) => {
    setSearchValue(value)
    syncSearchParams({ search: value, page: 1 })
    fetchStudents({ search: value, page: 1 })
  }

  // Generic filter change handler — applies immediately.
  // Ant Design Select passes undefined when cleared; normalise to null so the
  // 'key in overrides' check in pick() correctly recognises the cleared state.
  const handleFilterChange = (key, setter) => (value) => {
    const val = value === undefined ? null : value
    setter(val)
    syncSearchParams({ [key]: val, page: 1 })
    applyFilters({ [key]: val })
  }

  const handleResetFilters = () => {
    setSearchValue('')
    setStatusFilter(null)
    setProgramFilter(null)
    setAcademicYearFilter(null)
    setSemesterFilter(null)
    setCourseFilter(null)
    setRegionFilter(null)
    setProvinceFilter(null)
    setCityFilter(null)
    setSchoolFilter(null)
    setPriorityFilter(null)
    setSpecialGroupFilter(null)
    setAuthorityTypeFilter(null)
    setAwardYearFilter(null)
    setSortBy('name_asc')
    setSearchParams({}, { replace: true })
    fetchStudents({
      search: '',
      status: null,
      program: null,
      academicYear: null,
      semester: null,
      course: null,
      region: null,
      province: null,
      city: null,
      school: null,
      priority: null,
      specialGroup: null,
      authorityType: null,
      awardYear: null,
      sortBy: 'name_asc',
      page: 1,
    })
    setFiltersDrawerOpen(false)
  }

  // Count active filters (excluding search, which is always visible)
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (statusFilter) count++
    if (programFilter) count++
    if (academicYearFilter) count++
    if (semesterFilter) count++
    if (awardYearFilter) count++
    if (courseFilter) count++
    if (regionFilter) count++
    if (provinceFilter) count++
    if (cityFilter) count++
    if (schoolFilter) count++
    if (priorityFilter) count++
    if (specialGroupFilter) count++
    if (authorityTypeFilter) count++
    return count
  }, [statusFilter, programFilter, academicYearFilter, semesterFilter, awardYearFilter, courseFilter, regionFilter, provinceFilter, cityFilter, schoolFilter, priorityFilter, specialGroupFilter, authorityTypeFilter])

  // Handle pagination change
  const handleTableChange = (page, pageSize) => {
    setPagination(prev => ({ ...prev, current: page, pageSize }))
    syncSearchParams({ page, pageSize })
    fetchStudents({ page, pageSize })
  }

  // Get unique values for filters from filter options
  const scholarshipPrograms = filterOptions.scholarshipPrograms || []
  const academicYears = filterOptions.academicYears || []
  const semesters = filterOptions.semesters || []
  const statusValues = filterOptions.statusValues || []
  const courses = filterOptions.courses || []
  const regions = filterOptions.regions || []
  const provinces = filterOptions.provinces || []
  const cities = filterOptions.cities || []
  const schools = filterOptions.schools || []
  const priorities = filterOptions.priorities || []
  const specialGroups = filterOptions.specialGroups || []
  const authorityTypes = filterOptions.authorityTypes || []
  const awardYears = filterOptions.awardYears || []

  const searchInstructions = (
    <div style={{ maxWidth: 300 }}>
      <b>Search Instructions:</b>
      <ul style={{ paddingLeft: 18 }}>
        <li>Type any part of a student's name, program, award number, contact, or email.</li>
        <li>The table will filter results as you search.</li>
        <li>You can combine search with other filters for precise results.</li>
      </ul>
    </div>
  )

  const handlePrintMasterlist = () => {
    navigate('/students/pdf')
  }

  // Build active filters list for the summary bar
  const activeFilters = useMemo(() => {
    const filters = []
    const clearFilter = (key, setter) => () => {
      setter(key === 'search' ? '' : null)
      const override = { [key]: key === 'search' ? '' : null, page: 1 }
      syncSearchParams(override)
      fetchStudents(override)
    }
    if (searchValue) filters.push({ key: 'search', label: `Search: "${searchValue}"`, clear: clearFilter('search', setSearchValue) })
    if (statusFilter) filters.push({ key: 'status', label: `Status: ${statusFilter}`, clear: clearFilter('status', setStatusFilter) })
    if (programFilter) filters.push({ key: 'program', label: `Program: ${programFilter}`, clear: clearFilter('program', setProgramFilter) })
    if (academicYearFilter) filters.push({ key: 'academicYear', label: `AY: ${academicYearFilter}`, clear: clearFilter('academicYear', setAcademicYearFilter) })
    if (semesterFilter) filters.push({ key: 'semester', label: `Semester: ${semesterFilter}`, clear: clearFilter('semester', setSemesterFilter) })
    if (awardYearFilter) filters.push({ key: 'awardYear', label: `Award Year: ${awardYearFilter}`, clear: clearFilter('awardYear', setAwardYearFilter) })
    if (courseFilter) filters.push({ key: 'course', label: `Course: ${courseFilter}`, clear: clearFilter('course', setCourseFilter) })
    if (regionFilter) filters.push({ key: 'region', label: `Region: ${regionFilter}`, clear: clearFilter('region', setRegionFilter) })
    if (provinceFilter) filters.push({ key: 'province', label: `Province: ${provinceFilter}`, clear: clearFilter('province', setProvinceFilter) })
    if (cityFilter) filters.push({ key: 'city', label: `City: ${cityFilter}`, clear: clearFilter('city', setCityFilter) })
    if (schoolFilter) filters.push({ key: 'school', label: `School: ${schoolFilter}`, clear: clearFilter('school', setSchoolFilter) })
    if (priorityFilter) filters.push({ key: 'priority', label: `Priority: ${priorityFilter}`, clear: clearFilter('priority', setPriorityFilter) })
    if (specialGroupFilter) filters.push({ key: 'specialGroup', label: `Special Group: ${specialGroupFilter}`, clear: clearFilter('specialGroup', setSpecialGroupFilter) })
    if (authorityTypeFilter) filters.push({ key: 'authorityType', label: `Authority: ${authorityTypeFilter}`, clear: clearFilter('authorityType', setAuthorityTypeFilter) })
    return filters
  }, [searchValue, statusFilter, programFilter, academicYearFilter, semesterFilter, awardYearFilter, courseFilter, regionFilter, provinceFilter, cityFilter, schoolFilter, priorityFilter, specialGroupFilter, authorityTypeFilter])

  // ── Bulk Disbursement helpers ──

  const buildBulkDisbFilters = useCallback(() => {
    const params = {}
    if (programFilter) params.scholarship_program = programFilter
    if (schoolFilter) params.name_of_institution = schoolFilter
    if (regionFilter) params.region = regionFilter
    if (provinceFilter) params.province = provinceFilter
    if (cityFilter) params.municipality = cityFilter
    if (courseFilter) params.degree_program = courseFilter
    if (awardYearFilter) params.award_year = awardYearFilter
    return params
  }, [programFilter, schoolFilter, regionFilter, provinceFilter, cityFilter, courseFilter, awardYearFilter])

  const handleBulkDisbOpen = () => {
    bulkDisbForm.resetFields()
    setBulkDisbPreview(null)
    setBulkDisbOpen(true)
  }

  const handleBulkDisbPreview = useCallback(async () => {
    try {
      const values = await bulkDisbForm.validateFields(['academic_year', 'semester'])
      setBulkDisbPreviewLoading(true)
      const body = { ...values, ...buildBulkDisbFilters() }
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
      const res = await fetch(`${API_BASE}/disbursements/bulk-disbursement/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(storedUser?.id ? { 'X-User-Id': String(storedUser.id) } : {}),
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || 'Preview failed')
      }
      const data = await res.json()
      setBulkDisbPreview(data)
    } catch (err) {
      if (err.errorFields) return // validation error
      message.error(err.message)
    } finally {
      setBulkDisbPreviewLoading(false)
    }
  }, [bulkDisbForm, buildBulkDisbFilters])

  const handleBulkDisbSubmit = useCallback(async () => {
    try {
      const values = await bulkDisbForm.validateFields()
      setBulkDisbLoading(true)
      const body = { ...values, ...buildBulkDisbFilters() }
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
      const res = await fetch(`${API_BASE}/disbursements/bulk-disbursement/store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(storedUser?.id ? { 'X-User-Id': String(storedUser.id) } : {}),
        },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create disbursements')
      }
      message.success(data.message)
      setBulkDisbOpen(false)
      bulkDisbForm.resetFields()
      setBulkDisbPreview(null)
    } catch (err) {
      if (err.errorFields) return
      message.error(err.message)
    } finally {
      setBulkDisbLoading(false)
    }
  }, [bulkDisbForm, buildBulkDisbFilters])

  return (
    <div style={{ padding: 0, margin: 0 }}>
      <Title level={2} style={{ margin: '0 0 6px 0' }}>Students</Title>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
        <Space wrap>
          <Popover content={searchInstructions} title="How to use Search" trigger="click">
            <Button
              icon={<InfoCircleOutlined />}
              size="middle"
              style={{ padding: 0, width: 32, height: 32, minWidth: 32 }}
              type="text"
            />
          </Popover>
          <Search
            placeholder="Search students..."
            allowClear
            enterButton="Search"
            size="middle"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onSearch={handleSearch}
            style={{ width: 300 }}
          />
          <Dropdown
            menu={{
              items: [
                { key: 'name_asc', label: 'Name A → Z' },
                { key: 'name_desc', label: 'Name Z → A' },
                { key: 'award_asc', label: 'Award No. ↑' },
                { key: 'award_desc', label: 'Award No. ↓' },
              ],
              selectedKeys: [sortBy],
              onClick: ({ key }) => {
                setSortBy(key)
                syncSearchParams({ sortBy: key, page: 1 })
                fetchStudents({ sortBy: key, page: 1 })
              },
            }}
            trigger={['click']}
          >
            <Button size="middle" icon={<SortAscendingOutlined />}>
              Sort
            </Button>
          </Dropdown>
          <Button
            size="middle"
            icon={<FilterOutlined />}
            onClick={() => setFiltersDrawerOpen(true)}
            style={activeFilterCount > 0 ? { borderColor: '#1677ff', color: '#1677ff' } : {}}
          >
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Button>
        </Space>
        <Space wrap>
          <Button
            type="default"
            size="middle"
            icon={<FilePdfOutlined />}
            style={{ color: '#dc2626', borderColor: '#dc2626', fontWeight: 500 }}
            onClick={handlePrintMasterlist}
          >
            Print masterlist
          </Button>
          <Button
            type="default"
            size="middle"
            icon={<FileExcelOutlined />}
            style={{ backgroundColor: '#ecfdf3', color: '#16a34a', borderColor: '#16a34a', fontWeight: 600 }}
            onClick={handleExtractExcel}
          >
            Extract Excel
          </Button>
          {(canAddDisbursements || isMasterAdmin) && (
            <Button
              size="middle"
              icon={<ThunderboltOutlined />}
              style={{ color: '#7c3aed', borderColor: '#7c3aed', fontWeight: 500 }}
              onClick={handleBulkDisbOpen}
            >
              Bulk Disbursement
            </Button>
          )}
          {canAdd && (
            <Button type="primary" size="middle" onClick={handleAddStudent}>
              Add Student
            </Button>
          )}
        </Space>
      </div>

      {/* Active Filters Summary */}
      {activeFilters.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            marginBottom: 8,
            background: '#f0f5ff',
            border: '1px solid #adc6ff',
            borderRadius: 8,
            flexWrap: 'wrap',
          }}
        >
          <FilterOutlined style={{ color: '#2f54eb', fontSize: 14 }} />
          <span style={{ fontWeight: 600, color: '#1d39c4', fontSize: 13, marginRight: 4 }}>
            Showing:
          </span>
          {activeFilters.map((f) => (
            <Tag
              key={f.key}
              closable
              onClose={(e) => {
                e.preventDefault()
                f.clear()
              }}
              style={{
                fontSize: 13,
                padding: '2px 10px',
                borderRadius: 6,
                background: '#ffffff',
                border: '1px solid #d6e4ff',
                color: '#1d39c4',
              }}
            >
              {f.label}
            </Tag>
          ))}
          <Button
            type="link"
            size="small"
            onClick={handleResetFilters}
            style={{ fontSize: 12, color: '#595959', marginLeft: 'auto' }}
          >
            Clear all
          </Button>
        </div>
      )}

      <style>{`
        .students-table .ant-table {
          font-size: 14px;
        }
        .students-table .ant-table-container {
          width: 100%;
        }
        .students-table .ant-table-content > table {
          table-layout: fixed !important;
          width: 100% !important;
        }
        .students-table .ant-table-thead > tr > th {
          font-size: 12px;
          font-weight: 600;
          padding: 8px 10px;
          background: #fafafa;
          color: #595959;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .students-table .ant-table-tbody > tr > td {
          padding: 12px 10px;
          vertical-align: middle;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .students-table .ant-table-tbody > tr {
          transition: none;
        }
        .students-table .ant-table-cell {
          border-color: #f0f0f0 !important;
        }
        .student-row-terminated td {
          background: #fff1f0 !important;
        }
        .student-row-terminated td:first-child {
          border-left: 3px solid #ff4d4f !important;
        }
        .student-row-terminated:hover td {
          background: #ffccc7 !important;
        }
        .student-row-graduated td {
          background: #f0f5ff !important;
        }
        .student-row-graduated td:first-child {
          border-left: 3px solid #597ef7 !important;
        }
        .student-row-graduated:hover td {
          background: #d6e4ff !important;
        }
        .student-row-active td:first-child {
          border-left: 3px solid #52c41a !important;
        }
        .student-row-active:hover td {
          background: #f6ffed !important;
        }
        .student-row-other td {
          background: #fff7ed !important;
        }
        .student-row-other td:first-child {
          border-left: 3px solid #fa8c16 !important;
        }
        .student-row-other:hover td {
          background: #ffe7ba !important;
        }
      `}</style>
      <Table
        className="students-table"
        bordered
        loading={loading}
        dataSource={students}
        columns={columns}
        rowKey="seq"
        size="small"
        scroll={{ x: false }}
        rowClassName={(record) => {
          const status = (record.scholarship_status || '').toLowerCase()
          if (status === 'terminated') return 'student-row-terminated'
          if (status === 'graduated') return 'student-row-graduated'
          if (status === 'active') return 'student-row-active'
          return 'student-row-other'
        }}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          size: 'small',
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
          onChange: handleTableChange,
          onShowSizeChange: handleTableChange,
        }}
      />
      <Drawer
        title="Filters"
        placement="right"
        width={380}
        onClose={() => setFiltersDrawerOpen(false)}
        open={filtersDrawerOpen}
        extra={(
          <Button size="small" onClick={handleResetFilters} disabled={activeFilterCount === 0}>
            Reset all
          </Button>
        )}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          {/* Scholarship & Status */}
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#8b5cf6', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Scholarship & Status</div>
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              <Select
                placeholder="Status"
                allowClear
                size="middle"
                style={{ width: '100%' }}
                value={statusFilter}
                onChange={handleFilterChange('status', setStatusFilter)}
              >
                {statusValues.map((status) => (
                  <Option key={status} value={status}>{status}</Option>
                ))}
              </Select>
              <Select
                placeholder="Scholarship Program"
                allowClear
                showSearch
                size="middle"
                style={{ width: '100%' }}
                value={programFilter}
                onChange={handleFilterChange('program', setProgramFilter)}
              >
                {scholarshipPrograms.map((program) => {
                  const isAssigned = isMasterAdmin || assignedPrograms.includes('ALL') || assignedPrograms.includes(program)
                  return (
                    <Option key={program} value={program}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {program}
                        {!isMasterAdmin && isAssigned && (
                          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 12 }} />
                        )}
                      </span>
                    </Option>
                  )
                })}
              </Select>
              <Select
                placeholder="Award Year"
                allowClear
                showSearch
                size="middle"
                style={{ width: '100%' }}
                value={awardYearFilter}
                onChange={handleFilterChange('awardYear', setAwardYearFilter)}
              >
                {awardYears.map((year) => (
                  <Option key={year} value={year}>{year}</Option>
                ))}
              </Select>
            </Space>
          </div>

          {/* Academic & Term */}
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#0891b2', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Academic & Term</div>
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              <Select
                placeholder="Academic Year"
                allowClear
                showSearch
                size="middle"
                style={{ width: '100%' }}
                value={academicYearFilter}
                onChange={handleFilterChange('academicYear', setAcademicYearFilter)}
              >
                {academicYears.map((year) => {
                  const isAssigned = isMasterAdmin || assignedYears.includes('ALL') || assignedYears.includes(year)
                  return (
                    <Option key={year} value={year}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {year}
                        {!isMasterAdmin && isAssigned && (
                          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 12 }} />
                        )}
                      </span>
                    </Option>
                  )
                })}
              </Select>
              <Select
                placeholder="Semester"
                allowClear
                size="middle"
                style={{ width: '100%' }}
                value={semesterFilter}
                onChange={handleFilterChange('semester', setSemesterFilter)}
              >
                {semesters.map((sem) => (
                  <Option key={sem} value={sem}>{sem}</Option>
                ))}
              </Select>
              <Select
                placeholder="Course / Degree Program"
                allowClear
                showSearch
                size="middle"
                style={{ width: '100%' }}
                value={courseFilter}
                onChange={handleFilterChange('course', setCourseFilter)}
              >
                {courses.map((course) => (
                  <Option key={course} value={course}>{course}</Option>
                ))}
              </Select>
            </Space>
          </div>

          {/* School & Location */}
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#16a34a', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>School & Location</div>
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              <Select
                placeholder="School / Institution"
                allowClear
                showSearch
                size="middle"
                style={{ width: '100%' }}
                value={schoolFilter}
                onChange={handleFilterChange('school', setSchoolFilter)}
              >
                {schools.map((school) => (
                  <Option key={school} value={school}>{school}</Option>
                ))}
              </Select>
              <Space wrap style={{ width: '100%' }}>
                <Select
                  placeholder="Region"
                  allowClear
                  showSearch
                  size="middle"
                  style={{ width: 170 }}
                  value={regionFilter}
                  onChange={handleFilterChange('region', setRegionFilter)}
                >
                  {regions.map((region) => (
                    <Option key={region} value={region}>{region}</Option>
                  ))}
                </Select>
                <Select
                  placeholder="Province"
                  allowClear
                  showSearch
                  size="middle"
                  style={{ width: 170 }}
                  value={provinceFilter}
                  onChange={handleFilterChange('province', setProvinceFilter)}
                >
                  {provinces.map((province) => (
                    <Option key={province} value={province}>{province}</Option>
                  ))}
                </Select>
              </Space>
              <Select
                placeholder="City / Municipality"
                allowClear
                showSearch
                size="middle"
                style={{ width: '100%' }}
                value={cityFilter}
                onChange={handleFilterChange('city', setCityFilter)}
              >
                {cities.map((city) => (
                  <Option key={city} value={city}>{city}</Option>
                ))}
              </Select>
            </Space>
          </div>

          {/* Tags & Authority */}
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#d97706', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tags & Authority</div>
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              <Space wrap style={{ width: '100%' }}>
                <Select
                  placeholder="Priority Program"
                  allowClear
                  size="middle"
                  style={{ width: 170 }}
                  value={priorityFilter}
                  onChange={handleFilterChange('priority', setPriorityFilter)}
                >
                  {priorities.map((p) => (
                    <Option key={String(p)} value={p}>{String(p)}</Option>
                  ))}
                </Select>
                <Select
                  placeholder="Special Group"
                  allowClear
                  showSearch
                  size="middle"
                  style={{ width: 170 }}
                  value={specialGroupFilter}
                  onChange={handleFilterChange('specialGroup', setSpecialGroupFilter)}
                >
                  {specialGroups.map((group) => (
                    <Option key={group} value={group}>{group}</Option>
                  ))}
                </Select>
              </Space>
              <Select
                placeholder="Authority Type"
                allowClear
                showSearch
                size="middle"
                style={{ width: '100%' }}
                value={authorityTypeFilter}
                onChange={handleFilterChange('authorityType', setAuthorityTypeFilter)}
              >
                {authorityTypes.map((type) => (
                  <Option key={type} value={type}>{type}</Option>
                ))}
              </Select>
            </Space>
          </div>
        </Space>
      </Drawer>

      {/* Bulk Disbursement Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ThunderboltOutlined style={{ color: '#7c3aed' }} />
            <span>Bulk Disbursement</span>
          </div>
        }
        open={bulkDisbOpen}
        onCancel={() => { setBulkDisbOpen(false); setBulkDisbPreview(null) }}
        width={520}
        footer={[
          <Button key="cancel" onClick={() => { setBulkDisbOpen(false); setBulkDisbPreview(null) }}>
            Cancel
          </Button>,
          !bulkDisbPreview ? (
            <Button key="preview" type="primary" ghost loading={bulkDisbPreviewLoading} onClick={handleBulkDisbPreview}>
              Check Eligible Students
            </Button>
          ) : (
            <Button
              key="submit"
              type="primary"
              loading={bulkDisbLoading}
              disabled={!bulkDisbPreview?.eligible}
              onClick={handleBulkDisbSubmit}
              style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
            >
              Create {bulkDisbPreview.eligible} Disbursement{bulkDisbPreview.eligible !== 1 ? 's' : ''}
            </Button>
          ),
        ]}
      >
        <div style={{ marginBottom: 8 }}>
          <Alert
            type="info"
            showIcon
            message="Creates disbursement records for active students only."
            description="Students must have a record in the immediately previous semester (e.g. 1st Sem 2022-2023 requires 2nd Sem 2021-2022). Already existing records are skipped."
            style={{ marginBottom: 16 }}
          />
        </div>

        <Form form={bulkDisbForm} layout="vertical" onValuesChange={() => setBulkDisbPreview(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item
              name="academic_year"
              label="Academic Year"
              rules={[
                { required: true, message: 'Required' },
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve()
                    const m = String(value).match(/^(\d{4})-(\d{4})$/)
                    if (!m) return Promise.reject('Format must be YYYY-YYYY (e.g. 2024-2025)')
                    if (Number(m[2]) !== Number(m[1]) + 1) return Promise.reject('Years must be consecutive (e.g. 2024-2025)')
                    return Promise.resolve()
                  },
                },
              ]}
            >
              <AutoComplete
                placeholder="e.g. 2025-2026"
                allowClear
                options={academicYears.map((ay) => ({ value: ay, label: ay }))}
                filterOption={(input, option) => (option?.value || '').toLowerCase().includes(input.toLowerCase())}
              />
            </Form.Item>
            <Form.Item
              name="semester"
              label="Semester"
              rules={[{ required: true, message: 'Required' }]}
            >
              <Select placeholder="Select Semester" allowClear>
                {semesters.map((sem) => (
                  <Option key={sem} value={sem}>{sem}</Option>
                ))}
              </Select>
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="nta" label="NTA">
              <Input placeholder="e.g. Sub-ARO 2025-001" allowClear />
            </Form.Item>
            <Form.Item name="fund_source" label="Fund Source">
              <Input placeholder="e.g. GAA 2025" allowClear />
            </Form.Item>
          </div>
        </Form>

        {/* Active page filters note */}
        {(programFilter || schoolFilter || regionFilter || provinceFilter || cityFilter || courseFilter || awardYearFilter) && (
          <div style={{ padding: '8px 12px', background: '#f0f5ff', border: '1px solid #adc6ff', borderRadius: 6, marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1d39c4', marginBottom: 4 }}>Page filters applied:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {programFilter && <Tag color="blue" style={{ fontSize: 11 }}>Program: {programFilter}</Tag>}
              {schoolFilter && <Tag color="blue" style={{ fontSize: 11 }}>School: {schoolFilter}</Tag>}
              {regionFilter && <Tag color="blue" style={{ fontSize: 11 }}>Region: {regionFilter}</Tag>}
              {provinceFilter && <Tag color="blue" style={{ fontSize: 11 }}>Province: {provinceFilter}</Tag>}
              {cityFilter && <Tag color="blue" style={{ fontSize: 11 }}>City: {cityFilter}</Tag>}
              {courseFilter && <Tag color="blue" style={{ fontSize: 11 }}>Course: {courseFilter}</Tag>}
              {awardYearFilter && <Tag color="blue" style={{ fontSize: 11 }}>Award Year: {awardYearFilter}</Tag>}
            </div>
          </div>
        )}

        {/* Preview results */}
        {bulkDisbPreview && (
          <div style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid #d9d9d9', background: '#fafafa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Preview</span>
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: bulkDisbPreview.eligible > 0 ? '#52c41a' : '#ff4d4f' }}>
                  {bulkDisbPreview.eligible}
                </div>
                <div style={{ fontSize: 11, color: '#8c8c8c' }}>Will be created</div>
              </div>
              {bulkDisbPreview.skipped > 0 && (
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#fa8c16' }}>
                    {bulkDisbPreview.skipped}
                  </div>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>Skipped (already exist)</div>
                </div>
              )}
              {bulkDisbPreview.no_previous_sem > 0 && (
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#cf1322' }}>
                    {bulkDisbPreview.no_previous_sem}
                  </div>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>No prior semester record</div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}