import { useEffect, useState, useCallback } from 'react'
import { Table, Button, Tag, Typography, Space, message, Modal, Select, Tooltip, Steps, Empty, Row, Col } from 'antd'
import { UndoOutlined, FilterOutlined, ArrowRightOutlined, HistoryOutlined, ClockCircleOutlined, UserOutlined, ExclamationCircleOutlined } from '@ant-design/icons'

const { Title, Text } = Typography
const { Option } = Select

import { API_BASE as API_URL } from '../lib/config'
import { formatDisplayDate } from '../lib/dateUtils'

export function meta() {
  return [
    { title: 'Logs | StuFAPs' },
    { name: 'description', content: 'View system logs and audit trail' },
  ]
}

const ACTION_COLORS = {
  create: 'green',
  update: 'blue',
  delete: 'red',
  bulk_create: 'purple',
  bulk_update: 'cyan',
  bulk_delete: 'magenta',
}

const ACTION_LABELS = {
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
  bulk_create: 'Bulk Create',
  bulk_update: 'Bulk Update',
  bulk_delete: 'Bulk Delete',
}

// ── Student field layout for form-style display ──
const STUDENT_FIELD_GROUPS = [
  {
    title: 'Personal Information',
    fields: [
      { key: 'surname', label: 'Surname' },
      { key: 'first_name', label: 'First Name' },
      { key: 'middle_name', label: 'Middle Name' },
      { key: 'extension', label: 'Extension' },
      { key: 'sex', label: 'Sex' },
      { key: 'date_of_birth', label: 'Date of Birth' },
      { key: 'learner_reference_number', label: 'LRN' },
      { key: 'special_group', label: 'Special Group' },
    ],
  },
  {
    title: 'Contact & Address',
    fields: [
      { key: 'contact_number', label: 'Contact Number' },
      { key: 'email_address', label: 'Email Address' },
      { key: 'street_brgy', label: 'Street / Barangay' },
      { key: 'municipality_city', label: 'Municipality / City' },
      { key: 'province', label: 'Province' },
      { key: 'congressional_district', label: 'Congressional District' },
      { key: 'zip_code', label: 'Zip Code' },
      { key: 'region', label: 'Region' },
    ],
  },
  {
    title: 'Institution & Program',
    fields: [
      { key: 'name_of_institution', label: 'Institution' },
      { key: 'uii', label: 'UII' },
      { key: 'institutional_type', label: 'Institutional Type' },
      { key: 'degree_program', label: 'Degree Program' },
      { key: 'program_major', label: 'Major' },
      { key: 'program_discipline', label: 'Discipline' },
      { key: 'program_degree_level', label: 'Degree Level' },
    ],
  },
  {
    title: 'Scholarship Details',
    fields: [
      { key: 'in_charge', label: 'In Charge' },
      { key: 'award_year', label: 'Award Year' },
      { key: 'scholarship_program', label: 'Scholarship Program' },
      { key: 'award_number', label: 'Award Number' },
      { key: 'certification_number', label: 'Certification No.' },
      { key: 'authority_type', label: 'Authority Type' },
      { key: 'authority_number', label: 'Authority Number' },
      { key: 'series', label: 'Series' },
      { key: 'is_priority', label: 'Priority' },
      { key: 'basis_cmo', label: 'Basis CMO' },
      { key: 'scholarship_status', label: 'Status' },
      { key: 'replacement_info', label: 'Replacement Info' },
      { key: 'termination_reason', label: 'Termination Reason' },
    ],
  },
]

// ── Helper: version badge ──
const VersionBadge = ({ version, color = '#8c8c8c' }) => (
  <Tag style={{ fontSize: 11, fontWeight: 600, borderRadius: 10, padding: '0 8px', color, borderColor: color, background: 'transparent' }}>
    v{version}
  </Tag>
)

