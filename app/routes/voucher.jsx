import {
  Typography, Card, Select, InputNumber, Input, Button, Tag, Empty,
  Spin, message, Modal, Popconfirm, Space, AutoComplete, Alert,
  Tooltip, Badge, Tabs
} from 'antd'
import {
  FileTextOutlined, DownloadOutlined, PrinterOutlined, DeleteOutlined,
  EditOutlined, CloseOutlined, SortAscendingOutlined,
  SortDescendingOutlined, SearchOutlined, CheckCircleOutlined,
  UserOutlined, WarningOutlined,
  TeamOutlined, HistoryOutlined, EyeOutlined, SyncOutlined
} from '@ant-design/icons'
import { useState, useEffect, useCallback, useRef } from 'react'
import { API_BASE } from '../lib/config'
import { useRealtime } from '../lib/useRealtime'

const { Title, Text } = Typography

// Program default amounts
const PROGRAM_AMOUNTS = {
  'FULL SSP': 40000, 'FULL SSP-GAD': 40000,
  'HALF SSP': 20000, 'HALF SSP-GAD': 20000,
  'FULL PESFA': 60000, 'FULL PESFA-GAD': 60000,
  'HALF PESFA': 30000, 'HALF PESFA-GAD': 30000,
  'COSCHO': 40000,
  'FULL ESTATISTIKOLAR': 40000,
  'SIDA-SGP': 55000,
  'MSRS': 105000,
  'MTP-SP': 105000,
  'ACEF-GIAHEP PHEI': 30000,
  'ACEF-GIAHEP SUC': 20000,
}

