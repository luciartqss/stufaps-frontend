import { useState, useRef, useMemo } from 'react'
import { Typography, message, Button, Upload, Card, Space, Table, Input } from 'antd'
import { UploadOutlined, ExportOutlined, SendOutlined, CloseOutlined, InboxOutlined } from '@ant-design/icons'
import * as XLSX from 'xlsx'
import { useNavigate } from 'react-router-dom'

const { Title, Text } = Typography
const { Dragger } = Upload

// Column schema describing headers and order
const COLUMN_SCHEMA = [
  { key: 'seq', label: 'SEQ', rowSpan: 2 },
  { key: 'inCharge', label: 'IN-CHARGE', rowSpan: 2 },
  { key: 'awardYear', label: 'AWARD YEAR', rowSpan: 2 },
  { key: 'scholarshipProgram', label: 'SCHOLARSHIP PROGRAM', rowSpan: 2 },
  { key: 'awardNumber', label: 'AWARD NUMBER', rowSpan: 2 },
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
  { key: 'sex', label: 'SEX', rowSpan: 2 },
  { key: 'dateOfBirth', label: 'DATE OF BIRTH', rowSpan: 2 },
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
  { key: 'specialGroup', label: 'SPECIAL GROUP', rowSpan: 2 },
  { key: 'certificationNumber', label: 'CERTIFICATION NUMBER (If Applicable)', rowSpan: 2 },
  { key: 'nameOfInstitution', label: 'NAME OF INSTITUTION', rowSpan: 2 },
  { key: 'uii', label: 'UII', rowSpan: 2 },
  { key: 'institutionalType', label: 'INSTITUTIONAL TYPE', rowSpan: 2 },
  { key: 'regionSchoolLocated', label: 'REGION WHERE THE SCHOOL IS LOCATED', rowSpan: 2 },
  { key: 'degreeProgram', label: 'DEGREE PROGRAM', rowSpan: 2 },
  { key: 'programMajor', label: 'PROGRAM MAJOR', rowSpan: 2 },
  { key: 'programDiscipline', label: 'PROGRAM DISCIPLINE', rowSpan: 2 },
  { key: 'programDegreeLevel', label: 'PROGRAM DEGREE LEVEL', rowSpan: 2 },
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
  { key: 'scholarshipStatus', label: 'SCHOLARSHIP STATUS', rowSpan: 2 },
  {
    label: 'REMARKS',
    colSpan: 2,
    children: [
      { key: 'replacement', label: 'REPLACEMENT' },
      { key: 'reason', label: 'REASON' },
    ],
  },
]

// Flattened ordered fields for data mapping
const ALL_FIELDS = COLUMN_SCHEMA.flatMap(col => 
  col.children ? col.children.map(c => c.key) : [col.key]
)

