import { useState, useRef, useMemo, useEffect } from 'react'
import { Typography, message, Button, Card, Space, Input, Select, DatePicker, Tag, Pagination } from 'antd'
import { UploadOutlined, SendOutlined, CloseOutlined, InboxOutlined, PlusOutlined } from '@ant-design/icons'
import * as XLSX from 'xlsx'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// Semester detail fields (shared for First/Second)
const SEM_FIELDS = [
  { key: 'nta', label: 'NTA', width: 150 },
  { key: 'fundSource', label: 'FUND SOURCE', width: 180 },
  { key: 'amount', label: 'AMOUNT', width: 150 },
  { key: 'voucherNumber', label: 'VOUCHER NUMBER', width: 180 },
  { key: 'modeOfPayment', label: 'MODE OF PAYMENT', width: 180, type: 'select', options: ['ATM', 'Cheque', 'Through the HEI', ''] },
  { key: 'accountCheckNo', label: 'ACCOUNT/CHECK NO.', width: 180 },
  { key: 'paymentAmount', label: 'PAYMENT AMOUNT', width: 160 },
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
  const compact = key.match(/ay[_-]?(\d{4})[_-]?(\d{4})/)
  if (compact) {
    const start = Number(compact[1])
    const end = Number(compact[2])
    if (end > start) return `${start}-${end}`
  }

  const pair = key.match(/(20\d{2})\D{0,2}(20\d{2})/)
  if (pair) {
    const start = Number(pair[1])
    const end = Number(pair[2])
    if (end > start) return `${start}-${end}`
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
      fundSource: 'fund_source',
      amount: 'amount',
      voucherNumber: 'voucher_number',
      modeOfPayment: 'mode_of_payment',
      accountCheckNo: 'account_check_no',
      paymentAmount: 'payment_amount',
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
              if (backendK === 'amount' || backendK === 'payment_amount') {
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

        const fillForward = (row = []) => {
          const filled = [...row]
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

        const topRow = fillForward(topRowRaw)
        const midRow = fillForward(midRowRaw)

        // Detect AYs from the top row labels (flexible patterns)
        const ayFromTop = topRow
          .map((cell) => deriveAyLabelFromKey(String(cell || '')))
          .filter(Boolean)
        const detectedAyLabels = Array.from(new Set(ayFromTop)).sort(
          (a, b) => parseInt(a.slice(0, 4), 10) - parseInt(b.slice(0, 4), 10)
        )

        const mergedAys = mergeAcademicYears(academicYears, detectedAyLabels)
        const { leafFields: nextLeafFields } = buildHeaders(mergedAys)

        // Build column mapping using header rows
        const maxCols = Math.max(topRow.length, midRow.length, leafRow.length)
        const columnMeta = Array.from({ length: maxCols }).map((_, idx) => {
          const leafLabel = leafRow[idx]
          const fallback = midRow[idx] || topRow[idx] || ''
          const label = leafLabel || fallback || ''
          const ayLabel =
            deriveAyLabelFromKey(String(topRow[idx] || '')) ||
            deriveAyLabelFromKey(String(midRow[idx] || '')) ||
            deriveAyLabelFromKey(String(label))
          const semSan = sanitize(String(midRow[idx] || topRow[idx] || ''))
          const semester = semSan.includes('first') || semSan.includes('1st')
            ? 'First'
            : semSan.includes('second') || semSan.includes('2nd')
              ? 'Second'
              : null
          return { idx, label, ayLabel, semester, raw: { top: topRow[idx], mid: midRow[idx], leaf: leafLabel } }
        })

        // Map excel columns to leafFields
        const colToField = new Map()
        const unmappedCols = []

        columnMeta.forEach((col) => {
          const labelSan = sanitize(col.label)
          if (!labelSan) {
            unmappedCols.push(col)
            return
          }
          const candidates = nextLeafFields.filter((f) => {
            const fLabelSan = sanitize(f.label)
            const fKeySan = sanitize(f.key)
            const matchesLabel = fLabelSan === labelSan || fKeySan === labelSan
            const ayMatches = col.ayLabel
              ? mergedAys.find((ay) => ay.label === col.ayLabel)?.id === f.ayId
              : !f.ayId
            const semMatches = col.semester ? f.semester === col.semester : true

            // For CYL columns, allow loose match
            const isCyl = f.key.endsWith('__cyl') || fLabelSan.includes('cyl')
            const cylMatch = isCyl && (labelSan.includes('cyl') || labelSan.includes('curriculum'))

            // LDDAP headers often appear as just "LDDAP"; accept starts-with for LDDAP fields
            const isLddapField = fLabelSan.includes('lddap') || fKeySan.includes('lddap')
            const lddapMatch = isLddapField && labelSan.startsWith('lddap')

            return ayMatches && (semMatches && (matchesLabel || cylMatch || lddapMatch))
          })

          if (candidates.length > 0) {
            colToField.set(col.idx, candidates[0])
          } else {
            unmappedCols.push(col)
          }
        })

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
          'amount', 'vouchernumber', 'modeofpayment', 'accountcheckno', 'paymentamount',
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
            message.warning(`Some AY columns were not mapped: ${unmappedAyCols.map((c) => c.label || c.raw.leaf || c.raw.mid).join(', ')}`)
          }
        }

        setAcademicYears(mergedAys)
        setData(normalized)

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

  // Clear data and reset input
  const handleClear = () => {
    setData([])
    setInputKey(Date.now())
    setCurrentPage(1)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Submit data
  const handleSubmitData = async () => {
    if (data.length === 0) {
      message.warning('No data to submit')
      return
    }

    const backendData = convertToBackendFormat(data)

    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/students/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: backendData }),
      })

      if (!response.ok) throw new Error('Failed to import students')

      // Get DB-assigned seq values from created students
      const respJson = await response.json().catch(() => null)
      const createdStudents = respJson?.data || []
      const studentSeqByIndex = createdStudents.map((s) => s.seq)

      // Now convert disbursements using actual DB seq values
      const backendDisbursements = convertDisbursementsToBackend(data, academicYears, studentSeqByIndex)

      if (backendDisbursements.length > 0) {
        try {
          const disbResponse = await fetch(`${API_BASE}/disbursements/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ disbursements: backendDisbursements }),
          })
          if (!disbResponse.ok) {
            const errText = await disbResponse.text()
            message.warning(`Students saved, but disbursements failed: ${errText || disbResponse.status}`)
          }
        } catch (err) {
          console.error('Disbursement import error:', err)
          message.warning('Students saved, but disbursements failed to upload')
        }
      }

      const slotResponse = await fetch(`${API_BASE}/scholarship_programs/update-slots`, {
        method: 'POST',
      })

      if (!slotResponse.ok) {
        message.warning('Students imported, but slot update failed')
      } else {
        message.success('Students imported and slots updated successfully')
      }

      handleClear()
      navigate('/students')
    } catch (error) {
      console.error('Error:', error)
      message.error(error.message || 'Something went wrong')
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
                return (
                  <tr
                    key={actualRowIndex}
                    style={{ 
                      background: paginatedIndex % 2 === 0 ? 'white' : '#fafafa'
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
                            background: '#f5f5f5'
                          }}>
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
                        background: paginatedIndex % 2 === 0 ? 'white' : '#fafafa'
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
    </div>
  )
}
