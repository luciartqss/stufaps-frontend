import { Typography, Table, Input, DatePicker, Button, message, Tag, Switch, Space, Pagination, Select, Card, Empty, Divider, Tooltip } from 'antd'
import { SaveOutlined, SearchOutlined, CheckCircleOutlined, WarningOutlined, ClearOutlined, FilterOutlined } from '@ant-design/icons'
import { useEffect, useState, useCallback, useMemo, useRef, memo } from 'react'
import { API_BASE } from '../lib/config'
import dayjs from 'dayjs'

const { Title, Text } = Typography

// ── Debounced Input: only syncs to parent on blur or Enter ──
const EditableInput = memo(function EditableInput({ value, onChange, placeholder }) {
  const [local, setLocal] = useState(value || '')
  const prev = useRef(value)

  // Sync from parent only if the parent value actually changed (e.g. after save/refetch)
  if (value !== prev.current) {
    prev.current = value
    if ((value || '') !== local) setLocal(value || '')
  }

  const commit = () => {
    if (local !== (value || '')) onChange(local)
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

export default function DataQualityAccounting() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showMissingOnly, setShowMissingOnly] = useState(true)
  const [editedRows, setEditedRows] = useState({})
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 })
  const [hasQueried, setHasQueried] = useState(false)

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

  const fetchData = useCallback(async (page = 1) => {
    if (!filtersReady) return
    setLoading(true)
    setHasQueried(true)
    try {
      const params = new URLSearchParams({
        page,
        per_page: pagination.pageSize,
        filter: showMissingOnly ? 'missing' : 'all',
        academic_year: academicYear,
        semester: semester,
        scholarship_program: scholarshipProgram,
      })
      if (search) params.append('search', search)

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
  }, [search, showMissingOnly, pagination.pageSize, academicYear, semester, scholarshipProgram])

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

  const handleSearch = useCallback(() => {
    if (filtersReady) fetchData(1)
  }, [fetchData, filtersReady])

  // Stable callback — uses refs so it never changes identity
  const handleFieldChange = useCallback((disbursementId, field, value) => {
    setEditedRows(prev => {
      const existing = prev[disbursementId] || {}

      // QoL: Auto-fill today's date when voucher_no is entered & date is still empty
      if (field === 'voucher_no' && value) {
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
      const res = await fetch(`${API_BASE}/disbursements/accounting/bulk-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
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
    setSearch('')
    setAcademicYear(null)
    setSemester(null)
    setScholarshipProgram(null)
    setShowMissingOnly(true)
    setData([])
    setHasQueried(false)
    setEditedRows({})
  }, [])

  // ── Columns — no dependency on editedRows, so they stay stable ──
  const columns = useMemo(() => [
    {
      title: '#',
      width: 60,
      fixed: 'left',
      render: (_, __, index) => <Text style={{ fontSize: 12, color: '#8c8c8c' }}>{index + 1}</Text>,
    },
    {
      title: 'Award No.',
      dataIndex: ['student', 'award_number'],
      width: 130,
      fixed: 'left',
      render: (val) => <Text strong style={{ fontSize: 13 }}>{val || '—'}</Text>,
    },
    {
      title: 'Full Name (Last, First Middle)',
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
      render: (_, record) => (
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
      render: (_, record) => (
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
      render: (_, record) => (
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
  ], [handleFieldChange]) // handleFieldChange is stable (no deps)

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
          {filtersReady && editCount > 0 && (
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

          <Input
            placeholder="Search name or award no."
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 220 }}
            allowClear
            disabled={!filtersReady}
          />
          <Button onClick={handleSearch} disabled={!filtersReady}>Search</Button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 13, color: '#6b7280' }}>Missing only</Text>
            <Switch checked={showMissingOnly} onChange={setShowMissingOnly} size="small" />
          </div>

          {(academicYear || semester || scholarshipProgram || search) && (
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
            {editCount > 0 && <span style={{ color: '#1677ff', marginLeft: 12, fontWeight: 500 }}>{editCount} unsaved</span>}
          </Text>
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
              pagination={false}
              scroll={{ x: 1500 }}
              size="small"
              bordered
              style={{ background: '#fff', borderRadius: 8 }}
              rowClassName={(record) => editedRows[record.id] ? 'ant-table-row-edited' : ''}
              locale={{ emptyText: hasQueried ? <Empty description="No disbursement records found for this selection" /> : undefined }}
            />
            {pagination.total > pagination.pageSize && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <Pagination
                  current={pagination.current}
                  pageSize={pagination.pageSize}
                  total={pagination.total}
                  showSizeChanger={false}
                  onChange={(page) => fetchData(page)}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