// ── Helper: version transition ──
const VersionTransition = ({ from, to, action }) => {
  if (!to && to !== 0) return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>
  const toColor = action === 'delete' ? '#ff4d4f' : '#0032a0'
  return (
    <Space size={4} style={{ whiteSpace: 'nowrap' }}>
      {from ? <VersionBadge version={from} /> : null}
      {from ? <ArrowRightOutlined style={{ fontSize: 9, color: '#bfbfbf' }} /> : null}
      <VersionBadge version={to} color={toColor} />
    </Space>
  )
}

// ── Form-style field renderer for create/delete ──
const RecordFormView = ({ data, action }) => {
  if (!data) return <Text type="secondary" style={{ padding: 12, display: 'block' }}>No data recorded</Text>

  const valueColor = action === 'delete' ? '#ff4d4f' : '#52c41a'

  return (
    <div style={{ padding: '16px 20px' }}>
      {STUDENT_FIELD_GROUPS.map(group => {
        const hasAnyValue = group.fields.some(f => data[f.key] !== null && data[f.key] !== undefined && data[f.key] !== '')
        if (!hasAnyValue && action === 'create') return null

        return (
          <div key={group.title} style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 13, color: '#0032a0', display: 'block', marginBottom: 8, borderBottom: '1px solid #f0f0f0', paddingBottom: 4 }}>
              {group.title}
            </Text>
            <Row gutter={[16, 4]}>
              {group.fields.map(field => {
                const val = data[field.key]
                const isEmpty = val === null || val === undefined || val === ''
                return (
                  <Col xs={24} sm={12} md={8} key={field.key}>
                    <div style={{ marginBottom: 6 }}>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{field.label}</Text>
                      {isEmpty ? (
                        <Text italic style={{ fontSize: 12, color: '#d9d9d9' }}>Incomplete</Text>
                      ) : (
                        <Text style={{ fontSize: 12, color: valueColor }}>{String(val)}</Text>
                      )}
                    </div>
                  </Col>
                )
              })}
            </Row>
          </div>
        )
      })}
    </div>
  )
}

