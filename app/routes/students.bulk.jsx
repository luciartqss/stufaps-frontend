import { useState, useRef } from 'react'
import { Typography, message } from 'antd'
import * as XLSX from 'xlsx'
import { useNavigate } from 'react-router-dom'

const { Title } = Typography

export default function ImportBulk() {
    const navigate = useNavigate()
  const [data, setData] = useState([])
  const [inputKey, setInputKey] = useState(Date.now())
  const fileInputRef = useRef(null)

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      console.log('Selected file:', file.name)
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const buffer = new Uint8Array(e.target.result)
          const workbook = XLSX.read(buffer, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const parsedData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
          setData(parsedData)
          message.success(`File ${file.name} loaded - ${parsedData.length} records`)
        } catch (error) {
          message.error('Error parsing file')
          console.error(error)
        }
      }
      reader.readAsArrayBuffer(file)
    }
  }

  // Handle cell edit
  const handleCellEdit = (rowIndex, colIndex, newValue) => {
    const updatedData = [...data]
    const keys = Object.keys(updatedData[rowIndex])
    updatedData[rowIndex][keys[colIndex]] = newValue
    setData(updatedData)
  }

  // Clear data and reset input
  const handleClear = () => {
    setData([])
    setInputKey(Date.now())
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Submit data
  const handleSubmitData = async () => {
    if (data.length === 0) {
      message.warning('No data to submit')
      return
    }

    // 🔑 Clean the data before sending
    const cleanedData = data.map(row => {
      const cleanedRow = {}
      Object.entries(row).forEach(([key, value]) => {
        if (value !== '') { // only keep non-empty values
          cleanedRow[key] = value
        }
      })
      return cleanedRow
    })

    try {
      const response = await fetch('http://localhost:8000/api/students/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

      setData([])
      setInputKey(Date.now())
      if (fileInputRef.current) fileInputRef.current.value = ''

    } catch (error) {


      console.error('Error:', error)
      message.error(error.message || 'Something went wrong')
    } finally {
      setLoading(false)
      navigate('/students') // always redirect
    }
  }

  return (
    <div style={{ padding: '16px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '100%', margin: '0 auto', background: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
        <h2 className="text-2xl font-bold mb-4">Upload Excel File</h2>
        <p className="mb-4">Choose an Excel or CSV file to import:</p>

        <input
          key={inputKey}
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls, .xlsm, .xlsb, .csv"
          onChange={handleFileUpload}
          className="mb-6"
        />

        {data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table-auto border border-gray-400 w-full">
              <thead>
                <tr>
                  {Object.keys(data[0]).map((key) => (
                    <th key={key} className="border px-2 py-1">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr key={index}>
                    {Object.values(row).map((value, i) => (
                      <td key={i} className="border px-2 py-1">
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => handleCellEdit(index, i, e.target.value)}
                          className="w-full px-2 py-1 border"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          {data.length > 0 && (
            <>
              <button onClick={handleSubmitData} className="px-4 py-2 bg-blue-500 text-white rounded">
                Submit
              </button>
              <button onClick={handleClear} className="px-4 py-2 bg-red-500 text-white rounded">
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
