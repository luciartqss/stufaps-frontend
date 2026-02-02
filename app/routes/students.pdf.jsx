import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card, Col, Row, Select, Spin, Typography, message } from 'antd'
import { DownloadOutlined, EyeOutlined, FileTextOutlined, ReloadOutlined } from '@ant-design/icons'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const { Title, Text } = Typography

export function meta() {
  return [
    { title: 'Print Masterlist | StuFAPs' },
    { name: 'description', content: 'Generate and preview masterlist PDF by program, semester, and academic year.' },
  ]
}

export default function StudentsPdf() {
  const [students, setStudents] = useState([])
  const [program, setProgram] = useState()
  const [semester, setSemester] = useState()
  const [academicYear, setAcademicYear] = useState()
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewError, setPreviewError] = useState('')
  const abortRef = useRef(null)

  // Fetch students for filter options
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoadingOptions(true)
        const res = await fetch(`${API_BASE}/students`)
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        setStudents(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error(err)
        message.error('Unable to load filter options')
      } finally {
        setLoadingOptions(false)
      }
    }
    fetchStudents()
  }, [])

  // Derive filter options
  const programOptions = useMemo(() => {
    const set = new Set()
    students.forEach((s) => s?.scholarship_program && set.add(s.scholarship_program))
    return Array.from(set).sort()
  }, [students])

  const academicYearOptions = useMemo(() => {
    const set = new Set()
    students.forEach((s) => {
      (s?.disbursements || []).forEach((d) => d?.academic_year && set.add(d.academic_year))
    })
    return Array.from(set).sort()
  }, [students])

  const semesterOptions = useMemo(() => {
    const set = new Set()
    students.forEach((s) => {
      (s?.disbursements || []).forEach((d) => d?.semester && set.add(d.semester))
    })
    const arr = Array.from(set)
    return arr.length ? arr : ['First', 'Second']
  }, [students])

  const canGenerate = Boolean(program && semester && academicYear)

  // Generate preview when all filters are selected
  const generatePreview = useCallback(async () => {
    if (!program || !semester || !academicYear) return

    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    setLoadingPreview(true)
    setPreviewError('')

    try {
      const params = new URLSearchParams({ program, semester, academic_year: academicYear })
      const res = await fetch(`${API_BASE}/students/masterlist?${params}`, {
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'No students found for the selected filters')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)

      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error(err)
        setPreviewError(err.message || 'Unable to generate preview')
        setPreviewUrl('')
      }
    } finally {
      setLoadingPreview(false)
    }
  }, [program, semester, academicYear])

  // Auto-generate preview when filters change
  useEffect(() => {
    if (canGenerate) {
      generatePreview()
    } else {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return ''
      })
      setPreviewError('')
    }
  }, [canGenerate, generatePreview])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  const handleReset = () => {
    setProgram(undefined)
    setSemester(undefined)
    setAcademicYear(undefined)
    setPreviewError('')
  }

  const handleDownload = () => {
    if (!previewUrl) return
    const link = document.createElement('a')
    link.href = previewUrl
    link.download = `masterlist-${program}-${semester}-AY-${academicYear}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    message.success('Download started')
  }

  const handleOpenNewTab = () => {
    if (previewUrl) window.open(previewUrl, '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        {/* Header & Filters */}
        <Card bordered={false} className="shadow-sm">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <Title level={3} className="!mb-1">
                Print Masterlist
              </Title>
              <Text type="secondary">
                Select filters below to preview and download the PDF masterlist.
              </Text>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button icon={<ReloadOutlined />} onClick={handleReset} disabled={loadingPreview}>
                Reset
              </Button>
              <Button icon={<EyeOutlined />} onClick={generatePreview} loading={loadingPreview} disabled={!canGenerate}>
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownload}
                disabled={!previewUrl}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Download PDF
              </Button>
            </div>
          </div>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <label className="mb-1 block text-sm font-medium text-gray-700">Program</label>
              <Select
                showSearch
                allowClear
                placeholder="Select program"
                value={program}
                onChange={setProgram}
                loading={loadingOptions}
                className="w-full"
                optionFilterProp="label"
                options={programOptions.map((opt) => ({ label: opt, value: opt }))}
              />
            </Col>
            <Col xs={24} sm={8}>
              <label className="mb-1 block text-sm font-medium text-gray-700">Semester</label>
              <Select
                allowClear
                placeholder="Select semester"
                value={semester}
                onChange={setSemester}
                loading={loadingOptions}
                className="w-full"
                options={semesterOptions.map((opt) => ({ label: opt, value: opt }))}
              />
            </Col>
            <Col xs={24} sm={8}>
              <label className="mb-1 block text-sm font-medium text-gray-700">Academic Year</label>
              <Select
                showSearch
                allowClear
                placeholder="Select academic year"
                value={academicYear}
                onChange={setAcademicYear}
                loading={loadingOptions}
                className="w-full"
                optionFilterProp="label"
                options={academicYearOptions.map((opt) => ({ label: opt, value: opt }))}
              />
            </Col>
          </Row>
        </Card>

        {/* Preview Area */}
        <Card
          bordered={false}
          className="shadow-sm"
          title={
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold">Preview (Folio 8.5" × 13" Landscape)</span>
              {previewUrl && (
                <Button size="small" type="link" icon={<FileTextOutlined />} onClick={handleOpenNewTab}>
                  Open in new tab
                </Button>
              )}
            </div>
          }
        >
          {loadingPreview ? (
            <div className="flex h-[70vh] items-center justify-center">
              <Spin size="large" tip="Generating preview..." />
            </div>
          ) : previewError ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-red-300 bg-red-50 text-center">
              <Text type="danger" className="text-base">
                {previewError}
              </Text>
              <Text type="secondary" className="mt-1 text-sm">
                Try adjusting the filters above.
              </Text>
            </div>
          ) : previewUrl ? (
            <iframe
              title="Masterlist Preview"
              src={previewUrl}
              className="w-full rounded-lg border border-gray-200"
              style={{ height: '70vh' }}
            />
          ) : (
            <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-center">
              <FileTextOutlined className="mb-2 text-4xl text-gray-400" />
              <Text type="secondary">Select Program, Semester, and Academic Year to preview the masterlist.</Text>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