// Get total column count
const TOTAL_COLUMNS = ALL_FIELDS.length

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
        // Try to map case-insensitively from uploaded headers
        const matchingKey =
          Object.keys(row).find(k => k.toLowerCase().replace(/[_\s]/g, '') === field.toLowerCase().replace(/[_\s]/g, '')) || field
        normalized[field] = row[matchingKey] ?? ''
      })
      // Preserve SEQ if present, otherwise auto-number
      if (!normalized.seq) normalized.seq = String(idx + 1)
      return normalized
    })

  // Handle file upload
  const handleFileUpload = (file) => {
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
    return false // Prevent auto upload
  }

  // Handle cell edit
  const handleCellEdit = (rowIndex, field, newValue) => {
    setData(prev => {
      const updated = [...prev]
      updated[rowIndex] = { ...updated[rowIndex], [field]: newValue }
      return updated
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
    const ws = XLSX.utils.json_to_sheet(data, { header: ALL_FIELDS })
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

    // Clean the data before sending (remove empty values)
    const cleanedData = data.map(row => {
      const cleanedRow = {}
      Object.entries(row).forEach(([key, value]) => {
        if (value !== '') cleanedRow[key] = value
      })
      return cleanedRow
    })

    setLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/students/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: cleanedData }),
      })

      if (!response.ok) throw new Error('Failed to import students')

      const slotResponse = await fetch('http://localhost:8000/api/scholarship_programs/update-slots', {
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

  // Build header rows - Row 1: merged headers + rowSpan headers, Row 2: sub-headers only
  const subHeaders = useMemo(() => {
    return COLUMN_SCHEMA.flatMap(col => col.children ? col.children : [])
  }, [])

  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.xlsx,.xls,.xlsm,.xlsb,.csv',
    beforeUpload: handleFileUpload,
    showUploadList: false,
    key: inputKey,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-full mx-auto">
        <Card 
          className="shadow-lg rounded-xl mb-6"
          bordered={false}
        >
          <div className="mb-6">
            <Title level={2} className="!mb-2 !text-cyan-900">
              <UploadOutlined className="mr-3" />
              Bulk Student Import
            </Title>
            <Text type="secondary" className="text-base">
              Upload an Excel file to import multiple student records at once
            </Text>
          </div>

          <Dragger {...uploadProps} className="!bg-gradient-to-br !from-cyan-50 !to-blue-50 !border-2 !border-dashed !border-cyan-300 hover:!border-cyan-500 !rounded-lg">
            <p className="ant-upload-drag-icon">
              <InboxOutlined className="!text-cyan-600" style={{ fontSize: '48px' }} />
            </p>
            <p className="ant-upload-text text-lg font-semibold text-cyan-900">
              Click or drag file to this area to upload
            </p>
            <p className="ant-upload-hint text-gray-600">
              Support for Excel files (.xlsx, .xls, .xlsm, .xlsb) or CSV files
            </p>
          </Dragger>

          {data.length > 0 && (
            <div className="mt-6">
              <Space size="middle" wrap>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSubmitData}
                  loading={loading}
                  size="large"
                  className="!bg-blue-600 hover:!bg-blue-700"
                >
                  Submit {data.length} Record{data.length > 1 ? 's' : ''}
                </Button>
                <Button
                  icon={<ExportOutlined />}
                  onClick={handleExport}
                  size="large"
                  className="!bg-emerald-600 !text-white hover:!bg-emerald-700"
                >
                  Export to Excel
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
          )}
        </Card>

        {data.length > 0 && (
          <Card 
            className="shadow-lg rounded-xl"
            bordered={false}
            title={
              <div className="flex items-center justify-between">
                <Text strong className="text-lg text-cyan-900">
                  Preview & Edit Data ({data.length} records)
                </Text>
                <Text type="secondary">
                  Scroll horizontally to view all columns
                </Text>
              </div>
            }
          >
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="border-collapse w-full text-xs" style={{ minWidth: '3500px' }}>
                <thead>
                  {/* Row 1: Main headers (merged for groups, rowSpan=2 for singles) */}
                  <tr className="bg-gradient-to-r from-cyan-900 to-cyan-800 text-white">
                    {COLUMN_SCHEMA.map((col, idx) =>
                      col.children ? (
                        <th
                          key={idx}
                          colSpan={col.colSpan}
                          className="border border-cyan-700 px-3 py-3 text-center font-bold text-sm tracking-wide"
                        >
                          {col.label}
                        </th>
                      ) : (
                        <th
                          key={idx}
                          rowSpan={2}
                          className="border border-cyan-700 px-3 py-3 text-center font-bold text-sm whitespace-nowrap tracking-wide"
                        >
                          {col.label}
                        </th>
                      )
                    )}
                  </tr>
                  {/* Row 2: Sub-headers only (for merged columns) */}
                  <tr className="bg-gradient-to-r from-cyan-800 to-cyan-700 text-white">
                    {subHeaders.map((col, idx) => (
                      <th
                        key={idx}
                        className="border border-cyan-700 px-3 py-3 text-center font-semibold text-xs whitespace-nowrap"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {data.map((row, rowIndex) => (
                    <tr 
                      key={rowIndex} 
                      className={`
                        ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                        hover:bg-cyan-50 transition-colors duration-150
                      `}
                    >
                      {ALL_FIELDS.map((field) => (
                        <td key={field} className="border border-gray-200 px-1 py-1">
                          <Input
                            value={row[field] ?? ''}
                            onChange={(e) => handleCellEdit(rowIndex, field, e.target.value)}
                            className="!border-0 !shadow-none hover:!bg-blue-50 focus:!bg-blue-50"
                            style={{ minWidth: '100px' }}
                            size="small"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {data.length === 0 && (
          <Card className="shadow-lg rounded-xl text-center py-12" bordered={false}>
            <InboxOutlined className="text-gray-300 mb-4" style={{ fontSize: '64px' }} />
            <Title level={4} className="!text-gray-400 !mb-2">No Data Loaded</Title>
            <Text type="secondary">Upload an Excel file to get started</Text>
          </Card>
        )}
      </div>
    </div>
  )
}
