import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card, Col, Row, Select, Spin, Typography, message, Input, Divider, Form } from 'antd'
import { DownloadOutlined, EyeOutlined, FileTextOutlined, ReloadOutlined, UserOutlined, EditOutlined, PlusOutlined, CloseCircleOutlined } from '@ant-design/icons'

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

  // Signature fields
  const [preparedBy, setPreparedBy] = useState([{ name: '', position: '' }])
  const [reviewedName, setReviewedName] = useState('')
  const [reviewedPosition, setReviewedPosition] = useState('')
  const [approvedName, setApprovedName] = useState('')
  const [approvedPosition, setApprovedPosition] = useState('Director IV')

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
      const params = new URLSearchParams({
        program,
        semester,
        academic_year: academicYear,
        reviewed_name: reviewedName,
        reviewed_position: reviewedPosition,
        approved_name: approvedName,
        approved_position: approvedPosition,
      })
      // Add prepared by entries as arrays
      preparedBy.forEach((p, i) => {
        params.append(`prepared_name[${i}]`, p.name)
        params.append(`prepared_position[${i}]`, p.position)
      })
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
  }, [program, semester, academicYear, preparedBy, reviewedName, reviewedPosition, approvedName, approvedPosition])

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
    setPreparedBy([{ name: '', position: '' }])
    setReviewedName('')
    setReviewedPosition('')
    setApprovedName('')
    setApprovedPosition('Director IV')
  }

  // Handle prepared by changes
  const handlePreparedByChange = (index, field, value) => {
    setPreparedBy((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const addPreparedBy = () => {
    if (preparedBy.length < 2) {
      setPreparedBy((prev) => [...prev, { name: '', position: '' }])
    }
  }

  const removePreparedBy = (index) => {
    if (preparedBy.length > 1) {
      setPreparedBy((prev) => prev.filter((_, i) => i !== index))
    }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Header & Filters */}
        <Card
          bordered={false}
          className="shadow-md hover:shadow-lg transition-shadow duration-300"
          styles={{ header: { borderBottom: '2px solid #1890ff' } }}
          title={
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500 text-white">
                <FileTextOutlined className="text-xl" />
              </div>
              <div>
                <Title level={4} className="!mb-0 !text-gray-800">
                  Print Masterlist
                </Title>
                <Text type="secondary" className="text-xs">
                  Generate and download PDF masterlist
                </Text>
              </div>
            </div>
          }
          extra={
            <div className="flex flex-wrap gap-2">
              <Button
                icon={<ReloadOutlined />}
                onClick={handleReset}
                disabled={loadingPreview}
                className="hover:border-orange-400 hover:text-orange-500"
              >
                Reset
              </Button>
              <Button
                icon={<EyeOutlined />}
                onClick={generatePreview}
                loading={loadingPreview}
                disabled={!canGenerate}
                className="hover:border-green-400 hover:text-green-500"
              >
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownload}
                disabled={!previewUrl}
                className="bg-gradient-to-r from-blue-500 to-blue-600 border-0 hover:from-blue-600 hover:to-blue-700 shadow-md"
              >
                Download PDF
              </Button>
            </div>
          }
        >
          <div className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-4 mb-1">
            <Text className="text-sm font-medium text-blue-700 mb-3 block">
              <EditOutlined className="mr-2" />
              Filter Options
            </Text>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600 uppercase tracking-wide">Program</label>
                <Select
                  showSearch
                  allowClear
                  placeholder="Select program"
                  value={program}
                  onChange={setProgram}
                  loading={loadingOptions}
                  className="w-full"
                  size="large"
                  optionFilterProp="label"
                  options={programOptions.map((opt) => ({ label: opt, value: opt }))}
                />
              </Col>
              <Col xs={24} sm={8}>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600 uppercase tracking-wide">Semester</label>
                <Select
                  allowClear
                  placeholder="Select semester"
                  value={semester}
                  onChange={setSemester}
                  loading={loadingOptions}
                  className="w-full"
                  size="large"
                  options={semesterOptions.map((opt) => ({ label: opt, value: opt }))}
                />
              </Col>
              <Col xs={24} sm={8}>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600 uppercase tracking-wide">Academic Year</label>
                <Select
                  showSearch
                  allowClear
                  placeholder="Select academic year"
                  value={academicYear}
                  onChange={setAcademicYear}
                  loading={loadingOptions}
                  className="w-full"
                  size="large"
                  optionFilterProp="label"
                  options={academicYearOptions.map((opt) => ({ label: opt, value: opt }))}
                />
              </Col>
            </Row>
          </div>
        </Card>

        {/* Preview Area */}
        <Card
          bordered={false}
          className="shadow-md hover:shadow-lg transition-shadow duration-300"
          styles={{ header: { borderBottom: '2px solid #52c41a' } }}
          title={
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500 text-white">
                <EyeOutlined className="text-xl" />
              </div>
              <div>
                <span className="text-base font-semibold text-gray-800">PDF Preview</span>
                <Text type="secondary" className="text-xs block">Folio 8.5" × 13" Landscape</Text>
              </div>
            </div>
          }
          extra={
            previewUrl && (
              <Button
                size="small"
                type="primary"
                ghost
                icon={<FileTextOutlined />}
                onClick={handleOpenNewTab}
                className="border-green-400 text-green-600 hover:border-green-500 hover:text-green-700"
              >
                Open in new tab
              </Button>
            )
          }
        >
          {loadingPreview ? (
            <div className="flex h-[60vh] items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
              <Spin size="large" tip="Generating preview..." />
            </div>
          ) : previewError ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-red-300 bg-gradient-to-br from-red-50 to-orange-50 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-3">
                <FileTextOutlined className="text-2xl text-red-500" />
              </div>
              <Text type="danger" className="text-base font-medium">
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
              className="w-full rounded-xl border-2 border-gray-200 shadow-inner"
              style={{ height: '60vh' }}
            />
          ) : (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-slate-100 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 mb-3">
                <FileTextOutlined className="text-2xl text-gray-400" />
              </div>
              <Text type="secondary" className="font-medium">Select Program, Semester, and Academic Year</Text>
              <Text type="secondary" className="text-xs mt-1">to preview the masterlist</Text>
            </div>
          )}
        </Card>

        {/* Signature Form */}
        <Card
          bordered={false}
          className="shadow-md hover:shadow-lg transition-shadow duration-300"
          styles={{ header: { borderBottom: '2px solid #722ed1' } }}
          title={
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500 text-white">
                <UserOutlined className="text-xl" />
              </div>
              <div>
                <span className="text-base font-semibold text-gray-800">Signatory Details</span>
                <Text type="secondary" className="text-xs block">Fill in the names and positions for the PDF footer</Text>
              </div>
            </div>
          }
        >
          <Row gutter={[24, 24]}>
            {/* Prepared By - supports 1 or 2 entries */}
            <Col xs={24} md={8}>
              <div className="rounded-xl border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 h-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white text-xs font-bold">
                      1
                    </div>
                    <Text strong className="text-blue-700">Prepared By</Text>
                  </div>
                  {preparedBy.length < 2 && (
                    <Button
                      type="dashed"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={addPreparedBy}
                      className="border-blue-400 text-blue-600 hover:border-blue-500 hover:text-blue-700"
                    >
                      Add 2nd
                    </Button>
                  )}
                </div>
                
                <div className="space-y-4">
                  {preparedBy.map((person, index) => (
                    <div key={index} className={`${index > 0 ? 'pt-4 border-t border-blue-200' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <Text className="text-xs font-semibold text-blue-600">
                          {preparedBy.length > 1 ? `Person ${index + 1} ${index === 0 ? '(Left)' : '(Right)'}` : ''}
                        </Text>
                        {preparedBy.length > 1 && (
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<CloseCircleOutlined />}
                            onClick={() => removePreparedBy(index)}
                            className="!px-1"
                          />
                        )}
                      </div>
                      <Form layout="vertical">
                        <Form.Item label={<span className="text-xs font-semibold text-gray-600 uppercase">Name</span>} className="!mb-3">
                          <Input
                            placeholder="Enter name"
                            value={person.name}
                            onChange={(e) => handlePreparedByChange(index, 'name', e.target.value)}
                            prefix={<UserOutlined className="text-gray-400" />}
                            className="rounded-lg"
                            size="large"
                          />
                        </Form.Item>
                        <Form.Item label={<span className="text-xs font-semibold text-gray-600 uppercase">Position</span>} className="!mb-0">
                          <Input
                            placeholder="Enter position"
                            value={person.position}
                            onChange={(e) => handlePreparedByChange(index, 'position', e.target.value)}
                            prefix={<EditOutlined className="text-gray-400" />}
                            className="rounded-lg"
                            size="large"
                          />
                        </Form.Item>
                      </Form>
                    </div>
                  ))}
                </div>
              </div>
            </Col>

            {/* Reviewed & Certified By */}
            <Col xs={24} md={8}>
              <div className="rounded-xl border-2 border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 p-4 h-full">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white text-xs font-bold">
                    2
                  </div>
                  <Text strong className="text-green-700">Reviewed & Certified By</Text>
                </div>
                <Form layout="vertical" className="space-y-3">
                  <Form.Item label={<span className="text-xs font-semibold text-gray-600 uppercase">Name</span>} className="!mb-3">
                    <Input
                      placeholder="Enter name"
                      value={reviewedName}
                      onChange={(e) => setReviewedName(e.target.value)}
                      prefix={<UserOutlined className="text-gray-400" />}
                      className="rounded-lg"
                      size="large"
                    />
                  </Form.Item>
                  <Form.Item label={<span className="text-xs font-semibold text-gray-600 uppercase">Position</span>} className="!mb-0">
                    <Input
                      placeholder="Enter position"
                      value={reviewedPosition}
                      onChange={(e) => setReviewedPosition(e.target.value)}
                      prefix={<EditOutlined className="text-gray-400" />}
                      className="rounded-lg"
                      size="large"
                    />
                  </Form.Item>
                </Form>
              </div>
            </Col>

            {/* Approved By */}
            <Col xs={24} md={8}>
              <div className="rounded-xl border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-violet-50 p-4 h-full">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-white text-xs font-bold">
                    3
                  </div>
                  <Text strong className="text-purple-700">Approved By</Text>
                </div>
                <Form layout="vertical" className="space-y-3">
                  <Form.Item label={<span className="text-xs font-semibold text-gray-600 uppercase">Name</span>} className="!mb-3">
                    <Input
                      placeholder="Enter name"
                      value={approvedName}
                      onChange={(e) => setApprovedName(e.target.value)}
                      prefix={<UserOutlined className="text-gray-400" />}
                      className="rounded-lg"
                      size="large"
                    />
                  </Form.Item>
                  <Form.Item label={<span className="text-xs font-semibold text-gray-600 uppercase">Position</span>} className="!mb-0">
                    <Input
                      placeholder="Enter position"
                      value={approvedPosition}
                      onChange={(e) => setApprovedPosition(e.target.value)}
                      prefix={<EditOutlined className="text-gray-400" />}
                      className="rounded-lg"
                      size="large"
                    />
                  </Form.Item>
                </Form>
              </div>
            </Col>
          </Row>

          <Divider className="!my-4" />

          <div className="flex justify-end">
            <Button
              type="primary"
              icon={<EyeOutlined />}
              onClick={generatePreview}
              loading={loadingPreview}
              disabled={!canGenerate}
              size="large"
              className="bg-gradient-to-r from-purple-500 to-indigo-600 border-0 hover:from-purple-600 hover:to-indigo-700 shadow-md px-8"
            >
              Update Preview with Signatories
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
