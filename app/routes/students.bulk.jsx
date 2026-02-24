import { useState, useRef, useMemo, useEffect, useCallback, memo } from 'react'
import { Typography, message, Button, Card, Space, Input, Select, DatePicker, Tag, Pagination, Tooltip, Badge, Popover, Popconfirm, Progress, Modal, Divider } from 'antd'
import { UploadOutlined, SendOutlined, CloseOutlined, InboxOutlined, PlusOutlined, WarningOutlined, ExclamationCircleOutlined, CheckCircleOutlined, LoadingOutlined, DeleteOutlined, DownloadOutlined, InfoCircleOutlined, StopOutlined } from '@ant-design/icons'
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

// Name-based alias map: student field key → array of sanitized aliases
const STUDENT_FIELD_ALIASES = {
  seq: ['seq'],
  inCharge: ['incharge'],
  awardYear: ['awardyear', 'awyr'],
  scholarshipProgram: ['scholarshipprogram', 'schoprog'],
  awardNumber: ['awardnumber', 'awno'],
  learnerReferenceNumber: ['learnerreferencenumber', 'lrn'],
  surname: ['surname', 'sname'],
  firstName: ['firstname', 'fname'],
  middleName: ['middlename', 'mname'],
  extension: ['extension', 'ename', 'ext', 'nameextension'],
  sex: ['sex', 'gender'],
  dateOfBirth: ['dateofbirth', 'birthday', 'dob', 'birthdate'],
  contactNumber: ['contactnumber', 'contno'],
  emailAddress: ['emailaddress', 'emladd', 'email'],
  streetBrgy: ['streetbrgy', 'stbrgy'],
  municipalityCity: ['municipalitycity', 'muncity'],
  province: ['province', 'prov'],
  congressionalDistrict: ['congressionaldistrict', 'congdist'],
  zipCode: ['zipcode', 'zip'],
  specialGroup: ['specialgroup', 'spgrp'],
  certificationNumber: ['certificationnumber', 'certno', 'certificationnumberifapplicable'],
  nameOfInstitution: ['nameofinstitution', 'hei', 'institution'],
  uii: ['uii'],
  institutionalType: ['institutionaltype', 'insttype'],
  regionSchoolLocated: ['regionwheretheschoolislocated', 'region', 'regionschool'],
  degreeProgram: ['degreeprogram', 'progname'],
  programMajor: ['programmajor', 'progmjr'],
  programDiscipline: ['programdiscipline', 'progdiscp'],
  programDegreeLevel: ['programdegreelevel', 'proglvl', 'degreelevel'],
  authorityType: ['authoritytype', 'gprtype'],
  authorityNumber: ['authoritynumber', 'gprno'],
  series: ['series', 'gprseries'],
  priority: ['priority', 'prio'],
  basisCmo: ['basiscmo', 'priobasis', 'basiscmo'],
  scholarshipStatus: ['scholarshipstatus', 'schostatus'],
  replacement: ['replacement', 'remarks1'],
  reason: ['reason', 'remarks2'],
}

// Student information fields for comparison (excludes seq and dynamic AY fields)
const STUDENT_INFO_KEYS = [
  'inCharge', 'awardYear', 'scholarshipProgram', 'awardNumber',
  'learnerReferenceNumber', 'surname', 'firstName', 'middleName',
  'extension', 'sex', 'dateOfBirth', 'contactNumber', 'emailAddress',
  'streetBrgy', 'municipalityCity', 'province', 'congressionalDistrict',
  'zipCode', 'specialGroup', 'certificationNumber', 'nameOfInstitution',
  'uii', 'institutionalType', 'regionSchoolLocated', 'degreeProgram',
  'programMajor', 'programDiscipline', 'programDegreeLevel',
  'authorityType', 'authorityNumber', 'series', 'priority', 'basisCmo',
  'scholarshipStatus', 'replacement', 'reason',
]

// Human-readable field labels for export
const FIELD_EXPORT_LABELS = {
  inCharge: 'In-Charge', awardYear: 'Award Year', scholarshipProgram: 'Scholarship Program',
  awardNumber: 'Award Number', learnerReferenceNumber: 'LRN', surname: 'Surname',
  firstName: 'First Name', middleName: 'Middle Name', extension: 'Extension',
  sex: 'Sex', dateOfBirth: 'Date of Birth', contactNumber: 'Contact Number',
  emailAddress: 'Email Address', streetBrgy: 'Street/Brgy', municipalityCity: 'Municipality/City',
  province: 'Province', congressionalDistrict: 'Congressional District', zipCode: 'Zip Code',
  specialGroup: 'Special Group', certificationNumber: 'Certification Number',
  nameOfInstitution: 'Institution', uii: 'UII', institutionalType: 'Institutional Type',
  regionSchoolLocated: 'Region', degreeProgram: 'Degree Program', programMajor: 'Program Major',
  programDiscipline: 'Program Discipline', programDegreeLevel: 'Program Degree Level',
  authorityType: 'Authority Type', authorityNumber: 'Authority Number', series: 'Series',
  priority: 'Priority', basisCmo: 'Basis (CMO)', scholarshipStatus: 'Scholarship Status',
  replacement: 'Replacement', reason: 'Reason',
}

// Semester field aliases (used inside AY blocks)
const SEM_FIELD_ALIASES = {
  nta: ['nta'],
  fundSource: ['fundsource'],
  voucherTrackingNo: ['vouchertrackingno', 'vouchertracking'],
  modeOfPayment: ['modeofpayment'],
  atmAccountNo: ['atmaccountno', 'atmaccount'],
  dateProcess: ['dateprocess'],
  voucherNo: ['voucherno', 'vouchernumber'],
  voucherDate: ['voucherdate'],
  accountCheckNo: ['accountcheckno'],
  amount: ['amount'],
  lddapNo: ['lddapno', 'lddapnumber'],
  disbursementDate: ['disbursementdate'],
  status: ['status'],
  remarks: ['remarks'],
}

