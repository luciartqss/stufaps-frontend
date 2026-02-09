import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { Typography, message, Button, Card, Space, Input, Select, DatePicker, Tag, Pagination, Tooltip, Badge, Popover, Progress, Modal } from 'antd'
import { UploadOutlined, SendOutlined, CloseOutlined, InboxOutlined, PlusOutlined, WarningOutlined, ExclamationCircleOutlined, CheckCircleOutlined, LoadingOutlined } from '@ant-design/icons'
import * as XLSX from 'xlsx'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// Semester detail fields (shared for First/Second)
const SEM_FIELDS = [
  { key: 'nta', label: 'NTA', width: 150 },
  { key: 'fundSource', label: 'FUND SOURCE', width: 180 },
  { key: 'grant', label: 'GRANT', width: 150 },
  { key: 'voucherNumber', label: 'VOUCHER NUMBER', width: 180 },
  { key: 'modeOfPayment', label: 'MODE OF PAYMENT', width: 180, type: 'select', options: ['ATM', 'Cheque', 'Through the HEI', ''] },
  { key: 'accountCheckNo', label: 'ACCOUNT/CHECK NO.', width: 180 },
  { key: 'amount', label: 'AMOUNT', width: 160 },
  { key: 'lddapNumber', label: 'LDDAP NUMBER', width: 160 },
  { key: 'disbursementDate', label: 'DISBURSEMENT DATE', width: 160, type: 'date' },
  { key: 'status', label: 'STATUS', width: 140 },
  { key: 'remarks', label: 'REMARKS', width: 200 },
]

// Helpers
const sanitize = (str = '') => str.toLowerCase().replace(/[^a-z0-9]/g, '')
const makeAyId = (label) => `ay_${sanitize(label) || Date.now()}`

// Expand AY input like "2021-2029" to individual blocks (2021-2022, 2022-2023, ...)
const expandAcademicYearInput = (input = '') => {
  const trimmed = input.trim()
  if (!trimmed) return []

  const rangeMatch = trimmed.match(/^(\d{4})\s*-\s*(\d{4})$/)
  if (!rangeMatch) return [trimmed]

  const start = Number(rangeMatch[1])
  const end = Number(rangeMatch[2])
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [trimmed]

  const labels = []
  for (let year = start; year < end; year += 1) {
    labels.push(`${year}-${year + 1}`)
  }
  return labels
}

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

const deriveAyLabelFromKey = (key = '') => {
  if (!key) return null
  const str = String(key).trim()
  
  // Pattern 1: ay_20212022 or ay-2021-2022 or AY 2021-2022
  const compact = str.match(/ay[_\-\s]*(\d{4})[_\-\s]*(\d{4})/i)
  if (compact) {
    const start = Number(compact[1])
    const end = Number(compact[2])
    if (end > start && end - start <= 10) return `${start}-${end}`
  }

  // Pattern 2: 2021-2022 or 2021 - 2022 or 2021/2022 (allow any separator)
  const pair = str.match(/(\d{4})\s*[-\/\s]+\s*(\d{4})/)
  if (pair) {
    const start = Number(pair[1])
    const end = Number(pair[2])
    if (end > start && end - start <= 10) return `${start}-${end}`
  }

  // Pattern 3: Short year format like 2021-22 or 2021/22
  const shortYear = str.match(/(\d{4})\s*[-\/]\s*(\d{2})(?!\d)/)
  if (shortYear) {
    const start = Number(shortYear[1])
    const endShort = Number(shortYear[2])
    const century = Math.floor(start / 100) * 100
    const end = century + endShort
    if (end > start && end - start <= 10) return `${start}-${end}`
  }

  // Pattern 4: Just "AY 2021" - assume it's 2021-2022
  const singleYear = str.match(/ay\s*(\d{4})(?!\d)/i)
  if (singleYear) {
    const start = Number(singleYear[1])
    return `${start}-${start + 1}`
  }

  // Pattern 5: Standalone year pair anywhere in string (more permissive)
  const looseMatch = str.match(/(20\d{2})[^\d]*(20\d{2})/)
  if (looseMatch) {
    const start = Number(looseMatch[1])
    const end = Number(looseMatch[2])
    if (end > start && end - start <= 10) return `${start}-${end}`
  }

  return null
}

const extractAyLabelsFromRows = (rows = []) => {
  const labels = new Set()
  rows.forEach((row) => {
    Object.keys(row || {}).forEach((key) => {
      const label = deriveAyLabelFromKey(String(key))
      if (label) labels.add(label)
    })
  })
  return Array.from(labels).sort((a, b) => parseInt(a.slice(0, 4), 10) - parseInt(b.slice(0, 4), 10))
}

const excelDateToISO = (value) => {
  const parsed = XLSX.SSF?.parse_date_code?.(value)
  if (!parsed) return value
  const pad = (n) => String(n).padStart(2, '0')
  return `${parsed.y}-${pad(parsed.m)}-${pad(parsed.d)}`
}

const isAmountKey = (key = '') => /amount/.test(String(key).toLowerCase())

