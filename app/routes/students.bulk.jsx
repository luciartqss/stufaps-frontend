import { useState, useRef, useMemo } from 'react'
import { Typography, message, Button, Card, Space, Input, Select, DatePicker } from 'antd'
import { UploadOutlined, ExportOutlined, SendOutlined, CloseOutlined, InboxOutlined, PlusOutlined } from '@ant-design/icons'
import * as XLSX from 'xlsx'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// Column schema describing headers and order (frontend display)
const COLUMN_SCHEMA = [
  { key: 'seq', label: 'SEQ', rowSpan: 2, width: 60 },
  { key: 'inCharge', label: 'IN-CHARGE', rowSpan: 2, width: 120 },
  { key: 'awardYear', label: 'AWARD YEAR', rowSpan: 2, width: 100 },
  { key: 'scholarshipProgram', label: 'SCHOLARSHIP PROGRAM', rowSpan: 2, width: 180 },
  { key: 'awardNumber', label: 'AWARD NUMBER', rowSpan: 2, width: 140 },
  {
    label: 'NAME OF GRANTEE',
    colSpan: 4,
    children: [
      { key: 'surname', label: 'SURNAME', width: 140 },
      { key: 'firstName', label: 'FIRST NAME', width: 140 },
      { key: 'middleName', label: 'MIDDLE NAME', width: 140 },
      { key: 'extension', label: 'EXT', width: 60 },
    ],
  },
  { key: 'sex', label: 'SEX', rowSpan: 2, width: 80, type: 'select', options: ['Male', 'Female'] },
  { key: 'dateOfBirth', label: 'DATE OF BIRTH', rowSpan: 2, width: 120, type: 'date' },
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
      { key: 'streetBrgy', label: 'STREET/BRGY', width: 180 },
      { key: 'municipalityCity', label: 'MUNICIPALITY/CITY', width: 160 },
      { key: 'province', label: 'PROVINCE', width: 140 },
      { key: 'congressionalDistrict', label: 'CONG. DISTRICT', width: 130 },
      { key: 'zipCode', label: 'ZIP CODE', width: 80 },
    ],
  },
  { key: 'specialGroup', label: 'SPECIAL GROUP', rowSpan: 2, width: 120, type: 'select', options: ['IP', 'PWD', 'Solo Parent', ''] },
  { key: 'certificationNumber', label: 'CERT. NUMBER', rowSpan: 2, width: 140 },
  { key: 'nameOfInstitution', label: 'NAME OF INSTITUTION', rowSpan: 2, width: 220 },
  { key: 'uii', label: 'UII', rowSpan: 2, width: 100 },
  { key: 'institutionalType', label: 'INST. TYPE', rowSpan: 2, width: 120 },
  { key: 'regionSchoolLocated', label: 'REGION', rowSpan: 2, width: 100 },
  { key: 'degreeProgram', label: 'DEGREE PROGRAM', rowSpan: 2, width: 180 },
  { key: 'programMajor', label: 'PROGRAM MAJOR', rowSpan: 2, width: 160 },
  { key: 'programDiscipline', label: 'PROGRAM DISCIPLINE', rowSpan: 2, width: 160 },
  { key: 'programDegreeLevel', label: 'DEGREE LEVEL', rowSpan: 2, width: 140, type: 'select', options: ['Pre-baccalaureate', 'Baccalaureate', 'Post Baccalaureate', 'Masters', 'Doctorate', ''] },
  {
    label: 'GOVERNMENT AUTHORITY',
    colSpan: 3,
    children: [
      { key: 'authorityType', label: 'AUTH TYPE', width: 100, type: 'select', options: ['GP', 'GR', 'RRPA', 'COPC', ''] },
      { key: 'authorityNumber', label: 'AUTH NUMBER', width: 120 },
      { key: 'series', label: 'SERIES', width: 80 },
    ],
  },
  {
    label: 'PRIORITY PROGRAM',
    colSpan: 2,
    children: [
      { key: 'priority', label: 'PRIORITY', width: 100, type: 'select', options: ['Yes', 'No', ''] },
      { key: 'basisCmo', label: 'BASIS (CMO)', width: 120 },
    ],
  },
  { key: 'scholarshipStatus', label: 'STATUS', rowSpan: 2, width: 120, type: 'select', options: ['On-going', 'Graduated', 'Terminated', ''] },
  {
    label: 'REMARKS',
    colSpan: 2,
    children: [
      { key: 'replacement', label: 'REPLACEMENT', width: 140 },
      { key: 'reason', label: 'REASON', width: 180 },
    ],
  },
]