// CYL aliases
const CYL_ALIASES = ['curriculumyearlevel', 'cyl', 'yearlevel']

// Build reverse lookup: sanitized alias string → field key
const buildAliasLookup = (aliasMap) => {
  const lookup = new Map()
  Object.entries(aliasMap).forEach(([fieldKey, aliases]) => {
    aliases.forEach((alias) => lookup.set(alias, fieldKey))
  })
  return lookup
}
const STUDENT_ALIAS_LOOKUP = buildAliasLookup(STUDENT_FIELD_ALIASES)
const SEM_ALIAS_LOOKUP = buildAliasLookup(SEM_FIELD_ALIASES)

// Count how many cells in a row match known student/semester field aliases
const countHeaderMatches = (row) => {
  if (!Array.isArray(row)) return { total: 0, studentKeys: new Set(), semKeys: new Set() }
  const studentKeys = new Set()
  const semKeys = new Set()
  row.forEach((cell) => {
    const san = sanitize(String(cell || ''))
    if (!san) return
    const sk = STUDENT_ALIAS_LOOKUP.get(san)
    if (sk) studentKeys.add(sk)
    const semk = SEM_ALIAS_LOOKUP.get(san)
    if (semk) semKeys.add(semk)
    if (CYL_ALIASES.includes(san)) studentKeys.add('__cyl__')
  })
  return { total: studentKeys.size + semKeys.size, studentKeys, semKeys }
}

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
  const [academicYears, setAcademicYears] = useState([
    { id: makeAyId('2024-2025'), label: '2024-2025' },
  ])
  const ayInputRef = useRef(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [duplicateMap, setDuplicateMap] = useState({}) // { rowIndex: { matches: [...], checking: false } }
  const [duplicateChecking, setDuplicateChecking] = useState(false)
  const [needsValidation, setNeedsValidation] = useState(false) // true when data changed since last validation
  const [uploadProgress, setUploadProgress] = useState(null) // { current, total, done, phase }
  const [fileLoadingState, setFileLoadingState] = useState(null) // null | { phase, detail }
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const hasExportedRef = useRef(false)

  const { row1: headerRow1, row2: headerRow2, row3: headerRow3, leafFields } = useMemo(
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

    // Reset input so the same file can be re-uploaded
    event.target.value = ''

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

        // ── Step 1: Find the header row by NAME matching ──
        // Scan the first 30 rows (headers are never deeper than that).
        let bestIdx = -1
        let bestScore = 0
        const scanLimit = Math.min(allRows.length, 30)

        for (let i = 0; i < scanLimit; i += 1) {
          const { total } = countHeaderMatches(allRows[i] || [])
          if (total > bestScore) {
            bestScore = total
            bestIdx = i
          }
        }

        // Also try combining 3 consecutive rows (merged header blocks)
        for (let i = 0; i < scanLimit - 2; i += 1) {
          const combined = []
          const r0 = allRows[i] || []
          const r1 = allRows[i + 1] || []
          const r2 = allRows[i + 2] || []
          const len = Math.max(r0.length, r1.length, r2.length)
          for (let c = 0; c < len; c += 1) {
            combined.push(r2[c] || r1[c] || r0[c] || '')
          }
          const { total } = countHeaderMatches(combined)
          if (total > bestScore) {
            bestScore = total
            bestIdx = i
          }
        }

        if (bestIdx < 0 || bestScore < 5) {
          message.error('Column headers not recognized – the file does not match the expected template.')
          setFileLoadingState(null)
          return
        }

        // Determine header block: could be 1, 2, or 3 rows.
        // We look at 3 rows starting at bestIdx (if available).
        const topRowRaw = allRows[bestIdx] || []
        const midRowRaw = bestIdx + 1 < allRows.length ? (allRows[bestIdx + 1] || []) : []
        const leafRowRaw = bestIdx + 2 < allRows.length ? (allRows[bestIdx + 2] || []) : []

        const maxColCount = Math.max(topRowRaw.length, midRowRaw.length, leafRowRaw.length)
        if (maxColCount <= 0) {
          message.error('Header rows are empty.')
          setFileLoadingState(null)
          return
        }

        // Fill-forward helper (for merged cells in parent rows)
        const fillForward = (row = [], maxLen) => {
          const filled = Array.from({ length: maxLen }, (_, i) => row[i])
          for (let i = 0; i < filled.length; i += 1) {
            if (filled[i] === undefined || filled[i] === null || filled[i] === '') {
              filled[i] = i > 0 ? filled[i - 1] : filled[i]
            }
          }
          return filled
        }

        const topRow = fillForward(topRowRaw, maxColCount)
        const midRow = fillForward(midRowRaw, maxColCount)
        const leafRow = Array.from({ length: maxColCount }, (_, i) => leafRowRaw[i] ?? '')

        // ── Step 2: Determine how many header rows were used ──
        // Check if rows bestIdx+1 and bestIdx+2 are also part of the header
        // (contain sub-headers / group labels rather than data).
        const headerRowCount = (() => {
          // If the combined 3-row score was the best, use 3
          const { total: scoreRow0 } = countHeaderMatches(topRowRaw)
          if (scoreRow0 === bestScore) {
            // Single row was enough – but check if next rows are sub-headers
            const { total: s1 } = countHeaderMatches(midRowRaw)
            const { total: s2 } = countHeaderMatches(leafRowRaw)
            if (s1 >= 3 || s2 >= 3) return 3
            if (s1 >= 1) return 2
            return 1
          }
          return 3
        })()

        // ── Step 3: Build effective label per column (bottom-up priority) ──
        // For each column, the effective label = first non-empty from leaf → mid → top
        const effectiveLabels = Array.from({ length: maxColCount }, (_, c) => {
          const lf = sanitize(String(leafRow[c] || ''))
          const md = sanitize(String(midRow[c] || ''))
          const tp = sanitize(String(topRow[c] || ''))
          return lf || md || tp || ''
        })

        // ── Step 4: Map static student columns by name ──
        const colToFieldKey = new Map() // colIdx → field key (string)
        const usedStudentFields = new Set()

        for (let c = 0; c < maxColCount; c += 1) {
          const label = effectiveLabels[c]
          if (!label) continue
          const fieldKey = STUDENT_ALIAS_LOOKUP.get(label)
          if (fieldKey && !usedStudentFields.has(fieldKey)) {
            usedStudentFields.add(fieldKey)
            colToFieldKey.set(c, { type: 'student', key: fieldKey })
          }
        }

        // ── Step 5: Detect AY labels from parent rows ──
        const colAyLabel = new Map()
        for (let c = 0; c < maxColCount; c += 1) {
          const ay =
            deriveAyLabelFromKey(String(topRow[c] || '')) ||
            deriveAyLabelFromKey(String(midRow[c] || '')) ||
            deriveAyLabelFromKey(String(leafRow[c] || ''))
          if (ay) colAyLabel.set(c, ay)
        }
        const detectedAyLabels = Array.from(new Set(colAyLabel.values()))
          .sort((a, b) => parseInt(a.slice(0, 4), 10) - parseInt(b.slice(0, 4), 10))

        // ── Step 6: Detect semester context from parent rows ──
        const colSemester = new Map()
        const checkSem = (str) => {
          const san = sanitize(String(str || ''))
          if (san.includes('first') || san.includes('1st')) return 'First'
          if (san.includes('second') || san.includes('2nd')) return 'Second'
          return null
        }
        for (let c = 0; c < maxColCount; c += 1) {
          const sem = checkSem(midRow[c]) || checkSem(topRow[c]) || checkSem(leafRow[c])
          if (sem) colSemester.set(c, sem)
        }

        // ── Step 7: Map AY disbursement columns by name ──
        // For each unmapped column that has an AY context:
        //   - check if it's CYL
        //   - check if its name matches a semester field alias
        const fileAys = detectedAyLabels.length > 0
          ? detectedAyLabels.map((label) => ({ id: makeAyId(label), label }))
          : academicYears

        // Track used semester fields per AY+semester to avoid double mapping
        const usedAySemFields = new Map() // 'ayLabel__sem__fieldKey' → true

        for (let c = 0; c < maxColCount; c += 1) {
          if (colToFieldKey.has(c)) continue
          const label = effectiveLabels[c]
          if (!label) continue

          const ayLabel = colAyLabel.get(c)
          if (!ayLabel) continue

          const ayObj = fileAys.find(a => a.label === ayLabel)
          if (!ayObj) continue

          // Check CYL
          if (CYL_ALIASES.includes(label)) {
            const cylKey = `${ayObj.id}__cyl`
            colToFieldKey.set(c, { type: 'cyl', key: cylKey, ayLabel })
            continue
          }

          // Check semester field
          const semFieldKey = SEM_ALIAS_LOOKUP.get(label)
          if (semFieldKey) {
            const sem = colSemester.get(c) || null
            if (sem) {
              const semPrefix = sem === 'First' ? 'first' : 'second'
              const fullKey = `${ayObj.id}__${semPrefix}__${semFieldKey}`
              const trackKey = `${ayLabel}__${semPrefix}__${semFieldKey}`
              if (!usedAySemFields.has(trackKey)) {
                usedAySemFields.set(trackKey, true)
                colToFieldKey.set(c, { type: 'semester', key: fullKey, ayLabel, semester: sem })
              }
            }
          }
        }

        // ── Step 8: Validate minimum required fields ──
        const hasSurname = usedStudentFields.has('surname')
        const hasFirstName = usedStudentFields.has('firstName')
        if (!hasSurname && !hasFirstName) {
          message.error('Could not find surname/first name columns – please check the file format.')
          setFileLoadingState(null)
          return
        }

        // Build the actual AY list for the table
        const { leafFields: nextLeafFields } = buildHeaders(fileAys)

        // Build a quick lookup: field key → leafField config
        const leafFieldMap = new Map()
        nextLeafFields.forEach(f => leafFieldMap.set(f.key, f))

        // Build final colIdx → leafField mapping
        const colToField = new Map()
        let mappedCount = 0
        colToFieldKey.forEach(({ key }, colIdx) => {
          const lf = leafFieldMap.get(key)
          if (lf) {
            colToField.set(colIdx, lf)
            mappedCount += 1
          }
        })

        setFileLoadingState({ phase: 'Mapping columns...', detail: `${mappedCount} columns mapped${detectedAyLabels.length > 0 ? `, ${detectedAyLabels.length} AY` : ''}` })
        await new Promise(r => setTimeout(r, 0))

        // ── Step 9: Extract data rows ──
        // Data starts after the header block
        const dataStartIdx = bestIdx + headerRowCount
        const dataRowsRaw = allRows.slice(dataStartIdx)

        // Build set of known header tokens to filter out stray header-like rows in data
        const headerSanSet = new Set()
        ;[topRow, midRow, leafRow].forEach(r => r.forEach(v => {
          const s = sanitize(String(v || ''))
          if (s) headerSanSet.add(s)
        }))
        // Add all known aliases
        STUDENT_ALIAS_LOOKUP.forEach((_, alias) => headerSanSet.add(alias))
        SEM_ALIAS_LOOKUP.forEach((_, alias) => headerSanSet.add(alias))
        CYL_ALIASES.forEach(a => headerSanSet.add(a))
        ;['nameofgrantee', 'contactdetails', 'completeaddress', 'governmentauthority',
          'priorityprogram', 'firstsemester', 'secondsemester', 'academicyear'
        ].forEach(t => headerSanSet.add(t))

        const dataRows = dataRowsRaw.filter((row) => {
          if (!Array.isArray(row)) return false
          const nonEmpty = row.filter(cell => {
            const s = String(cell ?? '').trim()
            return s !== ''
          })
          if (nonEmpty.length === 0) return false
          // Skip row if >40% of its non-empty cells are known header tokens
          const tokens = nonEmpty.map(cell => sanitize(String(cell || ''))).filter(Boolean)
          if (tokens.length > 0) {
            const hits = tokens.filter(t => headerSanSet.has(t)).length
            if (hits / tokens.length >= 0.4) return false
          }
          return true
        })

        setFileLoadingState({ phase: `Processing ${dataRows.length} rows...`, detail: `${mappedCount} columns mapped` })
        await new Promise(r => setTimeout(r, 0))

        // ── Step 10: Normalize data rows ──
        const normalized = dataRows.map((row, idx) => {
          const normalizedRow = {}
          nextLeafFields.forEach(f => { normalizedRow[f.key] = '' })
          normalizedRow.seq = String(idx + 1)

          if (Array.isArray(row)) {
            row.forEach((value, colIdx) => {
              const field = colToField.get(colIdx)
              if (!field) return
              let cellVal = value
              if (cellVal === null || cellVal === undefined) cellVal = ''

              if (typeof cellVal === 'number' && field.type === 'date') {
                cellVal = excelDateToISO(cellVal)
              }

              if (typeof cellVal === 'string') {
                cellVal = cellVal.trim()
                if (isAmountKey(field.key)) cellVal = cellVal.replace(/,/g, '')
              }

              normalizedRow[field.key] = cellVal === undefined || cellVal === null ? '' : cellVal
            })
          }

          return normalizedRow
        })

        // ── Step 11: Derive scholarship program from award number ──
        // LibreOffice doesn't cache formula results or doesn't support IFS(),
        // so cells come through as empty, #NAME?, #VALUE!, etc.
        // Fill them from the award number prefix.
        const isExcelError = (v) => typeof v === 'string' && /^#[A-Z0-9/]+[!?]?$/.test(v.trim())
        normalized.forEach((row) => {
          if ((!row.scholarshipProgram || isExcelError(row.scholarshipProgram)) && row.awardNumber) {
            row.scholarshipProgram = deriveScholarshipProgram(row.awardNumber)
          }
        })

        // Log mapping summary
        console.log('Name-based mapping:', mappedCount, 'columns mapped')
        console.log('Student fields found:', Array.from(usedStudentFields))
        console.log('Detected AYs:', detectedAyLabels)

        setFileLoadingState({ phase: `Loaded ${normalized.length} records`, detail: 'Checking for duplicates...' })
        await new Promise(r => setTimeout(r, 0))

        setAcademicYears(fileAys)
        setData(normalized)
        validateData(normalized)

        message.success(`Loaded ${normalized.length} records from ${file.name} | ${mappedCount} columns mapped${detectedAyLabels.length > 0 ? ` | AY: ${detectedAyLabels.join(', ')}` : ''}`)
      } catch (error) {
        console.error(error)
        message.error('Error parsing file')
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

    // --- Phase 1: Status Validation ---
    rows.forEach((row, idx) => {
      const status = String(row.scholarshipStatus || '').trim()
      if (!status) {
        ensureEntry(idx)
        newMap[idx].tags.push('missing_status')
        newMap[idx].reasons.push({ type: 'missing_status', detail: 'Missing Scholarship Status (required field)' })
      }
    })

    // --- Phase 2: Batch-internal identity & conflict detection ---
    // Identity: normalized name (surname + firstName + middleName)
    const identityKey = (row) => {
      const s = (row.surname || '').trim().toLowerCase()
      const f = (row.firstName || '').trim().toLowerCase()
      const m = (row.middleName || '').trim().toLowerCase()
      return s && f ? `${s}|${f}|${m}` : null
    }

    // Student info fingerprint
    const studentFingerprint = (row) =>
      STUDENT_INFO_KEYS.map(k => String(row[k] || '').trim().toLowerCase()).join('|')

    // AY disbursement data per row
    const getAyData = (row) => {
      const result = {}
      Object.keys(row).forEach(k => {
        const semMatch = k.match(/^(ay_[^_]+)__(first|second)__(.+)$/)
        if (semMatch) {
          const [, ayId, sem, field] = semMatch
          if (!result[ayId]) result[ayId] = {}
          if (!result[ayId][sem]) result[ayId][sem] = {}
          const val = String(row[k] || '').trim()
          if (val) result[ayId][sem][field] = val
        }
        const cylMatch = k.match(/^(ay_[^_]+)__cyl$/)
        if (cylMatch) {
          const ayId = cylMatch[1]
          if (!result[ayId]) result[ayId] = {}
          const val = String(row[k] || '').trim()
          if (val) result[ayId].cyl = val
        }
      })
      return result
    }

    // Group rows by identity
    const identityGroups = {}
    rows.forEach((row, idx) => {
      const key = identityKey(row)
      if (key) {
        if (!identityGroups[key]) identityGroups[key] = []
        identityGroups[key].push(idx)
      }
    })

    // Analyze each group with >1 row
    Object.values(identityGroups).filter(g => g.length > 1).forEach(group => {
      const firstFp = studentFingerprint(rows[group[0]])

      // Check if ALL student info is identical across the group
      let allStudentInfoIdentical = true
      const differingFields = []
      for (let i = 1; i < group.length; i++) {
        const fp = studentFingerprint(rows[group[i]])
        if (fp !== firstFp) {
          allStudentInfoIdentical = false
          // Find specific differing fields
          for (const key of STUDENT_INFO_KEYS) {
            const v1 = String(rows[group[0]][key] || '').trim().toLowerCase()
            const v2 = String(rows[group[i]][key] || '').trim().toLowerCase()
            if (v1 !== v2 && !differingFields.includes(key)) {
              differingFields.push(FIELD_EXPORT_LABELS[key] || key)
            }
          }
        }
      }

      if (!allStudentInfoIdentical) {
        // Student info differs → Conflict (Not Allowed) per requirement #1
        group.forEach(idx => {
          ensureEntry(idx)
          if (!newMap[idx].tags.includes('batch_conflict')) {
            newMap[idx].tags.push('batch_conflict')
            const others = group.filter(i => i !== idx).map(i => `Row ${i + 1}`)
            newMap[idx].reasons.push({
              type: 'batch_conflict',
              detail: `Student info conflict with ${others.join(', ')} — differs in: ${differingFields.join(', ')}`
            })
            newMap[idx].matches.push({
              match_type: 'batch_conflict',
              name: `Info conflict with ${others.join(', ')}`,
              award_number: rows[idx].awardNumber || '',
              institution: rows[idx].nameOfInstitution || '',
              program: rows[idx].scholarshipProgram || '',
            })
          }
        })
      } else {
        // Student info identical → check disbursement AYs (requirement #2)
        const ayDataPerRow = group.map(idx => ({ idx, ayData: getAyData(rows[idx]) }))

        for (let i = 0; i < ayDataPerRow.length; i++) {
          for (let j = i + 1; j < ayDataPerRow.length; j++) {
            const a = ayDataPerRow[i]
            const b = ayDataPerRow[j]
            const allAys = new Set([...Object.keys(a.ayData), ...Object.keys(b.ayData)])

            let hasOverlapConflict = false
            let allDisbIdentical = true

            for (const ayId of allAys) {
              const da = a.ayData[ayId]
              const db = b.ayData[ayId]
              if (da && db) {
                // Both have this AY → compare
                if (JSON.stringify(da) !== JSON.stringify(db)) {
                  hasOverlapConflict = true
                  allDisbIdentical = false
                }
              } else {
                allDisbIdentical = false
              }
            }

            if (allDisbIdentical) {
              // Exact duplicate — all student info + all disbursements identical
              // (includes case where both have zero AY data)
              ;[a.idx, b.idx].forEach(idx => {
                ensureEntry(idx)
                if (!newMap[idx].tags.includes('exact_duplicate')) {
                  newMap[idx].tags.push('exact_duplicate')
                  const otherIdx = idx === a.idx ? b.idx : a.idx
                  newMap[idx].reasons.push({
                    type: 'exact_duplicate',
                    detail: `Exact duplicate of Row ${otherIdx + 1} (student info + disbursements identical)`
                  })
                  newMap[idx].matches.push({
                    match_type: 'exact_duplicate',
                    name: `Exact duplicate of Row ${otherIdx + 1}`,
                    award_number: rows[idx].awardNumber || '',
                    institution: '', program: '',
                  })
                }
              })
            } else if (hasOverlapConflict) {
              // Same student, overlapping AY with different data → disbursement conflict
              ;[a.idx, b.idx].forEach(idx => {
                ensureEntry(idx)
                if (!newMap[idx].tags.includes('disb_conflict')) {
                  newMap[idx].tags.push('disb_conflict')
                  const otherIdx = idx === a.idx ? b.idx : a.idx
                  newMap[idx].reasons.push({
                    type: 'disb_conflict',
                    detail: `Disbursement conflict with Row ${otherIdx + 1} — same AY, different data`
                  })
                  newMap[idx].matches.push({
                    match_type: 'disb_conflict',
                    name: `Disbursement conflict with Row ${otherIdx + 1}`,
                    award_number: rows[idx].awardNumber || '',
                    institution: '', program: '',
                  })
                }
              })
            }
            // else: no AY overlap → valid (new AY data for same student), no flag needed
          }
        }
      }
    })

    // --- Phase 3: DB duplicate check (backend) ---
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
  }, [])

  // --- Validation counts ---
  const validationCounts = useMemo(() => {
    const total = data.length
    let valid = 0, missingStatus = 0, conflict = 0, exactDuplicate = 0, disbConflict = 0, dbMatch = 0
    data.forEach((_, idx) => {
      const info = duplicateMap[idx]
      if (!info || (!info.tags?.length && !info.matches?.length)) { valid++; return }
      const tags = info.tags || []
      if (tags.includes('missing_status')) missingStatus++
      if (tags.includes('batch_conflict')) conflict++
      if (tags.includes('exact_duplicate')) exactDuplicate++
      if (tags.includes('disb_conflict')) disbConflict++
      if (tags.includes('db_match')) dbMatch++
      // A row that only has db_match but no local issues is still importable (goes to resolve page)
      if (!tags.includes('missing_status') && !tags.includes('batch_conflict') &&
          !tags.includes('exact_duplicate') && !tags.includes('disb_conflict') &&
          !tags.includes('db_match')) valid++
    })
    const flagged = total - valid
    return { total, valid, missingStatus, conflict, exactDuplicate, disbConflict, dbMatch, flagged }
  }, [data, duplicateMap])

  // --- Export flagged records to Excel ---
  const handleExportFlagged = useCallback(() => {
    const flaggedRows = []

    data.forEach((row, idx) => {
      const info = duplicateMap[idx]
      if (!info || (!info.tags?.length && !info.matches?.length)) return

      const tags = info.tags || []
      const classification = []
      const reasons = []

      if (tags.includes('missing_status')) classification.push('❌ Missing Status')
      if (tags.includes('batch_conflict')) classification.push('⚠ Student Info Conflict')
      if (tags.includes('exact_duplicate')) classification.push('❌ Exact Duplicate')
      if (tags.includes('disb_conflict')) classification.push('⚠ Disbursement Conflict')
      if (tags.includes('db_match')) classification.push('⚠ DB Match')

      ;(info.reasons || []).forEach(r => reasons.push(r.detail))

      const exportRow = { 'Row #': idx + 1 }
      STUDENT_INFO_KEYS.forEach(key => {
        exportRow[FIELD_EXPORT_LABELS[key] || key] = row[key] || ''
      })
      exportRow['Classification'] = classification.join(', ')
      exportRow['Conflict Reason'] = reasons.join('; ')

      flaggedRows.push(exportRow)
    })

    if (flaggedRows.length === 0) {
      message.info('No flagged records to export')
      return false
    }

    const ws = XLSX.utils.json_to_sheet(flaggedRows)
    const colWidths = Object.keys(flaggedRows[0]).map(k => ({
      wch: Math.max(k.length, ...flaggedRows.slice(0, 50).map(r => String(r[k] || '').length)) + 2
    }))
    ws['!cols'] = colWidths

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Flagged Records')
    XLSX.writeFile(wb, `bulk-import-flagged-${dayjs().format('YYYY-MM-DD-HHmmss')}.xlsx`)
    message.success(`Exported ${flaggedRows.length} flagged records to Excel`)
    hasExportedRef.current = true
    return true
  }, [data, duplicateMap])

  // --- Clear flagged rows: export Excel copy then remove them ---
  const handleClearFlagged = useCallback(() => {
    const exported = handleExportFlagged()
    if (!exported) return
    const flaggedIndices = new Set(
      Object.entries(duplicateMap)
        .filter(([, v]) => v.tags?.length > 0 || v.matches?.length > 0)
        .map(([k]) => Number(k))
    )
    if (flaggedIndices.size === 0) return
    setData(prev => {
      const filtered = prev.filter((_, idx) => !flaggedIndices.has(idx))
      return filtered.map((row, idx) => ({ ...row, seq: String(idx + 1) }))
    })
    setDuplicateMap({})
    setCurrentPage(1)
    message.success(`Removed ${flaggedIndices.size} flagged row${flaggedIndices.size > 1 ? 's' : ''}. Excel backup downloaded.`)
  }, [duplicateMap, handleExportFlagged])

  // Clear data and reset input
  const handleClear = () => {
    setData([])
    setDuplicateMap({})
    setNeedsValidation(false)
    setInputKey(Date.now())
    setCurrentPage(1)
    hasExportedRef.current = false
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

  // Pre-submit validation gate
  const handlePreSubmit = () => {
    if (data.length === 0) {
      message.warning('No data to submit')
      return
    }
    const c = validationCounts
    if (c.missingStatus > 0) {
      message.error(`${c.missingStatus} row(s) missing Scholarship Status. Fix or remove them first.`)
      return
    }
    if (c.conflict > 0) {
      message.error(`${c.conflict} row(s) have student info conflicts. Resolve or remove them first.`)
      return
    }
    if (c.exactDuplicate > 0) {
      message.error(`${c.exactDuplicate} exact duplicate(s) found. Export & remove them first.`)
      return
    }
    if (c.disbConflict > 0) {
      message.error(`${c.disbConflict} row(s) have disbursement conflicts. Resolve or remove them first.`)
      return
    }
    setShowConfirmModal(true)
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
    // Use dummy seq array since we don't have real ones yet — backend will handle this
    const dummySeqs = backendData.map((_, i) => `__pending_${i}__`)
    const allDisbursements = convertDisbursementsToBackend(data, academicYears, dummySeqs)
    // Tag each disbursement with its import index
    const taggedDisb = allDisbursements.map(d => {
      const idx = dummySeqs.indexOf(d.student_seq)
      return { ...d, _import_index: idx >= 0 ? idx : null, student_seq: undefined }
    })

    setLoading(true)
    setUploadProgress({ current: 0, total: 1, done: false, phase: 'Checking for duplicates...' })

    try {
      // --- Phase 0: Resolve check ---
      const resolveRes = await fetch(`${API_BASE}/students/resolve-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: backendData, disbursements: taggedDisb }),
      })

      if (!resolveRes.ok) {
        const errText = await resolveRes.text().catch(() => '')
        throw new Error(`Resolve check failed: ${errText || resolveRes.status}`)
      }

      const resolveData = await resolveRes.json()
      const { summary } = resolveData

      // If any duplicates found, go to resolution page
      if (summary.duplicate_count > 0) {
        setUploadProgress(null)
        setLoading(false)

        // Build clean disbursements (for newly created students)
        const cleanDisbursements = taggedDisb.filter(d => {
          const cleanIndices = new Set(resolveData.clean.map(c => c.import_index))
          return cleanIndices.has(d._import_index)
        })

        navigate('/students/bulk/resolve', {
          state: {
            resolveData,
            cleanDisbursements,
            rawData: data,
            academicYears,
          },
        })
        return
      }

      // --- All clean: proceed with direct import ---
      setUploadProgress({ current: 0, total: backendData.length, done: false, phase: 'Uploading students...' })

      const studentChunks = chunkArray(backendData, STUDENT_CHUNK_SIZE)
      const totalStudents = backendData.length
      const totalStudentChunks = studentChunks.length
      let uploaded = 0
      // --- Phase 1: Upload students in chunks ---
      const allCreatedStudents = []

      const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
      const bulkBatchId = crypto.randomUUID()
      const userHeaders = {
        'Content-Type': 'application/json',
        ...(storedUser?.id ? { 'X-User-Id': String(storedUser.id) } : {}),
        'X-Bulk-Batch': bulkBatchId,
      }

      for (let i = 0; i < totalStudentChunks; i++) {
        const chunk = studentChunks[i]
        setUploadProgress({ current: uploaded, total: totalStudents, done: false, phase: `Uploading students... (${i + 1}/${totalStudentChunks})` })

        const response = await fetch(`${API_BASE}/students/import`, {
          method: 'POST',
          headers: userHeaders,
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
        setUploadProgress({ current: uploaded, total: totalStudents, done: false, phase: `Uploading students... (${i + 1}/${totalStudentChunks})` })
      }

      // --- Phase 2: Upload disbursements in chunks ---
      const studentSeqByIndex = allCreatedStudents.map((s) => s.seq)
      const backendDisbursements = convertDisbursementsToBackend(data, academicYears, studentSeqByIndex)

      if (backendDisbursements.length > 0) {
        const disbChunks = chunkArray(backendDisbursements, DISBURSEMENT_CHUNK_SIZE)
        const totalDisbursements = backendDisbursements.length
        const totalDisbChunks = disbChunks.length
        const grandTotal = totalStudents + totalDisbursements

        let totalDisbInserted = 0

        for (let i = 0; i < totalDisbChunks; i++) {
          const chunk = disbChunks[i]
          setUploadProgress({ current: uploaded, total: grandTotal, done: false, phase: `Uploading disbursements... (${i + 1}/${totalDisbChunks})` })

          try {
            const disbResponse = await fetch(`${API_BASE}/disbursements/bulk`, {
              method: 'POST',
              headers: userHeaders,
              body: JSON.stringify({ disbursements: chunk }),
            })
            const disbJson = await disbResponse.json().catch(() => null)
            if (!disbResponse.ok) {
              console.warn(`Disbursement batch ${i + 1} failed:`, disbJson)
              message.warning(`Disbursement batch ${i + 1} had errors`)
            } else {
              totalDisbInserted += disbJson?.created_count || 0
              if (disbJson?.error_count > 0) {
                console.warn(`Disbursement batch ${i + 1} partial errors:`, disbJson.errors)
              }
            }
          } catch (err) {
            console.error(`Disbursement batch ${i + 1} error:`, err)
          }
          uploaded += chunk.length
          setUploadProgress({ current: uploaded, total: grandTotal, done: false, phase: `Uploading disbursements... (${i + 1}/${totalDisbChunks})` })
        }

        console.log(`[DISB] Total disbursements inserted: ${totalDisbInserted}`)
      } else {
        console.warn('[DISB] No disbursements generated from data')
      }

      setUploadProgress(prev => ({ ...prev, phase: 'Updating scholarship slots...' }))
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
          onChange={(date, dateString) => handleCellEdit(rowIndex, field.key, dateString)}
          size="small"
          className="w-full"
          format="YYYY-MM-DD"
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

            {/* Academic Year Input — uncontrolled to avoid re-rendering the table */}
            <input
              ref={ayInputRef}
              placeholder="e.g. 2024-2025"
              defaultValue=""
              maxLength={9}
              onInput={(e) => { e.target.value = e.target.value.replace(/[^\d-]/g, '') }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                const val = ayInputRef.current?.value || ''
                const result = parseAcademicYearInput(val)
                if (!result.valid) { message.warning(result.error); return }
                const merged = mergeAcademicYears(academicYears, result.labels)
                const addedCount = merged.length - academicYears.length
                if (addedCount === 0) { message.info('AY already added') }
                else { message.success(`Added ${addedCount} AY`); setAcademicYears(merged) }
                ayInputRef.current.value = ''
              }}
              style={{
                width: 130, height: 24, padding: '0 8px',
                border: '1px solid #d9d9d9', borderRadius: 4, fontSize: 13,
                outline: 'none',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#40a9ff' }}
              onBlur={(e) => { e.target.style.borderColor = '#d9d9d9' }}
            />
            <Button
              size="small"
              type="primary"
              onClick={() => {
                const val = ayInputRef.current?.value || ''
                const result = parseAcademicYearInput(val)
                if (!result.valid) { message.warning(result.error); return }
                const merged = mergeAcademicYears(academicYears, result.labels)
                const addedCount = merged.length - academicYears.length
                if (addedCount === 0) { message.info('AY already added') }
                else { message.success(`Added ${addedCount} AY`); setAcademicYears(merged) }
                ayInputRef.current.value = ''
              }}
            >
              Add AY
            </Button>
          </div>

          {/* Right: Actions */}
          {data.length > 0 && (
            <Space wrap>
              {duplicateChecking && (
                <Tag color="processing">Validating...</Tag>
              )}
              {needsValidation && !duplicateChecking && (
                <Tag color="warning" icon={<ExclamationCircleOutlined />}>Needs Validation</Tag>
              )}
              {!duplicateChecking && data.length > 0 && (
                <>
                  <Tag color="green" icon={<CheckCircleOutlined />}>
                    {validationCounts.valid} Valid
                  </Tag>
                  {validationCounts.missingStatus > 0 && (
                    <Tag color="red" icon={<StopOutlined />}>
                      {validationCounts.missingStatus} Missing Status
                    </Tag>
                  )}
                  {validationCounts.conflict > 0 && (
                    <Tag color="volcano" icon={<WarningOutlined />}>
                      {validationCounts.conflict} Conflict
                    </Tag>
                  )}
                  {validationCounts.exactDuplicate > 0 && (
                    <Tag color="red" icon={<ExclamationCircleOutlined />}>
                      {validationCounts.exactDuplicate} Duplicate
                    </Tag>
                  )}
                  {validationCounts.disbConflict > 0 && (
                    <Tag color="orange" icon={<WarningOutlined />}>
                      {validationCounts.disbConflict} Disb. Conflict
                    </Tag>
                  )}
                  {validationCounts.dbMatch > 0 && (
                    <Tag color="purple" icon={<WarningOutlined />}>
                      {validationCounts.dbMatch} DB Match
                    </Tag>
                  )}
                </>
              )}
              {!duplicateChecking && validationCounts.flagged > 0 && (
                <Popconfirm
                  title="Clear flagged records?"
                  description="An Excel backup will be downloaded first. Flagged rows will then be removed."
                  onConfirm={handleClearFlagged}
                  okText="Download & Remove"
                  cancelText="Cancel"
                >
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                  >
                    Clear Flagged ({validationCounts.flagged})
                  </Button>
                </Popconfirm>
              )}
              <Text type="secondary">{data.length} records</Text>
              {needsValidation && !duplicateChecking && (
                <Button
                  type="primary"
                  ghost
                  icon={<ExclamationCircleOutlined />}
                  onClick={() => validateData(data)}
                  size="small"
                  style={{ borderColor: '#fa8c16', color: '#fa8c16' }}
                >
                  Validate
                </Button>
              )}
              <Button
                type="primary"
                icon={validationCounts.flagged > 0 ? <WarningOutlined /> : <SendOutlined />}
                onClick={handlePreSubmit}
                loading={loading}
                disabled={needsValidation || duplicateChecking || validationCounts.missingStatus > 0 || validationCounts.conflict > 0 || validationCounts.exactDuplicate > 0 || validationCounts.disbConflict > 0}
              >
                {needsValidation ? 'Validate First' : validationCounts.flagged > 0 ? 'Fix Issues First' : 'Submit All'}
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
              type={needsValidation ? 'primary' : 'default'}
              icon={<ExclamationCircleOutlined />}
              onClick={() => validateData(data)}
              loading={duplicateChecking}
            >
              {needsValidation ? 'Validate Now' : 'Re-validate'}
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
                const tags = dupInfo?.tags || []
                const hasMissingStatus = tags.includes('missing_status')
                const hasConflict = tags.includes('batch_conflict')
                const hasExactDup = tags.includes('exact_duplicate')
                const hasDisbConflict = tags.includes('disb_conflict')
                const hasDbMatch = tags.includes('db_match')
                const hasAnyIssue = tags.length > 0
                const alt = paginatedIndex % 2 === 0
                const rowBg = (hasExactDup || hasConflict)
                  ? (alt ? '#fff1f0' : '#ffe7e6')
                  : hasMissingStatus
                    ? (alt ? '#fff1f0' : '#ffe7e6')
                    : hasDisbConflict
                      ? (alt ? '#fff7e6' : '#fff2d6')
                      : hasDbMatch
                        ? (alt ? '#f9f0ff' : '#f0e5ff')
                        : (alt ? 'white' : '#fafafa')
                const borderColor = (hasExactDup || hasConflict) ? '#ff4d4f'
                  : hasMissingStatus ? '#ff7875'
                  : hasDisbConflict ? '#fa8c16'
                  : hasDbMatch ? '#722ed1' : 'transparent'
                return (
                  <tr
                    key={actualRowIndex}
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
                          whiteSpace: 'normal'
                        }}
                      >
                        {field.key === 'seq' ? (
                          <div style={{ 
                            padding: '4px 6px',
                            textAlign: 'center',
                            fontSize: '13px',
                            fontWeight: 500,
                            background: (hasExactDup || hasConflict) ? '#ffccc7' : hasMissingStatus ? '#ffccc7' : hasDisbConflict ? '#fff1b8' : hasDbMatch ? '#efdbff' : '#f5f5f5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4
                          }}>
                            {hasAnyIssue && (
                              <Popover
                                title={
                                  <span style={{ color: (hasExactDup || hasConflict) ? '#cf1322' : hasMissingStatus ? '#cf1322' : hasDisbConflict ? '#d46b08' : '#531dab' }}>
                                    <ExclamationCircleOutlined style={{ marginRight: 6 }} />
                                    {hasExactDup ? 'Exact Duplicate'
                                      : hasConflict ? 'Student Info Conflict'
                                      : hasDisbConflict ? 'Disbursement Conflict'
                                      : hasMissingStatus ? 'Missing Required Field'
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
                                            r.type === 'missing_status' ? 'red' :
                                            r.type === 'batch_conflict' ? 'volcano' :
                                            r.type === 'exact_duplicate' ? 'red' :
                                            r.type === 'disb_conflict' ? 'orange' :
                                            r.type === 'db_match' ? 'purple' : 'default'
                                          }
                                          style={{ marginBottom: 4, fontSize: 11 }}
                                        >
                                          {r.type === 'missing_status' ? '❌ Missing Status' :
                                           r.type === 'batch_conflict' ? '⚠ Info Conflict' :
                                           r.type === 'exact_duplicate' ? '❌ Exact Duplicate' :
                                           r.type === 'disb_conflict' ? '⚠ Disb. Conflict' :
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
                                <WarningOutlined style={{ color: (hasExactDup || hasConflict) ? '#ff4d4f' : hasMissingStatus ? '#ff7875' : hasDisbConflict ? '#fa8c16' : '#722ed1', cursor: 'pointer', fontSize: 14 }} />
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
                        background: rowBg
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
              {uploadProgress.done ? 'Done!' : (uploadProgress.phase || 'Uploading records...')}
            </Text>
            <Progress
              percent={uploadProgress.total > 0 ? Math.round((uploadProgress.current / uploadProgress.total) * 100) : 0}
              status={uploadProgress.done ? 'success' : 'active'}
              style={{ marginTop: 16 }}
            />
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

          {validationCounts.dbMatch > 0 && (
            <div style={{ background: '#f9f0ff', border: '1px solid #d3adf7', borderRadius: 6, padding: '12px 16px', marginBottom: 12 }}>
              <Text style={{ fontSize: 13, color: '#531dab' }}>
                <WarningOutlined style={{ marginRight: 6 }} />
                <strong>{validationCounts.dbMatch}</strong> record{validationCounts.dbMatch !== 1 ? 's' : ''} match existing DB records — you will be redirected to the resolve page for these.
              </Text>
            </div>
          )}

          <Divider style={{ margin: '16px 0 12px' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            This action cannot be undone after confirmation.
          </Text>
        </div>
      </Modal>
    </div>
  )
}
