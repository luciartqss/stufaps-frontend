import { useState, useRef, useMemo, useEffect } from 'react'
import { Typography, message, Button, Card, Space, Input, Select, DatePicker, Tag } from 'antd'
import { UploadOutlined, ExportOutlined, SendOutlined, CloseOutlined, InboxOutlined, PlusOutlined } from '@ant-design/icons'
import * as XLSX from 'xlsx'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// Semester detail fields (shared for First/Second)
const SEM_FIELDS = [
  { key: 'nta', label: 'NTA', width: 120 },
  { key: 'fundSource', label: 'FUND SOURCE', width: 140 },
  { key: 'amount', label: 'AMOUNT', width: 120 },
  { key: 'voucherNumber', label: 'VOUCHER NUMBER', width: 150 },
  { key: 'modeOfPayment', label: 'MODE OF PAYMENT', width: 150, type: 'select', options: ['ATM', 'Cheque', 'Through the HEI', ''] },
  { key: 'accountCheckNo', label: 'ACCOUNT/CHECK NO.', width: 160 },
  { key: 'paymentAmount', label: 'PAYMENT AMOUNT', width: 140 },
  { key: 'lddapNumber', label: 'LDDAP NUMBER', width: 140 },
  { key: 'disbursementDate', label: 'DISBURSEMENT DATE', width: 140, type: 'date' },
  { key: 'remarks', label: 'REMARKS', width: 160 },
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

// Static student schema (2-tier max)
const STATIC_SCHEMA = [
  { key: 'seq', label: 'SEQ', rowSpan: 3, width: 60 },
  { key: 'inCharge', label: 'IN-CHARGE', rowSpan: 3, width: 120 },
  { key: 'awardYear', label: 'AWARD YEAR', rowSpan: 3, width: 100 },
  { key: 'scholarshipProgram', label: 'SCHOLARSHIP PROGRAM', rowSpan: 3, width: 180 },
  { key: 'awardNumber', label: 'AWARD NUMBER', rowSpan: 3, width: 140 },
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

    row2.push({ label: 'CURRICULUM YEAR LEVEL', key: cylKey, rowSpan: 2, width: 160, type: 'select', options: ['I', 'II', 'III', 'IV', 'V', 'VI', ''] })
    row2.push({ label: 'FIRST SEMESTER', colSpan: semFirst.length, ayId, semester: 'First' })
    row2.push({ label: 'SECOND SEMESTER', colSpan: semSecond.length, ayId, semester: 'Second' })

    semFirst.forEach(f => row3.push(f))
    semSecond.forEach(f => row3.push(f))

    leafFields.push({ key: cylKey, label: `CYL (${ay.label})`, ayId, width: 160 })
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

const convertDisbursementsToBackend = (rows, academicYears) => {
  const semMap = {
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

  const disbursements = []

  rows.forEach((row) => {
    academicYears.forEach((ay) => {
      const cylKey = `${ay.id}__cyl`
      const cyl = row[cylKey]

      ['first', 'second'].forEach((semKey, idx) => {
        const semesterLabel = idx === 0 ? 'First' : 'Second'
        const base = `${ay.id}__${semKey}__`

        const payload = {
          student_seq: row.seq,
          academic_year: ay.label,
          semester: semesterLabel,
          curriculum_year_level: cyl || '',
        }

        let hasData = false
        Object.entries(semMap).forEach(([k, backendK]) => {
          const val = row[`${base}${k}`]
          if (val !== '' && val !== null && val !== undefined) {
            hasData = true
            if (['amount', 'payment_amount'].includes(backendK)) {
              const num = Number(String(val).replace(/,/g, ''))
              payload[backendK] = Number.isFinite(num) ? num : val
            } else if (backendK === 'semester') {
              const sem = String(val).toLowerCase()
              payload[backendK] = sem.startsWith('1') ? 'First' : sem.startsWith('2') ? 'Second' : val
            } else {
              payload[backendK] = val
            }
          }
        })

        if (hasData) disbursements.push(payload)
      })
    })
  })

  return disbursements
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

  const { row1: headerRow1, row2: headerRow2, row3: headerRow3, leafFields } = useMemo(
    () => buildHeaders(academicYears),
    [academicYears]
  )

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
        const parsedData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
        const detectedAyLabels = extractAyLabelsFromRows(parsedData)
        const mergedAys = mergeAcademicYears(academicYears, detectedAyLabels)
        const { leafFields: nextLeafFields } = buildHeaders(mergedAys)
        const normalized = normalizeRows(parsedData, nextLeafFields)

        setAcademicYears(mergedAys)
        setData(normalized)

        const ayNote = detectedAyLabels.length > 0 ? ` | AY detected: ${detectedAyLabels.join(', ')}` : ''
        message.success(`File ${file.name} loaded - ${normalized.length} records${ayNote}`)
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
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Export current grid to XLSX
  const handleExport = () => {
    if (data.length === 0) {
      message.info('No data to export')
      return
    }
    const ws = XLSX.utils.json_to_sheet(data, { header: leafFields.map(f => f.key) })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Students')
    XLSX.writeFile(wb, 'students-export.xlsx')
    message.success('Exported students-export.xlsx')
  }

  // Submit data
  const handleSubmitData = async () => {
    if (data.length === 0) {
      message.warning('No data to submit')
      return
    }

    const backendData = convertToBackendFormat(data)
  const backendDisbursements = convertDisbursementsToBackend(data, academicYears)

    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/students/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: backendData }),
      })

      if (!response.ok) throw new Error('Failed to import students')

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
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-6">
      <div className="max-w-full mx-auto">
        {/* Upload Section */}
        <Card
          className="shadow-xl rounded-2xl mb-6 border-0"
          bodyStyle={{ padding: '24px 32px' }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <Title level={2} className="!mb-1 !text-slate-800 flex items-center gap-3">
                <UploadOutlined className="text-cyan-600" />
                Bulk Student & Disbursement Import
              </Title>
              <Text type="secondary" className="text-base">
                Upload one continuous Excel sheet or manually add combined records
              </Text>
            </div>

            <div className="flex flex-wrap gap-3">
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
                  size="large"
                  className="!bg-cyan-600 !text-white hover:!bg-cyan-700 !border-0"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload Excel
                </Button>
              </label>

              <Button
                icon={<PlusOutlined />}
                size="large"
                onClick={handleAddRow}
                className="!bg-emerald-600 !text-white hover:!bg-emerald-700 !border-0"
              >
                Add Row
              </Button>
            </div>
          </div>
        </Card>

        {/* Academic Year Blocks */}
        <Card className="shadow-md rounded-xl mb-6 border-0" bodyStyle={{ padding: '16px 24px' }}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <Text strong className="text-base text-slate-700">Academic Year Sections</Text>
              <div className="text-slate-500 text-sm">Add/remove AY blocks; each includes First/Second semester disbursement fields.</div>
            </div>
            <Space wrap>
              <Input
                placeholder="e.g. 2024-2025"
                value={ayInput}
                onChange={(e) => setAyInput(e.target.value)}
                style={{ width: 180 }}
              />
              <Button
                icon={<PlusOutlined />}
                type="primary"
                onClick={() => {
                  const labels = expandAcademicYearInput(ayInput)
                  if (labels.length === 0) return

                  const merged = mergeAcademicYears(academicYears, labels)
                  const addedCount = merged.length - academicYears.length
                  if (addedCount === 0) {
                    message.info('AY already added')
                  } else {
                    message.success(`Added ${addedCount} AY block${addedCount > 1 ? 's' : ''}`)
                    setAcademicYears(merged)
                  }
                  setAyInput('')
                }}
              >
                Add AY
              </Button>
            </Space>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {academicYears.map((ay, idx) => (
              <Tag key={ay.id} color={idx % 2 === 0 ? 'blue' : 'cyan'} closable onClose={() => setAcademicYears(prev => sortAcademicYears(prev.filter(p => p.id !== ay.id)))}>
                AY {ay.label}
              </Tag>
            ))}
          </div>
        </Card>

        {/* Action Buttons */}
        {data.length > 0 && (
          <Card className="shadow-xl rounded-2xl mb-6 border-0" bodyStyle={{ padding: '16px 32px' }}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Text strong className="text-lg text-slate-700">
                {data.length} record{data.length > 1 ? 's' : ''} loaded
              </Text>
              <Space size="middle" wrap>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSubmitData}
                  loading={loading}
                  size="large"
                  className="!bg-blue-600 hover:!bg-blue-700 !shadow-lg"
                >
                  Submit All
                </Button>
                <Button
                  icon={<ExportOutlined />}
                  onClick={handleExport}
                  size="large"
                  className="!bg-emerald-600 !text-white hover:!bg-emerald-700 !border-0"
                >
                  Export
                </Button>
                <Button
                  danger
                  icon={<CloseOutlined />}
                  onClick={handleClear}
                  disabled={loading}
                  size="large"
                >
                  Clear All
                </Button>
              </Space>
            </div>
          </Card>
        )}

        {/* Data Table */}
        <Card
          className="shadow-xl rounded-2xl border-0"
          bodyStyle={{ padding: 0 }}
        >
          <div className="p-4 border-b border-slate-200 bg-slate-50 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <Text strong className="text-lg text-slate-700">
                Student & Disbursement Data
              </Text>
              <Text type="secondary">
                ← Scroll horizontally to view all columns →
              </Text>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table
              className="border-collapse"
              style={{ minWidth: `${totalTableWidth}px` }}
            >
              <thead>
                <tr className="bg-gradient-to-r from-cyan-800 to-cyan-700">
                  {headerRow1.map((col, idx) => (
                    <th
                      key={idx}
                      colSpan={col.colSpan || 1}
                      rowSpan={col.rowSpan || 1}
                      className="border border-cyan-600 px-3 py-4 text-center font-bold text-white text-sm tracking-wide uppercase whitespace-nowrap"
                      style={{ minWidth: col.width }}
                    >
                      {col.label}
                    </th>
                  ))}
                  <th
                    rowSpan={3}
                    className="border border-cyan-600 px-3 py-4 text-center font-bold text-white text-sm tracking-wide uppercase sticky right-0 bg-cyan-800"
                    style={{ minWidth: 60 }}
                  >
                    #
                  </th>
                </tr>
                <tr className="bg-gradient-to-r from-cyan-700 to-cyan-600">
                  {headerRow2.map((col, idx) => (
                    <th
                      key={idx}
                      colSpan={col.colSpan || 1}
                      rowSpan={col.rowSpan || 1}
                      className="border border-cyan-500 px-3 py-3 text-center font-semibold text-cyan-50 text-xs whitespace-nowrap uppercase"
                      style={{ minWidth: col.width }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
                <tr className="bg-gradient-to-r from-cyan-600 to-cyan-500">
                  {headerRow3.map((col, idx) => (
                    <th
                      key={idx}
                      className="border border-cyan-400 px-3 py-3 text-center font-semibold text-white text-xs whitespace-nowrap uppercase"
                      style={{ minWidth: col.width }}
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
                      className="border border-slate-200 px-4 py-16 text-center text-slate-400"
                      colSpan={leafFields.length + 1}
                    >
                      <InboxOutlined className="text-6xl mb-4 block" />
                      <div className="text-lg font-medium mb-2">No Data Loaded</div>
                      <div>Upload an Excel file or click "Add Row" to get started</div>
                    </td>
                  </tr>
                ) : (
                  data.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className={`
                        ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                        hover:bg-blue-50 transition-colors duration-100
                      `}
                    >
                      {leafFields.map((field) => (
                        <td
                          key={field.key}
                          className="border border-slate-200 p-0"
                          style={{ minWidth: field.width, maxWidth: field.width }}
                        >
                          {field.key === 'seq' ? (
                            <div className="px-3 py-2 text-center text-slate-600 font-medium bg-slate-100">
                              {row.seq}
                            </div>
                          ) : (
                            <div className="px-1 py-1">
                              {renderCellInput(row, rowIndex, field)}
                            </div>
                          )}
                        </td>
                      ))}
                      <td
                        className="border border-slate-200 p-2 text-center sticky right-0 bg-white"
                        style={{ minWidth: 60 }}
                      >
                        <Button
                          type="text"
                          danger
                          size="small"
                          onClick={() => handleDeleteRow(rowIndex)}
                          className="!px-2"
                        >
                          ✕
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </div>
  )
}