// Flattened ordered fields for data mapping
const ALL_FIELDS = COLUMN_SCHEMA.flatMap(col =>
  col.children ? col.children.map(c => ({ ...c })) : [{ ...col }]
)

// Get field config by key
const getFieldConfig = (key) => ALL_FIELDS.find(f => f.key === key) || {}

// Get total column count
const TOTAL_COLUMNS = ALL_FIELDS.length

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

export default function ImportBulk() {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [inputKey, setInputKey] = useState(Date.now())
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)

  // Normalize parsed rows to include all fields in order
  const normalizeRows = (rows) =>
    rows.map((row, idx) => {
      const normalized = {}
      ALL_FIELDS.forEach((field) => {
        const matchingKey =
          Object.keys(row).find(k => k.toLowerCase().replace(/[_\s]/g, '') === field.key.toLowerCase().replace(/[_\s]/g, '')) || field.key
        normalized[field.key] = row[matchingKey] ?? ''
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
        const normalized = normalizeRows(parsedData)
        setData(normalized)
        message.success(`File ${file.name} loaded - ${normalized.length} records`)
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
    ALL_FIELDS.forEach(field => {
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
    const ws = XLSX.utils.json_to_sheet(data, { header: ALL_FIELDS.map(f => f.key) })
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

    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/students/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: backendData }),
      })

      if (!response.ok) throw new Error('Failed to import students')

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

  // Build header rows
  const subHeaders = useMemo(() => {
    return COLUMN_SCHEMA.flatMap(col => col.children ? col.children : [])
  }, [])

  // Render cell input based on field type
  const renderCellInput = (row, rowIndex, field) => {
    const config = getFieldConfig(field.key)
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
  const totalTableWidth = ALL_FIELDS.reduce((sum, field) => sum + (field.width || 120), 0) + 60 // +60 for actions column

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
                Bulk Student Import
              </Title>
              <Text type="secondary" className="text-base">
                Upload an Excel file or manually add student records
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
                Student Data
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
                {/* Row 1: Main headers */}
                <tr className="bg-gradient-to-r from-cyan-800 to-cyan-700">
                  {COLUMN_SCHEMA.map((col, idx) =>
                    col.children ? (
                      <th
                        key={idx}
                        colSpan={col.colSpan}
                        className="border border-cyan-600 px-3 py-4 text-center font-bold text-white text-sm tracking-wide uppercase"
                      >
                        {col.label}
                      </th>
                    ) : (
                      <th
                        key={idx}
                        rowSpan={2}
                        className="border border-cyan-600 px-3 py-4 text-center font-bold text-white text-sm whitespace-nowrap tracking-wide uppercase"
                        style={{ minWidth: col.width }}
                      >
                        {col.label}
                      </th>
                    )
                  )}
                  <th
                    rowSpan={2}
                    className="border border-cyan-600 px-3 py-4 text-center font-bold text-white text-sm tracking-wide uppercase sticky right-0 bg-cyan-800"
                    style={{ minWidth: 60 }}
                  >
                    #
                  </th>
                </tr>
                {/* Row 2: Sub-headers */}
                <tr className="bg-gradient-to-r from-cyan-700 to-cyan-600">
                  {subHeaders.map((col, idx) => (
                    <th
                      key={idx}
                      className="border border-cyan-500 px-3 py-3 text-center font-semibold text-cyan-50 text-xs whitespace-nowrap uppercase"
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
                      colSpan={TOTAL_COLUMNS + 1}
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
                      {ALL_FIELDS.map((field) => (
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