// Static student schema (2-tier max)
const STATIC_SCHEMA = [
  { key: 'seq', label: 'SEQ', rowSpan: 3, width: 60 },
  { key: 'inCharge', label: 'IN-CHARGE', rowSpan: 3, width: 120 },
  { key: 'awardYear', label: 'AWARD YEAR', rowSpan: 3, width: 100 },
  { key: 'scholarshipProgram', label: 'SCHOLARSHIP PROGRAM', rowSpan: 3, width: 180 },
  { key: 'awardNumber', label: 'AWARD NUMBER', rowSpan: 3, width: 140 },
  { key: 'learnerReferenceNumber', label: 'LEARNER REFERENCE NUMBER', rowSpan: 3, width: 200 },
  {
    label: 'NAME OF GRANTEE',
    colSpan: 4,
    children: [
      { key: 'surname', label: 'SURNAME', width: 140 },
      { key: 'firstName', label: 'FIRST NAME', width: 140 },
      { key: 'middleName', label: 'MIDDLE NAME', width: 140 },
      { key: 'extension', label: 'EXTENSION', width: 80 },
    ],
  },
  { key: 'sex', label: 'SEX', rowSpan: 3, width: 80, type: 'select', options: ['Male', 'Female'] },
  { key: 'dateOfBirth', label: 'DATE OF BIRTH', rowSpan: 3, width: 120, type: 'date' },
  {
    label: 'CONTACT DETAILS',
    colSpan: 2,
    children: [
      { key: 'contactNumber', label: 'CONTACT NUMBER', width: 140 },
      { key: 'emailAddress', label: 'EMAIL ADDRESS', width: 200 },
    ],
  },
  {
    label: 'COMPLETE ADDRESS',
    colSpan: 5,
    children: [
      { key: 'streetBrgy', label: 'STREET_BRGY', width: 180 },
      { key: 'municipalityCity', label: 'MUNICIPALITY_CITY', width: 160 },
      { key: 'province', label: 'PROVINCE', width: 140 },
      { key: 'congressionalDistrict', label: 'CONGRESSIONAL DISTRICT', width: 160 },
      { key: 'zipCode', label: 'ZIP CODE', width: 100 },
    ],
  },
  { key: 'specialGroup', label: 'SPECIAL GROUP', rowSpan: 3, width: 140, type: 'select', options: ['IP', 'PWD', 'Solo Parent', ''] },
  { key: 'certificationNumber', label: 'CERTIFICATION NUMBER (If Applicable)', rowSpan: 3, width: 200 },
  { key: 'nameOfInstitution', label: 'NAME OF INSTITUTION', rowSpan: 3, width: 220 },
  { key: 'uii', label: 'UII', rowSpan: 3, width: 100 },
  { key: 'institutionalType', label: 'INSTITUTIONAL TYPE', rowSpan: 3, width: 140 },
  { key: 'regionSchoolLocated', label: 'REGION WHERE THE SCHOOL IS LOCATED', rowSpan: 3, width: 220 },
  { key: 'degreeProgram', label: 'DEGREE PROGRAM', rowSpan: 3, width: 200 },
  { key: 'programMajor', label: 'PROGRAM MAJOR', rowSpan: 3, width: 180 },
  { key: 'programDiscipline', label: 'PROGRAM DISCIPLINE', rowSpan: 3, width: 180 },
  { key: 'programDegreeLevel', label: 'PROGRAM DEGREE LEVEL', rowSpan: 3, width: 200, type: 'select', options: ['Pre-baccalaureate', 'Baccalaureate', 'Post Baccalaureate', 'Masters', 'Doctorate', ''] },
  {
    label: 'GOVERNMENT AUTHORITY',
    colSpan: 3,
    children: [
      { key: 'authorityType', label: 'AUTHORITY TYPE', width: 140, type: 'select', options: ['GP', 'GR', 'RRPA', 'COPC', ''] },
      { key: 'authorityNumber', label: 'AUTHORITY NUMBER', width: 160 },
      { key: 'series', label: 'SERIES', width: 100 },
    ],
  },
  {
    label: 'PRIORITY PROGRAM',
    colSpan: 2,
    children: [
      { key: 'priority', label: 'PRIORITY', width: 120, type: 'select', options: ['Yes', 'No', ''] },
      { key: 'basisCmo', label: 'BASIS (CMO)', width: 140 },
    ],
  },
  { key: 'scholarshipStatus', label: 'SCHOLARSHIP STATUS', rowSpan: 3, width: 180, type: 'select', options: ['On-going', 'Graduated', 'Terminated', ''] },
  {
    label: 'REMARKS',
    colSpan: 2,
    children: [
      { key: 'replacement', label: 'REPLACEMENT', width: 140 },
      { key: 'reason', label: 'REASON', width: 180 },
    ],
  },
]

const buildHeaders = (academicYears) => {
  const row1 = []
  const row2 = []
  const row3 = []
  const leafFields = []

  // Static portion (2-tier maximum)
  STATIC_SCHEMA.forEach(col => {
    if (col.children) {
      row1.push({ ...col })
      col.children.forEach(child => {
        row2.push({ ...child, rowSpan: 2 })
        leafFields.push({ ...child })
      })
    } else {
      row1.push({ ...col })
      leafFields.push({ ...col })
    }
  })

  // Dynamic AY blocks (3-tier)
  academicYears.forEach((ay) => {
    const ayId = ay.id
    const semFirst = SEM_FIELDS.map(f => ({ ...f, key: `${ayId}__first__${f.key}`, semester: 'First', ayId }))
    const semSecond = SEM_FIELDS.map(f => ({ ...f, key: `${ayId}__second__${f.key}`, semester: 'Second', ayId }))
    const cylKey = `${ayId}__cyl`

    row1.push({ label: `AY ${ay.label}`, colSpan: 1 + semFirst.length + semSecond.length, ayId })

    row2.push({ label: 'CURRICULUM YEAR LEVEL', key: cylKey, rowSpan: 2, width: 180, type: 'select', options: ['I', 'II', 'III', 'IV', 'V', 'VI', ''] })
    row2.push({ label: 'FIRST SEMESTER', colSpan: semFirst.length, ayId, semester: 'First' })
    row2.push({ label: 'SECOND SEMESTER', colSpan: semSecond.length, ayId, semester: 'Second' })

    semFirst.forEach(f => row3.push(f))
    semSecond.forEach(f => row3.push(f))

    leafFields.push({ key: cylKey, label: `CYL (${ay.label})`, ayId, width: 180 })
    semFirst.concat(semSecond).forEach(f => leafFields.push(f))
  })

  return { row1, row2, row3, leafFields }
}

const getFieldConfig = (fieldKey, leafFields) => leafFields.find(f => f.key === fieldKey) || {}

