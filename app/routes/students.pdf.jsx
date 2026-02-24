import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card, Col, Row, Select, Spin, Typography, message, Input, Form, Space, Badge, Tooltip } from 'antd'
import { DownloadOutlined, EyeOutlined, FileTextOutlined, ReloadOutlined, UserOutlined, PlusOutlined, CloseCircleOutlined, FilterOutlined, PrinterOutlined, CheckCircleOutlined, SyncOutlined } from '@ant-design/icons'
import { API_BASE } from '../lib/config'

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
  const [lastUpdated, setLastUpdated] = useState(null)
  const abortRef = useRef(null)

  // Signature fields
  const [preparedBy, setPreparedBy] = useState([{ name: '', position: '' }])
  const [reviewedBy, setReviewedBy] = useState([{ name: '', position: '' }])
  const [approvedName, setApprovedName] = useState('')
  const [approvedPosition, setApprovedPosition] = useState('Director IV')

  // LocalStorage keys
  const STORAGE_KEY = 'stufaps_masterlist_form'

  // Save form data to localStorage
  const saveFormData = useCallback(() => {
    const formData = {
      program,
      semester,
      academicYear,
      preparedBy,
      reviewedBy,
      approvedName,
      approvedPosition,
      timestamp: new Date().toISOString()
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData))
    } catch (error) {
      console.warn('Failed to save form data to localStorage:', error)
    }
  }, [program, semester, academicYear, preparedBy, reviewedBy, approvedName, approvedPosition])

  // Load form data from localStorage
  const loadFormData = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const formData = JSON.parse(saved)
        // Only restore if the data is not too old (7 days)
        const isRecent = new Date() - new Date(formData.timestamp) < 7 * 24 * 60 * 60 * 1000
        if (isRecent && formData) {
          if (formData.program) setProgram(formData.program)
          if (formData.semester) setSemester(formData.semester)
          if (formData.academicYear) setAcademicYear(formData.academicYear)
          if (formData.preparedBy?.length) setPreparedBy(formData.preparedBy)
          if (formData.reviewedBy?.length) setReviewedBy(formData.reviewedBy)
          if (formData.approvedName) setApprovedName(formData.approvedName)
          if (formData.approvedPosition) setApprovedPosition(formData.approvedPosition)
        }
      }
    } catch (error) {
      console.warn('Failed to load form data from localStorage:', error)
    }
  }, [])

  // Fetch students for filter options
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoadingOptions(true)
        const res = await fetch(`${API_BASE}/students`)
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        // Handle paginated response (data.data) or direct array
        const studentsArray = Array.isArray(data) ? data : (data.data || [])
        setStudents(studentsArray)
      } catch (err) {
        console.error(err)
        message.error('Unable to load filter options')
      } finally {
        setLoadingOptions(false)
      }
    }
    fetchStudents()
  }, [])

  // Load saved form data on mount
  useEffect(() => {
    loadFormData()
  }, [loadFormData])

  // Save form data whenever values change
  useEffect(() => {
    if (program || semester || academicYear || preparedBy.some(p => p.name || p.position) || 
        reviewedBy.some(r => r.name || r.position) || approvedName || approvedPosition !== 'Director IV') {
      const timeoutId = setTimeout(saveFormData, 1000) // Debounce saves
      return () => clearTimeout(timeoutId)
    }
  }, [program, semester, academicYear, preparedBy, reviewedBy, approvedName, approvedPosition, saveFormData])

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

  // Check if signatories are complete
  const signatoryComplete = useMemo(() => {
    const preparedComplete = preparedBy.every(p => p.name.trim() && p.position.trim())
    const reviewedComplete = reviewedBy.every(r => r.name.trim() && r.position.trim())
    const approvedComplete = approvedName.trim() && approvedPosition.trim()
    return preparedComplete && reviewedComplete && approvedComplete
  }, [preparedBy, reviewedBy, approvedName, approvedPosition])

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
        approved_name: approvedName,
        approved_position: approvedPosition,
      })
      // Add prepared by entries as arrays
      preparedBy.forEach((p, i) => {
        params.append(`prepared_name[${i}]`, p.name)
        params.append(`prepared_position[${i}]`, p.position)
      })
      reviewedBy.forEach((p, i) => {
        params.append(`reviewed_name[${i}]`, p.name)
        params.append(`reviewed_position[${i}]`, p.position)
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
      setLastUpdated(new Date())
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error(err)
        setPreviewError(err.message || 'Unable to generate preview')
        setPreviewUrl('')
      }
    } finally {
      setLoadingPreview(false)
    }
  }, [program, semester, academicYear, preparedBy, reviewedBy, approvedName, approvedPosition])

  // Auto-generate preview when filters change (with debounce)
  useEffect(() => {
    if (canGenerate) {
      const timeoutId = setTimeout(() => {
        generatePreview()
      }, 300) // 300ms debounce
      return () => clearTimeout(timeoutId)
    } else {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return ''
      })
      setPreviewError('')
      setLastUpdated(null)
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
    setReviewedBy([{ name: '', position: '' }])
    setApprovedName('')
    setApprovedPosition('Director IV')
    setLastUpdated(null)
    
    // Clear saved data
    try {
      localStorage.removeItem(STORAGE_KEY)
      message.success('Form reset and saved data cleared')
    } catch (error) {
      console.warn('Failed to clear saved data:', error)
    }
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

  const handleReviewedByChange = (index, field, value) => {
    setReviewedBy((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const addReviewedBy = () => {
    if (reviewedBy.length < 2) {
      setReviewedBy((prev) => [...prev, { name: '', position: '' }])
    }
  }

  const removeReviewedBy = (index) => {
    if (reviewedBy.length > 1) {
      setReviewedBy((prev) => prev.filter((_, i) => i !== index))
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

  const formatLastUpdated = (date) => {
    if (!date) return ''
    const now = new Date()
    const diff = Math.floor((now - date) / 1000)
    
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const y = date.getFullYear()
    return `${m}-${d}-${y}`
  }

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header - Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <Title level={3} style={{ margin: '0 0 8px 0', color: '#262626', textAlign: 'left' }}>
              Generate PDF Masterlist
            </Title>
            <Text type="secondary" style={{ fontSize: '14px', textAlign: 'left' }}>
              Select program, semester, and academic year to generate the masterlist document
            </Text>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <Form layout="inline" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', flex: 1 }}>
              <Form.Item label="Program" style={{ minWidth: '300px', flex: 1 }}>
                <Select
                  showSearch
                  allowClear
                  placeholder="Select program"
                  value={program}
                  onChange={setProgram}
                  loading={loadingOptions}
                  style={{ width: '100%' }}
                  optionFilterProp="label"
                  options={programOptions.map((opt) => ({ label: opt, value: opt }))}
                />
              </Form.Item>

              <Form.Item label="Semester" style={{ minWidth: '200px', flex: 1 }}>
                <Select
                  allowClear
                  placeholder="Select semester"
                  value={semester}
                  onChange={setSemester}
                  loading={loadingOptions}
                  style={{ width: '100%' }}
                  options={semesterOptions.map((opt) => ({ label: opt, value: opt }))}
                />
              </Form.Item>

              <Form.Item label="Academic Year" style={{ minWidth: '200px', flex: 1 }}>
                <Select
                  showSearch
                  allowClear
                  placeholder="Select academic year"
                  value={academicYear}
                  onChange={setAcademicYear}
                  loading={loadingOptions}
                  style={{ width: '100%' }}
                  optionFilterProp="label"
                  options={academicYearOptions.map((opt) => ({ label: opt, value: opt }))}
                />
              </Form.Item>
            </Form>

            <div style={{ display: 'flex', gap: '16px' }}>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleReset}
                disabled={loadingPreview}
                style={{ height: '40px' }}
              >
                Reset
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownload}
                disabled={!previewUrl}
                style={{ height: '40px' }}
              >
                Download PDF
              </Button>
            </div>
          </div>

          <Text type="secondary" style={{ display: 'block', marginTop: '12px', fontStyle: 'italic' }}>
            Note: COSCHO and MSRS scholarships have a different format and are not applicable to this layout.
          </Text>
        </div>
      </Card>

      {/* Body - PDF Viewer */}
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileTextOutlined />
            <span>PDF Preview</span>
            {loadingPreview && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
                <SyncOutlined spin style={{ fontSize: '12px' }} />
                <Text style={{ fontSize: '12px' }}>Updating...</Text>
              </div>
            )}
          </div>
        }
        extra={
          <Space>
            {lastUpdated && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Updated {formatLastUpdated(lastUpdated)}
              </Text>
            )}
            {previewUrl && (
              <Button
                type="link"
                icon={<EyeOutlined />}
                onClick={handleOpenNewTab}
                size="small"
              >
                Open in new tab
              </Button>
            )}
          </Space>
        }
        style={{ flex: 1, marginBottom: '24px', minHeight: '500px' }}
        styles={{ body: { padding: '16px', height: '500px', display: 'flex', flexDirection: 'column' } }}
      >
        {loadingPreview ? (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            background: '#fafafa',
            borderRadius: '6px',
            flex: 1
          }}>
            <Spin size="large" tip="Generating preview..." />
          </div>
        ) : previewError ? (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            background: '#fff2f0',
            border: '2px dashed #ffccc7',
            borderRadius: '6px',
            textAlign: 'center',
            flex: 1
          }}>
            <FileTextOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
            <Text style={{ fontSize: '16px', fontWeight: 500 }}>
              {previewError}
            </Text>
            <Text type="secondary" style={{ marginTop: '8px' }}>
              Try adjusting the filters above.
            </Text>
          </div>
        ) : previewUrl ? (
          <iframe
            title="Masterlist Preview"
            src={previewUrl}
            style={{ 
              width: '100%', 
              height: '100%',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              flex: 1
            }}
          />
        ) : (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            background: '#fafafa',
            border: '2px dashed #d9d9d9',
            borderRadius: '6px',
            textAlign: 'center',
            flex: 1
          }}>
            <FileTextOutlined style={{ fontSize: '64px', color: '#bfbfbf', marginBottom: '24px' }} />
            <Text style={{ fontSize: '18px', fontWeight: 500, color: '#8c8c8c', marginBottom: '8px' }}>
              Select Program, Semester, and Academic Year
            </Text>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              to preview the masterlist
            </Text>
          </div>
        )}
      </Card>

      {/* Footer - Signatories */}
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserOutlined />
            <span>Document Signatories</span>
            {signatoryComplete && (
              <Badge 
                count={<CheckCircleOutlined />} 
                style={{ marginLeft: '8px' }}
              />
            )}
          </div>
        }
      >
        <Row gutter={[24, 24]}>
          {/* Prepared By */}
          <Col xs={24} md={8}>
            <div style={{ padding: '24px', background: '#fff', borderRadius: '8px', border: '1px solid #d9d9d9', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <Text strong style={{ fontSize: '16px' }}>Prepared By</Text>
              </div>
              
              <div style={{ flex: 1 }}>
                {preparedBy.map((person, index) => (
                  <div key={index} style={{ 
                    marginBottom: index < preparedBy.length - 1 ? '16px' : '0',
                    padding: '16px',
                    background: '#f9f9f9',
                    borderRadius: '6px',
                    border: '1px solid #d9d9d9'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <Text style={{ fontSize: '12px', color: '#8c8c8c', fontWeight: 500 }}>
                        {preparedBy.length > 1 ? `Person ${index + 1}` : 'Person'}
                      </Text>
                      {preparedBy.length > 1 && (
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<CloseCircleOutlined />}
                          onClick={() => removePreparedBy(index)}
                        />
                      )}
                    </div>
                    <Form.Item
                      label="Name"
                      labelCol={{ span: 6 }} // Adjust label width
                      wrapperCol={{ span: 18 }} // Adjust input width
                      style={{ marginBottom: '12px' }}
                    >
                      <Input
                        placeholder="Enter full name"
                        value={person.name}
                        onChange={(e) => handlePreparedByChange(index, 'name', e.target.value)}
                      />
                    </Form.Item>
                    <Form.Item
                      label="Position"
                      labelCol={{ span: 6 }} // Same label width as "Name"
                      wrapperCol={{ span: 18 }} // Same input width as "Name"
                      style={{ marginBottom: '0' }}
                    >
                      <Input
                        placeholder="Enter position/title"
                        value={person.position}
                        onChange={(e) => handlePreparedByChange(index, 'position', e.target.value)}
                      />
                    </Form.Item>
                  </div>
                ))}
              </div>

              {preparedBy.length < 2 && (
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <Button
                    type="dashed"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={addPreparedBy}
                  >
                    Add Person
                  </Button>
                </div>
              )}
            </div>
          </Col>

          {/* Reviewed By */}
          <Col xs={24} md={8}>
            <div style={{ padding: '24px', background: '#fff', borderRadius: '8px', border: '1px solid #d9d9d9', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <Text strong style={{ fontSize: '16px' }}>Reviewed By</Text>
              </div>
              
              <div style={{ flex: 1 }}>
                {reviewedBy.map((person, index) => (
                  <div key={index} style={{ 
                    marginBottom: index < reviewedBy.length - 1 ? '16px' : '0',
                    padding: '16px',
                    background: '#f9f9f9',
                    borderRadius: '6px',
                    border: '1px solid #d9d9d9'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <Text style={{ fontSize: '12px', color: '#8c8c8c', fontWeight: 500 }}>
                        {reviewedBy.length > 1 ? `Person ${index + 1}` : 'Person'}
                      </Text>
                      {reviewedBy.length > 1 && (
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<CloseCircleOutlined />}
                          onClick={() => removeReviewedBy(index)}
                        />
                      )}
                    </div>
                    <Form.Item
                      label="Name"
                      labelCol={{ span: 6 }}
                      wrapperCol={{ span: 18 }}
                      style={{ marginBottom: '12px' }}
                    >
                      <Input
                        placeholder="Enter full name"
                        value={person.name}
                        onChange={(e) => handleReviewedByChange(index, 'name', e.target.value)}
                      />
                    </Form.Item>
                    <Form.Item
                      label="Position"
                      labelCol={{ span: 6 }}
                      wrapperCol={{ span: 18 }}
                      style={{ marginBottom: '0' }}
                    >
                      <Input
                        placeholder="Enter position/title"
                        value={person.position}
                        onChange={(e) => handleReviewedByChange(index, 'position', e.target.value)}
                      />
                    </Form.Item>
                  </div>
                ))}
              </div>

              {reviewedBy.length < 2 && (
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <Button
                    type="dashed"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={addReviewedBy}
                  >
                    Add Person
                  </Button>
                </div>
              )}
            </div>
          </Col>

          {/* Approved By */}
          <Col xs={24} md={8}>
            <div style={{ padding: '24px', background: '#fff', borderRadius: '8px', border: '1px solid #d9d9d9', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <Text strong style={{ fontSize: '16px' }}>Approved By</Text>
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ 
                  padding: '16px',
                  background: '#f9f9f9',
                  borderRadius: '6px',
                  border: '1px solid #d9d9d9'
                }}>
                  <Form.Item
                    label="Name"
                    labelCol={{ span: 6 }}
                    wrapperCol={{ span: 18 }}
                    style={{ marginBottom: '12px' }}
                  >
                    <Input
                      placeholder="Enter full name"
                      value={approvedName}
                      onChange={(e) => setApprovedName(e.target.value)}
                    />
                  </Form.Item>
                  <Form.Item
                    label="Position"
                    labelCol={{ span: 6 }}
                    wrapperCol={{ span: 18 }}
                    style={{ marginBottom: '0' }}
                  >
                    <Input
                      placeholder="Enter position/title"
                      value={approvedPosition}
                      onChange={(e) => setApprovedPosition(e.target.value)}
                    />
                  </Form.Item>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  )
}
