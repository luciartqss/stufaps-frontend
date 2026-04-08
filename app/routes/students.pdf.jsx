import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card, Col, Row, Select, Spin, Typography, message, Input, Form, Space, Badge } from 'antd'
import { ArrowLeftOutlined, DownloadOutlined, EyeOutlined, FileTextOutlined, ReloadOutlined, UserOutlined, PlusOutlined, CloseCircleOutlined, CheckCircleOutlined, SyncOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../lib/config'

const { Title, Text } = Typography

const FORM_TYPES = [
  { value: 'masterlist', label: 'Annex D — Masterlist' },
  { value: 'annexF2', label: 'Annex F-2 — By Year Level' },
  { value: 'annexF3', label: 'Annex F-3 — By Sex' },
  { value: 'annexF4', label: 'Annex F-4 — By Type of HEI' },
  { value: 'annexF6', label: 'Annex F-6 — Graduates' },
  { value: 'annexE1', label: 'Annex E-1 — Database of CMSP Beneficiaries' },
]

const FORM_ENDPOINTS = {
  masterlist: '/students/masterlist',
  annexF2: '/students/annex-f2',
  annexF3: '/students/annex-f3',
  annexF4: '/students/annex-f4',
  annexF6: '/students/annex-f6',
  annexE1: '/students/annex-e1',
}

export function meta() {
  return [
    { title: 'Generate PDF Reports | StuFAPs' },
    { name: 'description', content: 'Generate and preview PDF reports — masterlist and Annex forms.' },
  ]
}

export default function StudentsPdf() {
  const navigate = useNavigate()
  const [formType, setFormType] = useState('masterlist')
  const [program, setProgram] = useState()
  const [semester, setSemester] = useState()
  const [academicYear, setAcademicYear] = useState()
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewError, setPreviewError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const abortRef = useRef(null)
  const previewUrlRef = useRef('')

  // Signature fields
  const [preparedBy, setPreparedBy] = useState([{ name: '', position: '' }])
  const [reviewedBy, setReviewedBy] = useState([{ name: '', position: '' }])
  const [approvedName, setApprovedName] = useState('')
  const [approvedPosition, setApprovedPosition] = useState('Director IV')

  // Keep a stringified version of signatories to trigger effects correctly
  const signatoryDeps = JSON.stringify({ preparedBy, reviewedBy, approvedName, approvedPosition })

  const needsProgram = formType === 'masterlist' || formType === 'annexE1'
  const showsSignatories = true

  const annexE1Programs = [
    { label: 'CMSP', value: 'CMSP' },
    { label: 'ESTAT', value: 'ESTAT' },
  ]

  const STORAGE_KEY = 'stufaps_masterlist_form'

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
      console.warn('Failed to save to localStorage:', error)
    }
  }, [program, semester, academicYear, preparedBy, reviewedBy, approvedName, approvedPosition])

  const loadFormData = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const formData = JSON.parse(saved)
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
      console.warn('Failed to load from localStorage:', error)
    }
  }, [])

  const [filterOptions, setFilterOptions] = useState({ scholarshipPrograms: [], academicYears: [], semesters: [] })

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        setLoadingOptions(true)
        const res = await fetch(`${API_BASE}/students/filter-options`)
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        setFilterOptions(data)
      } catch (err) {
        console.error(err)
        message.warning('Could not load some dropdown options. Please refresh.')
      } finally {
        setLoadingOptions(false)
      }
    }
    fetchFilterOptions()
  }, [])

  useEffect(() => {
    loadFormData()
  }, [loadFormData])

  // Save changes when things update
  useEffect(() => {
    const timeoutId = setTimeout(saveFormData, 1000)
    return () => clearTimeout(timeoutId)
    // using signatoryDeps so it sees changes properly
  }, [program, semester, academicYear, signatoryDeps, saveFormData])

  const programOptions = useMemo(() => {
    return (filterOptions.scholarshipPrograms || []).slice().sort()
  }, [filterOptions])

  const academicYearOptions = useMemo(() => {
    return (filterOptions.academicYears || []).slice().sort()
  }, [filterOptions])

  const semesterOptions = useMemo(() => {
    const arr = filterOptions.semesters || []
    return arr.length ? arr : ['First', 'Second']
  }, [filterOptions])

  const canGenerate = needsProgram ? Boolean(program && semester && academicYear) : Boolean(semester && academicYear)

  const signatorySectionsComplete = useMemo(() => {
    const pComplete = preparedBy.every(p => p.name.trim() && p.position.trim())
    const rComplete = reviewedBy.every(r => r.name.trim() && r.position.trim())
    const aComplete = Boolean(approvedName.trim() && approvedPosition.trim())
    return [pComplete, rComplete, aComplete].filter(Boolean).length
  }, [preparedBy, reviewedBy, approvedName, approvedPosition])
  const signatoryComplete = signatorySectionsComplete === 3

  const generatePreview = useCallback(async () => {
    if (!canGenerate) return

    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    setLoadingPreview(true)
    setPreviewError('')

    try {
      const params = new URLSearchParams({
        semester,
        academic_year: academicYear,
      })
      if (needsProgram && program) {
        params.set('program', program)
      }
      
      params.set('approved_name', approvedName)
      params.set('approved_position', approvedPosition)
      preparedBy.forEach((p, i) => {
        params.append(`prepared_name[${i}]`, p.name)
        params.append(`prepared_position[${i}]`, p.position)
      })
      reviewedBy.forEach((p, i) => {
        params.append(`reviewed_name[${i}]`, p.name)
        params.append(`reviewed_position[${i}]`, p.position)
      })

      const endpoint = FORM_ENDPOINTS[formType] || FORM_ENDPOINTS.masterlist
      const res = await fetch(`${API_BASE}${endpoint}?${params.toString()}`, {
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        let errorMsg
        const contentType = res.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
          const errData = await res.json().catch(() => null)
          errorMsg = errData?.message
        } else {
          const text = await res.text().catch(() => '')
          const match = text.match(/<title>(.*?)<\/title>/i)
          errorMsg = match?.[1] || (text.length > 200 ? `Server error (${res.status})` : text)
        }
        throw new Error(errorMsg || `Server returned ${res.status} — check the backend logs`)
      }

      const blob = await res.blob()
      const pdfBlob = new Blob([blob], { type: 'application/pdf' })
      const url = URL.createObjectURL(pdfBlob)

      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        previewUrlRef.current = url
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
      if (abortRef.current && !abortRef.current.signal.aborted) {
        setLoadingPreview(false)
      }
    }
  }, [canGenerate, program, semester, academicYear, formType, needsProgram, preparedBy, reviewedBy, approvedName, approvedPosition])

  useEffect(() => {
    if (canGenerate) {
      const timeoutId = setTimeout(() => {
        generatePreview()
      }, 500)
      return () => clearTimeout(timeoutId)
    } else {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        previewUrlRef.current = ''
        return ''
      })
      setPreviewError('')
      setLastUpdated(null)
    }
  }, [canGenerate, generatePreview])

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  const handleReset = () => {
    setFormType('masterlist')
    setProgram(undefined)
    setSemester(undefined)
    setAcademicYear(undefined)
    setPreviewError('')
    setPreparedBy([{ name: '', position: '' }])
    setReviewedBy([{ name: '', position: '' }])
    setApprovedName('')
    setApprovedPosition('Director IV')
    setLastUpdated(null)
    
    try {
      localStorage.removeItem(STORAGE_KEY)
      message.success('Form reset and saved data cleared')
    } catch (e) {}
  }

  const handleDownload = () => {
    if (!previewUrl) return
    const link = document.createElement('a')
    link.href = previewUrl
    const prefix = needsProgram && program ? `${formType}-${program}` : formType
    link.download = `${prefix}-${semester}-AY-${academicYear}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    message.success('Download started')
  }

  const handleOpenNewTab = () => {
    if (previewUrl) window.open(previewUrl, '_blank')
  }

  return (
    <div style={{ margin: '-24px', background: '#f5f5f5', minHeight: 'calc(100vh - 72px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header - Filters */}
      <Card style={{ marginBottom: 0, borderRadius: 0, borderBottom: '1px solid #e8e8e8' }} styles={{ body: { padding: '24px' } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/students')} style={{ marginLeft: -12 }} />
              <Title level={3} style={{ margin: 0, color: '#262626' }}>
                Generate PDF Reports
              </Title>
            </div>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              Select a form type, then choose the filters to automatically generate the document
            </Text>
          </div>
          
          <Space>
            <Button icon={<ReloadOutlined />} onClick={handleReset} disabled={loadingPreview}>
              Reset All
            </Button>
            <Button
              icon={<SyncOutlined spin={loadingPreview} />}
              onClick={generatePreview}
              disabled={!canGenerate}
              loading={loadingPreview}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleDownload}
              disabled={!previewUrl}
            >
              Download PDF
            </Button>
          </Space>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={needsProgram ? 6 : 8}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Form Type</Text>
            <Select
              size="large"
              value={formType}
              onChange={(val) => {
                setFormType(val)
                setProgram(undefined)
              }}
              style={{ width: '100%' }}
              options={FORM_TYPES}
            />
          </Col>

          {needsProgram && (
            <Col xs={24} md={6}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Program</Text>
              <Select
                size="large"
                showSearch
                allowClear
                placeholder="Select program"
                value={program}
                onChange={setProgram}
                loading={loadingOptions}
                style={{ width: '100%' }}
                options={formType === 'annexE1' ? annexE1Programs : programOptions.map((opt) => ({
                  label: opt,
                  value: opt,
                  disabled: /^(COSCHO|MSRS)$/i.test(opt),
                }))}
              />
            </Col>
          )}

          <Col xs={24} md={needsProgram ? 6 : 8}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Semester</Text>
            <Select
              size="large"
              allowClear
              placeholder="Select semester"
              value={semester}
              onChange={setSemester}
              loading={loadingOptions}
              style={{ width: '100%' }}
              options={semesterOptions.map((opt) => ({ label: opt, value: opt }))}
            />
          </Col>

          <Col xs={24} md={needsProgram ? 6 : 8}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Academic Year</Text>
            <Select
              size="large"
              showSearch
              allowClear
              placeholder="Select academic year"
              value={academicYear}
              onChange={setAcademicYear}
              loading={loadingOptions}
              style={{ width: '100%' }}
              options={academicYearOptions.map((opt) => ({ label: opt, value: opt }))}
            />
          </Col>
        </Row>
        
        {formType === 'masterlist' && (
          <Text type="secondary" style={{ display: 'block', marginTop: '16px', fontSize: '13px' }}>
            * Note: COSCHO and MSRS scholarships have a different format and are not applicable to the masterlist layout.
          </Text>
        )}
      </Card>

      {/* Body - PDF Viewer */}
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileTextOutlined style={{ color: '#1677ff' }} />
            <span>Preview: {FORM_TYPES.find(f => f.value === formType)?.label}</span>
          </div>
        }
        extra={
          <Space>
            {lastUpdated && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Updated just now
              </Text>
            )}
            {previewUrl && (
              <Button type="link" icon={<EyeOutlined />} onClick={handleOpenNewTab} size="small">
                Open in new tab
              </Button>
            )}
          </Space>
        }
        style={{ flex: 1, margin: '24px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        styles={{ body: { padding: 0, height: '70vh', display: 'flex', flexDirection: 'column' } }}
      >
        {loadingPreview && !previewUrl ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', flex: 1, background: '#fafafa' }}>
            <Spin size="large" />
            <Text style={{ marginTop: 16, color: '#8c8c8c' }}>Generating document...</Text>
          </div>
        ) : previewError ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', flex: 1, background: '#fff2f0' }}>
            <FileTextOutlined style={{ fontSize: '48px', color: '#ff4d4f', marginBottom: '16px' }} />
            <Text strong style={{ fontSize: '16px', color: '#cf1322' }}>{previewError}</Text>
            <Text type="secondary" style={{ marginTop: '8px' }}>Adjust the filters above to try again.</Text>
          </div>
        ) : previewUrl ? (
          <iframe
            title="PDF Preview"
            src={`${previewUrl}#toolbar=0`}
            style={{ width: '100%', height: '100%', border: 'none', flex: 1 }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', flex: 1, background: '#fafafa' }}>
            <FileTextOutlined style={{ fontSize: '64px', color: '#d9d9d9', marginBottom: '24px' }} />
            <Text style={{ fontSize: '18px', fontWeight: 500, color: '#8c8c8c', marginBottom: '8px' }}>
              {needsProgram ? 'Select Program, Semester, and Academic Year' : 'Select Semester and Academic Year'}
            </Text>
            <Text type="secondary" style={{ fontSize: '14px' }}>to automatically preview the document</Text>
          </div>
        )}
      </Card>

      {/* Footer - Signatories */}
      {showsSignatories && (
      <Card
        style={{ margin: '0 24px 24px 24px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserOutlined style={{ color: '#1677ff' }} />
            <span>Document Signatories</span>
            <Badge
              count={`${signatorySectionsComplete}/3`}
              style={{
                marginLeft: '8px',
                backgroundColor: signatoryComplete ? '#52c41a' : '#1677ff',
                boxShadow: 'none',
              }}
            />
            {signatoryComplete && <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />}
          </div>
        }
      >
        <Row gutter={[24, 24]}>
          {/* Prepared By */}
          <Col xs={24} md={8}>
            <div style={{ padding: '20px', background: '#fafafa', borderRadius: '8px', border: '1px solid #f0f0f0', height: '100%' }}>
              <div style={{ marginBottom: '16px', borderBottom: '1px solid #e8e8e8', paddingBottom: 8 }}>
                <Text strong>Prepared By</Text>
              </div>
              {preparedBy.map((person, index) => (
                <div key={index} style={{ marginBottom: index < preparedBy.length - 1 ? 16 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Person {index + 1}</Text>
                    {preparedBy.length > 1 && (
                      <Button type="text" size="small" danger icon={<CloseCircleOutlined />} onClick={() => setPreparedBy(prev => prev.filter((_, i) => i !== index))} />
                    )}
                  </div>
                  <Input placeholder="Name" value={person.name} onChange={e => {
                    const next = [...preparedBy]; next[index].name = e.target.value; setPreparedBy(next);
                  }} style={{ marginBottom: 8 }} />
                  <Input placeholder="Position" value={person.position} onChange={e => {
                    const next = [...preparedBy]; next[index].position = e.target.value; setPreparedBy(next);
                  }} />
                </div>
              ))}
              {preparedBy.length < 2 && (
                <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => setPreparedBy(p => [...p, {name: '', position: ''}])} style={{ marginTop: 16, width: '100%' }}>
                  Add Person
                </Button>
              )}
            </div>
          </Col>

          {/* Reviewed By */}
          <Col xs={24} md={8}>
            <div style={{ padding: '20px', background: '#fafafa', borderRadius: '8px', border: '1px solid #f0f0f0', height: '100%' }}>
              <div style={{ marginBottom: '16px', borderBottom: '1px solid #e8e8e8', paddingBottom: 8 }}>
                <Text strong>Reviewed By</Text>
              </div>
              {reviewedBy.map((person, index) => (
                <div key={index} style={{ marginBottom: index < reviewedBy.length - 1 ? 16 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Person {index + 1}</Text>
                    {reviewedBy.length > 1 && (
                      <Button type="text" size="small" danger icon={<CloseCircleOutlined />} onClick={() => setReviewedBy(prev => prev.filter((_, i) => i !== index))} />
                    )}
                  </div>
                  <Input placeholder="Name" value={person.name} onChange={e => {
                    const next = [...reviewedBy]; next[index].name = e.target.value; setReviewedBy(next);
                  }} style={{ marginBottom: 8 }} />
                  <Input placeholder="Position" value={person.position} onChange={e => {
                    const next = [...reviewedBy]; next[index].position = e.target.value; setReviewedBy(next);
                  }} />
                </div>
              ))}
              {reviewedBy.length < 2 && (
                <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => setReviewedBy(p => [...p, {name: '', position: ''}])} style={{ marginTop: 16, width: '100%' }}>
                  Add Person
                </Button>
              )}
            </div>
          </Col>

          {/* Approved By */}
          <Col xs={24} md={8}>
            <div style={{ padding: '20px', background: '#fafafa', borderRadius: '8px', border: '1px solid #f0f0f0', height: '100%' }}>
              <div style={{ marginBottom: '16px', borderBottom: '1px solid #e8e8e8', paddingBottom: 8 }}>
                <Text strong>Approved By</Text>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Authorized Signatory</Text>
                </div>
                <Input placeholder="Name" value={approvedName} onChange={e => setApprovedName(e.target.value)} style={{ marginBottom: 8 }} />
                <Input placeholder="Position" value={approvedPosition} onChange={e => setApprovedPosition(e.target.value)} />
              </div>
            </div>
          </Col>
        </Row>
      </Card>
      )}
    </div>
  )
}
