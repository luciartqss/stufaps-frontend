import {
  Typography, Card, Select, InputNumber, Input, Button, Tag, Empty,
  Spin, message, Modal, Descriptions, Popconfirm, Space, AutoComplete, Divider, Alert
} from 'antd'
import {
  FileTextOutlined, DownloadOutlined, PrinterOutlined, DeleteOutlined,
  EditOutlined, CloseOutlined, SortAscendingOutlined,
  SortDescendingOutlined, SearchOutlined, ReloadOutlined
} from '@ant-design/icons'
import { useState, useEffect, useCallback, useRef } from 'react'
import { API_BASE } from '../lib/config'

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
  // ─── Config state ───
  const [programs, setPrograms] = useState([])
  const [years, setYears] = useState([])
  const [program, setProgram] = useState('')
  const [schoolYear, setSchoolYear] = useState('')
  const [semester, setSemester] = useState('First')
  const [customAmount, setCustomAmount] = useState(null)

  // ─── Students state ───
  const [availableStudents, setAvailableStudents] = useState([])
  const [selectedStudents, setSelectedStudents] = useState([])
  const [studentSearch, setStudentSearch] = useState('')
  const [sortAsc, setSortAsc] = useState(true)
  const [studentOptions, setStudentOptions] = useState([])

  // ─── Voucher / generate state ───
  const [generating, setGenerating] = useState(false)
  const [voucherData, setVoucherData] = useState(null)

  // ─── History state ───
  const [history, setHistory] = useState([])
  const [historySearch, setHistorySearch] = useState('')
  const [historyLoading, setHistoryLoading] = useState(false)

  // ─── Tracking number init ───
  const [trackingInfo, setTrackingInfo] = useState(null)
  const [trackingStartInput, setTrackingStartInput] = useState(1)
  const [settingTracking, setSettingTracking] = useState(false)

  const searchTimerRef = useRef(null)

  // ─── Load programs, years, history, tracking info on mount ───
  useEffect(() => {
    fetchPrograms()
    fetchYears()
    loadHistory()
    loadTrackingInfo()
  }, [])

  // ─── Reload students when program/year/semester changes ───
  useEffect(() => {
    if (program) loadStudents()
    // eslint-disable-next-line
  }, [program, schoolYear, semester])

  // ─── Auto-set custom amount when program changes ───
  useEffect(() => {
    if (program && PROGRAM_AMOUNTS[program]) {
      setCustomAmount(PROGRAM_AMOUNTS[program])
    } else {
      setCustomAmount(null)
    }
  }, [program])

  // ─── API calls ───
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

  const loadStudents = async () => {
    try {
      let url = `${API_BASE}/voucher/students?program=${encodeURIComponent(program)}`
      if (schoolYear) url += `&ay=${encodeURIComponent(schoolYear)}`
      if (semester) url += `&semester=${encodeURIComponent(semester)}`
      const res = await fetch(url)
      const data = await res.json()
      setAvailableStudents(data || [])
    } catch { setAvailableStudents([]) }
  }

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

  // ─── Student search / autocomplete ───
  const handleStudentSearch = useCallback((value) => {
    setStudentSearch(value)
    clearTimeout(searchTimerRef.current)

    const query = value.toLowerCase().trim()
    const selectedIds = new Set(selectedStudents.map(s => String(s.id)))

    if (availableStudents.length > 0) {
      const filtered = query === ''
        ? availableStudents
        : availableStudents.filter(s =>
            s.fullName.toLowerCase().includes(query) ||
            (s.atmAccount && s.atmAccount.toLowerCase().includes(query))
          )
      setStudentOptions(
        filtered
          .filter(s => !selectedIds.has(String(s.id)))
          .slice(0, 50)
          .map(s => ({
            value: String(s.id),
            label: `${s.fullName} (${s.atmAccount || 'No ATM'})`,
            student: s,
          }))
      )
    } else if (query) {
      searchTimerRef.current = setTimeout(async () => {
        let url = `${API_BASE}/voucher/students?program=${encodeURIComponent(program)}&q=${encodeURIComponent(query)}`
        if (schoolYear) url += `&ay=${encodeURIComponent(schoolYear)}`
        if (semester) url += `&semester=${encodeURIComponent(semester)}`
        try {
          const res = await fetch(url)
          const list = await res.json()
          setStudentOptions(
            (list || [])
              .filter(s => !selectedIds.has(String(s.id)))
              .slice(0, 50)
              .map(s => ({
                value: String(s.id),
                label: `${s.fullName} (${s.atmAccount || 'No ATM'})`,
                student: s,
              }))
          )
        } catch { /* ignore */ }
      }, 300)
    }
  }, [availableStudents, selectedStudents, program, schoolYear, semester])

  const handleSelectStudent = useCallback((value, option) => {
    const student = option.student
    if (!selectedStudents.some(s => String(s.id) === String(student.id))) {
      setSelectedStudents(prev => [...prev, student])
    }
    setStudentSearch('')
    setStudentOptions([])
  }, [selectedStudents])

  const removeStudent = useCallback((id) => {
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

  // ─── Config change guard ───
  const handleConfigChange = useCallback((setter, value) => {
    if (selectedStudents.length > 0) {
      Modal.confirm({
        title: 'Clear students?',
        content: 'Changing this will clear your selected students. Continue?',
        onOk: () => {
          setter(value)
          setSelectedStudents([])
          setVoucherData(null)
        },
      })
    } else {
      setter(value)
    }
  }, [selectedStudents])

  // ─── Set tracking start ───
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

  // ─── Generate ───
  const handleGenerate = async () => {
    if (selectedStudents.length === 0) {
      message.warning('Please add at least one student.')
      return
    }
    if (!schoolYear || !semester || !program) {
      message.error('Please complete all required fields.')
      return
    }
    if (!customAmount) {
      message.error('Please enter an amount.')
      return
    }

    // Check tracking is initialized
    if (trackingInfo && !trackingInfo.initialized) {
      message.error('Please set the voucher tracking starting number first.')
      return
    }

    setGenerating(true)
    try {
      const uniqueStudents = selectedStudents.filter(
        (s, i, self) => i === self.findIndex(t => String(t.id) === String(s.id))
      )
      const res = await fetch(`${API_BASE}/voucher/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolYear,
          semester,
          scholarshipProgram: program,
          customAmount,
          students: uniqueStudents,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setVoucherData(data)
      message.success('Voucher generated successfully!')
      loadHistory()
      loadTrackingInfo()
    } catch (err) {
      message.error('Error: ' + (err.message || 'Unknown error'))
    }
    setGenerating(false)
  }

  // ─── New voucher (reset) ───
  const handleNewVoucher = () => {
    Modal.confirm({
      title: 'New Voucher',
      content: 'Start a new voucher? All current inputs and selections will be cleared.',
      onOk: () => {
        setSelectedStudents([])
        setVoucherData(null)
        setStudentSearch('')
      },
    })
  }

  // ─── Delete history ───
  const handleDeleteHistory = async (id) => {
    try {
      await fetch(`${API_BASE}/voucher/history/${id}`, { method: 'DELETE' })
      message.success('History entry removed.')
      loadHistory()
    } catch {
      message.error('Failed to remove history entry.')
    }
  }

  // ─── Restore history entry ───
  const handleEditHistory = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/voucher/history/${id}`)
      const log = await res.json()
      if (!log) { message.error('Unable to restore this entry.'); return }
      setSchoolYear(log.school_year || '')
      setSemester(log.semester || '')
      setProgram(log.program || '')
      setCustomAmount(log.custom_amount || null)
      const students = (log.students || []).filter(
        (s, i, self) => i === self.findIndex(t => String(t.id) === String(s.id))
      )
      setSelectedStudents(students)
      setVoucherData(null)
      message.success('Previous work restored.')
    } catch {
      message.error('Failed to restore entry.')
    }
  }

  // ─── Download ───
  const handleDownload = () => {
    if (voucherData?.downloadFile) {
      window.open(`${API_BASE}/voucher/download?file=${encodeURIComponent(voucherData.downloadFile)}`, '_blank')
    }
  }

  // ─── Filtered history ───
  const filteredHistory = historySearch
    ? history.filter(h =>
        (h.program || '').toLowerCase().includes(historySearch.toLowerCase()) ||
        (h.semester || '').toLowerCase().includes(historySearch.toLowerCase()) ||
        (h.school_year || '').toLowerCase().includes(historySearch.toLowerCase()) ||
        (h.file_name || '').toLowerCase().includes(historySearch.toLowerCase())
      )
    : history

  // ─── Peso formatter ───
  const peso = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div style={{ padding: 24 }}>
      <Title level={2} style={{ margin: 0, marginBottom: 24 }}>StuFAPs Automated Voucher System</Title>

      {/* ─── Tracking Number Init Alert ─── */}
      {trackingInfo && !trackingInfo.initialized && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
          message="Voucher Tracking Number Not Initialized"
          description={
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <Text>Enter the starting voucher tracking number:</Text>
              <InputNumber
                min={1}
                value={trackingStartInput}
                onChange={setTrackingStartInput}
                style={{ width: 150 }}
                placeholder="e.g. 42"
              />
              <Button
                type="primary"
                loading={settingTracking}
                onClick={handleSetTrackingStart}
              >
                Set Starting Number
              </Button>
            </div>
          }
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
        {/* ═══════ LEFT PANEL: Configuration ═══════ */}
        <div>
          <Card title="Configuration" size="small">
            {/* Academic Year */}
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 4 }}>Academic Year</Text>
              <Select
                style={{ width: '100%' }}
                value={schoolYear}
                onChange={(val) => handleConfigChange(setSchoolYear, val)}
                options={years.map(y => ({ value: y, label: `AY ${y}` }))}
                placeholder="Select academic year"
              />
            </div>

            {/* Semester */}
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 4 }}>Semester</Text>
              <Select
                style={{ width: '100%' }}
                value={semester}
                onChange={(val) => handleConfigChange(setSemester, val)}
                options={[
                  { value: 'First', label: '1st Semester' },
                  { value: 'Second', label: '2nd Semester' },
                ]}
              />
            </div>

            {/* Scholarship Program */}
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 4 }}>Scholarship Program</Text>
              <Select
                style={{ width: '100%' }}
                value={program}
                onChange={(val) => handleConfigChange(setProgram, val)}
                showSearch
                options={programs.map(p => ({ value: p, label: p }))}
                placeholder="Select program"
              />
            </div>

            {/* Custom Amount */}
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 4 }}>Amount</Text>
              <InputNumber
                style={{ width: '100%' }}
                value={customAmount}
                onChange={setCustomAmount}
                placeholder="Enter amount"
                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={v => v.replace(/,/g, '')}
              />
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                Defaults to program amount. Override if needed.
              </Text>
            </div>

            {/* Student Search */}
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 4 }}>Add Students</Text>
              <AutoComplete
                style={{ width: '100%' }}
                value={studentSearch}
                options={studentOptions}
                onSearch={handleStudentSearch}
                onSelect={handleSelectStudent}
                onFocus={() => handleStudentSearch('')}
                placeholder="Search student by name or ATM..."
              />
            </div>

            {/* Generate & New buttons */}
            <Button
              type="primary"
              block
              style={{ marginBottom: 8, background: '#52c41a', borderColor: '#52c41a' }}
              onClick={handleGenerate}
              loading={generating}
              disabled={generating || (trackingInfo && !trackingInfo.initialized)}
            >
              Generate Documents
            </Button>
            <Button
              type="primary"
              block
              icon={<ReloadOutlined />}
              onClick={handleNewVoucher}
            >
              New Voucher
            </Button>

            {/* Selected Students */}
            <Divider style={{ margin: '16px 0 8px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text strong>Selected Students ({selectedStudents.length})</Text>
              {selectedStudents.length > 1 && (
                <Button
                  size="small"
                  icon={sortAsc ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
                  onClick={toggleSort}
                >
                  {sortAsc ? 'Sort A-Z' : 'Sort Z-A'}
                </Button>
              )}
            </div>

            {selectedStudents.length === 0 ? (
              <Text type="secondary">No students selected. Add students to generate documents.</Text>
            ) : (
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {selectedStudents.map((s, i) => (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 12px', background: '#fafafa', border: '1px solid #f0f0f0',
                      borderRadius: 6, marginBottom: 8, fontSize: 14,
                    }}
                  >
                    <div>
                      {i + 1}. {s.fullName}
                      <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginLeft: 8 }}>
                        ({s.atmAccount || 'No ATM'})
                      </span>
                    </div>
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<CloseOutlined />}
                      onClick={() => removeStudent(String(s.id))}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ═══════ RIGHT PANEL ═══════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ─── Voucher Preview ─── */}
          <Card>
            {!voucherData ? (
              <div style={{ textAlign: 'center', padding: '80px 24px', color: 'rgba(0,0,0,0.45)' }}>
                <FileTextOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <p style={{ fontSize: 16, marginBottom: 8 }}>Voucher Preview</p>
                <p style={{ fontSize: 14 }}>
                  Add students and click <strong>"Generate Documents"</strong> to see the voucher.
                </p>
              </div>
            ) : (
              <div>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ fontSize: 48, color: '#52c41a', marginBottom: 12 }}>✓</div>
                  <Title level={4} style={{ margin: 0, marginBottom: 4 }}>Voucher Generated Successfully!</Title>
                  <Text type="secondary">{voucherData.fileName}</Text>
                </div>

                <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
                  <Descriptions.Item label="Tracking No.">{voucherData.trackingNumber}</Descriptions.Item>
                  <Descriptions.Item label="Ref No.">{voucherData.refNumber}</Descriptions.Item>
                  <Descriptions.Item label="Payee">{voucherData.payee}</Descriptions.Item>
                  <Descriptions.Item label="Program">{voucherData.program}</Descriptions.Item>
                  <Descriptions.Item label="Semester">{voucherData.semester}</Descriptions.Item>
                  <Descriptions.Item label="Academic Year">{voucherData.schoolYear}</Descriptions.Item>
                  <Descriptions.Item label="No. of Students">{voucherData.studentCount}</Descriptions.Item>
                  <Descriptions.Item label="Total Amount">₱{peso(voucherData.totalAmount)}</Descriptions.Item>
                </Descriptions>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                  <Button type="primary" size="large" icon={<DownloadOutlined />} onClick={handleDownload}>
                    Download Spreadsheet
                  </Button>
                  <Button
                    size="large"
                    icon={<PrinterOutlined />}
                    onClick={() => {
                      if (voucherData?.downloadFile) {
                        window.open(`${API_BASE}/voucher/download?file=${encodeURIComponent(voucherData.downloadFile)}`, '_blank')
                      }
                    }}
                    style={{ background: '#52c41a', borderColor: '#52c41a', color: '#fff' }}
                  >
                    Open Spreadsheet
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* ─── TEST: Native Excel Preview ─── */}
          <Card
            title="🧪 Test Native Excel Export"
            size="small"
            style={{ border: '2px dashed #faad14', background: '#fffbe6' }}
            extra={<Tag color="orange">Temporary</Tag>}
          >
            <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
              Generate a native Excel voucher (Routing Slip + Tracking) using selected students and program settings.
              Uses the same data flow as "Generate Documents" — computes amounts, tracking numbers, and saves to history.
            </Text>
            <Button
              type="primary"
              style={{ background: '#faad14', borderColor: '#faad14' }}
              loading={generating}
              onClick={async () => {
                if (selectedStudents.length === 0) {
                  message.warning('Please add at least one student.')
                  return
                }
                if (!schoolYear || !semester || !program) {
                  message.error('Please complete all required fields.')
                  return
                }
                if (!customAmount) {
                  message.error('Please enter an amount.')
                  return
                }
                if (trackingInfo && !trackingInfo.initialized) {
                  message.error('Please set the voucher tracking starting number first.')
                  return
                }
                setGenerating(true)
                try {
                  const uniqueStudents = selectedStudents.filter(
                    (s, i, self) => i === self.findIndex(t => String(t.id) === String(s.id))
                  )
                  const res = await fetch(`${API_BASE}/excel/voucher`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      schoolYear,
                      semester,
                      scholarshipProgram: program,
                      customAmount,
                      students: uniqueStudents,
                    }),
                  })
                  const data = await res.json()
                  if (data.error) throw new Error(data.error)
                  setVoucherData(data)
                  message.success('Native Excel voucher generated — check preview above!')
                  loadHistory()
                  loadTrackingInfo()
                } catch (err) {
                  message.error('Error: ' + (err.message || 'Unknown error'))
                }
                setGenerating(false)
              }}
            >
              Generate Native Excel Voucher
            </Button>
          </Card>

          {/* ─── History Logs ─── */}
          <Card title="History Logs" size="small">
            <Input
              placeholder="Search history..."
              prefix={<SearchOutlined />}
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
              style={{ marginBottom: 12 }}
              allowClear
            />
            {historyLoading ? (
              <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
            ) : filteredHistory.length === 0 ? (
              <Empty description="No saved works yet." image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div style={{ maxHeight: 600, overflowY: 'auto' }}>
                {filteredHistory.map(log => (
                  <div
                    key={log.id}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 0', borderBottom: '1px solid #f0f0f0',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {log.program} | {log.semester} | AY {log.school_year}
                        {log.last_edited && <Tag color="blue">Edited</Tag>}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                        {log.tracking_number && <Tag style={{ marginRight: 8 }}>{log.tracking_number}</Tag>}
                        Created: {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                        {log.last_edited && (<><br />Last Edited: {new Date(log.last_edited).toLocaleString()}</>)}
                      </div>
                      {log.file_name && (
                        <a
                          href={`${API_BASE}/voucher/download?file=${encodeURIComponent(
                            (log.file_name || '').replace(/[^A-Za-z0-9\-_ |]/g, '') + '.xlsx'
                          )}`}
                          style={{ fontSize: 13 }}
                          target="_blank"
                          rel="noreferrer"
                        >
                          📥 {log.file_name}
                        </a>
                      )}
                    </div>
                    <Space>
                      <Button type="link" icon={<EditOutlined />} onClick={() => handleEditHistory(log.id)}>
                        Edit
                      </Button>
                      <Popconfirm
                        title="Remove this history entry?"
                        onConfirm={() => handleDeleteHistory(log.id)}
                      >
                        <Button type="link" danger icon={<DeleteOutlined />}>Delete</Button>
                      </Popconfirm>
                    </Space>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

