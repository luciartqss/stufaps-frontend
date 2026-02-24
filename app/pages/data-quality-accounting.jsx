import { Typography, Table, Input, DatePicker, Button, message, Tag, Switch, Space, Pagination, Select, Card, Empty, Divider, Tooltip } from 'antd'
import { SaveOutlined, SearchOutlined, CheckCircleOutlined, WarningOutlined, ClearOutlined, FilterOutlined, EditOutlined, UndoOutlined } from '@ant-design/icons'
import { useEffect, useState, useCallback, useMemo, useRef, memo } from 'react'
import { API_BASE } from '../lib/config'
import dayjs from 'dayjs'

const { Title, Text } = Typography

// ── Debounced Input: only syncs to parent on blur or Enter ──
const EditableInput = memo(function EditableInput({ value, onChange, placeholder }) {
  const [local, setLocal] = useState(value || '')
  const valueRef = useRef(value)

  // Sync from parent when value changes externally (bulk edit, save/refetch)
  useEffect(() => {
    valueRef.current = value
    setLocal(value || '')
  }, [value])

  const commit = () => {
    if (local !== (valueRef.current || '')) onChange(local)
  }

  return (
    <Input
      size="small"
      value={local}
      placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onPressEnter={commit}
      style={{ fontSize: 13 }}
    />
  )
})

// ── DatePicker wrapper: commits immediately (no typing lag since it's a picker) ──
const EditableDatePicker = memo(function EditableDatePicker({ value, onChange }) {
  return (
    <DatePicker
      size="small"
      value={value ? dayjs(value) : null}
      onChange={(_, dateStr) => onChange(dateStr || null)}
      style={{ width: '100%', fontSize: 13 }}
      format="YYYY-MM-DD"
      placeholder="Pick date"
    />
  )
})

// ── Search input: local state only, commits via onSearch callback ──
const SearchInput = memo(function SearchInput({ onSearch, disabled }) {
  const [local, setLocal] = useState('')
  return (
    <>
      <Input
        placeholder="Search name or award no."
        prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onPressEnter={() => onSearch(local)}
        style={{ width: 220 }}
        allowClear
        disabled={disabled}
      />
      <Button onClick={() => onSearch(local)} disabled={disabled}>Search</Button>
    </>
  )
})