// Map frontend keys to backend keys
const FRONTEND_TO_BACKEND_MAP = {
  seq: null, // Ignore seq
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

// Convert frontend data to backend format
const convertToBackendFormat = (frontendData) => {
  return frontendData.map(row => {
    const backendRow = {}
    Object.entries(row).forEach(([key, value]) => {
      const backendKey = FRONTEND_TO_BACKEND_MAP[key]
      if (backendKey === null) return // Skip seq
      if (backendKey && value !== '' && value !== null && value !== undefined) {
        // Convert priority to boolean
        if (key === 'priority') {
          backendRow[backendKey] = value === 'Yes' || value === true || value === 'true' || value === '1'
        } else {
          backendRow[backendKey] = value
        }
      }
    })
    return backendRow
  })
}

const convertDisbursementsToBackend = (rows = [], academicYears = [], studentSeqByIndex = []) => {
  try {
    if (!Array.isArray(rows) || !Array.isArray(academicYears)) return []
    if (rows.length === 0 || academicYears.length === 0) return []
    
    // Preserve index alignment with student seq mapping
    const validRows = rows.map((r) => (r && typeof r === 'object' ? r : {}))
    const validAys = academicYears.filter((ay) => ay && ay.id && ay.label)
    
    if (validRows.length === 0 || validAys.length === 0) return []
    
    // Need DB-assigned seq mapping for proper foreign keys
    if (!Array.isArray(studentSeqByIndex) || studentSeqByIndex.length === 0) return []

    const semFieldMap = {
      nta: 'nta',
      grant: 'grant',
      fundSource: 'fund_source',
      amount: 'amount',
      voucherNumber: 'voucher_number',
      modeOfPayment: 'mode_of_payment',
      accountCheckNo: 'account_check_no',
      lddapNumber: 'lddap_number',
      disbursementDate: 'disbursement_date',
      status: 'status',
      remarks: 'remarks',
    }

    const semFieldKeys = Object.keys(semFieldMap)
    const disbursements = []

    for (let ri = 0; ri < validRows.length; ri++) {
      const row = validRows[ri]
      const studentSeq = studentSeqByIndex[ri]
      if (!row || !studentSeq) continue

      for (let ai = 0; ai < validAys.length; ai++) {
        const ay = validAys[ai]
        if (!ay || !ay.id || !ay.label) continue

        const cylKey = `${ay.id}__cyl`
        const cyl = row[cylKey] || ''

        const semesters = ['first', 'second']
        for (let si = 0; si < semesters.length; si++) {
          const semKey = semesters[si]
          const semesterLabel = si === 0 ? 'First' : 'Second'
          const base = `${ay.id}__${semKey}__`

          const payload = {
            student_seq: studentSeq,
            academic_year: ay.label,
            semester: semesterLabel,
            curriculum_year_level: cyl,
          }

          let hasData = false
          for (let fi = 0; fi < semFieldKeys.length; fi++) {
            const k = semFieldKeys[fi]
            const backendK = semFieldMap[k]
            const val = row[`${base}${k}`]
            
            if (val !== '' && val !== null && val !== undefined) {
              hasData = true
              if (backendK === 'grant' || backendK === 'amount') {
                const num = Number(String(val).replace(/,/g, ''))
                payload[backendK] = Number.isFinite(num) ? num : val
              } else {
                payload[backendK] = val
              }
            }
          }

          if (hasData) {
            disbursements.push(payload)
          }
        }
      }
    }

    return disbursements
  } catch (err) {
    console.error('convertDisbursementsToBackend error:', err)
    return []
  }
}

export default function ImportBulk() {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [inputKey, setInputKey] = useState(Date.now())
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)
  const [academicYears, setAcademicYears] = useState([
    { id: makeAyId('2024-2025'), label: '2024-2025' },
  ])
  const [ayInput, setAyInput] = useState('2024-2025')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [duplicateMap, setDuplicateMap] = useState({}) // { rowIndex: { matches: [...], checking: false } }
  const [duplicateChecking, setDuplicateChecking] = useState(false)
  const duplicateCheckTimer = useRef(null)
  const [uploadProgress, setUploadProgress] = useState(null) // { current, total, done }

  const { row1: headerRow1, row2: headerRow2, row3: headerRow3, leafFields } = useMemo(
    () => buildHeaders(academicYears),
    [academicYears]
  )

  // Paginated data slice
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return data.slice(startIndex, endIndex)
  }, [data, currentPage, pageSize])

  // Reset to first page when data changes significantly
  useEffect(() => {
    if (currentPage > Math.ceil(data.length / pageSize)) {
      setCurrentPage(1)
    }
  }, [data.length, pageSize, currentPage])

  useEffect(() => {
    setData((prev) =>
      prev.map((row, idx) => {
        const next = { ...row }
        leafFields.forEach(f => {
          if (next[f.key] === undefined) next[f.key] = ''
        })
        Object.keys(next).forEach(k => {
          if (!leafFields.find(f => f.key === k) && k !== 'seq') delete next[k]
        })
        if (!next.seq) next.seq = String(idx + 1)
        return next
      })
    )
  }, [leafFields])

  // Normalize parsed rows to include all fields in order
  const normalizeRows = (rows, fields = leafFields) =>
    rows.map((row, idx) => {
      const normalized = {}
      const entries = Object.entries(row)

      fields.forEach((field) => {
        const match = entries.find(([k]) => sanitize(k) === sanitize(field.label) || sanitize(k) === sanitize(field.key))
        normalized[field.key] = match ? match[1] ?? '' : ''
      })

      if (!normalized.seq) normalized.seq = String(idx + 1)
      return normalized
    })

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const buffer = new Uint8Array(e.target.result)
        const workbook = XLSX.read(buffer, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        // Grab first 3 header rows as arrays
        const headerRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, blankrows: false })

        // Find the maximum column count across all rows
        const maxColCount = headerRows.reduce((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0)

        const fillForward = (row = [], maxLen = maxColCount) => {
          // Extend the array to maxLen first
          const filled = Array.from({ length: maxLen }, (_, i) => row[i])
          for (let i = 0; i < filled.length; i += 1) {
            if (filled[i] === undefined || filled[i] === null || filled[i] === '') {
              filled[i] = i > 0 ? filled[i - 1] : filled[i]
            }
          }
          return filled
        }

        const topRowRaw = headerRows[0] || []
        const midRowRaw = headerRows[1] || []
        const leafRow = headerRows[2] || []

        // Extend leaf row to max length too (but don't fill forward - keep original values)
        const leafRowExtended = Array.from({ length: maxColCount }, (_, i) => leafRow[i] ?? '')

        const topRow = fillForward(topRowRaw, maxColCount)
        const midRow = fillForward(midRowRaw, maxColCount)

        // Detect AYs from all header rows (more thorough detection)
        const detectAysFromRow = (row) => row
          .map((cell) => deriveAyLabelFromKey(String(cell || '')))
          .filter(Boolean)
        
        const ayFromTop = detectAysFromRow(topRow)
        const ayFromMid = detectAysFromRow(midRow)
        const ayFromLeaf = detectAysFromRow(leafRow)
        
        const detectedAyLabels = Array.from(new Set([...ayFromTop, ...ayFromMid, ...ayFromLeaf]))
          .sort((a, b) => parseInt(a.slice(0, 4), 10) - parseInt(b.slice(0, 4), 10))

        const mergedAys = mergeAcademicYears(academicYears, detectedAyLabels)
        const { leafFields: nextLeafFields } = buildHeaders(mergedAys)

        // Build column mapping using header rows
        const maxCols = maxColCount
        const columnMeta = Array.from({ length: maxCols }).map((_, idx) => {
          const leafLabel = leafRowExtended[idx]
          const midLabel = midRow[idx]
          const topLabel = topRow[idx]
          const fallback = midLabel || topLabel || ''
          const label = leafLabel || fallback || ''
          
          // Check all three rows for AY label (more thorough detection)
          const ayLabel =
            deriveAyLabelFromKey(String(topLabel || '')) ||
            deriveAyLabelFromKey(String(midLabel || '')) ||
            deriveAyLabelFromKey(String(leafLabel || '')) ||
            deriveAyLabelFromKey(String(label))
          
          // Check all three rows for semester detection
          const checkSemester = (str) => {
            const san = sanitize(String(str || ''))
            if (san.includes('first') || san.includes('1st') || san === '1stsem' || san === 'firstsem') return 'First'
            if (san.includes('second') || san.includes('2nd') || san === '2ndsem' || san === 'secondsem') return 'Second'
            return null
          }
          const semester = checkSemester(midLabel) || checkSemester(topLabel) || checkSemester(leafLabel)
          
          return { idx, label, ayLabel, semester, raw: { top: topLabel, mid: midLabel, leaf: leafLabel } }
        })

        // Map excel columns to leafFields
        const colToField = new Map()
        const unmappedCols = []
        const assignedFieldKeys = new Set() // Track which leaf fields are already mapped

        columnMeta.forEach((col) => {
          const labelSan = sanitize(col.label)
          if (!labelSan) {
            unmappedCols.push(col)
            return
          }
          
          const candidates = nextLeafFields.filter((f) => {
            // Skip fields already assigned to another column
            if (assignedFieldKeys.has(f.key)) return false

            const fLabelSan = sanitize(f.label)
            const fKeySan = sanitize(f.key)
            const matchesLabel = fLabelSan === labelSan || fKeySan === labelSan
            
            // For AY matching, be more flexible
            let ayMatches = false
            if (col.ayLabel) {
              // Find the AY in merged list and check if field belongs to it
              const matchedAy = mergedAys.find((ay) => ay.label === col.ayLabel)
              ayMatches = matchedAy && f.ayId === matchedAy.id
            } else {
              // Column has no AY, field should also have no AY
              ayMatches = !f.ayId
            }
            
            // Semester matching - only check if both have semester info
            const semMatches = !col.semester || !f.semester || f.semester === col.semester

            // For CYL columns, allow loose match
            const isCyl = f.key.endsWith('__cyl') || fLabelSan.includes('cyl') || fLabelSan.includes('curriculumyearlevel')
            const cylMatch = isCyl && (labelSan.includes('cyl') || labelSan.includes('curriculum') || labelSan.includes('yearlevel'))

            // LDDAP headers often appear as just "LDDAP"; accept starts-with for LDDAP fields
            const isLddapField = fLabelSan.includes('lddap') || fKeySan.includes('lddap')
            const lddapMatch = isLddapField && labelSan.startsWith('lddap')

            // For AY fields, require AY to match; for static fields, require no AY
            if (f.ayId) {
              return ayMatches && semMatches && (matchesLabel || cylMatch || lddapMatch)
            } else {
              return ayMatches && (matchesLabel || cylMatch || lddapMatch)
            }
          })

          if (candidates.length > 0) {
            colToField.set(col.idx, candidates[0])
            assignedFieldKeys.add(candidates[0].key)
          } else {
            unmappedCols.push(col)
            // Debug: Log why this column wasn't mapped
            console.log('Unmapped column:', {
              idx: col.idx,
              label: col.label,
              ayLabel: col.ayLabel,
              semester: col.semester,
              raw: col.raw
            })
          }
        })

        // Positional fallback for unmapped columns:
        // If a column couldn't be matched by name (e.g. duplicate header names),
        // map it to the leaf field at that position if the field is still unassigned
        if (unmappedCols.length > 0) {
          const positionFilled = []
          unmappedCols.forEach((col) => {
            const posField = nextLeafFields[col.idx]
            if (posField && !assignedFieldKeys.has(posField.key)) {
              colToField.set(col.idx, posField)
              assignedFieldKeys.add(posField.key)
              positionFilled.push({ col: col.idx, label: col.label, field: posField.key })
            }
          })
          if (positionFilled.length > 0) {
            console.log('Positional fallback mapped:', positionFilled)
          }
        }

        // Full fallback: if name-based mapping is very poor overall, use pure positional mapping
        const mappedFieldKeys = new Set(Array.from(colToField.values()).map(f => f.key))
        const staticFieldCount = nextLeafFields.filter(f => !f.ayId).length
        const mappedStaticCount = nextLeafFields.filter(f => !f.ayId && mappedFieldKeys.has(f.key)).length

        if (mappedStaticCount < staticFieldCount * 0.4) {
          // Name-based mapping failed for most columns — fall back to full positional mapping
          console.log(`Name-based mapping poor (${mappedStaticCount}/${staticFieldCount} static fields). Falling back to full structural position mapping.`)
          colToField.clear()
          unmappedCols.length = 0

          for (let i = 0; i < Math.min(maxCols, nextLeafFields.length); i++) {
            colToField.set(i, nextLeafFields[i])
          }

          message.info('Column headers not recognized — mapped by structural position instead')
        }

        // Data rows start after the first 3 header rows
        const dataRowsRaw = headerRows.slice(3)
        
        // Build set of known header tokens from all header rows
        const headerSanSet = new Set([...topRow, ...midRow, ...leafRow].map((v) => sanitize(String(v || ''))).filter(Boolean))
        
        // Additional common header tokens that should be filtered (including abbreviated versions)
        const knownHeaderTokens = [
          // Full names
          'seq', 'incharge', 'awardyear', 'scholarshipprogram', 'awardnumber',
          'surname', 'firstname', 'middlename', 'extension', 'sex', 'birthday',
          'dateofbirth', 'contactnumber', 'email', 'emailaddress', 'address',
          'streetbrgy', 'municipalitycity', 'province', 'congressionaldistrict',
          'zipcode', 'specialgroup', 'certificationnumber', 'nameofinstitution',
          'uii', 'institutionaltype', 'region', 'degreeprogram', 'programmajor',
          'programdiscipline', 'programdegreelevel', 'authoritytype', 'authoritynumber',
          'series', 'priority', 'basiscmo', 'scholarshipstatus', 'replacementinfo',
          'terminationreason', 'cyl', 'curriculumyearlevel', 'nta', 'fundsource',
          'amount', 'vouchernumber', 'modeofpayment', 'accountcheckno', 'grant',
          'lddapnumber', 'disbursementdate', 'remarks', 'firstsemester', 'secondsemester',
          'semester', 'ay', 'academicyear',
          // Abbreviated versions from Excel (SCHO_PROG, AW_YR, S_NAME, F_NAME, etc.)
          'awyr', 'schoprog', 'awno', 'sname', 'fname', 'mname', 'ename',
          'contno', 'emladd', 'stbrgy', 'muncity', 'congdist', 'spgrp',
          'certno', 'hei', 'insttype', 'progname', 'progmjr', 'progdiscp',
          'proglvl', 'gprtype', 'gprno', 'gprseries', 'priobasis', 'schostatus',
          'remarks1', 'remarks2', 'nameofgrantee', 'contactdetails', 'completeaddress',
          'governmentauthority', 'priorityprogram'
        ]
        knownHeaderTokens.forEach(t => headerSanSet.add(t))

        const isHeaderLikeRow = (row = []) => {
          const tokens = row.map((cell) => sanitize(String(cell || ''))).filter(Boolean)
          if (tokens.length === 0) return true
          const hits = tokens.filter((t) => headerSanSet.has(t)).length
          // If more than 25% of non-empty cells match header tokens, skip this row
          // Lowered threshold to catch more header variants
          return hits / tokens.length >= 0.25
        }

        const dataRows = dataRowsRaw.filter((row) => {
          if (!Array.isArray(row)) return false
          const hasValue = row.some((cell) => sanitize(String(cell || '')) !== '')
          if (!hasValue) return false
          if (isHeaderLikeRow(row)) return false
          return true
        })
        const normalized = dataRows.map((row, idx) => {
          const normalizedRow = {}

          nextLeafFields.forEach((f) => {
            normalizedRow[f.key] = ''
          })
          normalizedRow.seq = String(idx + 1)

          row.forEach((value, colIdx) => {
            const field = colToField.get(colIdx)
            if (!field) return
            let cellVal = value
            if (cellVal === null || cellVal === undefined) cellVal = ''

            if (typeof cellVal === 'number') {
              if (field.type === 'date') {
                cellVal = excelDateToISO(cellVal)
              }
            }

            if (typeof cellVal === 'string') {
              cellVal = cellVal.trim()
              if (isAmountKey(field.key)) {
                cellVal = cellVal.replace(/,/g, '')
              }
            }

            normalizedRow[field.key] = cellVal === undefined || cellVal === null ? '' : cellVal
          })

          return normalizedRow
        })

        // Validation: required columns
        const mappedKeys = Array.from(colToField.values()).map((f) => f.key)
        const missingCritical = ['surname', 'firstName'].filter((req) => !mappedKeys.includes(req))
        if (missingCritical.length > 0) {
          message.error(`Missing required column(s): ${missingCritical.join(', ')}`)
          return
        }

        const mappedCount = colToField.size
        const ignoredCount = columnMeta.length - mappedCount
        if (ignoredCount > 0) {
          const unmappedAyCols = unmappedCols.filter((c) => c.ayLabel)
          if (unmappedAyCols.length > 0) {
            console.warn('Unmapped AY columns:', unmappedAyCols.map(c => ({
              label: c.label,
              ayLabel: c.ayLabel,
              semester: c.semester,
              raw: c.raw
            })))
            message.warning(`Some AY columns were not mapped: ${unmappedAyCols.map((c) => c.label || c.raw.leaf || c.raw.mid).slice(0, 5).join(', ')}${unmappedAyCols.length > 5 ? ` and ${unmappedAyCols.length - 5} more...` : ''}`)
          }
        }

        // Debug: Log detected AYs and mapping summary
        console.log('Detected Academic Years:', detectedAyLabels)
        console.log('Merged Academic Years:', mergedAys.map(ay => ay.label))
        console.log(`Column mapping: ${mappedCount} mapped, ${ignoredCount} ignored, ${unmappedCols.length} unmapped`)

        setAcademicYears(mergedAys)
        setData(normalized)

        // Trigger duplicate check after file upload
        checkDuplicates(normalized)

        message.success(`File ${file.name} loaded - ${normalized.length} records | Mapped ${mappedCount}/${columnMeta.length} columns${ignoredCount > 0 ? `, ignored ${ignoredCount}` : ''}${detectedAyLabels.length > 0 ? ` | AY detected: ${detectedAyLabels.join(', ')}` : ''}`)
      } catch (error) {
        console.error(error)
        message.error('Error parsing file')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  // Handle cell edit
  const handleCellEdit = (rowIndex, field, newValue) => {
    setData(prev => {
      const updated = [...prev]
      updated[rowIndex] = { ...updated[rowIndex], [field]: newValue }
      // Trigger duplicate check on relevant field changes
      const dupFields = ['surname', 'firstName', 'middleName', 'awardNumber', 'nameOfInstitution']
      if (dupFields.includes(field)) {
        triggerDuplicateCheck(updated)
      }
      return updated
    })
  }

  // Add new row
  const handleAddRow = () => {
    const newRow = {}
    leafFields.forEach(field => {
      newRow[field.key] = ''
    })
    newRow.seq = String(data.length + 1)
    setData(prev => [...prev, newRow])
    // Navigate to the page containing the new row
    const newTotalRows = data.length + 1
    const newPage = Math.ceil(newTotalRows / pageSize)
    setCurrentPage(newPage)
  }

  // Delete row
  const handleDeleteRow = (rowIndex) => {
    setData(prev => {
      const updated = prev.filter((_, idx) => idx !== rowIndex)
      // Re-number seq
      return updated.map((row, idx) => ({ ...row, seq: String(idx + 1) }))
    })
  }

  // --- Duplicate detection ---
  const checkDuplicates = useCallback(async (rows) => {
    if (!rows || rows.length === 0) {
      setDuplicateMap({})
      return
    }

    // Build candidates from rows that have at least a surname + first name
    const candidates = rows.map((row) => ({
      surname: row.surname || '',
      first_name: row.firstName || '',
      middle_name: row.middleName || '',
      award_number: row.awardNumber || '',
      name_of_institution: row.nameOfInstitution || '',
    }))

    // Only check rows that have at least a name
    const hasData = candidates.some(c => c.surname || c.first_name)
    if (!hasData) {
      setDuplicateMap({})
      return
    }

    setDuplicateChecking(true)
    try {
      const res = await fetch(`${API_BASE}/students/check-duplicates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidates }),
      })
      if (!res.ok) throw new Error('Duplicate check failed')
      const json = await res.json()
      const newMap = {}
      ;(json.duplicates || []).forEach(d => {
        newMap[d.row_index] = { matches: d.matches }
      })

      // Also detect duplicates within the import batch itself
      const batchDupMap = {}
      const nameKey = (r) => {
        const s = (r.surname || '').trim().toLowerCase()
        const f = (r.firstName || '').trim().toLowerCase()
        const m = (r.middleName || '').trim().toLowerCase()
        return s && f ? `${s}|${f}|${m}` : null
      }
      const awardKey = (r) => {
        const a = (r.awardNumber || '').trim()
        return a || null
      }

      // Group by name and award number
      const nameGroups = {}
      const awardGroups = {}
      rows.forEach((row, idx) => {
        const nk = nameKey(row)
        if (nk) {
          if (!nameGroups[nk]) nameGroups[nk] = []
          nameGroups[nk].push(idx)
        }
        const ak = awardKey(row)
        if (ak) {
          if (!awardGroups[ak]) awardGroups[ak] = []
          awardGroups[ak].push(idx)
        }
      })

      // Mark batch duplicates
      Object.values(nameGroups).filter(g => g.length > 1).forEach(group => {
        group.forEach(idx => {
          if (!batchDupMap[idx]) batchDupMap[idx] = []
          const others = group.filter(i => i !== idx).map(i => `Row ${i + 1}`)
          batchDupMap[idx].push({ match_type: 'batch_name', detail: `Same name as ${others.join(', ')}` })
        })
      })
      Object.values(awardGroups).filter(g => g.length > 1).forEach(group => {
        group.forEach(idx => {
          if (!batchDupMap[idx]) batchDupMap[idx] = []
          const others = group.filter(i => i !== idx).map(i => `Row ${i + 1}`)
          batchDupMap[idx].push({ match_type: 'batch_award', detail: `Same award number as ${others.join(', ')}` })
        })
      })

      // Merge batch duplicates into the map
      Object.keys(batchDupMap).forEach(idx => {
        const numIdx = Number(idx)
        if (!newMap[numIdx]) newMap[numIdx] = { matches: [] }
        batchDupMap[idx].forEach(bd => {
          newMap[numIdx].matches.push({
            match_type: bd.match_type,
            name: bd.detail,
            award_number: '',
            institution: '',
            program: '',
          })
        })
      })

      setDuplicateMap(newMap)
    } catch (err) {
      console.error('Duplicate check error:', err)
    } finally {
      setDuplicateChecking(false)
    }
  }, [])

  // Debounced duplicate check
  const triggerDuplicateCheck = useCallback((rows) => {
    if (duplicateCheckTimer.current) clearTimeout(duplicateCheckTimer.current)
    duplicateCheckTimer.current = setTimeout(() => {
      checkDuplicates(rows)
    }, 1000)
  }, [checkDuplicates])

  // Count total duplicates
  const duplicateCount = useMemo(() => Object.keys(duplicateMap).length, [duplicateMap])

  // Clear data and reset input
  const handleClear = () => {
    setData([])
    setDuplicateMap({})
    setInputKey(Date.now())
    setCurrentPage(1)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Chunk an array into smaller arrays of a given size
  const chunkArray = (arr, size) => {
    const chunks = []
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size))
    }
    return chunks
  }

  const STUDENT_CHUNK_SIZE = 200
  const DISBURSEMENT_CHUNK_SIZE = 500

  // Submit data
  const handleSubmitData = async () => {
    if (data.length === 0) {
      message.warning('No data to submit')
      return
    }

    const backendData = convertToBackendFormat(data)
    const studentChunks = chunkArray(backendData, STUDENT_CHUNK_SIZE)
    const totalStudents = backendData.length
    const totalStudentChunks = studentChunks.length

    // Total work units = students + disbursements (estimated) + 1 for slot update
    const totalWork = totalStudents // will be updated once we know disbursement count
    let uploaded = 0

    setLoading(true)
    setUploadProgress({ current: 0, total: totalWork, done: false })

    try {
      // --- Phase 1: Upload students in chunks ---
      const allCreatedStudents = []

      for (let i = 0; i < totalStudentChunks; i++) {
        const chunk = studentChunks[i]
        setUploadProgress({ current: uploaded, total: totalWork, done: false })

        const response = await fetch(`${API_BASE}/students/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ students: chunk }),
        })

        if (!response.ok) {
          const errText = await response.text().catch(() => '')
          throw new Error(`Failed to import students (batch ${i + 1}): ${errText || response.status}`)
        }

        const respJson = await response.json().catch(() => null)
        const created = respJson?.data || []
        allCreatedStudents.push(...created)
        uploaded += chunk.length
        setUploadProgress({ current: uploaded, total: totalWork, done: false })
      }

      // --- Phase 2: Upload disbursements in chunks ---
      const studentSeqByIndex = allCreatedStudents.map((s) => s.seq)
      const backendDisbursements = convertDisbursementsToBackend(data, academicYears, studentSeqByIndex)

      if (backendDisbursements.length > 0) {
        const disbChunks = chunkArray(backendDisbursements, DISBURSEMENT_CHUNK_SIZE)
        const totalDisbursements = backendDisbursements.length
        const totalDisbChunks = disbChunks.length
        const grandTotal = totalStudents + totalDisbursements

        for (let i = 0; i < totalDisbChunks; i++) {
          const chunk = disbChunks[i]
          setUploadProgress({ current: uploaded, total: grandTotal, done: false })

          try {
            const disbResponse = await fetch(`${API_BASE}/disbursements/bulk`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ disbursements: chunk }),
            })
            if (!disbResponse.ok) {
              const errText = await disbResponse.text()
              console.warn(`Disbursement batch ${i + 1} failed:`, errText)
            }
          } catch (err) {
            console.error(`Disbursement batch ${i + 1} error:`, err)
          }
          uploaded += chunk.length
          setUploadProgress({ current: uploaded, total: grandTotal, done: false })
        }
      }

      const slotResponse = await fetch(`${API_BASE}/scholarship_programs/update-slots`, {
        method: 'POST',
      })

      if (!slotResponse.ok) {
        message.warning('Students imported, but slot update failed')
      }

      // --- Done ---
      setUploadProgress(prev => ({ ...prev, done: true }))
      await new Promise(r => setTimeout(r, 1000))

      message.success('Import complete!')
      handleClear()
      setUploadProgress(null)
      navigate('/students')
    } catch (error) {
      console.error('Error:', error)
      message.error(error.message || 'Something went wrong')
      setUploadProgress(null)
    } finally {
      setLoading(false)
    }
  }

  // Render cell input based on field type
  const renderCellInput = (row, rowIndex, field) => {
    const config = getFieldConfig(field.key, leafFields)
    const value = row[field.key] ?? ''

    if (config.type === 'select' && config.options) {
      return (
        <Select
          value={value || undefined}
          onChange={(val) => handleCellEdit(rowIndex, field.key, val || '')}
          allowClear
          className="w-full"
          size="small"
          placeholder="-"
          style={{ minWidth: config.width - 16 }}
          popupMatchSelectWidth={false}
        >
          {config.options.filter(opt => opt !== '').map(opt => (
            <Select.Option key={opt} value={opt}>{opt}</Select.Option>
          ))}
        </Select>
      )
    }

    if (config.type === 'date') {
      return (
        <DatePicker
          value={value ? dayjs(value) : null}
          onChange={(date, dateString) => handleCellEdit(rowIndex, field.key, dateString)}
          size="small"
          className="w-full"
          format="YYYY-MM-DD"
          style={{ minWidth: config.width - 16 }}
        />
      )
    }

    return (
      <Input
        value={value}
        onChange={(e) => handleCellEdit(rowIndex, field.key, e.target.value)}
        size="small"
        className="!border-0 !shadow-none hover:!bg-blue-50 focus:!bg-blue-50 !rounded-none !px-2"
        style={{ minWidth: config.width - 16 }}
      />
    )
  }

  // Calculate total table width
  const totalTableWidth = leafFields.reduce((sum, field) => sum + (field.width || 120), 0) + 60 // +60 for actions column

  return (
    <div style={{ 
      height: 'calc(100vh - 120px)', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden',
      margin: '-24px'
    }}>
      {/* Compact Header Controls */}
      <div style={{ 
        background: 'white', 
        padding: '12px 16px',
        borderBottom: '1px solid #e8e8e8',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          {/* Left: Title and Upload */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UploadOutlined style={{ color: '#1890ff' }} />
              Bulk Import
            </Title>
            
            <label className="cursor-pointer">
              <input
                key={inputKey}
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.xlsm,.xlsb,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                icon={<UploadOutlined />}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload Excel
              </Button>
            </label>

            <Button
              icon={<PlusOutlined />}
              onClick={handleAddRow}
            >
              Add Row
            </Button>

            {/* Academic Year Input */}
            <Input
              placeholder="AY (e.g. 2024-2025)"
              value={ayInput}
              onChange={(e) => setAyInput(e.target.value)}
              style={{ width: 160 }}
              size="small"
            />
            <Button
              size="small"
              type="primary"
              onClick={() => {
                const labels = expandAcademicYearInput(ayInput)
                if (labels.length === 0) return
                const merged = mergeAcademicYears(academicYears, labels)
                const addedCount = merged.length - academicYears.length
                if (addedCount === 0) {
                  message.info('AY already added')
                } else {
                  message.success(`Added ${addedCount} AY`)
                  setAcademicYears(merged)
                }
                setAyInput('')
              }}
            >
              Add AY
            </Button>
          </div>

          {/* Right: Actions */}
          {data.length > 0 && (
            <Space>
              {duplicateChecking && (
                <Tag color="processing">Checking duplicates...</Tag>
              )}
              {!duplicateChecking && duplicateCount > 0 && (
                <Tag color="warning" icon={<WarningOutlined />}>
                  {duplicateCount} possible duplicate{duplicateCount > 1 ? 's' : ''}
                </Tag>
              )}
              <Text type="secondary">{data.length} records</Text>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSubmitData}
                loading={loading}
              >
                Submit All
              </Button>
              <Button
                danger
                icon={<CloseOutlined />}
                onClick={handleClear}
                disabled={loading}
              >
                Clear
              </Button>
            </Space>
          )}
        </div>

        {/* AY Tags Row */}
        {academicYears.length > 0 && (
          <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>Academic Years:</Text>
            {academicYears.map((ay) => (
              <Tag 
                key={ay.id} 
                closable 
                onClose={() => setAcademicYears(prev => sortAcademicYears(prev.filter(p => p.id !== ay.id)))}
              >
                {ay.label}
              </Tag>
            ))}
          </div>
        )}
      </div>

      {/* Table Controls Bar */}
      <div style={{ 
        background: '#fafafa', 
        padding: '8px 16px',
        borderBottom: '1px solid #e8e8e8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div>
          {data.length > 0 ? (
            <Text type="secondary">
              Showing {Math.min((currentPage - 1) * pageSize + 1, data.length)}-{Math.min(currentPage * pageSize, data.length)} of {data.length} rows
            </Text>
          ) : (
            <Text type="secondary">No data loaded</Text>
          )}
        </div>
        
        {data.length > 0 && (
          <Space size="small">
            <Button
              size="small"
              icon={<ExclamationCircleOutlined />}
              onClick={() => checkDuplicates(data)}
              loading={duplicateChecking}
            >
              Re-check Duplicates
            </Button>
            <Text type="secondary">Rows:</Text>
            <Select
              value={pageSize}
              onChange={(value) => {
                setPageSize(value)
                setCurrentPage(1)
              }}
              size="small"
              style={{ width: 70 }}
              options={[
                { label: '20', value: 20 },
                { label: '50', value: 50 },
                { label: '100', value: 100 },
              ]}
            />
          </Space>
        )}
      </div>

      {/* Duplicate Warning Banner */}
      {duplicateCount > 0 && data.length > 0 && (
        <div style={{
          background: 'linear-gradient(90deg, #fffbe6 0%, #fff7e6 100%)',
          padding: '8px 16px',
          borderBottom: '1px solid #ffe58f',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0
        }}>
          <WarningOutlined style={{ color: '#faad14', fontSize: 16 }} />
          <Text style={{ color: '#d48806', fontWeight: 500, fontSize: 13 }}>
            {duplicateCount} row{duplicateCount > 1 ? 's' : ''} may be duplicate{duplicateCount > 1 ? 's' : ''} of existing records or within this batch. 
            Click the <WarningOutlined style={{ color: '#faad14' }} /> icon on the SEQ column to see details.
          </Text>
          <Button
            type="link"
            size="small"
            style={{ color: '#d48806', fontWeight: 500, padding: 0 }}
            onClick={() => {
              // Navigate to the first page with a duplicate
              const firstDupIdx = Math.min(...Object.keys(duplicateMap).map(Number))
              const targetPage = Math.floor(firstDupIdx / pageSize) + 1
              setCurrentPage(targetPage)
            }}
          >
            Go to first duplicate →
          </Button>
        </div>
      )}

      {/* Table Container with Scroll */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto',
        background: 'white'
      }}>
        <table
          className="border-collapse"
          style={{ 
            minWidth: `${totalTableWidth}px`,
            width: '100%'
          }}
        >
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr style={{ background: '#1890ff' }}>
              {headerRow1.map((col, idx) => (
                <th
                  key={idx}
                  colSpan={col.colSpan || 1}
                  rowSpan={col.rowSpan || 1}
                  style={{ 
                    minWidth: col.width, 
                    maxWidth: col.width,
                    padding: '6px 4px',
                    textAlign: 'center',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'white',
                    border: '1px solid #0c7cd5',
                    whiteSpace: 'normal',
                    wordWrap: 'break-word',
                    lineHeight: '1.2'
                  }}
                >
                  {col.label}
                </th>
              ))}
              <th
                rowSpan={3}
                style={{ 
                  minWidth: 60,
                  maxWidth: 60,
                  padding: '6px 4px',
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'white',
                  border: '1px solid #0c7cd5',
                  position: 'sticky',
                  right: 0,
                  background: '#1890ff'
                }}
              >
                #
              </th>
            </tr>
            <tr style={{ background: '#40a9ff' }}>
              {headerRow2.map((col, idx) => (
                <th
                  key={idx}
                  colSpan={col.colSpan || 1}
                  rowSpan={col.rowSpan || 1}
                  style={{ 
                    minWidth: col.width,
                    maxWidth: col.width,
                    padding: '5px 4px',
                    textAlign: 'center',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'white',
                    border: '1px solid #0c7cd5',
                    whiteSpace: 'normal',
                    wordWrap: 'break-word',
                    lineHeight: '1.2'
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
            <tr style={{ background: '#69c0ff' }}>
              {headerRow3.map((col, idx) => (
                <th
                  key={idx}
                  style={{ 
                    minWidth: col.width,
                    maxWidth: col.width,
                    padding: '5px 4px',
                    textAlign: 'center',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'white',
                    border: '1px solid #0c7cd5',
                    whiteSpace: 'normal',
                    wordWrap: 'break-word',
                    lineHeight: '1.2'
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  style={{ 
                    padding: '60px 20px',
                    textAlign: 'center',
                    color: '#bfbfbf',
                    border: '1px solid #f0f0f0'
                  }}
                  colSpan={leafFields.length + 1}
                >
                  <InboxOutlined style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }} />
                  <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>No Data</div>
                  <div style={{ fontSize: '14px' }}>Upload Excel or Add Row to start</div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, paginatedIndex) => {
                const actualRowIndex = (currentPage - 1) * pageSize + paginatedIndex
                const dupInfo = duplicateMap[actualRowIndex]
                const isDuplicate = !!dupInfo && dupInfo.matches && dupInfo.matches.length > 0
                const rowBg = isDuplicate 
                  ? (paginatedIndex % 2 === 0 ? '#fff7e6' : '#fff2d6')
                  : (paginatedIndex % 2 === 0 ? 'white' : '#fafafa')
                return (
                  <tr
                    key={actualRowIndex}
                    style={{ 
                      background: rowBg,
                      borderLeft: isDuplicate ? '3px solid #faad14' : 'none'
                    }}
                    className="hover:bg-blue-50"
                  >
                    {leafFields.map((field) => (
                      <td
                        key={field.key}
                        style={{ 
                          minWidth: field.width,
                          maxWidth: field.width,
                          padding: 0,
                          border: '1px solid #f0f0f0',
                          wordWrap: 'break-word',
                          whiteSpace: 'normal'
                        }}
                      >
                        {field.key === 'seq' ? (
                          <div style={{ 
                            padding: '4px 6px',
                            textAlign: 'center',
                            fontSize: '13px',
                            fontWeight: 500,
                            background: isDuplicate ? '#fff1b8' : '#f5f5f5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4
                          }}>
                            {isDuplicate && (
                              <Popover
                                title={
                                  <span style={{ color: '#d48806' }}>
                                    <ExclamationCircleOutlined style={{ marginRight: 6 }} />
                                    Possible Duplicate Detected
                                  </span>
                                }
                                content={
                                  <div style={{ maxWidth: 380, maxHeight: 250, overflowY: 'auto' }}>
                                    {dupInfo.matches.map((m, mi) => (
                                      <div 
                                        key={mi} 
                                        style={{ 
                                          padding: '8px 12px',
                                          background: mi % 2 === 0 ? '#fffbe6' : '#fff',
                                          borderRadius: 6,
                                          marginBottom: 8,
                                          border: '1px solid #ffe58f',
                                          fontSize: 13
                                        }}
                                      >
                                        <div style={{ fontWeight: 600, marginBottom: 4, color: '#1f2937' }}>
                                          {m.name}
                                        </div>
                                        {m.award_number && (
                                          <div style={{ color: '#6b7280' }}>
                                            <span style={{ fontWeight: 500 }}>Award #:</span> {m.award_number}
                                          </div>
                                        )}
                                        {m.institution && (
                                          <div style={{ color: '#6b7280' }}>
                                            <span style={{ fontWeight: 500 }}>Institution:</span> {m.institution}
                                          </div>
                                        )}
                                        {m.program && (
                                          <div style={{ color: '#6b7280' }}>
                                            <span style={{ fontWeight: 500 }}>Program:</span> {m.program}
                                          </div>
                                        )}
                                        <Tag 
                                          color={
                                            m.match_type === 'full_name' ? 'red' :
                                            m.match_type === 'award_number' ? 'orange' :
                                            m.match_type === 'name_institution' ? 'volcano' :
                                            m.match_type === 'batch_name' ? 'purple' :
                                            m.match_type === 'batch_award' ? 'magenta' : 'default'
                                          }
                                          style={{ marginTop: 6, fontSize: 11 }}
                                        >
                                          {
                                            m.match_type === 'full_name' ? 'Name match in DB' :
                                            m.match_type === 'award_number' ? 'Award # match in DB' :
                                            m.match_type === 'name_institution' ? 'Name + Institution match in DB' :
                                            m.match_type === 'batch_name' ? 'Duplicate name in batch' :
                                            m.match_type === 'batch_award' ? 'Duplicate award # in batch' :
                                            m.match_type
                                          }
                                        </Tag>
                                      </div>
                                    ))}
                                  </div>
                                }
                                trigger="click"
                                placement="right"
                              >
                                <WarningOutlined style={{ color: '#faad14', cursor: 'pointer', fontSize: 14 }} />
                              </Popover>
                            )}
                            {row.seq}
                          </div>
                        ) : (
                          <div style={{ padding: '1px' }}>
                            {renderCellInput(row, actualRowIndex, field)}
                          </div>
                        )}
                      </td>
                    ))}
                    <td
                      style={{ 
                        minWidth: 60,
                        padding: '4px',
                        textAlign: 'center',
                        border: '1px solid #f0f0f0',
                        position: 'sticky',
                        right: 0,
                        background: isDuplicate 
                          ? (paginatedIndex % 2 === 0 ? '#fff7e6' : '#fff2d6')
                          : (paginatedIndex % 2 === 0 ? 'white' : '#fafafa')
                      }}
                    >
                      <Button
                        type="text"
                        danger
                        size="small"
                        onClick={() => handleDeleteRow(actualRowIndex)}
                        style={{ padding: '0 4px' }}
                      >
                        ✕
                      </Button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {data.length > 0 && (
        <div style={{ 
          background: '#fafafa',
          padding: '10px 16px',
          borderTop: '1px solid #e8e8e8',
          display: 'flex',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={data.length}
            onChange={(page) => setCurrentPage(page)}
            showSizeChanger={false}
            showTotal={(total, range) => `${range[0]}-${range[1]} of ${total}`}
            size="small"
          />
        </div>
      )}

      {/* Upload Progress Modal */}
      <Modal
        open={!!uploadProgress}
        closable={false}
        footer={null}
        centered
        maskClosable={false}
        width={400}
      >
        {uploadProgress && (
          <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
            {uploadProgress.done ? (
              <CheckCircleOutlined style={{ fontSize: 40, color: '#52c41a', marginBottom: 16 }} />
            ) : (
              <LoadingOutlined style={{ fontSize: 40, color: '#1890ff', marginBottom: 16 }} />
            )}
            <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 4, color: '#1f2937' }}>
              {uploadProgress.current} / {uploadProgress.total}
            </div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {uploadProgress.done ? 'Done!' : 'Uploading records...'}
            </Text>
            <Progress
              percent={uploadProgress.total > 0 ? Math.round((uploadProgress.current / uploadProgress.total) * 100) : 0}
              status={uploadProgress.done ? 'success' : 'active'}
              style={{ marginTop: 16 }}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}
