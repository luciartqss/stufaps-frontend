import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card, Col, Row, Select, Spin, Typography, message, Input, Form, Space, Badge, Tooltip } from 'antd'
import { DownloadOutlined, EyeOutlined, FileTextOutlined, ReloadOutlined, UserOutlined, PlusOutlined, CloseCircleOutlined, FilterOutlined, PrinterOutlined, CheckCircleOutlined, SyncOutlined } from '@ant-design/icons'

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
    return date.toLocaleDateString()
  }

  return (
    <div style={{ padding: '0', background: '#f5f5f5', minHeight: 'calc(100vh - 72px)' }}>
      <div style={{ width: '100%', padding: '0 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px', background: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '8px', 
                background: '#1890ff', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <PrinterOutlined style={{ fontSize: '24px', color: '#fff' }} />
              </div>
              <div>
                <Title level={3} style={{ margin: '0 0 4px 0', color: '#262626' }}>
                  Print Masterlist
                </Title>
                <Text type="secondary" style={{ fontSize: '14px' }}>
                  Generate and download PDF masterlist reports
                </Text>
              </div>
            </div>
            <Space size="middle">
              <Tooltip title="Clear all fields and start over">
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleReset}
                  disabled={loadingPreview}
                >
                  Reset
                </Button>
              </Tooltip>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownload}
                disabled={!previewUrl}
                size="large"
              >
                Download PDF
              </Button>
            </Space>
          </div>
        </div>

        <Row gutter={[32, 24]} style={{ minHeight: 'calc(100vh - 200px)' }}>
          {/* Left Column - Filters & Signatories */}
          <Col xs={24} lg={8} xl={7}>
            {/* Filter Options */}
            <Card 
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FilterOutlined style={{ color: '#1890ff' }} />
                  <span>Filter Options</span>
                  {canGenerate && (
                    <Badge 
                      count={<CheckCircleOutlined style={{ color: '#52c41a' }} />} 
                      style={{ marginLeft: '8px' }}
                    />
                  )}
                </div>
              }
              style={{ marginBottom: '24px' }}
            >
              <Form layout="vertical">
                <Form.Item 
                  label={<Text strong style={{ fontSize: '13px' }}>Program</Text>}
                  style={{ marginBottom: '16px' }}
                >
                  <Select
                    showSearch
                    allowClear
                    placeholder="Select program"
                    value={program}
                    onChange={setProgram}
                    loading={loadingOptions}
                    size="large"
                    optionFilterProp="label"
                    options={programOptions.map((opt) => ({ label: opt, value: opt }))}
                  />
                </Form.Item>
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item 
                      label={<Text strong style={{ fontSize: '13px' }}>Semester</Text>}
                      style={{ marginBottom: '16px' }}
                    >
                      <Select
                        allowClear
                        placeholder="Select semester"
                        value={semester}
                        onChange={setSemester}
                        loading={loadingOptions}
                        size="large"
                        options={semesterOptions.map((opt) => ({ label: opt, value: opt }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item 
                      label={<Text strong style={{ fontSize: '13px' }}>Academic Year</Text>}
                      style={{ marginBottom: '0' }}
                    >
                      <Select
                        showSearch
                        allowClear
                        placeholder="Select academic year"
                        value={academicYear}
                        onChange={setAcademicYear}
                        loading={loadingOptions}
                        size="large"
                        optionFilterProp="label"
                        options={academicYearOptions.map((opt) => ({ label: opt, value: opt }))}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {canGenerate && (
                  <div style={{ 
                    marginTop: '16px', 
                    padding: '12px', 
                    background: '#f6ffed', 
                    border: '1px solid #b7eb8f',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    <Text style={{ color: '#52c41a', fontSize: '12px' }}>
                      Filters applied - Preview will update automatically
                    </Text>
                  </div>
                )}
              </Form>
            </Card>

            {/* Signatory Details */}
            <Card 
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserOutlined style={{ color: '#1890ff' }} />
                  <span>Signatory Details</span>
                  {signatoryComplete && (
                    <Badge 
                      count={<CheckCircleOutlined style={{ color: '#52c41a' }} />} 
                      style={{ marginLeft: '8px' }}
                    />
                  )}
                </div>
              }
            >
              <Form layout="vertical">
                {/* Prepared By */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <Text strong style={{ color: '#1890ff' }}>Prepared By</Text>
                    {preparedBy.length < 2 && (
                      <Button
                        type="dashed"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={addPreparedBy}
                      >
                        Add 2nd Person
                      </Button>
                    )}
                  </div>
                  
                  {preparedBy.map((person, index) => (
                    <div key={index} style={{ 
                      marginBottom: index < preparedBy.length - 1 ? '16px' : '0',
                      padding: '16px',
                      background: '#fafafa',
                      borderRadius: '6px',
                      border: '1px solid #f0f0f0'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <Text style={{ fontSize: '12px', color: '#8c8c8c' }}>
                          {preparedBy.length > 1 ? `Person ${index + 1} ${index === 0 ? '(Left)' : '(Right)'}` : 'Person 1'}
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
                      <Row gutter={12}>
                        <Col span={12}>
                          <Form.Item label="Name" style={{ marginBottom: '12px' }}>
                            <Input
                              placeholder="Enter name"
                              value={person.name}
                              onChange={(e) => handlePreparedByChange(index, 'name', e.target.value)}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="Position" style={{ marginBottom: '12px' }}>
                            <Input
                              placeholder="Enter position"
                              value={person.position}
                              onChange={(e) => handlePreparedByChange(index, 'position', e.target.value)}
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                    </div>
                  ))}
                </div>

                {/* Reviewed & Certified By */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <Text strong style={{ color: '#52c41a' }}>Reviewed & Certified By</Text>
                    {reviewedBy.length < 2 && (
                      <Button
                        type="dashed"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={addReviewedBy}
                      >
                        Add 2nd Person
                      </Button>
                    )}
                  </div>
                  
                  {reviewedBy.map((person, index) => (
                    <div key={index} style={{ 
                      marginBottom: index < reviewedBy.length - 1 ? '16px' : '0',
                      padding: '16px',
                      background: '#f6ffed',
                      borderRadius: '6px',
                      border: '1px solid #d9f7be'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <Text style={{ fontSize: '12px', color: '#8c8c8c' }}>
                          {reviewedBy.length > 1 ? `Person ${index + 1} ${index === 0 ? '(Left)' : '(Right)'}` : 'Person 1'}
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
                      <Row gutter={12}>
                        <Col span={12}>
                          <Form.Item label="Name" style={{ marginBottom: '12px' }}>
                            <Input
                              placeholder="Enter name"
                              value={person.name}
                              onChange={(e) => handleReviewedByChange(index, 'name', e.target.value)}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="Position" style={{ marginBottom: '12px' }}>
                            <Input
                              placeholder="Enter position"
                              value={person.position}
                              onChange={(e) => handleReviewedByChange(index, 'position', e.target.value)}
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                    </div>
                  ))}
                </div>

                {/* Approved By */}
                <div>
                  <Text strong style={{ color: '#722ed1', marginBottom: '12px', display: 'block' }}>Approved By</Text>
                  <div style={{ 
                    padding: '16px',
                    background: '#f9f0ff',
                    borderRadius: '6px',
                    border: '1px solid #d3adf7'
                  }}>
                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item label="Name" style={{ marginBottom: '12px' }}>
                          <Input
                            placeholder="Enter name"
                            value={approvedName}
                            onChange={(e) => setApprovedName(e.target.value)}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="Position" style={{ marginBottom: '12px' }}>
                          <Input
                            placeholder="Enter position"
                            value={approvedPosition}
                            onChange={(e) => setApprovedPosition(e.target.value)}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                </div>

                {signatoryComplete && (
                  <div style={{ 
                    marginTop: '16px', 
                    padding: '12px', 
                    background: '#f6ffed', 
                    border: '1px solid #b7eb8f',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    <Text style={{ color: '#52c41a', fontSize: '12px' }}>
                      All signatories completed
                    </Text>
                  </div>
                )}
              </Form>
            </Card>
          </Col>

          {/* Right Column - PDF Preview */}
          <Col xs={24} lg={16} xl={17}>
            <Card 
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileTextOutlined style={{ color: '#1890ff' }} />
                  <span>PDF Preview</span>
                  <Text type="secondary" style={{ fontSize: '12px', marginLeft: '8px' }}>
                    (8.5" × 13" Landscape)
                  </Text>
                  {loadingPreview && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
                      <SyncOutlined spin style={{ color: '#1890ff', fontSize: '12px' }} />
                      <Text style={{ fontSize: '12px', color: '#1890ff' }}>Updating...</Text>
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
              style={{ height: 'calc(100vh - 200px)' }}
              bodyStyle={{ padding: '16px', height: 'calc(100vh - 280px)', display: 'flex', flexDirection: 'column' }}
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
                  <FileTextOutlined style={{ fontSize: '48px', color: '#ff4d4f', marginBottom: '16px' }} />
                  <Text type="danger" style={{ fontSize: '16px', fontWeight: 500 }}>
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
                  <div style={{ 
                    marginTop: '32px', 
                    padding: '16px 24px',
                    background: '#fff',
                    border: '1px solid #e8e8e8',
                    borderRadius: '8px',
                    maxWidth: '400px'
                  }}>
                    <Text style={{ fontSize: '13px', color: '#595959', lineHeight: '1.6' }}>
                      Once you select the required filters, the PDF preview will appear here automatically. 
                      You can then fill in the signatory details on the left to customize the document.
                    </Text>
                  </div>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  )
}