export default function DataQualityAccounting({ readOnly = false }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showMissingOnly, setShowMissingOnly] = useState(true)
  const [editedRows, setEditedRows] = useState({})
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [hasQueried, setHasQueried] = useState(false)
  const [autoFillDate, setAutoFillDate] = useState(true)
  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [bulkDate, setBulkDate] = useState(null)
  const [bulkVoucherNo, setBulkVoucherNo] = useState('')
  const [undoStack, setUndoStack] = useState([])

  // Filters
  const [filterOptions, setFilterOptions] = useState({ academic_years: [], semesters: [], scholarship_programs: [] })
  const [academicYear, setAcademicYear] = useState(null)
  const [semester, setSemester] = useState(null)
  const [scholarshipProgram, setScholarshipProgram] = useState(null)

  const filtersReady = academicYear && semester && scholarshipProgram

  // Keep a ref to data + editedRows so callbacks don't need them as deps
  const dataRef = useRef(data)
  dataRef.current = data
  const editedRef = useRef(editedRows)
  editedRef.current = editedRows
  const searchRef = useRef('')
  const autoFillDateRef = useRef(true)
  autoFillDateRef.current = autoFillDate

  // Fetch filter options once
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const res = await fetch(`${API_BASE}/disbursements/accounting/filter-options`)
        if (res.ok) setFilterOptions(await res.json())
      } catch (err) {
        console.error('Failed to fetch filter options:', err)
      }
    }
    fetchFilterOptions()
  }, [])

  const fetchData = useCallback(async (page = 1, perPage = null) => {
    if (!filtersReady) return
    setLoading(true)
    setHasQueried(true)
    try {
      const ps = perPage || pagination.pageSize
      const params = new URLSearchParams({
        page,
        per_page: ps,
        filter: showMissingOnly ? 'missing' : 'all',
        academic_year: academicYear,
        semester: semester,
        scholarship_program: scholarshipProgram,
      })
      if (searchRef.current) params.append('search', searchRef.current)

      const res = await fetch(`${API_BASE}/disbursements/accounting?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()

      setData(json.data || [])
      setPagination(prev => ({ ...prev, current: json.current_page || page, total: json.total || 0 }))
    } catch (err) {
      console.error(err)
      message.error('Failed to load accounting data')
    } finally {
      setLoading(false)
    }
  }, [showMissingOnly, pagination.pageSize, academicYear, semester, scholarshipProgram])

  // Auto-fetch when all 3 required filters are set
  useEffect(() => {
    if (filtersReady) {
      setEditedRows({})
      fetchData(1)
    } else {
      setData([])
      setHasQueried(false)
      setPagination(prev => ({ ...prev, current: 1, total: 0 }))
    }
  }, [academicYear, semester, scholarshipProgram, showMissingOnly])

  const handleSearch = useCallback((value) => {
    if (value !== undefined) searchRef.current = value
    if (filtersReady) fetchData(1)
  }, [fetchData, filtersReady])

  // Stable callback — uses refs so it never changes identity
  const handleFieldChange = useCallback((disbursementId, field, value) => {
    setEditedRows(prev => {
      const existing = prev[disbursementId] || {}

      // QoL: Auto-fill today's date when voucher_no is entered & date is still empty
      if (field === 'voucher_no' && value && autoFillDateRef.current) {
        const record = dataRef.current.find(r => r.id === disbursementId)
        const hasDate = existing.voucher_date || record?.voucher_date
        if (!hasDate) {
          return {
            ...prev,
            [disbursementId]: {
              ...existing,
              voucher_no: value,
              voucher_date: dayjs().format('YYYY-MM-DD'),
            },
          }
        }
      }

      return {
        ...prev,
        [disbursementId]: { ...existing, [field]: value },
      }
    })
  }, []) // stable — no deps needed thanks to refs + functional setState

  const handleSaveAll = useCallback(async () => {
    const ids = Object.keys(editedRef.current)
    if (ids.length === 0) return message.info('No changes to save')

    setSaving(true)
    try {
      const updates = ids.map(id => ({ id: Number(id), ...editedRef.current[id] }))
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
      const res = await fetch(`${API_BASE}/disbursements/accounting/bulk-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(storedUser?.id ? { 'X-User-Id': String(storedUser.id) } : {}) },
        body: JSON.stringify({ updates }),
      })
      if (!res.ok) throw new Error('Failed to save')
      const json = await res.json()
      message.success(json.message || 'Saved successfully')
      setEditedRows({})
      fetchData(pagination.current)
    } catch (err) {
      console.error(err)
      message.error('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }, [fetchData, pagination.current])

  const handleClearFilters = useCallback(() => {
    searchRef.current = ''
    setAcademicYear(null)
    setSemester(null)
    setScholarshipProgram(null)
    setShowMissingOnly(true)
    setSelectedRowKeys([])
    setBulkDate(null)
    setBulkVoucherNo('')
    setData([])
    setHasQueried(false)
    setEditedRows({})
  }, [])

  const handleApplyDate = useCallback(() => {
    if (!bulkDate) return message.info('Pick a date first')
    if (selectedRowKeys.length === 0) return message.info('Select at least one row')

    const dateStr = dayjs(bulkDate).format('YYYY-MM-DD')
    setEditedRows(prev => {
      const next = { ...prev }
      selectedRowKeys.forEach(id => {
        const existing = next[id] || {}
        next[id] = { ...existing, voucher_date: dateStr }
      })
      return next
    })

    message.success(`Date applied to ${selectedRowKeys.length} record${selectedRowKeys.length !== 1 ? 's' : ''}`)
  }, [bulkDate, selectedRowKeys])

  const handleApplyBulk = useCallback(() => {
    if (selectedRowKeys.length === 0) return message.info('Select at least one row')
    if (!bulkVoucherNo && !bulkDate) return message.info('Enter a voucher no. or pick a date')

    // Save current state for undo
    setUndoStack(prev => [...prev, editedRef.current])

    setEditedRows(prev => {
      const next = { ...prev }
      selectedRowKeys.forEach(id => {
        const existing = next[id] || {}
        const updates = { ...existing }
        if (bulkVoucherNo) updates.voucher_no = bulkVoucherNo
        if (bulkDate) updates.voucher_date = dayjs(bulkDate).format('YYYY-MM-DD')
        else if (bulkVoucherNo && autoFillDateRef.current) {
          const record = dataRef.current.find(r => r.id === id)
          if (!existing.voucher_date && !record?.voucher_date) {
            updates.voucher_date = dayjs().format('YYYY-MM-DD')
          }
        }
        next[id] = updates
      })
      return next
    })

    const parts = []
    if (bulkVoucherNo) parts.push('voucher no.')
    if (bulkDate) parts.push('date')
    message.success(`Applied ${parts.join(' & ')} to ${selectedRowKeys.length} record${selectedRowKeys.length !== 1 ? 's' : ''}`)
  }, [bulkVoucherNo, bulkDate, selectedRowKeys])

  const handleUndo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev
      const next = [...prev]
      const last = next.pop()
      setEditedRows(last)
      message.info('Last action undone')
      return next
    })
  }, [])

  // ── Columns — no dependency on editedRows, so they stay stable ──
  const columns = useMemo(() => [
    {
      title: '#',
      width: 60,
      fixed: 'left',
      render: (_, __, index) => {
        const offset = ((pagination.current || 1) - 1) * (pagination.pageSize || 10)
        return <Text style={{ fontSize: 12, color: '#8c8c8c' }}>{offset + index + 1}</Text>
      },
    },
    {
      title: 'Award No.',
      dataIndex: ['student', 'award_number'],
      width: 130,
      fixed: 'left',
      render: (val) => <Text strong style={{ fontSize: 13 }}>{val || '—'}</Text>,
    },
    {
      title: 'Full Name',
      key: 'full_name',
      width: 280,
      render: (_, record) => {
        const s = record.student || {}
        const name = s.surname
          ? `${s.surname}, ${s.first_name || ''}${s.middle_name ? ' ' + s.middle_name : ''}${s.extension ? ' ' + s.extension : ''}`
          : '—'
        return <Text style={{ fontSize: 13 }}>{name}</Text>
      },
    },
    {
      title: 'School',
      dataIndex: ['student', 'name_of_institution'],
      width: 200,
      ellipsis: { showTitle: false },
      render: (val) => (
        <Tooltip placement="topLeft" title={val || '—'}>
          <Text style={{ fontSize: 13 }}>{val || '—'}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Course',
      dataIndex: ['student', 'degree_program'],
      width: 160,
      ellipsis: { showTitle: false },
      render: (val) => (
        <Tooltip placement="topLeft" title={val || '—'}>
          <Text style={{ fontSize: 13 }}>{val || '—'}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Voucher No.',
      key: 'voucher_no',
      width: 160,
      render: (_, record) => readOnly
        ? <Text style={{ fontSize: 13 }}>{record.voucher_no || '—'}</Text>
        : (
          <EditableInput
            value={record.voucher_no}
            placeholder="Enter voucher no."
            onChange={(val) => handleFieldChange(record.id, 'voucher_no', val)}
          />
        ),
    },
    {
      title: 'Voucher Date',
      key: 'voucher_date',
      width: 170,
      render: (_, record) => readOnly
        ? <Text style={{ fontSize: 13 }}>{record.voucher_date || '—'}</Text>
        : (
          <EditableDatePicker
            value={record.voucher_date}
            onChange={(val) => handleFieldChange(record.id, 'voucher_date', val)}
          />
        ),
    },
    {
      title: 'Account/Check No.',
      key: 'account_check_no',
      width: 160,
      render: (_, record) => readOnly
        ? <Text style={{ fontSize: 13 }}>{record.account_check_no || '—'}</Text>
        : (
          <EditableInput
            value={record.account_check_no}
            placeholder="Enter check no."
            onChange={(val) => handleFieldChange(record.id, 'account_check_no', val)}
          />
        ),
    },
    {
      title: 'Status',
      key: 'accounting_status',
      width: 100,
      align: 'center',
      render: (_, record) => {
        const v = record.voucher_no
        const d = record.voucher_date
        const c = record.account_check_no
        const complete = v && d && c
        return complete
          ? <Tag color="green" icon={<CheckCircleOutlined />}>Done</Tag>
          : <Tag color="orange" icon={<WarningOutlined />}>Pending</Tag>
      },
    },
  ], [handleFieldChange, pagination.current, pagination.pageSize, readOnly])

  // Merge edits onto data so the table reflects pending changes (e.g. auto-filled date)
  const mergedData = useMemo(() => {
    if (Object.keys(editedRows).length === 0) return data
    return data.map(row => {
      const edits = editedRows[row.id]
      if (!edits) return row
      return { ...row, ...edits }
    })
  }, [data, editedRows])

  const editCount = Object.keys(editedRows).length

  return (
    <div style={{ background: '#fafbfc', minHeight: '100vh', margin: -24 }}>
      {/* Header */}
      <div style={{ padding: '24px 24px 16px', background: '#fff', borderBottom: '1px solid #e8eaed' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
              Accounting — Voucher Entry
            </Title>
            <Text style={{ color: '#6b7280', fontSize: 14 }}>
              Select Academic Year, Semester, and Scholarship Program to begin
            </Text>
          </div>
          {!readOnly && filtersReady && editCount > 0 && (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveAll}
              loading={saving}
              size="large"
            >
              Save Changes ({editCount})
            </Button>
          )}
        </div>

        {/* Required Filters */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Select
            placeholder="Academic Year *"
            value={academicYear}
            onChange={setAcademicYear}
            allowClear
            style={{ width: 170 }}
            options={filterOptions.academic_years.map(v => ({ label: v, value: v }))}
          />
          <Select
            placeholder="Semester *"
            value={semester}
            onChange={setSemester}
            allowClear
            style={{ width: 150 }}
            options={filterOptions.semesters.map(v => ({ label: v, value: v }))}
          />
          <Select
            placeholder="Scholarship Program *"
            value={scholarshipProgram}
            onChange={setScholarshipProgram}
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 260 }}
            options={filterOptions.scholarship_programs.map(v => ({ label: v, value: v }))}
          />

          <Divider type="vertical" style={{ height: 28 }} />

          <SearchInput onSearch={handleSearch} disabled={!filtersReady} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 13, color: '#6b7280' }}>Missing only</Text>
            <Switch checked={showMissingOnly} onChange={setShowMissingOnly} size="small" />
          </div>
          {!readOnly && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 13, color: '#6b7280' }}>Auto-fill date</Text>
              <Switch checked={autoFillDate} onChange={setAutoFillDate} size="small" />
            </div>
          )}

          {(academicYear || semester || scholarshipProgram) && (
            <Button icon={<ClearOutlined />} size="small" onClick={handleClearFilters} type="text" danger>
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Context Banner — shows when filters are active */}
      {filtersReady && (
        <div style={{ padding: '10px 24px', background: '#f0f5ff', borderBottom: '1px solid #d6e4ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space split={<Divider type="vertical" />}>
            <Text style={{ fontSize: 13 }}><Text strong>AY:</Text> {academicYear}</Text>
            <Text style={{ fontSize: 13 }}><Text strong>Semester:</Text> {semester}</Text>
            <Text style={{ fontSize: 13 }}><Text strong>Program:</Text> {scholarshipProgram}</Text>
          </Space>
          <Text style={{ fontSize: 13, color: '#8c8c8c' }}>
            {pagination.total} record{pagination.total !== 1 ? 's' : ''}
            {!readOnly && editCount > 0 && <span style={{ color: '#1677ff', marginLeft: 12, fontWeight: 500 }}>{editCount} unsaved</span>}
          </Text>
          {!readOnly && undoStack.length > 0 && (
            <Button
              size="small"
              icon={<UndoOutlined />}
              onClick={handleUndo}
              style={{ marginLeft: 8 }}
            >
              Undo
            </Button>
          )}
        </div>
      )}

      {/* Read-only Banner */}
      {readOnly && filtersReady && (
        <div style={{ padding: '8px 24px', background: '#fff7e6', borderBottom: '1px solid #ffd591', textAlign: 'center' }}>
          <Text style={{ fontSize: 13, color: '#d46b08' }}>You have view-only access to this section. Editing is disabled.</Text>
        </div>
      )}

      {/* Bulk Actions Bar — visible when rows are selected */}
      {!readOnly && filtersReady && selectedRowKeys.length > 0 && (
        <div style={{ padding: '10px 24px', background: '#fffbe6', borderBottom: '1px solid #ffe58f', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <EditOutlined style={{ color: '#d48806', fontSize: 14 }} />
          <Text strong style={{ fontSize: 13, color: '#d48806' }}>{selectedRowKeys.length} selected</Text>
          <Divider type="vertical" style={{ height: 20 }} />
          <Input
            size="small"
            placeholder="Voucher No."
            value={bulkVoucherNo}
            onChange={(e) => setBulkVoucherNo(e.target.value)}
            style={{ width: 150 }}
          />
          <DatePicker
            size="small"
            value={bulkDate}
            onChange={(date) => setBulkDate(date)}
            format="YYYY-MM-DD"
            placeholder="Voucher Date"
            style={{ width: 140 }}
          />
          <Button
            size="small"
            type="primary"
            onClick={handleApplyBulk}
            disabled={!bulkVoucherNo && !bulkDate}
          >
            Apply to Selected
          </Button>
          <Button
            size="small"
            type="text"
            onClick={() => setSelectedRowKeys([])}
          >
            Clear Selection
          </Button>
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '16px 24px' }}>
        {!filtersReady ? (
          <Card style={{ borderRadius: 12, textAlign: 'center', padding: '60px 0' }}>
            <FilterOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
            <Title level={4} style={{ color: '#8c8c8c', fontWeight: 400, margin: 0 }}>
              Select all three filters to load records
            </Title>
            <Text style={{ color: '#bfbfbf', fontSize: 14 }}>
              Academic Year, Semester, and Scholarship Program are required
            </Text>
          </Card>
        ) : (
          <>
            <Table
              dataSource={mergedData}
              columns={columns}
              rowKey="id"
              loading={loading}
              rowSelection={readOnly ? undefined : {
                selectedRowKeys,
                onChange: setSelectedRowKeys,
                columnWidth: 40,
              }}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
                size: 'small',
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
                onChange: (page, pageSize) => {
                  setPagination(prev => ({ ...prev, current: page, pageSize }))
                  fetchData(page, pageSize)
                },
                onShowSizeChange: (_, size) => {
                  setPagination(prev => ({ ...prev, pageSize: size, current: 1 }))
                  fetchData(1, size)
                },
              }}
              scroll={{ x: 1500 }}
              size="small"
              bordered
              style={{ background: '#fff', borderRadius: 8 }}
              rowClassName={(record) => editedRows[record.id] ? 'ant-table-row-edited' : ''}
              locale={{ emptyText: hasQueried ? <Empty description="No disbursement records found for this selection" /> : undefined }}
            />
          </>
        )}
      </div>
    </div>
  )
}