export default function Voucher() {
  const [programs, setPrograms] = useState([])
  const [years, setYears] = useState([])
  const [program, setProgram] = useState('')
  const [schoolYear, setSchoolYear] = useState('')
  const [semester, setSemester] = useState('First')
  const [customAmount, setCustomAmount] = useState(null)

  const [availableStudents, setAvailableStudents] = useState([])
  const [selectedStudents, setSelectedStudents] = useState([])
  const [studentSearch, setStudentSearch] = useState('')
  const [sortAsc, setSortAsc] = useState(true)
  const [studentOptions, setStudentOptions] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(false)

  const [generating, setGenerating] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('')
  const [previewFile, setPreviewFile] = useState('')
  const [previewError, setPreviewError] = useState('')
  const [previewStale, setPreviewStale] = useState(false)

  const [history, setHistory] = useState([])
  const [historySearch, setHistorySearch] = useState('')
  const [historyLoading, setHistoryLoading] = useState(false)

  const [trackingInfo, setTrackingInfo] = useState(null)
  const [trackingStartInput, setTrackingStartInput] = useState(1)
  const [settingTracking, setSettingTracking] = useState(false)

  const autocompleteRef = useRef(null)
  const abortRef = useRef(null)
  const studentAbortRef = useRef(null)

  useEffect(() => {
    fetchPrograms()
    fetchYears()
    loadHistory()
    loadTrackingInfo()
  }, [])

  useRealtime(['VoucherHistory', 'VoucherCounter', 'Student', 'Disbursement'], () => {
    fetchPrograms(); fetchYears(); loadHistory(); loadTrackingInfo()
    if (program) loadStudents()
  })

  useEffect(() => {
    if (program) loadStudents()
  }, [program, schoolYear, semester])

  useEffect(() => {
    if (program && PROGRAM_AMOUNTS[program]) {
      setCustomAmount(PROGRAM_AMOUNTS[program])
    } else {
      setCustomAmount(null)
    }
  }, [program])

  const fetchPrograms = async () => {
    try {
      const res = await fetch(`${API_BASE}/voucher/programs`)
      const data = await res.json()
      setPrograms(data)
      if (data.length > 0) setProgram(data[0])
    } catch { message.error('Failed to load programs') }
  }

  const fetchYears = async () => {
    try {
      const res = await fetch(`${API_BASE}/voucher/years`)
      const data = await res.json()
      setYears(data)
      if (data.length > 0) setSchoolYear(data[0])
    } catch { message.error('Failed to load years') }
  }

  const clearPreview = useCallback(() => {
    setPdfPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return ''
    })
    setPreviewFile('')
    setPreviewError('')
    setPreviewStale(false)
  }, [])

  const readErrorMessage = async (res, fallback) => {
    try {
      const data = await res.json()
      if (data?.error) return data.error
      if (data?.message) return data.message
    } catch {
      try {
        const text = await res.text()
        if (text) return text
      } catch {
        // Ignore secondary parsing failures.
      }
    }

    return fallback
  }

  const loadStudents = useCallback(async () => {
    if (!program) {
      setAvailableStudents([])
      setStudentOptions([])
      return
    }

    if (studentAbortRef.current) studentAbortRef.current.abort()
    studentAbortRef.current = new AbortController()
    setStudentsLoading(true)

    try {
      let url = `${API_BASE}/voucher/students?program=${encodeURIComponent(program)}`
      if (schoolYear) url += `&ay=${encodeURIComponent(schoolYear)}`
      if (semester) url += `&semester=${encodeURIComponent(semester)}`
      const res = await fetch(url, { signal: studentAbortRef.current.signal })
      const data = await res.json()
      setAvailableStudents(data || [])
    } catch (err) {
      if (err.name !== 'AbortError') {
        setAvailableStudents([])
      }
    } finally {
      if (studentAbortRef.current && !studentAbortRef.current.signal.aborted) {
        setStudentsLoading(false)
      }
    }
  }, [program, schoolYear, semester])

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch(`${API_BASE}/voucher/history`)
      const data = await res.json()
      setHistory(data || [])
    } catch { /* ignore */ }
    setHistoryLoading(false)
  }

  const loadTrackingInfo = async () => {
    try {
      const res = await fetch(`${API_BASE}/voucher/tracking-info`)
      const data = await res.json()
      setTrackingInfo(data)
    } catch { /* ignore */ }
  }

  const handleStudentSearch = useCallback((value) => {
    setStudentSearch(value)
  }, [])

  useEffect(() => {
    const query = studentSearch.toLowerCase().trim()
    const selectedIds = new Set(selectedStudents.map(s => String(s.id)))
    const activeNta = selectedStudents.length > 0 ? selectedStudents[0].nta : null
    let filtered = query === ''
      ? availableStudents
      : availableStudents.filter(s =>
          s.fullName.toLowerCase().includes(query) ||
          (s.atmAccount && s.atmAccount.toLowerCase().includes(query))
        )

    if (activeNta) {
      filtered = filtered.filter(s => s.nta === activeNta)
    }

    setStudentOptions(
      filtered
        .filter(s => !selectedIds.has(String(s.id)))
        .map(s => ({
          value: String(s.id),
          label: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, padding: '2px 0' }}>
                <Text strong style={{ fontSize: 13, lineHeight: 1.3, color: '#262626' }}>
                  {s.fullName}
                </Text>
                <Text type="secondary" style={{ fontSize: 11, lineHeight: 1.2 }}>
                  {s.atmAccount || 'No ATM'}
                </Text>
                {s.nta && (
                  <Text type="secondary" style={{ fontSize: 11, lineHeight: 1.2 }}>
                    {s.nta}
                  </Text>
                )}
                {s.voucherTrackingNo && (
                  <Text type="secondary" style={{ fontSize: 11, lineHeight: 1.2, color: '#8c8c8c' }}>
                    {s.voucherTrackingNo}
                  </Text>
                )}
            </div>
          ),
          student: s,
        }))
    )
  }, [availableStudents, selectedStudents, studentSearch])

  const handleSelectStudent = useCallback((value, option) => {
    const student = option.student
    if (!selectedStudents.some(s => String(s.id) === String(student.id))) {
      setSelectedStudents(prev => {
        const next = [...prev, student]
        next.sort((a, b) => a.fullName.localeCompare(b.fullName))
        return next
      })
    }
    setStudentSearch('')
    setStudentOptions([])
    setPreviewStale(true)
    setTimeout(() => autocompleteRef.current?.blur(), 0)
  }, [selectedStudents])

  const removeStudent = useCallback((id) => {
    setPreviewStale(true)
    setSelectedStudents(prev => prev.filter(s => String(s.id) !== String(id)))
  }, [])

  const toggleSort = useCallback(() => {
    setSelectedStudents(prev => {
      const sorted = [...prev].sort((a, b) =>
        sortAsc ? a.fullName.localeCompare(b.fullName) : b.fullName.localeCompare(a.fullName)
      )
      return sorted
    })
    setSortAsc(prev => !prev)
  }, [sortAsc])

  const handleConfigChange = useCallback((setter, value) => {
    if (selectedStudents.length > 0) {
      Modal.confirm({
        title: 'Clear students?',
        content: 'Changing this will clear your selected students. Continue?',
        onOk: () => {
          setter(value)
          setSelectedStudents([])
          setStudentSearch('')
          setStudentOptions([])
          clearPreview()
        },
      })
    } else {
      setter(value)
      setStudentSearch('')
      setStudentOptions([])
      clearPreview()
    }
  }, [clearPreview, selectedStudents])

  const handleSetTrackingStart = async () => {
    if (!trackingStartInput || trackingStartInput < 0) {
      message.error('Please enter a valid starting number')
      return
    }
    setSettingTracking(true)
    try {
      const res = await fetch(`${API_BASE}/voucher/set-tracking-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startNumber: trackingStartInput }),
      })
      const data = await res.json()
      if (data.success) {
        message.success(`Tracking number will start at ${trackingStartInput}`)
        loadTrackingInfo()
      } else {
        message.error(data.error || 'Failed to set tracking start')
      }
    } catch {
      message.error('Failed to set tracking start')
    }
    setSettingTracking(false)
  }

  const handleClearAll = () => {
    Modal.confirm({
      title: 'Clear All',
      content: 'Are you sure you want to clear all configurations and selected students?',
      onOk: () => {
        setSelectedStudents([])
        setStudentSearch('')
        setStudentOptions([])
        clearPreview()
      },
    })
  }

  // ─── Live Preview ───
  const canGenerate = Boolean(schoolYear && semester && program && customAmount && selectedStudents.length > 0 && trackingInfo?.initialized)

  const generatePreview = useCallback(async () => {
    if (!canGenerate) return

    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    setGenerating(true)
    setPreviewError('')

    try {
      const uniqueStudents = selectedStudents.filter((s, i, self) => i === self.findIndex(t => String(t.id) === String(s.id)))
      const res = await fetch(`${API_BASE}/voucher/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({ schoolYear, semester, scholarshipProgram: program, customAmount, students: uniqueStudents }),
      })

      if (!res.ok) {
        throw new Error(await readErrorMessage(res, 'Preview failed to generate'))
      }
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      if (data.downloadFile) {
        setPreviewFile(data.downloadFile)
        const pdfRes = await fetch(`${API_BASE}/voucher/download?file=${encodeURIComponent(data.downloadFile)}`, {
          signal: abortRef.current.signal
        })
        if (pdfRes.ok) {
          const blob = await pdfRes.blob()
          const pdfBlob = new Blob([blob], { type: 'application/pdf' })
          const url = URL.createObjectURL(pdfBlob)
          setPdfPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return url })
          setPreviewStale(false)
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setPreviewError(err.message || 'Failed to load preview. Please try again.')
      }
    } finally {
      if (abortRef.current && !abortRef.current.signal.aborted) {
        setGenerating(false)
      }
    }
  }, [canGenerate, selectedStudents, schoolYear, semester, program, customAmount])

  useEffect(() => {
    if (!canGenerate) {
      clearPreview()
      setGenerating(false)
      return
    }

    setPreviewStale(true)
    setPdfPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return ''
    })
    setPreviewError('')
  }, [canGenerate, clearPreview, customAmount, program, schoolYear, selectedStudents, semester])

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl)
      if (abortRef.current) abortRef.current.abort()
      if (studentAbortRef.current) studentAbortRef.current.abort()
    }
  }, [])

  // ─── Finalize ───
  const handleFinalize = async () => {
    setAccepting(true)
    try {
      const uniqueStudents = selectedStudents.filter((s, i, self) => i === self.findIndex(t => String(t.id) === String(s.id)))
      const res = await fetch(`${API_BASE}/voucher/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolYear, semester, scholarshipProgram: program, customAmount, students: uniqueStudents, previewFile }),
      })
      
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, 'Failed to finalize voucher'))
      }
      const data = await res.json()
      
      if (data.downloadFile) {
        // Use a hidden iframe to trigger native browser download.
        // This avoids the "save as" dialog that appears when a.click()
        // loses user-gesture context after async awaits.
        const iframe = document.createElement('iframe')
        iframe.style.display = 'none'
        iframe.src = `${API_BASE}/voucher/download?file=${encodeURIComponent(data.downloadFile)}`
        document.body.appendChild(iframe)
        setTimeout(() => iframe.remove(), 10000)
      }
      message.success('Voucher finalized, logged, and downloaded successfully!')
      loadHistory()
      loadTrackingInfo()
      setSelectedStudents([]) // clear students to prep for next
    } catch (err) {
      message.error(err.message || 'Error finalizaing voucher')
    }
    setAccepting(false)
  }

  const handleDeleteHistory = async (id) => {
    try {
      await fetch(`${API_BASE}/voucher/history/${id}`, { method: 'DELETE' })
      message.success('History entry removed.')
      loadHistory()
    } catch { message.error('Failed to remove history entry.') }
  }

  const handleEditHistory = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/voucher/history/${id}`)
      const log = await res.json()
      if (!log) { message.error('Unable to restore this entry.'); return }
      setSchoolYear(log.school_year || '')
      setSemester(log.semester || '')
      setProgram(log.program || '')
      setCustomAmount(log.custom_amount || null)
      const students = (log.students || []).filter((s, i, self) => i === self.findIndex(t => String(t.id) === String(s.id)))
      setSelectedStudents(students)
      setPreviewStale(true)
      message.success('Previous work restored. Click Refresh Preview when ready.')
    } catch { message.error('Failed to restore entry.') }
  }

  const studentsWithVoucher = selectedStudents.filter(s => s.voucherTrackingNo)
  const filteredHistory = historySearch
    ? history.filter(h =>
        (h.program || '').toLowerCase().includes(historySearch.toLowerCase()) ||
        (h.semester || '').toLowerCase().includes(historySearch.toLowerCase()) ||
        (h.school_year || '').toLowerCase().includes(historySearch.toLowerCase()) ||
        (h.file_name || '').toLowerCase().includes(historySearch.toLowerCase()) ||
        (h.tracking_number || '').toLowerCase().includes(historySearch.toLowerCase())
      )
    : history

  const items = [
    {
      key: '1',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <EyeOutlined /> Live Preview
        </span>
      ),
      children: (
        <div style={{ height: '75vh', display: 'flex', flexDirection: 'column' }}>
          {generating ? (
            <Spin tip="Generating preview..." size="large" spinning={true}>
              <div style={{ flex: 1, minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', borderRadius: 8 }} />
            </Spin>
          ) : previewError ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff2f0', border: '2px dashed #ffccc7', borderRadius: 8 }}>
              <WarningOutlined style={{ fontSize: 40, color: '#ff4d4f', marginBottom: 12 }} />
              <Typography.Text type="danger">{previewError}</Typography.Text>
            </div>
          ) : pdfPreviewUrl ? (
            <iframe
              title="Voucher PDF Preview"
              src={pdfPreviewUrl + '#toolbar=0&navpanes=0'}
              style={{ flex: 1, width: '100%', border: '1px solid #e8e8e8', borderRadius: 8 }}
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fafafa', border: '2px dashed #d9d9d9', borderRadius: 8 }}>
              <FileTextOutlined style={{ fontSize: 60, color: '#bfbfbf', marginBottom: 16 }} />
              <Typography.Text style={{ fontSize: 16, color: '#8c8c8c' }}>
                Complete configuration and add students to preview the voucher
              </Typography.Text>
            </div>
          )}
        </div>
      ),
    },
    {
      key: '2',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <HistoryOutlined /> Generated Logs
        </span>
      ),
      children: (
        <div>
          <Input
            placeholder="Search history..."
            prefix={<SearchOutlined style={{ color: '#bbb' }} />}
            value={historySearch}
            onChange={e => setHistorySearch(e.target.value)}
            allowClear
            style={{ marginBottom: 16, maxWidth: 300 }}
          />
          {historyLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
          ) : filteredHistory.length === 0 ? (
            <Empty description="No generated vouchers yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <div style={{ maxHeight: '72vh', overflowY: 'auto' }}>
              {filteredHistory.map(log => (
                <div key={log.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 14px', background: '#fff', border: '1px solid #f0f0f0',
                  borderRadius: 8, marginBottom: 8, transition: 'all 0.2s',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span>{log.program}</span>
                      <Tag style={{ margin: 0 }}>{log.semester}</Tag>
                      <Tag style={{ margin: 0 }}>AY {log.school_year}</Tag>
                      {log.tracking_number && <Tag color="blue" style={{ margin: 0 }}>{log.tracking_number}</Tag>}
                    </div>
                    <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
                      {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                      {log.last_edited && <> · <span style={{ color: '#1890ff' }}>Edited {new Date(log.last_edited).toLocaleString()}</span></>}
                    </div>
                    {log.file_name && (
                      <a href={`${API_BASE}/voucher/download?file=${encodeURIComponent((log.file_name || '').replace(/[^A-Za-z0-9\-_ |]/g, '') + '.pdf')}`}
                        target="_blank" rel="noreferrer" style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <DownloadOutlined /> {log.file_name}
                      </a>
                    )}
                  </div>
                  <Space size="small">
                    <Button type="default" size="middle" icon={<EditOutlined />} onClick={() => handleEditHistory(log.id)}>Restore</Button>
                    <Popconfirm title="Delete this entry?" onConfirm={() => handleDeleteHistory(log.id)}>
                      <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    }
  ];

  return (
    <div style={{ padding: '0', background: '#f5f5f5', minHeight: 'calc(100vh - 72px)', display: 'flex', flexDirection: 'column' }}>
      
      {/* HEADER / CONFIG BAR */}
      <Card style={{ margin: 0, borderRadius: 0, borderBottom: '1px solid #e8e8e8' }} styles={{ body: { padding: '20px 24px' } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>Automated Voucher System</Title>
            <Text type="secondary">Generate completely formatted disbursement vouchers and logs</Text>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {trackingInfo && trackingInfo.initialized ? (
              <Badge status="processing" text={
                <Text type="secondary">Next No: <strong style={{ color: '#1890ff' }}>StuFAPs-{new Date().getFullYear()}-{String(trackingInfo.currentValue + 1).padStart(4, '0')}</strong></Text>
              } style={{ marginRight: 8 }} />
            ) : null}
            <Button onClick={handleClearAll}>Reset</Button>
            <Button
              icon={<SyncOutlined spin={generating} />}
              onClick={generatePreview}
              loading={generating}
              disabled={!canGenerate || accepting}
            >
              {previewStale || !pdfPreviewUrl ? 'Refresh Preview' : 'Preview Ready'}
            </Button>
            <Button
              type="primary"
              size="large"
              icon={<CheckCircleOutlined />}
              onClick={handleFinalize}
              loading={accepting}
              disabled={!canGenerate || generating || (trackingInfo && !trackingInfo.initialized)}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
            >
              Finalize & Download
            </Button>
          </div>
        </div>

        {/* Tracking Init Alert */}
        {trackingInfo && !trackingInfo.initialized && (
          <Alert
            type="warning" showIcon style={{ marginBottom: 16 }}
            message="Required: Set Tracking Initializer"
            description={
              <Space style={{ marginTop: 8 }}>
                <span>Starting sequence number:</span>
                <InputNumber min={1} value={trackingStartInput} onChange={setTrackingStartInput} />
                <Button type="primary" size="small" loading={settingTracking} onClick={handleSetTrackingStart}>Initialize</Button>
              </Space>
            }
          />
        )}

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <Text type="secondary" style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Program</Text>
            <Select style={{ width: '100%' }} size="large" showSearch value={program} onChange={(v) => handleConfigChange(setProgram, v)} options={programs.map(p => ({ value: p, label: p }))} />
          </div>
          <div style={{ flex: '0 1 160px' }}>
            <Text type="secondary" style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Semester</Text>
            <Select style={{ width: '100%' }} size="large" value={semester} onChange={(v) => handleConfigChange(setSemester, v)} options={[{ value: 'First', label: '1st Sem' }, { value: 'Second', label: '2nd Sem' }]} />
          </div>
          <div style={{ flex: '0 1 160px' }}>
            <Text type="secondary" style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Academic Year</Text>
            <Select style={{ width: '100%' }} size="large" value={schoolYear} onChange={(v) => handleConfigChange(setSchoolYear, v)} options={years.map(y => ({ value: y, label: `AY ${y}` }))} />
          </div>
          <div style={{ flex: '0 1 160px' }}>
            <Text type="secondary" style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Per Student (₱)</Text>
            <InputNumber style={{ width: '100%' }} size="large" value={customAmount} onChange={setCustomAmount} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </div>
        </div>
      </Card>

      {/* BODY GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', flex: 1 }}>
        
        {/* LEFT BAR: STUDENTS */}
        <div style={{ borderRight: '1px solid #e8e8e8', background: '#fff', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Text strong style={{ fontSize: 15, whiteSpace: 'nowrap' }}>
                <TeamOutlined style={{ marginRight: 8, color: '#1677ff' }} />Beneficiaries
              </Text>
              {selectedStudents.length > 0 && selectedStudents[0].nta && (
                <Tag color="blue" style={{ fontSize: 12, padding: '1px 8px', fontWeight: 600, margin: 0, flexShrink: 0 }}>
                  {selectedStudents[0].nta}
                </Tag>
              )}
            </div>
            <AutoComplete
              ref={autocompleteRef}
              style={{ width: '100%' }}
              size="large"
              value={studentSearch}
              options={studentOptions}
              onSearch={handleStudentSearch}
              onSelect={handleSelectStudent}
              onFocus={() => handleStudentSearch('')}
              notFoundContent={studentsLoading ? 'Loading students...' : 'No students found'}
              placeholder="Search or scan ATM number..."
            />
          </div>

          <div style={{ padding: '16px 24px', background: '#fafafa', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong style={{ margin: 0 }}>Selected ({selectedStudents.length})</Text>
            {selectedStudents.length > 1 && (
              <Button size="small" type="text" onClick={toggleSort} icon={sortAsc ? <SortAscendingOutlined /> : <SortDescendingOutlined />}>
                {sortAsc ? 'A-Z' : 'Z-A'}
              </Button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 320px)', padding: '16px 24px', background: '#fcfcfc' }}>
            {selectedStudents.length === 0 ? (
              <Empty style={{ marginTop: 60 }} description="No students selected" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                {studentsWithVoucher.length > 0 && (
                  <Alert
                    type="warning"
                    showIcon
                    message="Existing voucher detected"
                    description={`${studentsWithVoucher.length} selected student(s) already have a voucher. Finalizing will overwrite the current voucher number.`}
                    style={{ marginBottom: 4 }}
                  />
                )}
                {selectedStudents.map((s, i) => {
                  const hasV = !!s.voucherTrackingNo;
                  return (
                    <div key={s.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 12px', background: hasV ? '#fffaf0' : '#fff',
                      border: hasV ? '1px solid #ffd591' : '1px solid #e8e8e8',
                      borderRadius: 6, boxShadow: '0 1px 2px rgba(0,0,0,0.01)'
                    }}>
                      <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                          <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>{i + 1}.</Text>
                          <Text strong style={{ fontSize: 13, lineHeight: 1.35 }}>{s.fullName}</Text>
                        </div>
                        <div style={{ paddingLeft: 18, marginTop: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Text type="secondary" style={{ fontSize: 11, lineHeight: 1.2 }}>{s.atmAccount || 'No ATM'}</Text>
                          {s.nta && <Text type="secondary" style={{ fontSize: 11, lineHeight: 1.2 }}>{s.nta}</Text>}
                          {hasV && (
                            <Text style={{ fontSize: 11, lineHeight: 1.2, color: '#d46b08' }}>
                              Existing voucher: {s.voucherTrackingNo} (will be overwritten)
                            </Text>
                          )}
                        </div>
                      </div>
                      <Button type="text" danger size="small" icon={<CloseOutlined />} onClick={() => removeStudent(String(s.id))} />
                    </div>
                  )
                })}
              </Space>
            )}
          </div>
        </div>

        {/* RIGHT BAR: PREVIEW / HISTORY */}
        <div style={{ padding: '24px' }}>
          <Card 
            size="small"
            style={{ height: '100%', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            styles={{ body: { padding: '8px 24px 24px' } }}
          >
            <Tabs items={items} defaultActiveKey="1" tabBarExtraContent={generating ? <Text type="secondary" style={{ fontSize: 12 }}><SyncOutlined spin /> Syncing</Text> : null} />
          </Card>
        </div>

      </div>
    </div>
  )
}