export default function LogsIndex() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [filters, setFilters] = useState({ entity_type: null, action: null })
  const [expandedRows, setExpandedRows] = useState([])

  // Timeline modal
  const [timelineModal, setTimelineModal] = useState({ visible: false, entityType: null, entityId: null, data: [], loading: false })

  // ── Fetch paginated logs ──
  const fetchLogs = useCallback(async (page = 1, pageSize = 20) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', page)
      params.set('per_page', pageSize)
      if (filters.entity_type) params.set('entity_type', filters.entity_type)
      if (filters.action) params.set('action', filters.action)

      const res = await fetch(`${API_URL}/logs?${params}`)
      if (!res.ok) throw new Error('Failed to fetch logs')
      const data = await res.json()

      setLogs(data.data || [])
      setPagination(prev => ({ ...prev, current: data.page || 1, pageSize: data.per_page || 20, total: data.total || 0 }))
    } catch (error) {
      message.error('Failed to fetch logs')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchLogs(1, pagination.pageSize) }, [filters])

  // ── Fetch entity timeline ──
  const openTimeline = async (entityType, entityId) => {
    if (entityId === 0) return
    setTimelineModal({ visible: true, entityType, entityId, data: [], loading: true })
    try {
      const res = await fetch(`${API_URL}/logs/timeline/${entityType}/${entityId}`)
      if (!res.ok) throw new Error('Failed to fetch timeline')
      const data = await res.json()
      setTimelineModal(prev => ({ ...prev, data, loading: false }))
    } catch (error) {
      message.error('Failed to fetch entity timeline')
      setTimelineModal(prev => ({ ...prev, loading: false }))
    }
  }

  // ── Rollback handler ──
  const handleRollback = (log) => {
    Modal.confirm({
      title: 'Confirm Rollback',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p style={{ marginBottom: 8 }}>{log.description}</p>
          {log.action === 'bulk_create' && (
            <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 6, padding: 12, marginBottom: 8 }}>
              <Text strong style={{ color: '#cf1322' }}>
                This will permanently delete all {log.bulk_count || ''} records from this import.
              </Text>
            </div>
          )}
          {log.action === 'bulk_update' && (
            <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 6, padding: 12, marginBottom: 8 }}>
              <Text strong style={{ color: '#cf1322' }}>
                This will reverse a bulk operation affecting {log.bulk_count || 'multiple'} records.
              </Text>
            </div>
          )}
          <div style={{ marginTop: 8, padding: 10, background: '#f6f8fa', borderRadius: 6 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              This entry will be marked as rolled back. This action cannot be undone.
            </Text>
          </div>
        </div>
      ),
      okText: 'Rollback',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
          const res = await fetch(`${API_URL}/logs/${log.id}/rollback`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(storedUser?.id ? { 'X-User-Id': String(storedUser.id) } : {}),
            },
          })
          const data = await res.json()
          if (res.ok) {
            message.success(data.message)
            fetchLogs(pagination.current, pagination.pageSize)
          } else {
            message.error(data.error || 'Failed to rollback')
          }
        } catch (error) {
          message.error('Failed to rollback')
        }
      },
    })
  }

  // ── Expandable row render ──
  const expandedRowRender = (record) => {
    // Bulk entries
    if (record.bulk_batch || record.action?.startsWith('bulk_')) {
      return (
        <div style={{ padding: '12px 20px' }}>
          <Space size={12} style={{ marginBottom: 8 }}>
            <Tag color="purple" style={{ fontSize: 12 }}>{record.bulk_count || '?'} record(s) affected</Tag>
            {record.changed_fields?.length > 0 && (
              <Text type="secondary" style={{ fontSize: 12 }}>Fields: {record.changed_fields.join(', ')}</Text>
            )}
          </Space>
          {record.data_before && record.data_after && record.changed_fields && renderFieldsTable(record)}
        </div>
      )
    }

    // Create — form-style
    if (record.action === 'create') {
      return <RecordFormView data={record.data_after} action="create" />
    }

    // Delete — form-style
    if (record.action === 'delete') {
      return <RecordFormView data={record.data_before} action="delete" />
    }

    // Update — changed fields table
    if (record.action === 'update' && record.data_before && record.data_after) {
      const fields = record.changed_fields || Object.keys(record.data_after)
      if (fields.length === 0) return <Text type="secondary" style={{ padding: 12, display: 'block' }}>No changes recorded</Text>
      return (
        <div style={{ padding: '12px 20px' }}>
          {renderFieldsTable(record)}
        </div>
      )
    }

    return <Text type="secondary" style={{ padding: 12, display: 'block' }}>No details available</Text>
  }

  const renderFieldsTable = (record) => {
    const fields = record.changed_fields || Object.keys(record.data_after || {})
    if (!fields.length || !record.data_before || !record.data_after) return null

    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, maxWidth: 600 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
            <th style={{ padding: '6px 12px', textAlign: 'left', color: '#8c8c8c', fontWeight: 600, fontSize: 11 }}>Field</th>
            <th style={{ padding: '6px 12px', textAlign: 'left', color: '#ff4d4f', fontWeight: 600, fontSize: 11 }}>Before</th>
            <th style={{ padding: '6px 12px', textAlign: 'center', width: 24 }}></th>
            <th style={{ padding: '6px 12px', textAlign: 'left', color: '#52c41a', fontWeight: 600, fontSize: 11 }}>After</th>
          </tr>
        </thead>
        <tbody>
          {fields.map(field => (
            <tr key={field} style={{ borderBottom: '1px solid #f5f5f5' }}>
              <td style={{ padding: '5px 12px', fontWeight: 500, fontSize: 12 }}>{field}</td>
              <td style={{ padding: '5px 12px', color: '#ff4d4f', fontSize: 12 }}>{record.data_before[field] ?? <em style={{ color: '#bfbfbf' }}>null</em>}</td>
              <td style={{ padding: '5px 12px', textAlign: 'center' }}><ArrowRightOutlined style={{ color: '#d9d9d9', fontSize: 9 }} /></td>
              <td style={{ padding: '5px 12px', color: '#52c41a', fontSize: 12 }}>{record.data_after[field] ?? <em style={{ color: '#bfbfbf' }}>null</em>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  // ── Table columns ──
  const columns = [
    {
      title: 'Log #',
      dataIndex: 'id',
      key: 'id',
      width: 60,
      align: 'center',
      render: (id) => <Text style={{ fontSize: 11, color: '#8c8c8c' }}>#{id}</Text>,
    },
    {
      title: 'Entity',
      key: 'entity',
      width: 140,
      render: (_, r) => (
        <Space size={4}>
          <Text strong style={{ fontSize: 13 }}>{r.entity_type}</Text>
          {r.entity_id > 0 && (
            <a onClick={() => openTimeline(r.entity_type, r.entity_id)} style={{ fontSize: 11, cursor: 'pointer' }}>
              #{r.entity_id}
            </a>
          )}
          {r.entity_id === 0 && <Tag color="purple" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>Bulk</Tag>}
        </Space>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 115,
      render: (action) => (
        <Tag color={ACTION_COLORS[action] || 'default'} style={{ fontSize: 12, fontWeight: 500 }}>
          {ACTION_LABELS[action] || action}
        </Tag>
      ),
    },
    {
      title: 'Version',
      key: 'version',
      width: 110,
      align: 'center',
      render: (_, r) => <VersionTransition from={r.previous_version} to={r.version} action={r.action} />,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <Text style={{ fontSize: 12 }}>{text || '—'}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Done By',
      key: 'user',
      width: 140,
      render: (_, r) => r.user ? (
        <Space size={4} align="start">
          <UserOutlined style={{ color: '#8c8c8c', fontSize: 12, marginTop: 3 }} />
          <div style={{ lineHeight: 1.3 }}>
            <Text strong style={{ fontSize: 12, display: 'block' }}>{r.user.username}</Text>
            <Text style={{ fontSize: 10, color: '#8c8c8c' }}>{r.user_role || r.user.role}</Text>
          </div>
        </Space>
      ) : <Text type="secondary" style={{ fontSize: 12 }}>System</Text>,
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 155,
      render: (date) => (
        <Space size={4}>
          <ClockCircleOutlined style={{ fontSize: 11, color: '#8c8c8c' }} />
          <Text style={{ fontSize: 12 }}>{formatDisplayDate(date)}</Text>
        </Space>
      ),
    },
    {
      title: '',
      key: 'action_btn',
      width: 110,
      align: 'center',
      render: (_, record) => {
        if (record.rolled_back) return <Tag color="default" style={{ fontSize: 11 }}>Rolled Back</Tag>

        const canRollback = ['delete', 'update', 'bulk_update', 'bulk_create'].includes(record.action)
        if (!canRollback) return null

        return (
          <Button type="primary" danger size="small" icon={<UndoOutlined />} onClick={() => handleRollback(record)}>
            Rollback
          </Button>
        )
      },
    },
  ]

  // ── Timeline step status mapping ──
  const timelineStepStatus = (action) => {
    if (action === 'create') return 'finish'
    if (action === 'delete') return 'error'
    return 'finish'
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Title level={2} style={{ margin: 0, color: '#0032a0' }}>Audit Logs</Title>
        <Text type="secondary">Immutable audit trail — all actions are recorded and versions always move forward</Text>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <FilterOutlined style={{ color: '#8c8c8c' }} />
        <Select
          placeholder="Entity Type"
          allowClear
          style={{ width: 150 }}
          value={filters.entity_type}
          onChange={(v) => setFilters(prev => ({ ...prev, entity_type: v || null }))}
        >
          <Option value="Student">Student</Option>
          <Option value="Disbursement">Disbursement</Option>
        </Select>
        <Select
          placeholder="Action"
          allowClear
          style={{ width: 150 }}
          value={filters.action}
          onChange={(v) => setFilters(prev => ({ ...prev, action: v || null }))}
        >
          <Option value="create">Create</Option>
          <Option value="update">Update</Option>
          <Option value="delete">Delete</Option>
          <Option value="bulk_create">Bulk Create</Option>
          <Option value="bulk_update">Bulk Update</Option>
        </Select>
        <Text type="secondary" style={{ fontSize: 13, marginLeft: 'auto' }}>
          {pagination.total} total log{pagination.total !== 1 ? 's' : ''}
        </Text>
      </div>

      {/* Flat table */}
      <div style={{ backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          size="middle"
          bordered
          expandable={{
            expandedRowRender,
            expandedRowKeys: expandedRows,
            onExpandedRowsChange: setExpandedRows,
            rowExpandable: () => true,
          }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) => `${range[0]}–${range[1]} of ${total}`,
            onChange: (page, pageSize) => fetchLogs(page, pageSize),
            onShowSizeChange: (_, size) => fetchLogs(1, size),
          }}
          rowClassName={(record) => record.rolled_back ? 'log-row-rolled-back' : ''}
        />
      </div>

      {/* Row styles */}
      <style>{`
        .log-row-rolled-back > td { background: #fafafa !important; opacity: 0.55; }
        .ant-table-expanded-row > td { padding: 0 !important; }
      `}</style>

      {/* ── Entity Timeline Modal ── */}
      <Modal
        title={
          <Space>
            <HistoryOutlined style={{ color: '#0032a0' }} />
            <Text strong>Entity Timeline</Text>
            <Text type="secondary">{timelineModal.entityType} #{timelineModal.entityId}</Text>
          </Space>
        }
        open={timelineModal.visible}
        onCancel={() => setTimelineModal({ visible: false, entityType: null, entityId: null, data: [], loading: false })}
        footer={null}
        width={680}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        {timelineModal.loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Text type="secondary">Loading timeline...</Text></div>
        ) : timelineModal.data.length === 0 ? (
          <Empty description="No history found" />
        ) : (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              <Tag color="blue">{timelineModal.data.length} version{timelineModal.data.length !== 1 ? 's' : ''}</Tag>
              <Tag color="green">Latest: v{timelineModal.data[timelineModal.data.length - 1]?.version}</Tag>
            </div>

            <Steps
              direction="vertical"
              size="small"
              current={timelineModal.data.length - 1}
              items={timelineModal.data.map((entry) => {
                const fromLabel = entry.previous_version ? `from v${entry.previous_version}` : ''

                return {
                  title: (
                    <Space size={6}>
                      <Text strong style={{ fontSize: 13 }}>v{entry.version}</Text>
                      {fromLabel && <Text type="secondary" style={{ fontSize: 11 }}>{fromLabel}</Text>}
                    </Space>
                  ),
                  description: (
                    <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Tag color={ACTION_COLORS[entry.action] || 'default'} style={{ fontSize: 11 }}>
                          {ACTION_LABELS[entry.action] || entry.action}
                        </Tag>
                        {entry.rolled_back && <Tag color="default" style={{ fontSize: 10 }}>Rolled Back</Tag>}
                      </div>
                      <div style={{ color: '#595959', marginTop: 4 }}>{entry.description}</div>
                      <div style={{ color: '#8c8c8c', marginTop: 2 }}>
                        {entry.user?.username || 'System'}
                        {entry.user_role ? ` (${entry.user_role})` : ''}
                        {' · '}
                        {formatDisplayDate(entry.created_at)}
                      </div>
                      {entry.action === 'update' && entry.changed_fields?.length > 0 && entry.data_before && entry.data_after && (
                        <div style={{ marginTop: 6, padding: '6px 10px', background: '#f6f8fa', borderRadius: 4, fontSize: 12 }}>
                          {entry.changed_fields.map(f => (
                            <div key={f}>
                              <Text type="secondary">{f}:</Text>{' '}
                              <Text delete style={{ color: '#ff4d4f', fontSize: 11 }}>{entry.data_before[f] ?? 'null'}</Text>
                              {' → '}
                              <Text style={{ color: '#52c41a', fontSize: 11 }}>{entry.data_after[f] ?? 'null'}</Text>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ),
                  status: timelineStepStatus(entry.action),
                }
              })}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}