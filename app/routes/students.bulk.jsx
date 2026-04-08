import { useState, useRef, useMemo, useEffect, useCallback, memo } from 'react'
import { Typography, message, Button, Space, Input, Select, DatePicker, Tag, Pagination, Popover, Progress, Modal, Divider } from 'antd'
import { ArrowLeftOutlined, UploadOutlined, SendOutlined, CloseOutlined, InboxOutlined, PlusOutlined, WarningOutlined, ExclamationCircleOutlined, CheckCircleOutlined, LoadingOutlined, DeleteOutlined, StopOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons'
import * as XLSX from 'xlsx'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'

import { API_BASE } from '../lib/config'
import { useAuth } from '../lib/AuthContext'

const { Title, Text } = Typography

// Semester detail fields (shared for First/Second)
const SEM_FIELDS = [
  { key: 'nta', label: 'NTA', width: 150 },
  { key: 'fundSource', label: 'FUND SOURCE', width: 180 },
  { key: 'voucherTrackingNo', label: 'VOUCHER TRACKING NO.', width: 200 },
  { key: 'modeOfPayment', label: 'MODE OF PAYMENT', width: 180 },
  { key: 'atmAccountNo', label: 'ATM ACCOUNT NO.', width: 180 },
  { key: 'dateProcess', label: 'DATE PROCESS', width: 160, type: 'date' },
  { key: 'voucherNo', label: 'VOUCHER NO.', width: 180 },
  { key: 'voucherDate', label: 'VOUCHER DATE', width: 160, type: 'date' },
  { key: 'accountCheckNo', label: 'ACCOUNT/CHECK NO.', width: 180 },
  { key: 'amount', label: 'AMOUNT', width: 160 },
  { key: 'lddapNo', label: 'LDDAP NO.', width: 160 },
  { key: 'disbursementDate', label: 'DISBURSEMENT DATE', width: 160, type: 'date' },
  { key: 'status', label: 'STATUS', width: 140 },
  { key: 'remarks', label: 'REMARKS', width: 200 },
]

// Helpers
const sanitize = (str = '') => str.toLowerCase().replace(/[^a-z0-9]/g, '')
const makeAyId = (label) => `ay_${sanitize(label) || Date.now()}`

// Validate and expand AY input like "2024-2025" or range "2021-2029"
// Returns { valid: bool, labels: string[], error: string }
const parseAcademicYearInput = (input = '') => {
  const trimmed = input.trim()
  if (!trimmed) return { valid: false, labels: [], error: 'Enter an academic year' }

  // Must be digits and a dash/hyphen only
  if (!/^\d{4}\s*-\s*\d{4}$/.test(trimmed)) {
    return { valid: false, labels: [], error: 'Format must be YYYY-YYYY (e.g. 2024-2025)' }
  }

  const rangeMatch = trimmed.match(/^(\d{4})\s*-\s*(\d{4})$/)
  const start = Number(rangeMatch[1])
  const end = Number(rangeMatch[2])

  if (start < 1990 || start > 2099) {
    return { valid: false, labels: [], error: 'Start year must be between 1990 and 2099' }
  }
  if (end <= start) {
    return { valid: false, labels: [], error: 'End year must be greater than start year' }
  }
  if (end - start > 10) {
    return { valid: false, labels: [], error: 'Range too large (max 10 years)' }
  }

  const labels = []
  for (let year = start; year < end; year += 1) {
    labels.push(`${year}-${year + 1}`)
  }
  return { valid: true, labels, error: '' }
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

const excelDateToISO = (value) => {
  const parsed = XLSX.SSF?.parse_date_code?.(value)
  if (!parsed) return value
  const pad = (n) => String(n).padStart(2, '0')
  return `${parsed.y}-${pad(parsed.m)}-${pad(parsed.d)}`
}

// ── Date format detection ──
// Scan all text-based date values in the file and determine if the format
// is MM-DD-YYYY or DD-MM-YYYY by looking for any unambiguous value where
// one part > 12 (can't be a month), then apply that format to ALL dates.
// Falls back to MM-DD-YYYY (PH standard) when every date is ambiguous.
const detectDateFormat = (textDates) => {
  // textDates: array of raw string values from date columns
  for (const raw of textDates) {
    const s = String(raw ?? '').trim()
    // Match patterns: MM-DD-YYYY, MM/DD/YYYY, MM.DD.YYYY, etc.
    const m = s.match(/^(\d{1,2})[\-\/\.](\d{1,2})[\-\/\.](\d{4})$/)
    if (!m) continue
    const a = Number(m[1])
    const b = Number(m[2])
    if (a > 12 && b <= 12) return 'DD-MM-YYYY' // first part can't be month
    if (b > 12 && a <= 12) return 'MM-DD-YYYY' // second part can't be month
  }
  return 'MM-DD-YYYY' // default: PH/US convention
}

// Normalize a text date string to ISO YYYY-MM-DD given a detected format
const normalizeTextDate = (raw, format) => {
  const s = String(raw ?? '').trim()
  if (!s) return ''

  // Already ISO? (YYYY-MM-DD from excelDateToISO)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  const m = s.match(/^(\d{1,2})[\-\/\.](\d{1,2})[\-\/\.](\d{4})$/)
  if (!m) return s // can't parse — leave as-is for backend to handle

  const pad = (n) => String(n).padStart(2, '0')
  if (format === 'DD-MM-YYYY') {
    return `${m[3]}-${pad(m[2])}-${pad(m[1])}` // YYYY-MM-DD
  }
  // MM-DD-YYYY (default)
  return `${m[3]}-${pad(m[1])}-${pad(m[2])}` // YYYY-MM-DD
}

const isAmountKey = (key = '') => /amount/.test(String(key).toLowerCase())

// Derive scholarship program from award number prefix (mirrors the Excel IFS formula)
const deriveScholarshipProgram = (awardNumber = '') => {
  const s = String(awardNumber || '').trim().toUpperCase()
  if (s.startsWith('FSSP'))  return 'FULL SSP'
  if (s.startsWith('HSSP'))  return 'HALF SSP'
  if (s.startsWith('FSGAD')) return 'FULL SSP-GAD'
  if (s.startsWith('HSGAD')) return 'HALF SSP-GAD'
  if (s.startsWith('FPESFA')) return 'FULL PESFA'
  if (s.startsWith('HPESFA')) return 'HALF PESFA'
  if (s.startsWith('FPGAD')) return 'FULL PESFA-GAD'
  if (s.startsWith('HPGAD')) return 'HALF PESFA-GAD'
  return ''
}

// Expected positional column order (matches the original Excel template).
// Columns are mapped strictly by position — no header-name matching.
const STRUCTURAL_COLUMN_ORDER = [
  'seq', 'inCharge', 'awardYear', 'scholarshipProgram', 'awardNumber',
  'learnerReferenceNumber', 'surname', 'firstName', 'middleName', 'extension',
  'sex', 'civilStatus', 'dateOfBirth', 'contactNumber', 'emailAddress',
  'street', 'brgyPsgcCode', 'brgy', 'municipalityPsgcCode', 'municipality',
  'provincePsgcCode', 'province', 'congressionalDistrict', 'zipCode',
  'specialGroup', 'certificationNumber', 'nameOfInstitution', 'uii',
  'institutionalType', 'regionSchoolLocated', 'prioProgramCode',
  'degreeProgram', 'programMajor', 'disciplineCode', 'programDiscipline',
  'programDegreeLevel', 'authorityType', 'authorityNumber', 'series',
  'priority', 'basisCmo', 'scholarshipStatus', 'replacement', 'reason',
]

// Static student schema (2-tier max)
const STATIC_SCHEMA = [
  // ── Frozen identification columns (pinned when scrolling horizontally) ──
  { key: 'seq', label: 'SEQ', rowSpan: 3, width: 60 },
  { key: 'awardNumber', label: 'AWARD NUMBER', rowSpan: 3, width: 140 },
  { key: 'surname', label: 'SURNAME', rowSpan: 3, width: 140 },
  { key: 'firstName', label: 'FIRST NAME', rowSpan: 3, width: 140 },
  // ── Scrollable columns ──
  { key: 'middleName', label: 'MIDDLE NAME', rowSpan: 3, width: 140 },
  { key: 'extension', label: 'EXTENSION', rowSpan: 3, width: 80 },
  { key: 'learnerReferenceNumber', label: 'LEARNER REFERENCE NUMBER', rowSpan: 3, width: 200 },
  { key: 'inCharge', label: 'IN-CHARGE', rowSpan: 3, width: 120 },
  { key: 'awardYear', label: 'AWARD YEAR', rowSpan: 3, width: 100 },
  { key: 'scholarshipProgram', label: 'SCHOLARSHIP PROGRAM', rowSpan: 3, width: 180 },
  { key: 'sex', label: 'SEX', rowSpan: 3, width: 80, type: 'select', options: ['Male', 'Female'] },
  { key: 'civilStatus', label: 'CIVIL STATUS', rowSpan: 3, width: 120, type: 'select', options: ['Single', 'Married', 'Widowed', 'Separated', 'Divorced', ''] },
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
    colSpan: 9,
    children: [
      { key: 'street', label: 'STREET', width: 180 },
      { key: 'brgyPsgcCode', label: 'BRGY PSGC CODE', width: 140 },
      { key: 'brgy', label: 'BRGY', width: 140 },
      { key: 'municipalityPsgcCode', label: 'MUNICIPALITY PSGC CODE', width: 180 },
      { key: 'municipality', label: 'MUNICIPALITY', width: 160 },
      { key: 'provincePsgcCode', label: 'PROVINCE PSGC CODE', width: 160 },
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
  { key: 'prioProgramCode', label: 'PRIORITY PROGRAM CODE', rowSpan: 3, width: 180 },
  { key: 'degreeProgram', label: 'DEGREE PROGRAM', rowSpan: 3, width: 200 },
  { key: 'programMajor', label: 'PROGRAM MAJOR', rowSpan: 3, width: 180 },
  { key: 'disciplineCode', label: 'DISCIPLINE CODE', rowSpan: 3, width: 140 },
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

  // ── Compute frozen column offsets (leftmost N leaf columns stay pinned) ──
  const FROZEN_LEAF_COUNT = 4 // seq, awardNumber, surname, firstName
  let frozenOffset = 0
  for (let i = 0; i < Math.min(FROZEN_LEAF_COUNT, leafFields.length); i++) {
    leafFields[i].frozen = true
    leafFields[i].leftOffset = frozenOffset
    frozenOffset += leafFields[i].width || 120
  }
  if (FROZEN_LEAF_COUNT > 0 && FROZEN_LEAF_COUNT <= leafFields.length) {
    leafFields[FROZEN_LEAF_COUNT - 1].lastFrozen = true
  }
  const frozenWidth = frozenOffset

  // Annotate header row1 cells with frozen info
  let leafIdx = 0
  row1.forEach(col => {
    if (leafIdx < FROZEN_LEAF_COUNT) {
      col.frozen = true
      col.leftOffset = leafFields[leafIdx]?.leftOffset ?? 0
    }
    const span = col.children ? col.children.length : 1
    const newLeafIdx = leafIdx + span
    if (leafIdx < FROZEN_LEAF_COUNT && newLeafIdx >= FROZEN_LEAF_COUNT) {
      col.lastFrozen = true
    }
    leafIdx = newLeafIdx
  })

  // Annotate header row2 cells with frozen info
  row2.forEach(col => {
    if (col.key) {
      const lfIdx = leafFields.findIndex(f => f.key === col.key)
      if (lfIdx >= 0 && leafFields[lfIdx]?.frozen) {
        col.frozen = true
        col.leftOffset = leafFields[lfIdx].leftOffset
        if (lfIdx === FROZEN_LEAF_COUNT - 1) col.lastFrozen = true
      }
    }
  })

  return { row1, row2, row3, leafFields, frozenWidth }
}

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
  degreeProgram: 'degree_program',
  programMajor: 'program_major',
  programDiscipline: 'program_discipline',
  programDegreeLevel: 'program_degree_level',
  authorityType: 'authority_type',
  authorityNumber: 'authority_number',
  series: 'series',
  prioProgramCode: 'prio_program_code',
  priority: 'is_priority',
  basisCmo: 'basis_cmo',
  disciplineCode: 'discipline_code',
  scholarshipStatus: 'scholarship_status',
  replacement: 'replacement_info',
  reason: 'termination_reason',
}

// ── Data Cleaning Utilities ──

// Values treated as empty/null
const INVALID_VALUES = new Set([
  'na', 'n/a', 'n.a.', 'n.a', 'n/ a', 'n /a',
  'none', 'nil', 'null', 'undefined',
  '-', '--', '---', '.', '..', '...',
  'not applicable', 'not available',
])

// Strip invalid placeholder values to null
const cleanInvalidValue = (val) => {
  if (val === null || val === undefined) return null
  const s = String(val).trim()
  if (s === '') return null
  if (INVALID_VALUES.has(s.toLowerCase())) return null
  return s
}

// Proper Title Case for names:
//   "JOHN DOE" → "John Doe"
//   "maria de la cruz" → "Maria De La Cruz"
//   "O'BRIEN" → "O'Brien"
//   "MARY-JANE" → "Mary-Jane"
//   "MC DONALD" → "Mc Donald"
const toProperName = (val) => {
  if (!val) return val
  const s = String(val).trim()
  if (!s) return null
  return s
    .toLowerCase()
    .replace(/(?:^|[\s\-\'\.])\S/g, (match) => match.toUpperCase())
}

// Fields that contain person names (should be Title Cased)
const NAME_FIELDS_FRONTEND = ['surname', 'firstName', 'middleName', 'extension']
const NAME_FIELDS_BACKEND = ['surname', 'first_name', 'middle_name', 'extension']

// Convert frontend data to backend format
const convertToBackendFormat = (frontendData) => {
  return frontendData.map(row => {
    const backendRow = {}
    Object.entries(row).forEach(([key, value]) => {
      const backendKey = FRONTEND_TO_BACKEND_MAP[key]
      if (backendKey === null) return // Skip seq
      if (backendKey && value !== '' && value !== null && value !== undefined) {
        // Clean invalid placeholder values
        let cleaned = cleanInvalidValue(value)
        if (cleaned === null) return

        // Convert priority to boolean
        if (key === 'priority') {
          backendRow[backendKey] = cleaned === 'Yes' || cleaned === true || cleaned === 'true' || cleaned === '1'
          return
        }

        // Normalize name fields to proper Title Case
        if (NAME_FIELDS_FRONTEND.includes(key)) {
          cleaned = toProperName(cleaned)
        }

        backendRow[backendKey] = cleaned
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
              if (backendK === 'amount') {
                const num = Number(String(val).replace(/,/g, ''))
                payload[backendK] = Number.isFinite(num) ? num : val
              } else {
                payload[backendK] = val
              }
            }
          }

          // Include disbursement if any semester field has data,
          // OR if curriculum_year_level is set (meaning the AY row has data)
          if (hasData || (cyl && cyl !== '')) {
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

// Optimized text input — manages local state, commits on blur/Enter
// Prevents re-rendering entire table on every keystroke
const DebouncedInput = memo(function DebouncedInput({ value: externalValue, onChange, ...props }) {
  const [localValue, setLocalValue] = useState(externalValue ?? '')
  const committed = useRef(externalValue ?? '')

  useEffect(() => {
    if (externalValue !== committed.current) {
      setLocalValue(externalValue ?? '')
      committed.current = externalValue ?? ''
    }
  }, [externalValue])

  const commit = useCallback(() => {
    if (localValue !== committed.current) {
      committed.current = localValue
      onChange(localValue)
    }
  }, [localValue, onChange])

  return (
    <Input
      {...props}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={commit}
      onPressEnter={commit}
    />
  )
})

export default function ImportBulk() {
  const navigate = useNavigate()
  const { getAccess } = useAuth()
  const canAdd = getAccess('students-add') === 'full'
  const [data, setData] = useState([])
  const [inputKey, setInputKey] = useState(Date.now())
  const [loading, setLoading] = useState(false)

  // Redirect if user doesn't have add permission
  useEffect(() => {
    if (!canAdd) {
      message.error('You do not have permission to add students')
      navigate('/students', { replace: true })
    }
  }, [canAdd, navigate])
  const fileInputRef = useRef(null)
  const [academicYears, setAcademicYears] = useState([])
  const ayInputRef = useRef(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [duplicateMap, setDuplicateMap] = useState({}) // { rowIndex: { matches: [...], checking: false } }
  const [duplicateChecking, setDuplicateChecking] = useState(false)
  const [conflictNavIndex, setConflictNavIndex] = useState(-1) // current conflict navigation position
  const [needsValidation, setNeedsValidation] = useState(false) // true when data changed since last validation
  const [uploadProgress, setUploadProgress] = useState(null) // { current, total, done, phase }
  const [importResult, setImportResult] = useState(null) // null | { status, imported, disbursements, failedStudents, failedDisbursements }
  const [fileLoadingState, setFileLoadingState] = useState(null) // null | { phase, detail }
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const abortControllerRef = useRef(null) // to cancel ongoing import

  // Reset all import-related state to a clean slate
  const resetImportState = useCallback(() => {
    setUploadProgress(null)
    setImportResult(null)
    setLoading(false)
    abortControllerRef.current = null
  }, [])

  const { row1: headerRow1, row2: headerRow2, row3: headerRow3, leafFields, frozenWidth } = useMemo(
    () => buildHeaders(academicYears),
    [academicYears]
  )

  // O(1) field config lookup instead of .find() per cell
  const fieldConfigMap = useMemo(() => {
    const map = new Map()
    leafFields.forEach(f => map.set(f.key, f))
    return map
  }, [leafFields])

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
    setData((prev) => {
      const leafKeySet = new Set(leafFields.map(f => f.key))
      return prev.map((row, idx) => {
        const next = { ...row }
        leafFields.forEach(f => {
          if (next[f.key] === undefined) next[f.key] = ''
        })
        Object.keys(next).forEach(k => {
          if (!leafKeySet.has(k) && k !== 'seq') delete next[k]
        })
        if (!next.seq) next.seq = String(idx + 1)
        return next
      })
    })
  }, [leafFields])

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Reset input so the same file can be re-uploaded
    event.target.value = ''

    // Clear any stale import state from a previous operation
    resetImportState()

    setFileLoadingState({ phase: 'Reading file...', detail: file.name })
    const reader = new FileReader()
    reader.onload = (e) => {
      (async () => {
      try {
        await new Promise(r => requestAnimationFrame(() => setTimeout(r, 80)))
        setFileLoadingState({ phase: 'Parsing Excel...', detail: file.name })
        await new Promise(r => setTimeout(r, 0))

        const buffer = new Uint8Array(e.target.result)
        const workbook = XLSX.read(buffer, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        const allRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, blankrows: false })

        // ── Structure-based parsing: map columns strictly by position ──
        const STUDENT_COL_COUNT = STRUCTURAL_COLUMN_ORDER.length // 44 static student columns
        const AY_BLOCK_SIZE = 1 + SEM_FIELDS.length * 2 // 1 CYL + 14×2 = 29 per AY
        const SEM_FIELD_KEYS = SEM_FIELDS.map(f => f.key)

        // ── Step 1: Find data start by scanning for SEQ = 1 ──
        // The first column of the template is always "SEQ" and the first data row
        // has value 1. This reliably skips any title rows, descriptions, blank
        // rows, and multi-level header rows regardless of file layout.
        let dataStart = -1
        for (let i = 0; i < allRows.length; i += 1) {
          const row = allRows[i] || []
          const firstCell = row[0]
          // Check if first cell is the number 1 (or string "1")
          if (firstCell !== null && firstCell !== undefined && String(firstCell).trim() === '1') {
            // Verify this is actually a data row — it should have more than just "1"
            const nonEmpty = row.filter(c => String(c ?? '').trim() !== '').length
            if (nonEmpty >= 3) {
              dataStart = i
              break
            }
          }
        }

        if (dataStart < 0) {
          setFileLoadingState(null)
          Modal.error({
            title: 'Invalid File Format',
            content: 'Could not find the start of the data. The first column must be SEQ and the first data row must start with the number 1.',
            centered: true,
          })
          return
        }

        // ── Step 2: Strict column structure validation ──
        // Compute effective column count by finding the rightmost non-empty cell
        // across header rows and first few data rows (ignores trailing empty columns Excel may add)
        let effectiveTotalCols = 0
        const colScanRows = allRows.slice(0, Math.min(dataStart + 10, allRows.length))
        for (const scanRow of colScanRows) {
          if (!Array.isArray(scanRow)) continue
          for (let c = scanRow.length - 1; c >= 0; c--) {
            if (String(scanRow[c] ?? '').trim() !== '') {
              effectiveTotalCols = Math.max(effectiveTotalCols, c + 1)
              break
            }
          }
        }

        // Validate: must have at least STUDENT_COL_COUNT columns
        if (effectiveTotalCols < STUDENT_COL_COUNT) {
          setFileLoadingState(null)
          Modal.error({
            title: 'Invalid File Format',
            content: 'The file has fewer columns than expected. Please make sure you are using the correct template.',
            centered: true,
          })
          return
        }

        const extraCols = effectiveTotalCols - STUDENT_COL_COUNT

        // Validate: extra columns (beyond student columns) must form complete AY blocks
        // Each AY block requires exactly AY_BLOCK_SIZE columns: 1 CYL + 14 First Sem + 14 Second Sem
        if (extraCols > 0 && extraCols % AY_BLOCK_SIZE !== 0) {
          const remainder = extraCols % AY_BLOCK_SIZE
          const halfBlock = 1 + SEM_FIELDS.length // 15 = CYL + one semester
          const isLikelyOneSemester = (remainder === halfBlock) || (remainder === SEM_FIELDS.length) || (extraCols === halfBlock)
          setFileLoadingState(null)
          if (isLikelyOneSemester) {
            Modal.error({
              title: 'Invalid File Format',
              content: 'It looks like one of the Academic Years only has one semester. Each Academic Year must have both First Semester and Second Semester columns.',
              centered: true,
            })
          } else {
            Modal.error({
              title: 'Invalid File Format',
              content: 'The file has extra columns that don\'t match the expected format. Each Academic Year must be a complete block with Curriculum Year Level, First Semester, and Second Semester columns.',
              centered: true,
            })
          }
          return
        }

        const ayBlockCount = extraCols > 0 ? extraCols / AY_BLOCK_SIZE : 0

        // ── Step 3: Detect AY labels from the header rows ──
        const detectedAyLabels = []
        if (ayBlockCount > 0) {
          const scanEnd = Math.min(dataStart, allRows.length)
          for (let i = 0; i < scanEnd; i += 1) {
            const row = allRows[i] || []
            row.forEach(cell => {
              const ayLabel = deriveAyLabelFromKey(String(cell || ''))
              if (ayLabel && !detectedAyLabels.includes(ayLabel)) {
                detectedAyLabels.push(ayLabel)
              }
            })
          }
          detectedAyLabels.sort((a, b) => parseInt(a.slice(0, 4), 10) - parseInt(b.slice(0, 4), 10))
        }

        // If fewer labels detected than blocks, generate sequential placeholders
        while (detectedAyLabels.length < ayBlockCount) {
          const baseYear = detectedAyLabels.length > 0
            ? parseInt(detectedAyLabels[detectedAyLabels.length - 1].split('-')[0], 10) + 1
            : 2020 + detectedAyLabels.length
          detectedAyLabels.push(`${baseYear}-${baseYear + 1}`)
        }

        const fileAys = detectedAyLabels.map(label => ({ id: makeAyId(label), label }))

        // ── Step 4: Build column mapping (student + AY blocks by position) ──
        const { leafFields: structLeafFields } = buildHeaders(fileAys)
        const structLeafMap = new Map()
        structLeafFields.forEach(f => structLeafMap.set(f.key, f))

        // Map student columns (first 43) by position
        const colMap = new Map()
        STRUCTURAL_COLUMN_ORDER.forEach((fieldKey, colIdx) => {
          if (structLeafMap.has(fieldKey)) colMap.set(colIdx, structLeafMap.get(fieldKey))
        })

        // Map AY columns by position (after the 43 student columns)
        // Each AY block = 1 CYL + 14 First-Semester fields + 14 Second-Semester fields
        fileAys.forEach((ay, ayIdx) => {
          const ayStart = STUDENT_COL_COUNT + ayIdx * AY_BLOCK_SIZE

          // CYL
          const cylKey = `${ay.id}__cyl`
          if (structLeafMap.has(cylKey)) colMap.set(ayStart, structLeafMap.get(cylKey))

          // First Semester (14 fields)
          SEM_FIELD_KEYS.forEach((fKey, fIdx) => {
            const fullKey = `${ay.id}__first__${fKey}`
            if (structLeafMap.has(fullKey)) colMap.set(ayStart + 1 + fIdx, structLeafMap.get(fullKey))
          })

          // Second Semester (14 fields)
          SEM_FIELD_KEYS.forEach((fKey, fIdx) => {
            const fullKey = `${ay.id}__second__${fKey}`
            if (structLeafMap.has(fullKey)) colMap.set(ayStart + 1 + SEM_FIELD_KEYS.length + fIdx, structLeafMap.get(fullKey))
          })
        })

        const mappedCount = colMap.size

        setFileLoadingState({ phase: `Structure match: mapping columns...`, detail: `${mappedCount} columns mapped${fileAys.length > 0 ? `, ${fileAys.length} AY detected` : ''}` })
        await new Promise(r => setTimeout(r, 0))

        // ── Step 5: Extract and filter data rows ──
        const dataRows = allRows.slice(dataStart).filter(row => {
          if (!Array.isArray(row)) return false
          return row.some(c => String(c ?? '').trim() !== '')
        })

        if (dataRows.length === 0) {
          setFileLoadingState(null)
          Modal.error({
            title: 'Invalid File Format',
            content: 'No data was found in the file. Make sure the file has student records starting with SEQ number 1.',
            centered: true,
          })
          return
        }

        setFileLoadingState({ phase: `Processing ${dataRows.length} rows...`, detail: `${mappedCount} columns mapped` })
        await new Promise(r => setTimeout(r, 0))

        // ── Step 6: Detect date format from text dates ──
        // Collect all text-based date cell values so we can determine MM-DD vs DD-MM
        const textDateSamples = []
        for (const row of dataRows) {
          if (!Array.isArray(row)) continue
          row.forEach((value, colIdx) => {
            const field = colMap.get(colIdx)
            if (!field || field.type !== 'date') return
            if (typeof value === 'string' && value.trim()) {
              textDateSamples.push(value)
            }
          })
        }
        const detectedDateFormat = detectDateFormat(textDateSamples)
        console.log('Detected date format:', detectedDateFormat, `(from ${textDateSamples.length} text date samples)`)

        // ── Step 7: Normalize data rows ──
        const isExcelError = (v) => typeof v === 'string' && /^#[A-Z0-9/]+[!?]?$/.test(v.trim())

        const normalized = dataRows.map((row, idx) => {
          const normalizedRow = {}
          structLeafFields.forEach(f => { normalizedRow[f.key] = '' })
          normalizedRow.seq = String(idx + 1)

          if (Array.isArray(row)) {
            row.forEach((value, colIdx) => {
              const field = colMap.get(colIdx)
              if (!field) return
              if (field.key === 'seq') return // We generate seq ourselves
              let cellVal = value
              if (cellVal === null || cellVal === undefined) cellVal = ''
              if (typeof cellVal === 'number' && field.type === 'date') {
                cellVal = excelDateToISO(cellVal)
              }
              // Normalize text dates to ISO YYYY-MM-DD using detected format
              if (field.type === 'date' && typeof cellVal === 'string' && cellVal.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(cellVal.trim())) {
                cellVal = normalizeTextDate(cellVal, detectedDateFormat)
              }
              if (typeof cellVal === 'string') {
                cellVal = cellVal.trim()
                if (isAmountKey(field.key)) cellVal = cellVal.replace(/,/g, '')
              }
              normalizedRow[field.key] = cellVal === undefined || cellVal === null ? '' : cellVal
            })
          }

          // Derive scholarship program from award number
          if ((!normalizedRow.scholarshipProgram || isExcelError(normalizedRow.scholarshipProgram)) && normalizedRow.awardNumber) {
            normalizedRow.scholarshipProgram = deriveScholarshipProgram(normalizedRow.awardNumber)
          }

          return normalizedRow
        })

        console.log('Structure-based mapping:', mappedCount, 'columns mapped')
        console.log('Student columns:', STUDENT_COL_COUNT)
        console.log('Detected AYs:', detectedAyLabels)
        console.log('AY blocks:', ayBlockCount, '×', AY_BLOCK_SIZE, 'cols')

        setFileLoadingState({ phase: `Loaded ${normalized.length} records`, detail: 'Checking for duplicates...' })
        await new Promise(r => setTimeout(r, 0))

        // Set AYs detected from the file
        if (fileAys.length > 0) {
          setAcademicYears(fileAys)
        }
        setData(normalized)
        validateData(normalized)

        setFileLoadingState(null)
      } catch (error) {
        console.error(error)
        setFileLoadingState(null)
        Modal.error({
          title: 'Error Reading File',
          content: 'Something went wrong while reading the file. Please check that you are uploading a valid Excel file using the correct template.',
          centered: true,
        })
      } finally {
        setFileLoadingState(null)
      }
      })()
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
    setNeedsValidation(true)
  }

  // Add new row
  const handleAddRow = () => {
    const newRow = {}
    leafFields.forEach(field => {
      newRow[field.key] = ''
    })
    newRow.seq = String(data.length + 1)
    setData(prev => [...prev, newRow])
    setNeedsValidation(true)
    // Navigate to the page containing the new row
    const newTotalRows = data.length + 1
    const newPage = Math.ceil(newTotalRows / pageSize)
    setCurrentPage(newPage)
  }

  // Delete row
  const handleDeleteRow = (rowIndex) => {
    setData(prev => {
      const updated = prev.filter((_, idx) => idx !== rowIndex)
      return updated.map((row, idx) => ({ ...row, seq: String(idx + 1) }))
    })
    setNeedsValidation(true)
  }

  // --- Comprehensive validation & duplicate detection ---
  const validateData = useCallback(async (rows) => {
    if (!rows || rows.length === 0) {
      setDuplicateMap({})
      return
    }

    setDuplicateChecking(true)
    const newMap = {}

    const ensureEntry = (idx) => {
      if (!newMap[idx]) newMap[idx] = { matches: [], reasons: [], tags: [] }
    }

    // --- Phase 1: Missing required fields = Conflict ---
    // Required: Award Number (except ACEF-GIAHEP), Surname, First Name
    // (Scholarship Status, Middle Name and Extension are optional)
    rows.forEach((row, idx) => {
      const missing = []
      const isAcef = /^ACEF[-\s]?GIAHEP$/i.test(String(row.scholarshipProgram || '').trim())
      if (!isAcef && !String(row.awardNumber || '').trim()) missing.push('Award Number')
      if (!String(row.surname || '').trim()) missing.push('Surname')
      if (!String(row.firstName || '').trim()) missing.push('First Name')

      if (missing.length > 0) {
        ensureEntry(idx)
        newMap[idx].tags.push('missing_fields')
        newMap[idx].reasons.push({ type: 'missing_fields', detail: `Missing: ${missing.join(', ')}` })
      }
    })

    // --- Phase 2: DB duplicate check (backend) ---
    try {
      const candidates = rows.map(row => ({
        surname: row.surname || '',
        first_name: row.firstName || '',
        middle_name: row.middleName || '',
        award_number: row.awardNumber || '',
        name_of_institution: row.nameOfInstitution || '',
      }))

      const hasData = candidates.some(c => c.surname || c.first_name)
      if (hasData) {
        const res = await fetch(`${API_BASE}/students/check-duplicates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidates }),
        })
        if (res.ok) {
          const json = await res.json()
          ;(json.duplicates || []).forEach(d => {
            ensureEntry(d.row_index)
            if (!newMap[d.row_index].tags.includes('db_match')) {
              newMap[d.row_index].tags.push('db_match')
            }
            d.matches.forEach(m => {
              newMap[d.row_index].matches.push(m)
              newMap[d.row_index].reasons.push({
                type: 'db_match',
                detail: `DB match: ${m.name} (${m.match_type})`
              })
            })
          })
        }
      }
    } catch (err) {
      console.error('DB duplicate check error:', err)
    }

    setDuplicateMap(newMap)
    setDuplicateChecking(false)
    setNeedsValidation(false)
    setConflictNavIndex(-1)
  }, [])

  // --- Validation counts ---
  const validationCounts = useMemo(() => {
    const total = data.length
    let valid = 0, missingFields = 0, dbMatch = 0
    data.forEach((_, idx) => {
      const info = duplicateMap[idx]
      if (!info || (!info.tags?.length && !info.matches?.length)) { valid++; return }
      const tags = info.tags || []
      if (tags.includes('missing_fields')) missingFields++
      if (tags.includes('db_match')) dbMatch++
      if (!tags.includes('missing_fields') && !tags.includes('db_match')) valid++
    })
    const flagged = total - valid
    return { total, valid, missingFields, dbMatch, flagged }
  }, [data, duplicateMap])

  // Clear data and reset input
  const handleClear = () => {
    setData([])
    setDuplicateMap({})
    setAcademicYears([])
    setNeedsValidation(false)
    setInputKey(Date.now())
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Add Academic Year from the AY input field
  const handleAddAY = () => {
    const inputEl = ayInputRef.current?.input ?? ayInputRef.current
    const val = inputEl?.value || ''
    const result = parseAcademicYearInput(val)
    if (!result.valid) { message.warning(result.error); return }
    const merged = mergeAcademicYears(academicYears, result.labels)
    const addedCount = merged.length - academicYears.length
    if (addedCount === 0) { message.info('AY already added') }
    else { message.success(`Added ${addedCount} AY`); setAcademicYears(merged) }
    if (inputEl) inputEl.value = ''
  }

  const STUDENT_CHUNK_SIZE = 50
  const MAX_RETRIES = 3
  const RETRY_BASE_DELAY = 1500 // ms
  const REQUEST_TIMEOUT = 90000 // 90 seconds — generous for LAN
  const RESOLVE_CHUNK_SIZE = 200 // chunk size for resolve-import calls

  // Fetch with timeout and retry logic for LAN reliability
  const fetchWithRetry = async (url, options, retries = MAX_RETRIES) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      const controller = new AbortController()
      // Merge abort signals: our timeout + the global import abort
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
      // If the global import was cancelled, abort immediately
      if (abortControllerRef.current?.signal?.aborted) {
        clearTimeout(timeoutId)
        throw new Error('Import cancelled by user')
      }
      const onGlobalAbort = () => controller.abort()
      abortControllerRef.current?.signal?.addEventListener('abort', onGlobalAbort)
      try {
        const response = await fetch(url, { ...options, signal: controller.signal })
        clearTimeout(timeoutId)
        abortControllerRef.current?.signal?.removeEventListener('abort', onGlobalAbort)
        return response
      } catch (err) {
        clearTimeout(timeoutId)
        abortControllerRef.current?.signal?.removeEventListener('abort', onGlobalAbort)
        if (abortControllerRef.current?.signal?.aborted) throw new Error('Import cancelled by user')
        const isLastAttempt = attempt === retries
        const isRetryable = err.name === 'AbortError' || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || err.message?.includes('network')
        if (isLastAttempt || !isRetryable) throw err
        const delay = RETRY_BASE_DELAY * Math.pow(2, attempt - 1)
        console.warn(`Request to ${url} failed (attempt ${attempt}/${retries}), retrying in ${delay}ms...`, err.message)
        await new Promise(r => setTimeout(r, delay))
      }
    }
  }

  // Pre-submit validation gate
  const handlePreSubmit = () => {
    if (data.length === 0) {
      message.warning('No data to submit')
      return
    }
    const c = validationCounts
    if (c.missingFields > 0) {
      message.error(`${c.missingFields} row(s) missing required fields (Award Number [except ACEF-GIAHEP], or Name). Fix or remove them first.`)
      return
    }
    // db_match rows are allowed — the resolve-import flow will handle duplicates
    if (c.dbMatch > 0) {
      message.info(`${c.dbMatch} row(s) already exist in the database. They will be sent to the resolve page.`)
    }
    setShowConfirmModal(true)
  }

  // Build disbursements for a chunk, tagged with _chunk_index (position within the chunk)
  const buildChunkDisbursements = (dataChunk, academicYears) => {
    const dummySeqs = dataChunk.map((_, i) => `__chunk_${i}__`)
    const raw = convertDisbursementsToBackend(dataChunk, academicYears, dummySeqs)
    return raw.map(d => {
      const idx = dummySeqs.indexOf(d.student_seq)
      return { ...d, _chunk_index: idx >= 0 ? idx : null, student_seq: undefined }
    })
  }

  // Submit data (called from confirmation modal)
  const handleSubmitData = async () => {
    setShowConfirmModal(false)
    if (data.length === 0) {
      message.warning('No data to submit')
      return
    }

    const backendData = convertToBackendFormat(data)

    // Build disbursements with _import_index for resolve tracking
    const dummySeqs = backendData.map((_, i) => `__pending_${i}__`)
    const allDisbursements = convertDisbursementsToBackend(data, academicYears, dummySeqs)
    const taggedDisb = allDisbursements.map(d => {
      const idx = dummySeqs.indexOf(d.student_seq)
      return { ...d, _import_index: idx >= 0 ? idx : null, student_seq: undefined }
    })

    // Setup abort controller for cancellation
    abortControllerRef.current = new AbortController()
    setLoading(true)
    setUploadProgress({ current: 0, total: 1, done: false, phase: 'Checking for duplicates...' })

    try {
      // --- Phase 0: Chunked resolve check ---
      let allClean = []
      let allDuplicates = []

      for (let offset = 0; offset < backendData.length; offset += RESOLVE_CHUNK_SIZE) {
        const end = Math.min(offset + RESOLVE_CHUNK_SIZE, backendData.length)
        const studentSlice = backendData.slice(offset, end)

        const sliceIndices = new Set()
        for (let i = offset; i < end; i++) sliceIndices.add(i)
        const disbSlice = taggedDisb.filter(d => sliceIndices.has(d._import_index))
        const reindexedDisb = disbSlice.map(d => ({ ...d, _import_index: d._import_index - offset }))

        setUploadProgress({ current: 0, total: 1, done: false, phase: `Checking duplicates... (${Math.min(end, backendData.length)}/${backendData.length})` })

        const resolveRes = await fetchWithRetry(`${API_BASE}/students/resolve-import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ students: studentSlice, disbursements: reindexedDisb }),
        })

        if (!resolveRes.ok) {
          const errText = await resolveRes.text().catch(() => '')
          throw new Error(`Resolve check failed: ${errText || resolveRes.status}`)
        }

        const resolveChunk = await resolveRes.json()
        const chunkClean = (resolveChunk.clean || []).map(c => ({ ...c, import_index: c.import_index + offset }))
        const chunkDups = (resolveChunk.duplicates || []).map(d => ({ ...d, import_index: d.import_index + offset }))
        allClean.push(...chunkClean)
        allDuplicates.push(...chunkDups)
      }

      // If any duplicates found, go to resolution page
      if (allDuplicates.length > 0) {
        resetImportState()

        const cleanIndices = new Set(allClean.map(c => c.import_index))
        const cleanDisbursements = taggedDisb.filter(d => cleanIndices.has(d._import_index))

        navigate('/students/bulk/resolve', {
          state: {
            resolveData: {
              clean: allClean,
              duplicates: allDuplicates,
              summary: { clean_count: allClean.length, duplicate_count: allDuplicates.length, total: backendData.length },
            },
            cleanDisbursements,
            rawData: data,
            academicYears,
          },
        })
        return
      }

      // --- All clean: proceed with atomic import ---
      const totalStudents = backendData.length
      setUploadProgress({ current: 0, total: totalStudents, done: false, phase: 'Importing...' })

      const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
      const bulkBatchId = crypto.randomUUID?.() ?? (
        ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
          (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        )
      )
      const userHeaders = {
        'Content-Type': 'application/json',
        ...(storedUser?.id ? { 'X-User-Id': String(storedUser.id) } : {}),
        'X-Bulk-Batch': bulkBatchId,
      }

      let imported = 0
      let totalDisbursementsImported = 0
      let totalDisbursementsFailed = 0
      const failedChunks = []
      const failedStudentDetails = []
      const failedDisbursementDetails = []

      for (let offset = 0; offset < totalStudents; offset += STUDENT_CHUNK_SIZE) {
        if (abortControllerRef.current?.signal?.aborted) {
          throw new Error('Import cancelled by user')
        }

        const end = Math.min(offset + STUDENT_CHUNK_SIZE, totalStudents)
        const studentChunk = backendData.slice(offset, end)
        const dataChunk = data.slice(offset, end)
        const chunkNum = Math.floor(offset / STUDENT_CHUNK_SIZE) + 1
        const totalChunks = Math.ceil(totalStudents / STUDENT_CHUNK_SIZE)

        setUploadProgress({ current: imported, total: totalStudents, done: false, phase: `Importing batch ${chunkNum}/${totalChunks}... (${imported}/${totalStudents} students)` })

        const chunkDisbursements = buildChunkDisbursements(dataChunk, academicYears)

        try {
          const response = await fetchWithRetry(`${API_BASE}/students/import-atomic`, {
            method: 'POST',
            headers: userHeaders,
            body: JSON.stringify({
              students: studentChunk,
              disbursements: chunkDisbursements,
            }),
          })

          if (!response.ok) {
            const errText = await response.text().catch(() => '')
            console.error(`Chunk ${chunkNum} failed:`, errText)
            failedChunks.push({ chunkNum, offset, count: studentChunk.length, error: errText || response.status })
            for (let i = offset; i < end; i++) {
              const row = data[i]
              if (row) failedStudentDetails.push({ name: `${row.surname || ''}, ${row.firstName || ''}`.trim(), awardNumber: row.awardNumber || '' })
            }
          } else {
            const respJson = await response.json().catch(() => null)
            const created = respJson?.data || []
            imported += created.length
            totalDisbursementsImported += respJson?.disbursements_created || 0
            const disbErrors = respJson?.disbursement_errors || []
            if (disbErrors.length > 0) {
              totalDisbursementsFailed += disbErrors.length
              console.warn(`Chunk ${chunkNum} disbursement errors:`, disbErrors)
              const seqToStudent = new Map()
              created.forEach((s) => { if (s.seq) seqToStudent.set(String(s.seq), s) })
              disbErrors.forEach((de) => {
                const student = de.student_seq ? seqToStudent.get(String(de.student_seq)) : null
                failedDisbursementDetails.push({
                  name: student ? `${student.surname || ''}, ${student.first_name || ''}`.trim() : 'Unknown',
                  awardNumber: student?.award_number || '',
                  ay: de.academic_year || '',
                  semester: de.semester || '',
                })
              })
            }
          }
        } catch (err) {
          if (err.message === 'Import cancelled by user') throw err
          console.error(`Chunk ${chunkNum} error after retries:`, err)
          failedChunks.push({ chunkNum, offset, count: studentChunk.length, error: err.message })
          for (let i = offset; i < end; i++) {
            const row = data[i]
            if (row) failedStudentDetails.push({ name: `${row.surname || ''}, ${row.firstName || ''}`.trim(), awardNumber: row.awardNumber || '' })
          }
        }

        setUploadProgress({ current: imported, total: totalStudents, done: false, phase: `Importing batch ${chunkNum}/${totalChunks}... (${imported}/${totalStudents} students)` })
      }

      // Finalize batch: mark all pending records as confirmed
      if (imported > 0) {
        setUploadProgress(prev => ({ ...prev, phase: 'Finalizing import...' }))
        try {
          await fetchWithRetry(`${API_BASE}/students/finalize-batch`, {
            method: 'POST',
            headers: { ...userHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ batch_id: bulkBatchId }),
          })
        } catch (err) {
          console.error('Finalize batch failed:', err)
          message.error('Import saved but finalization failed. Records may not be visible until an admin finalizes the batch.')
        }
      }

      // Update slots
      setUploadProgress(prev => ({ ...prev, phase: 'Updating scholarship slots...' }))
      try {
        await fetchWithRetry(`${API_BASE}/scholarship_programs/update-slots`, { method: 'POST', headers: userHeaders })
      } catch {
        console.warn('Slot update failed — non-critical')
      }

      // --- Done ---
      const failedStudentCount = failedChunks.reduce((sum, c) => sum + c.count, 0)

      setImportResult({
        status: failedChunks.length > 0 ? 'partial' : totalDisbursementsFailed > 0 ? 'warning' : 'success',
        imported,
        totalStudents,
        disbursementsImported: totalDisbursementsImported,
        failedStudentCount,
        failedStudentDetails,
        totalDisbursementsFailed,
        failedDisbursementDetails,
      })
      setUploadProgress(prev => ({ ...prev, done: true }))
    } catch (error) {
      console.error('Import error:', error)
      if (error.message === 'Import cancelled by user') {
        message.warning('Import was cancelled. Some data may have already been saved.')
      } else {
        message.error(error.message || 'Something went wrong during import')
      }
      setUploadProgress(null)
      setImportResult(null)
    } finally {
      setLoading(false)
      abortControllerRef.current = null
    }
  }

  // Render cell input based on field type
  const renderCellInput = (row, rowIndex, field) => {
    const config = fieldConfigMap.get(field.key) || field
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
          onChange={(date) => handleCellEdit(rowIndex, field.key, date ? date.format('YYYY-MM-DD') : '')}
          size="small"
          className="w-full"
          format="MM-DD-YYYY"
          style={{ minWidth: config.width - 16 }}
        />
      )
    }

    return (
      <DebouncedInput
        value={value}
        onChange={(val) => handleCellEdit(rowIndex, field.key, val)}
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
      {/* Hidden file input — always mounted */}
      <input
        key={inputKey}
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.xlsm,.xlsb,.csv"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {/* Header */}
      <div style={{
        background: 'white',
        padding: '12px 16px',
        borderBottom: '1px solid #e8e8e8',
        flexShrink: 0
      }}>
        {/* Row 1: Title + data controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/students')} />
            <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
              <UploadOutlined style={{ color: '#1890ff' }} />
              Bulk Import
            {data.length > 0 && (
              <Text type="secondary" style={{ fontSize: 14, fontWeight: 400, marginLeft: 4 }}>
                — {data.length} record{data.length !== 1 ? 's' : ''}
              </Text>
            )}
          </Title>
          </div>
          {data.length > 0 && (
            <Space size="small">
              <Button
                size="small"
                icon={<UploadOutlined />}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload
              </Button>
              <Button size="small" icon={<PlusOutlined />} onClick={handleAddRow}>
                Add Row
              </Button>
              <Button size="small" danger icon={<CloseOutlined />} onClick={handleClear} disabled={loading}>
                Clear All
              </Button>
            </Space>
          )}
        </div>

        {/* Row 2: Academic Year management */}
        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>Academic Years:</Text>
          {academicYears.map((ay) => (
            <Tag
              key={ay.id}
              closable
              onClose={() => setAcademicYears(prev => sortAcademicYears(prev.filter(p => p.id !== ay.id)))}
              style={{ margin: 0 }}
            >
              {ay.label}
            </Tag>
          ))}
          <Input
            ref={ayInputRef}
            placeholder="YYYY-YYYY"
            size="small"
            maxLength={9}
            style={{ width: 110 }}
            onPressEnter={handleAddAY}
          />
          <Button size="small" icon={<PlusOutlined />} onClick={handleAddAY}>
            Add
          </Button>
        </div>
      </div>

      {/* Status & Action Bar — only when data is loaded */}
      {data.length > 0 && (
        <div style={{
          background: '#fafafa',
          padding: '6px 16px',
          borderBottom: '1px solid #e8e8e8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          flexShrink: 0
        }}>
          {/* Left: Validation summary */}
          <Space size={4}>
            {duplicateChecking ? (
              <Tag color="processing" icon={<LoadingOutlined />}>Validating...</Tag>
            ) : needsValidation ? (
              <Tag color="warning" icon={<ExclamationCircleOutlined />}>Needs Validation</Tag>
            ) : (
              <>
                <Tag color="green" icon={<CheckCircleOutlined />}>{validationCounts.valid} Valid</Tag>
                {validationCounts.missingFields > 0 && (
                  <Tag color="red" icon={<StopOutlined />}>
                    {validationCounts.missingFields} Missing Fields
                  </Tag>
                )}
                {validationCounts.dbMatch > 0 && (
                  <Tag color="purple" icon={<WarningOutlined />}>{validationCounts.dbMatch} DB Match</Tag>
                )}
                {validationCounts.flagged > 0 && (() => {
                  // Collect all conflict indices
                  const conflictIndices = []
                  data.forEach((_, idx) => {
                    const info = duplicateMap[idx]
                    const tags = info?.tags || []
                    if (tags.includes('missing_fields') || tags.includes('db_match')) conflictIndices.push(idx)
                  })
                  if (conflictIndices.length === 0) return null

                  const currentPos = conflictNavIndex >= 0 && conflictNavIndex < conflictIndices.length ? conflictNavIndex : -1

                  const goToConflict = (pos) => {
                    const targetIdx = conflictIndices[pos]
                    if (targetIdx === undefined) return
                    setConflictNavIndex(pos)
                    const targetPage = Math.floor(targetIdx / pageSize) + 1
                    setCurrentPage(targetPage)
                    setTimeout(() => {
                      const row = document.querySelector(`tr[data-row-index="${targetIdx}"]`)
                      if (row) {
                        row.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        row.style.outline = '2px solid #ff4d4f'
                        row.style.outlineOffset = '-1px'
                        setTimeout(() => { row.style.outline = ''; row.style.outlineOffset = '' }, 2000)
                      }
                    }, 100)
                  }

                  return (
                    <Space size={2} style={{ marginLeft: 4 }}>
                      <Button
                        size="small"
                        type="text"
                        icon={<LeftOutlined />}
                        disabled={currentPos <= 0}
                        onClick={() => goToConflict(currentPos <= 0 ? 0 : currentPos - 1)}
                        style={{ padding: '0 4px', height: 22, fontSize: 11 }}
                        title="Previous conflict"
                      />
                      <Button
                        size="small"
                        type="link"
                        onClick={() => goToConflict(currentPos < 0 ? 0 : currentPos)}
                        style={{ padding: '0 4px', height: 22, fontSize: 11 }}
                      >
                        {currentPos >= 0 ? `${currentPos + 1}/${conflictIndices.length}` : `Go to conflict`}
                      </Button>
                      <Button
                        size="small"
                        type="text"
                        icon={<RightOutlined />}
                        disabled={currentPos >= conflictIndices.length - 1}
                        onClick={() => goToConflict(currentPos < 0 ? 0 : currentPos + 1)}
                        style={{ padding: '0 4px', height: 22, fontSize: 11 }}
                        title="Next conflict"
                      />
                    </Space>
                  )
                })()}
              </>
            )}
          </Space>

          {/* Right: Action buttons */}
          <Space size="small">
            {needsValidation && !duplicateChecking && (
              <Button
                size="small"
                type="primary"
                ghost
                icon={<ExclamationCircleOutlined />}
                onClick={() => validateData(data)}
                style={{ borderColor: '#fa8c16', color: '#fa8c16' }}
              >
                Validate
              </Button>
            )}
            {!needsValidation && !duplicateChecking && (
              <Button
                size="small"
                icon={<ExclamationCircleOutlined />}
                onClick={() => validateData(data)}
              >
                Re-validate
              </Button>
            )}
            {!duplicateChecking && validationCounts.flagged > 0 && (
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => {
                  const flaggedIndices = new Set(
                    Object.entries(duplicateMap)
                      .filter(([, v]) => {
                        const tags = v.tags || []
                        return tags.includes('missing_fields') || tags.includes('db_match')
                      })
                      .map(([k]) => Number(k))
                  )
                  if (flaggedIndices.size === 0) return
                  setData(prev => {
                    const filtered = prev.filter((_, idx) => !flaggedIndices.has(idx))
                    return filtered.map((row, idx) => ({ ...row, seq: String(idx + 1) }))
                  })
                  setDuplicateMap({})
                  setCurrentPage(1)
                  setNeedsValidation(true)
                  message.success(`Removed ${flaggedIndices.size} conflicting row${flaggedIndices.size > 1 ? 's' : ''}`)
                }}
              >
                Clear Conflicts ({validationCounts.flagged})
              </Button>
            )}
            <Button
              type="primary"
              size="small"
              icon={validationCounts.flagged > 0 ? <WarningOutlined /> : <SendOutlined />}
              onClick={handlePreSubmit}
              loading={loading}
              disabled={needsValidation || duplicateChecking || validationCounts.flagged > 0}
            >
              {needsValidation ? 'Validate First' : validationCounts.flagged > 0 ? 'Fix Issues' : 'Submit All'}
            </Button>
          </Space>
        </div>
      )}

      {/* Empty State — when no data is loaded */}
      {data.length === 0 && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'white',
          padding: 40
        }}>
          <InboxOutlined style={{ fontSize: 64, color: '#d9d9d9', marginBottom: 16 }} />
          <Title level={5} style={{ color: '#8c8c8c', margin: '0 0 8px' }}>No Data Loaded</Title>
          <Text type="secondary" style={{ marginBottom: 24 }}>
            Upload an Excel file or add a row to get started
          </Text>
          <Space size="middle">
            <Button
              type="primary"
              size="large"
              icon={<UploadOutlined />}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload Excel
            </Button>
            <Button size="large" icon={<PlusOutlined />} onClick={handleAddRow}>
              Add Row
            </Button>
          </Space>
        </div>
      )}

      {/* Table Container with Scroll */}
      {data.length > 0 && (
      <div style={{ 
        flex: 1, 
        overflow: 'auto',
        background: 'white'
      }}>
        <table
          style={{ 
            minWidth: `${totalTableWidth}px`,
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
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
                    lineHeight: '1.2',
                    background: '#1890ff',
                    ...(col.frozen ? {
                      position: 'sticky',
                      left: col.leftOffset,
                      zIndex: 14,
                      ...(col.lastFrozen ? { boxShadow: '2px 0 5px rgba(0,0,0,0.1)' } : {}),
                    } : {}),
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
                  zIndex: 15,
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
                    lineHeight: '1.2',
                    background: '#40a9ff',
                    ...(col.frozen ? {
                      position: 'sticky',
                      left: col.leftOffset,
                      zIndex: 14,
                      ...(col.lastFrozen ? { boxShadow: '2px 0 5px rgba(0,0,0,0.1)' } : {}),
                    } : {}),
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
            {paginatedData.map((row, paginatedIndex) => {
                const actualRowIndex = (currentPage - 1) * pageSize + paginatedIndex
                const dupInfo = duplicateMap[actualRowIndex]
                const tags = dupInfo?.tags || []
                const hasMissingFields = tags.includes('missing_fields')
                const hasDbMatch = tags.includes('db_match')
                const hasAnyIssue = tags.length > 0
                const alt = paginatedIndex % 2 === 0
                const rowBg = hasMissingFields
                  ? (alt ? '#fff1f0' : '#ffe7e6')
                  : hasDbMatch
                    ? (alt ? '#f9f0ff' : '#f0e5ff')
                    : (alt ? 'white' : '#fafafa')
                const borderColor = hasMissingFields ? '#ff4d4f'
                  : hasDbMatch ? '#722ed1' : 'transparent'
                return (
                  <tr
                    key={actualRowIndex}
                    data-row-index={actualRowIndex}
                    style={{ 
                      background: rowBg,
                      borderLeft: hasAnyIssue ? `3px solid ${borderColor}` : 'none'
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
                          whiteSpace: 'normal',
                          ...(field.frozen ? {
                            position: 'sticky',
                            left: field.leftOffset,
                            zIndex: 2,
                            background: rowBg,
                            ...(field.lastFrozen ? { boxShadow: '2px 0 5px rgba(0,0,0,0.06)' } : {}),
                          } : {}),
                        }}
                      >
                        {field.key === 'seq' ? (
                          <div style={{ 
                            padding: '4px 6px',
                            textAlign: 'center',
                            fontSize: '13px',
                            fontWeight: 500,
                            background: hasMissingFields ? '#ffccc7' : hasDbMatch ? '#efdbff' : '#f5f5f5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4
                          }}>
                            {hasAnyIssue && (
                              <Popover
                                title={
                                  <span style={{ color: hasMissingFields ? '#cf1322' : '#531dab' }}>
                                    <ExclamationCircleOutlined style={{ marginRight: 6 }} />
                                    {hasMissingFields ? 'Missing Required Field(s)'
                                      : hasDbMatch ? 'DB Match Found'
                                      : 'Issue'}
                                  </span>
                                }
                                content={
                                  <div style={{ maxWidth: 400, maxHeight: 280, overflowY: 'auto' }}>
                                    {(dupInfo?.reasons || []).map((r, ri) => (
                                      <div
                                        key={ri}
                                        style={{
                                          padding: '8px 12px',
                                          background: ri % 2 === 0 ? '#fffbe6' : '#fff',
                                          borderRadius: 6,
                                          marginBottom: 8,
                                          border: '1px solid #ffe58f',
                                          fontSize: 13
                                        }}
                                      >
                                        <Tag
                                          color={
                                            r.type === 'missing_fields' ? 'red' :
                                            r.type === 'db_match' ? 'purple' : 'default'
                                          }
                                          style={{ marginBottom: 4, fontSize: 11 }}
                                        >
                                          {r.type === 'missing_fields' ? '❌ Missing Field' :
                                           r.type === 'db_match' ? '⚠ DB Match' : r.type}
                                        </Tag>
                                        <div style={{ color: '#6b7280', marginTop: 4 }}>{r.detail}</div>
                                      </div>
                                    ))}
                                  </div>
                                }
                                trigger="click"
                                placement="right"
                              >
                                <WarningOutlined style={{ color: hasMissingFields ? '#ff4d4f' : '#722ed1', cursor: 'pointer', fontSize: 14 }} />
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
                        zIndex: 3,
                        background: rowBg,
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
              })}
          </tbody>
        </table>
      </div>
      )}

      {/* Pagination Footer */}
      {data.length > 0 && (
        <div style={{ 
          background: '#fafafa',
          padding: '8px 16px',
          borderTop: '1px solid #e8e8e8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Showing {Math.min((currentPage - 1) * pageSize + 1, data.length)}–{Math.min(currentPage * pageSize, data.length)} of {data.length}
          </Text>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={data.length}
            onChange={(page) => setCurrentPage(page)}
            showSizeChanger={false}
            size="small"
          />
          <Space size="small">
            <Text type="secondary" style={{ fontSize: 12 }}>Rows:</Text>
            <Select
              value={pageSize}
              onChange={(value) => { setPageSize(value); setCurrentPage(1) }}
              size="small"
              style={{ width: 65 }}
              options={[
                { label: '20', value: 20 },
                { label: '50', value: 50 },
                { label: '100', value: 100 },
              ]}
            />
          </Space>
        </div>
      )}

      {/* File Loading Modal */}
      <Modal
        open={!!fileLoadingState}
        closable={false}
        footer={null}
        centered
        maskClosable={false}
        width={360}
      >
        {fileLoadingState && (
          <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
            <LoadingOutlined style={{ fontSize: 40, color: '#1890ff', marginBottom: 16 }} />
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4, color: '#1f2937' }}>
              {fileLoadingState.phase}
            </div>
            {fileLoadingState.detail && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                {fileLoadingState.detail}
              </Text>
            )}
          </div>
        )}
      </Modal>

      {/* Upload Progress / Import Result Modal */}
      <Modal
        open={!!uploadProgress}
        closable={false}
        footer={importResult ? (
          <div style={{ textAlign: 'right' }}>
            <Button
              type="primary"
              onClick={() => {
                resetImportState()
                handleClear()
                navigate('/students')
              }}
            >
              OK
            </Button>
          </div>
        ) : null}
        centered
        maskClosable={false}
        width={importResult ? 540 : 420}
        keyboard={false}
      >
        {uploadProgress && !importResult && (
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
              {uploadProgress.done ? 'Done!' : (uploadProgress.phase || 'Uploading records...')}
            </Text>
            <Progress
              percent={uploadProgress.total > 0 ? Math.round((uploadProgress.current / uploadProgress.total) * 100) : 0}
              status={uploadProgress.done ? 'success' : 'active'}
              style={{ marginTop: 16 }}
            />
            {!uploadProgress.done && (
              <div style={{ marginTop: 16 }}>
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8, color: '#ff7a45' }}>
                  <WarningOutlined style={{ marginRight: 4 }} />
                  Do not close, refresh, or navigate away. Data is being saved.
                </Text>
                <Button
                  size="small"
                  danger
                  onClick={() => {
                    Modal.confirm({
                      title: 'Cancel Import?',
                      content: 'Students and disbursements already saved will remain in the database. Only unsent batches will be skipped.',
                      okText: 'Yes, Cancel',
                      cancelText: 'Keep Going',
                      centered: true,
                      onOk: () => { if (abortControllerRef.current) abortControllerRef.current.abort() },
                    })
                  }}
                >
                  Cancel Import
                </Button>
              </div>
            )}
          </div>
        )}

        {importResult && (
          <div style={{ padding: '8px 0' }}>
            {/* Title row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              {importResult.status === 'success' ? (
                <CheckCircleOutlined style={{ fontSize: 28, color: '#52c41a' }} />
              ) : (
                <WarningOutlined style={{ fontSize: 28, color: importResult.status === 'partial' ? '#fa8c16' : '#faad14' }} />
              )}
              <div style={{ fontSize: 18, fontWeight: 600, color: '#1f2937' }}>
                {importResult.status === 'success' ? 'Import Successful' : importResult.status === 'partial' ? 'Import Partially Complete' : 'Import Complete (with Warnings)'}
              </div>
            </div>

            {/* Success summary */}
            <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, padding: '10px 14px', marginBottom: 12 }}>
              <Text style={{ fontSize: 13 }}>
                <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 6 }} />
                <strong>{importResult.imported}</strong> student{importResult.imported !== 1 ? 's' : ''} and <strong>{importResult.disbursementsImported}</strong> disbursement{importResult.disbursementsImported !== 1 ? 's' : ''} saved to the database.
              </Text>
            </div>

            {/* Failed students */}
            {importResult.failedStudentDetails?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 6, padding: '10px 14px' }}>
                  <Text style={{ fontSize: 13, color: '#ad6800', display: 'block', marginBottom: 8 }}>
                    <WarningOutlined style={{ marginRight: 6 }} />
                    <strong>{importResult.failedStudentCount}</strong> student{importResult.failedStudentCount !== 1 ? 's' : ''} failed to import:
                  </Text>
                  <div style={{ maxHeight: 160, overflowY: 'auto', fontSize: 12 }}>
                    {importResult.failedStudentDetails.map((s, i) => (
                      <div key={i} style={{ padding: '3px 0', borderBottom: i < importResult.failedStudentDetails.length - 1 ? '1px solid #ffe7ba' : 'none' }}>
                        <strong>{s.name || '—'}</strong>
                        {s.awardNumber && <span style={{ color: '#8c8c8c', marginLeft: 8 }}>{s.awardNumber}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Failed disbursements */}
            {importResult.failedDisbursementDetails?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 6, padding: '10px 14px' }}>
                  <Text style={{ fontSize: 13, color: '#a8071a', display: 'block', marginBottom: 8 }}>
                    <WarningOutlined style={{ marginRight: 6 }} />
                    <strong>{importResult.totalDisbursementsFailed}</strong> disbursement{importResult.totalDisbursementsFailed !== 1 ? 's' : ''} had errors:
                  </Text>
                  <div style={{ maxHeight: 160, overflowY: 'auto', fontSize: 12 }}>
                    {importResult.failedDisbursementDetails.map((d, i) => (
                      <div key={i} style={{ padding: '3px 0', borderBottom: i < importResult.failedDisbursementDetails.length - 1 ? '1px solid #ffccc7' : 'none' }}>
                        <strong>{d.name || '—'}</strong>
                        {d.awardNumber && <span style={{ color: '#8c8c8c', marginLeft: 8 }}>{d.awardNumber}</span>}
                        {(d.ay || d.semester) && <span style={{ color: '#8c8c8c', marginLeft: 8 }}>({d.ay}{d.semester ? ` ${d.semester}` : ''})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        open={showConfirmModal}
        title={
          <span>
            <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
            Confirm Import
          </span>
        }
        onOk={() => {
          setShowConfirmModal(false)
          handleSubmitData()
        }}
        onCancel={() => setShowConfirmModal(false)}
        okText="Yes, Import"
        cancelText="Cancel"
        centered
        width={480}
      >
        <div style={{ padding: '12px 0' }}>
          <Text style={{ fontSize: 14, display: 'block', marginBottom: 16 }}>
            You are about to submit <strong>{data.length}</strong> record{data.length !== 1 ? 's' : ''} for import.
          </Text>

          <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, padding: '12px 16px', marginBottom: 12 }}>
            <Text style={{ fontSize: 13 }}>
              <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 6 }} />
              <strong>{validationCounts.valid}</strong> record{validationCounts.valid !== 1 ? 's' : ''} ready for import
            </Text>
          </div>

          <Divider style={{ margin: '16px 0 12px' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            This action cannot be undone after confirmation.
          </Text>
        </div>
      </Modal>

    </div>
  )
}