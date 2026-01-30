import { useEffect, useMemo, useState } from 'react'
import { Typography, Table, Button, Input, Space, Select, Tag, message, Popover, Modal, Drawer } from 'antd'
import { InfoCircleOutlined, FileExcelOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx-js-style'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const { Title } = Typography
const { Search } = Input
const { Option } = Select

// Shared schema copied from students.bulk for consistent Excel structure
const SEM_FIELDS = [
  { key: 'nta', label: 'NTA' },
  { key: 'fundSource', label: 'FUND SOURCE' },
  { key: 'amount', label: 'AMOUNT' },
  { key: 'voucherNumber', label: 'VOUCHER NUMBER' },
  { key: 'modeOfPayment', label: 'MODE OF PAYMENT' },
  { key: 'accountCheckNo', label: 'ACCOUNT/CHECK NO.' },
  { key: 'paymentAmount', label: 'PAYMENT AMOUNT' },
  { key: 'lddapNumber', label: 'LDDAP NUMBER' },
  { key: 'disbursementDate', label: 'DISBURSEMENT DATE' },
  { key: 'remarks', label: 'REMARKS' },
]

const STATIC_SCHEMA = [
  { key: 'seq', label: 'SEQ', rowSpan: 3 },
  { key: 'inCharge', label: 'IN-CHARGE', rowSpan: 3 },
  { key: 'awardYear', label: 'AWARD YEAR', rowSpan: 3 },
  { key: 'scholarshipProgram', label: 'SCHOLARSHIP PROGRAM', rowSpan: 3 },
  { key: 'awardNumber', label: 'AWARD NUMBER', rowSpan: 3 },
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
    colSpan: 5,
    children: [
      { key: 'streetBrgy', label: 'STREET_BRGY' },
      { key: 'municipalityCity', label: 'MUNICIPALITY_CITY' },
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
  { key: 'degreeProgram', label: 'DEGREE PROGRAM', rowSpan: 3 },
  { key: 'programMajor', label: 'PROGRAM MAJOR', rowSpan: 3 },
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

const mergeAcademicYears = (current = [], labels = []) => {
  const seen = new Set(current.map((ay) => ay.label))
  const merged = [...current]

  labels.forEach((label) => {
    if (!seen.has(label)) {
      merged.push({ id: makeAyId(label), label })
      seen.add(label)
    }
  })

  return sortAcademicYears(merged)
}

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
  surname: 'surname',
  firstName: 'first_name',
  middleName: 'middle_name',
  extension: 'extension',
  sex: 'sex',
  dateOfBirth: 'date_of_birth',
  contactNumber: 'contact_number',
  emailAddress: 'email_address',
  streetBrgy: 'street_brgy',
  municipalityCity: 'municipality_city',
  province: 'province',
  congressionalDistrict: 'congressional_district',
  zipCode: 'zip_code',
  specialGroup: 'special_group',
  certificationNumber: 'certification_number',
  nameOfInstitution: 'name_of_institution',
  uii: 'uii',
  institutionalType: 'institutional_type',
  regionSchoolLocated: 'region',
  degreeProgram: 'degree_program',
  programMajor: 'program_major',
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
  amount: 'amount',
  voucherNumber: 'voucher_number',
  modeOfPayment: 'mode_of_payment',
  accountCheckNo: 'account_check_no',
  paymentAmount: 'payment_amount',
  lddapNumber: 'lddap_number',
  disbursementDate: 'disbursement_date',
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
  const [students, setStudents] = useState([])
  const [filteredStudents, setFilteredStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [statusFilter, setStatusFilter] = useState(null)
  const [programFilter, setProgramFilter] = useState(null)
  const [academicYearFilter, setAcademicYearFilter] = useState(null)
  const [semesterFilter, setSemesterFilter] = useState(null)
  const [courseFilter, setCourseFilter] = useState(null)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 })
  const [modalVisible, setModalVisible] = useState(false)
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false)
  const [regionFilter, setRegionFilter] = useState(null)
  const [provinceFilter, setProvinceFilter] = useState(null)
  const [cityFilter, setCityFilter] = useState(null)
  const [schoolFilter, setSchoolFilter] = useState(null)
  const [priorityFilter, setPriorityFilter] = useState(null)
  const [specialGroupFilter, setSpecialGroupFilter] = useState(null)
  const [authorityTypeFilter, setAuthorityTypeFilter] = useState(null)
  const [awardYearFilter, setAwardYearFilter] = useState(null)
  const navigate = useNavigate()

  const academicYearsFromData = useMemo(() => {
    const labels = new Set()
    filteredStudents.forEach((s) => {
      (s.disbursements || []).forEach((d) => {
        if (d.academic_year) labels.add(d.academic_year)
      })
    })
    return sortAcademicYears(Array.from(labels).map((label) => ({ id: makeAyId(label), label })))
  }, [filteredStudents])

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/students`)
      if (!response.ok) {
        throw new Error('Failed to fetch students')
      }
      const data = await response.json()
      console.log('Fetched data:', data) // Debug log
      const studentsData = Array.isArray(data) ? data : data.data || []
      setStudents(studentsData)
      setFilteredStudents(studentsData)
    } catch (error) {
      console.error('Error fetching students:', error)
      message.error('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const applyAllFilters = (overrides = {}) => {
    applyFilters({
      search: overrides.search ?? searchValue,
      status: overrides.status ?? statusFilter,
      program: overrides.program ?? programFilter,
      academicYear: overrides.academicYear ?? academicYearFilter,
      semester: overrides.semester ?? semesterFilter,
      course: overrides.course ?? courseFilter,
      region: overrides.region ?? regionFilter,
      province: overrides.province ?? provinceFilter,
      city: overrides.city ?? cityFilter,
      school: overrides.school ?? schoolFilter,
      priority: overrides.priority ?? priorityFilter,
      specialGroup: overrides.specialGroup ?? specialGroupFilter,
      authorityType: overrides.authorityType ?? authorityTypeFilter,
      awardYear: overrides.awardYear ?? awardYearFilter,
    })
  }

  // Define table columns
  const columns = [
    {
      title: 'SEQ',
      key: 'seq',
      render: (_, __, index) => {
        const page = (pagination?.current || 1)
        const pageSize = (pagination?.pageSize || 10)
        return (page - 1) * pageSize + index + 1
      },
      width: 70,
      align: 'center',
    },
    {
      title: 'Award Number',
      dataIndex: 'award_number',
      key: 'award_number',
    },
    {
      title: 'Full Name',
      key: 'full_name',
      render: (_, student) => {
        const surname = student.surname || ''
        const firstName = student.first_name || ''
        const middleName = student.middle_name || ''
        const extension = student.extension || ''
        
        const otherParts = [firstName, middleName, extension].filter(Boolean).join(' ')
        
        if (surname && otherParts) {
          return `${surname}, ${otherParts}`
        }
        return surname || otherParts
      },
    },
    {
      title: 'Contact Number',
      dataIndex: 'contact_number',
      key: 'contact_number',
      render: (text) => text || 'N/A',
    },
    {
      title: 'Email Address',
      dataIndex: 'email_address',
      key: 'email_address',
      render: (text) => text || 'N/A',
    },
    {
      title: 'School',
      dataIndex: 'name_of_institution',
      key: 'name_of_institution',
      render: (text) => text || 'N/A',
    },
    {
      title: 'Degree Program',
      dataIndex: 'degree_program',
      key: 'degree_program',
    },
    {
      title: 'Scholarship Program',
      dataIndex: 'scholarship_program',
      key: 'scholarship_program',
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, student) => (
        <Tag color={getStatusColor(student.scholarship_status)}>
          {student.scholarship_status}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, student) => (
        <Button type="primary" onClick={() => handleViewMore(student)}>
          View More
        </Button>
      ),
    },
  ]

  // Handle "View More" button click
  const handleViewMore = (student) => {
    navigate(`/students/${student.seq}`) // Use `seq` as the unique identifier
  }

  // Log action function
  const logAction = async (model, modelId, action, oldData, newData) => {
    try {
      await fetch(`${API_BASE}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          model_id: modelId,
          action,
          old_data: oldData,
          new_data: newData,
          ip_address: 'client',
        }),
      })
    } catch (error) {
      console.error('Failed to log action:', error)
    }
  }

  // Handle "Add Student" button click
  const handleAddStudent = async () => {
    // Log the navigation (logging will happen in the create page)
    navigate('/students/create')
  }

  // Handle "Add Bulk" button click
  const handleBulkAdd = () => {
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
  const handleExtractExcel = () => {
    if (filteredStudents.length === 0) {
      message.info('No students to export')
      return
    }

    const academicYears = academicYearsFromData
    const { leafFields } = buildHeaders(academicYears)
    const { headerRows, merges } = buildHeaderRowsWithMerges(leafFields)

    const rows = buildExportRows(filteredStudents, academicYears, leafFields)
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
    message.success('Excel file exported successfully!')
  }

  // Get color for status
  const getStatusColor = (status) => {
    switch (status) {
      case 'On-going':
        return 'green'
      case 'Graduated':
        return 'blue'
      case 'Terminated':
        return 'red'
      case 'Active':
      case 'active':
        return 'green'
      default:
        return 'default'
    }
  }

  // Handle search
  const handleSearch = (value) => {
    setSearchValue(value)
    applyAllFilters({ search: value })
  }

  // Handle status filter
  const handleStatusChange = (value) => {
    setStatusFilter(value)
    applyAllFilters({ status: value })
  }

  // Handle program filter
  const handleProgramChange = (value) => {
    setProgramFilter(value)
    applyAllFilters({ program: value })
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
    applyAllFilters({
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
    })
    setFiltersDrawerOpen(false)
  }

  const handleApplyDrawerFilters = () => {
    applyAllFilters()
    setFiltersDrawerOpen(false)
  }

  // Apply filters and search
  const applyFilters = ({
    search,
    status,
    program,
    academicYear,
    semester,
    course,
    region,
    province,
    city,
    school,
    priority,
    specialGroup,
    authorityType,
    awardYear,
  }) => {
    let filtered = [...students]

    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter((student) => {
        const fullName = `${student.surname || ''} ${student.first_name || ''} ${student.middle_name || ''} ${student.extension || ''}`.toLowerCase()
        const scholarshipProgram = (student.scholarship_program || '').toLowerCase()
        const awardNumber = (student.award_number || '').toLowerCase()
        const contactNumber = (student.contact_number || '').toLowerCase()
        const emailAddress = (student.email_address || '').toLowerCase()

        return (
          fullName.includes(searchLower) ||
          scholarshipProgram.includes(searchLower) ||
          awardNumber.includes(searchLower) ||
          contactNumber.includes(searchLower) ||
          emailAddress.includes(searchLower)
        )
      })
    }

    if (status) {
      filtered = filtered.filter((student) => student.scholarship_status === status)
    }

    if (program) {
      filtered = filtered.filter((student) => student.scholarship_program === program)
    }

    if (academicYear) {
      filtered = filtered.filter((student) => student.academic_year === academicYear)
    }

    if (semester) {
      filtered = filtered.filter((student) => student.semester === semester)
    }

    if (course) {
      filtered = filtered.filter((student) => student.degree_program === course)
    }

    if (region) {
      filtered = filtered.filter((student) => student.region === region)
    }

    if (province) {
      filtered = filtered.filter((student) => student.province === province)
    }

    if (city) {
      filtered = filtered.filter((student) => student.municipality_city === city)
    }

    if (school) {
      filtered = filtered.filter((student) => student.name_of_institution === school)
    }

    if (priority !== null && priority !== undefined && priority !== '') {
      const target = String(priority).toLowerCase()
      filtered = filtered.filter((student) => String(student.is_priority || '').toLowerCase() === target)
    }

    if (specialGroup) {
      filtered = filtered.filter((student) => student.special_group === specialGroup)
    }

    if (authorityType) {
      filtered = filtered.filter((student) => student.authority_type === authorityType)
    }

    if (awardYear) {
      filtered = filtered.filter((student) => student.award_year === awardYear)
    }

    setFilteredStudents(filtered)
  }

  // Get unique values for filters
  const scholarshipPrograms = [...new Set(students.map((s) => s.scholarship_program))].filter(Boolean)
  const academicYears = [...new Set(students.map((s) => s.academic_year))].filter(Boolean)
  const semesters = [...new Set(students.map((s) => s.semester))].filter(Boolean)
  const statusValues = [...new Set(students.map((s) => s.scholarship_status))].filter(Boolean)
  const courses = [...new Set(students.map((s) => s.degree_program))].filter(Boolean)
  const regions = [...new Set(students.map((s) => s.region))].filter(Boolean)
  const provinces = [...new Set(students.map((s) => s.province))].filter(Boolean)
  const cities = [...new Set(students.map((s) => s.municipality_city))].filter(Boolean)
  const schools = [...new Set(students.map((s) => s.name_of_institution))].filter(Boolean)
  const priorities = [...new Set(students.map((s) => s.is_priority))].filter((v) => v !== null && v !== undefined && v !== '')
  const specialGroups = [...new Set(students.map((s) => s.special_group))].filter(Boolean)
  const authorityTypes = [...new Set(students.map((s) => s.authority_type))].filter(Boolean)
  const awardYears = [...new Set(students.map((s) => s.award_year))].filter(Boolean)

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

  const [field, setField] = useState('degree_program')
  const [oldValue, setOldValue] = useState('')
  const [newValue, setNewValue] = useState('')

  // Safe, bulk-editable fields (excluding disbursement/sensitive data)
  const fieldOptions = [
    { label: 'Course Name', value: 'degree_program' },
    { label: 'Program Major', value: 'program_major' },
    { label: 'Program Discipline', value: 'program_discipline' },
    { label: 'Program Degree Level', value: 'program_degree_level' },
    { label: 'Institution Name', value: 'name_of_institution' },
    { label: 'Institution Type', value: 'institutional_type' },
    { label: 'Region', value: 'region' },
    { label: 'Province', value: 'province' },
    { label: 'City / Municipality', value: 'municipality_city' },
    { label: 'Barangay / Street', value: 'street_brgy' },
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

  // Compute unique existing values for the selected field (defensive for missing keys)
  const oldValues = [
    ...new Set(
      students
        .map((s) => (s && s[field] !== undefined && s[field] !== null ? String(s[field]) : null))
        .filter(Boolean)
    ),
  ]

  // Update the handleSubmit for Bulk Edit to include logging
  const handleSubmit = async () => {
    if (!field || !oldValue || !newValue) {
      message.error('Please select a field and enter both old and new values.')
      return
    }

    // Log the bulk edit action
    await logAction('Student', 0, 'update', { [field]: oldValue }, { [field]: newValue })

    const res = await fetch(`${API_BASE}/students/bulk-update-field`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field, old_value: oldValue, new_value: newValue }),
    })
    const data = await res.json()
    if (res.ok) {
      message.success(data.message)
      fetchStudents()
      setModalVisible(false)
      setOldValue('')
      setNewValue('')
    } else {
      message.error(data.error || 'Failed to update')
    }
  }

  const refreshStudents = () => {
    fetchStudents()
  }

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Students</Title>
      <Space direction="vertical" style={{ width: '100%', marginBottom: '16px' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Space wrap>
            <Popover content={searchInstructions} title="How to use Search" trigger="click">
              <Button
                icon={<InfoCircleOutlined />}
                size="middle"
                style={{ marginRight: 4, padding: 0, width: 32, height: 32, minWidth: 32 }}
                type="text"
              />
            </Popover>
            <Search
              placeholder="Search"
              allowClear
              enterButton="Search"
              size="middle"
              value={searchValue}
              onChange={(e) => {
                const next = e.target.value
                setSearchValue(next)
                if (next === '') applyAllFilters({ search: '' })
              }}
              onSearch={handleSearch}
              style={{ width: 300 }}
            />
            <Select
              placeholder="Status"
              allowClear
              size="middle"
              style={{ width: 140 }}
              value={statusFilter}
              onChange={handleStatusChange}
            >
              {statusValues.map((status) => (
                <Option key={status} value={status}>
                  {status}
                </Option>
              ))}
            </Select>
            <Select
              placeholder="Program"
              allowClear
              size="middle"
              style={{ width: 150 }}
              onChange={handleProgramChange}
              value={programFilter}
            >
              {scholarshipPrograms.map((program) => (
                <Option key={program} value={program}>
                  {program}
                </Option>
              ))}
            </Select>
            <Button
              size="middle"
              onClick={() => setFiltersDrawerOpen(true)}
            >
              Filters
            </Button>
          </Space>
          <Space>
            <Button
              type="default"
              size="middle"
              icon={<FileExcelOutlined />}
              style={{
                backgroundColor: '#ecfdf3',
                color: '#16a34a',
                borderColor: '#16a34a',
                fontWeight: 600,
                width: 140,
              }}
              onClick={handleExtractExcel}
            >
              Extract Excel
            </Button>

            <Button
              type="primary"
              size="middle"
              style={{ width: 120 }}
              onClick={handleAddStudent}
            >
              Add Student
            </Button>
            <Button
              type="default"
              size="middle"
              style={{ width: 120 }}
              onClick={() => setModalVisible(true)}
            >
              Bulk Edit
            </Button>
          </Space>
        </Space>
      </Space>
      <Table
        bordered
        loading={loading}
        dataSource={filteredStudents}
        columns={columns}
        rowKey="seq"
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: filteredStudents.length,
          onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
        }}
      />
      <Modal open={modalVisible} onCancel={() => setModalVisible(false)} onOk={handleSubmit} title="Bulk Edit">
        <Select value={field} onChange={setField} style={{ width: '100%', marginBottom: 12 }}>
          {fieldOptions.map(opt => <Option key={opt.value} value={opt.value}>{opt.label}</Option>)}
        </Select>
        <Select
          value={oldValue}
          onChange={setOldValue}
          style={{ width: '100%', marginBottom: 12 }}
          placeholder="Select value to replace"
        >
          {oldValues.map(val => <Option key={val} value={val}>{val}</Option>)}
        </Select>
        <Input
          value={newValue}
          onChange={e => setNewValue(e.target.value)}
          placeholder="Enter new value"
        />
      </Modal>

      <Drawer
        title="Filters"
        placement="right"
        width={420}
        onClose={() => setFiltersDrawerOpen(false)}
        open={filtersDrawerOpen}
        extra={(
          <Space>
            <Button onClick={handleResetFilters}>Reset</Button>
            <Button type="primary" onClick={handleApplyDrawerFilters}>Apply</Button>
          </Space>
        )}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Academic & Term</div>
            <Space wrap>
              <Select
                placeholder="Academic Year"
                allowClear
                showSearch
                size="middle"
                style={{ width: 180 }}
                value={academicYearFilter}
                onChange={(value) => {
                  setAcademicYearFilter(value)
                  applyAllFilters({ academicYear: value })
                }}
              >
                {academicYears.map((year) => (
                  <Option key={year} value={year}>{year}</Option>
                ))}
              </Select>
              <Select
                placeholder="Semester"
                allowClear
                size="middle"
                style={{ width: 140 }}
                value={semesterFilter}
                onChange={(value) => {
                  setSemesterFilter(value)
                  applyAllFilters({ semester: value })
                }}
              >
                {semesters.map((sem) => (
                  <Option key={sem} value={sem}>{sem}</Option>
                ))}
              </Select>
              <Select
                placeholder="Award Year"
                allowClear
                showSearch
                size="middle"
                style={{ width: 160 }}
                value={awardYearFilter}
                onChange={(value) => {
                  setAwardYearFilter(value)
                  applyAllFilters({ awardYear: value })
                }}
              >
                {awardYears.map((year) => (
                  <Option key={year} value={year}>{year}</Option>
                ))}
              </Select>
              <Select
                placeholder="Course"
                allowClear
                showSearch
                size="middle"
                style={{ width: 200 }}
                value={courseFilter}
                onChange={(value) => {
                  setCourseFilter(value)
                  applyAllFilters({ course: value })
                }}
              >
                {courses.map((course) => (
                  <Option key={course} value={course}>{course}</Option>
                ))}
              </Select>
            </Space>
          </div>

          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>School & Location</div>
            <Space wrap>
              <Select
                placeholder="Region"
                allowClear
                showSearch
                size="middle"
                style={{ width: 160 }}
                value={regionFilter}
                onChange={(value) => {
                  setRegionFilter(value)
                  applyAllFilters({ region: value })
                }}
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
                style={{ width: 160 }}
                value={provinceFilter}
                onChange={(value) => {
                  setProvinceFilter(value)
                  applyAllFilters({ province: value })
                }}
              >
                {provinces.map((province) => (
                  <Option key={province} value={province}>{province}</Option>
                ))}
              </Select>
              <Select
                placeholder="City / Municipality"
                allowClear
                showSearch
                size="middle"
                style={{ width: 200 }}
                value={cityFilter}
                onChange={(value) => {
                  setCityFilter(value)
                  applyAllFilters({ city: value })
                }}
              >
                {cities.map((city) => (
                  <Option key={city} value={city}>{city}</Option>
                ))}
              </Select>
              <Select
                placeholder="School"
                allowClear
                showSearch
                size="middle"
                style={{ width: 240 }}
                value={schoolFilter}
                onChange={(value) => {
                  setSchoolFilter(value)
                  applyAllFilters({ school: value })
                }}
              >
                {schools.map((school) => (
                  <Option key={school} value={school}>{school}</Option>
                ))}
              </Select>
            </Space>
          </div>

          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Scholarship & Tags</div>
            <Space wrap>
              <Select
                placeholder="Priority"
                allowClear
                size="middle"
                style={{ width: 140 }}
                value={priorityFilter}
                onChange={(value) => {
                  setPriorityFilter(value)
                  applyAllFilters({ priority: value })
                }}
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
                style={{ width: 160 }}
                value={specialGroupFilter}
                onChange={(value) => {
                  setSpecialGroupFilter(value)
                  applyAllFilters({ specialGroup: value })
                }}
              >
                {specialGroups.map((group) => (
                  <Option key={group} value={group}>{group}</Option>
                ))}
              </Select>
              <Select
                placeholder="Authority Type"
                allowClear
                showSearch
                size="middle"
                style={{ width: 160 }}
                value={authorityTypeFilter}
                onChange={(value) => {
                  setAuthorityTypeFilter(value)
                  applyAllFilters({ authorityType: value })
                }}
              >
                {authorityTypes.map((type) => (
                  <Option key={type} value={type}>{type}</Option>
                ))}
              </Select>
            </Space>
          </div>
        </Space>
      </Drawer>
    </div>
  )
}