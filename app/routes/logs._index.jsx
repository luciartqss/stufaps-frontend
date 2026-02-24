import { useEffect, useState, useMemo } from 'react'
import { Table, Button, Tag, Typography, Space, message, Modal, Spin, Empty, Select, DatePicker, Input, Tooltip, Pagination } from 'antd'
import { UndoOutlined, FilterOutlined, SearchOutlined, InfoCircleOutlined, ArrowRightOutlined } from '@ant-design/icons'

const { Title, Text } = Typography
const { Option } = Select
const { RangePicker } = DatePicker

import { API_BASE as API_URL } from '../lib/config'
import { formatDisplayDate, parseDate } from '../lib/dateUtils'

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
  rollback: 'orange',
  bulk_create: 'purple',
  bulk_update: 'purple',
  bulk_delete: 'purple',
}

const ACTION_LABELS = {
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
  rollback: 'Rollback',
  bulk_create: 'Bulk Create',
  bulk_update: 'Bulk Update',
  bulk_delete: 'Bulk Delete',
}

export default function LogsIndex() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [filters, setFilters] = useState({ entity_type: null, action: null })
  const [detailModal, setDetailModal] = useState({ visible: false, log: null })

  const fetchLogs = async (page = 1, pageSize = 20) => {
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
      setPagination(prev => ({
        ...prev,
        current: data.page || 1,
        pageSize: data.per_page || 20,
        total: data.total || 0,
      }))
    } catch (error) {
      message.error('Failed to fetch logs')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs(1, pagination.pageSize)
  }, [filters])

  const handleRollback = (log) => {
    const isDestructive = log.action === 'bulk_update'
    const content = isDestructive
      ? (
        <div>
          <p>{log.description}</p>
          <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 6, padding: 12, marginTop: 8 }}>
            <Text strong style={{ color: '#cf1322' }}>This will reverse a bulk operation affecting {log.bulk_count || 'multiple'} records.</Text>
          </div>
        </div>
      )
      : `Are you sure you want to rollback this action? This will create a new rollback log entry.`

    Modal.confirm({
      title: 'Confirm Rollback',
      content,
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
          console.error(error)
        }
      },
    })
  }

  const renderChanges = (log) => {
    // Bulk entries
    if (log.bulk_batch || log.action?.startsWith('bulk_')) {
      return (
        <Tag color="purple" style={{ fontSize: 12 }}>
          {log.bulk_count || '?'} record(s)
        </Tag>
      )
    }

    if (log.action === 'create') return <Text type="success">Record created</Text>
    if (log.action === 'delete') return <Text type="danger">Record deleted</Text>
    if (log.action === 'rollback') {
      return (
        <Space size={4}>
          <Tag color="orange">Rollback of #{log.rollback_of}</Tag>
        </Space>
      )
    }

    if (log.action === 'update' && log.data_before && log.data_after) {
      const fields = log.changed_fields || Object.keys(log.data_after)
      if (fields.length === 0) return <Text type="secondary">No changes</Text>

      // Show first 2 inline, rest in modal
      const preview = fields.slice(0, 2)
      const hasMore = fields.length > 2

      return (
        <div>
          {preview.map(key => (
            <div key={key} style={{ fontSize: 12, marginBottom: 2 }}>
              <Text strong style={{ fontSize: 11 }}>{key}:</Text>{' '}
              <Text delete style={{ color: '#ff4d4f', fontSize: 11 }}>{log.data_before[key] ?? 'null'}</Text>
              {' → '}
              <Text style={{ color: '#52c41a', fontSize: 11 }}>{log.data_after[key] ?? 'null'}</Text>
            </div>
          ))}
          {hasMore && (
            <a onClick={() => setDetailModal({ visible: true, log })} style={{ fontSize: 11 }}>
              +{fields.length - 2} more fields
            </a>
          )}
        </div>
      )
    }

    return <Text type="secondary">—</Text>
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
      align: 'center',
      render: (id) => <Text style={{ fontSize: 12, color: '#8c8c8c' }}>{id}</Text>,
    },
    {
      title: 'Entity',
      key: 'entity',
      width: 130,
      render: (_, r) => (
        <Space size={4}>
          <Text strong style={{ fontSize: 13 }}>{r.entity_type}</Text>
          {r.entity_id > 0 && <Text type="secondary" style={{ fontSize: 11 }}>#{r.entity_id}</Text>}
          {r.entity_id === 0 && <Tag color="purple" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>Bulk</Tag>}
        </Space>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 110,
      render: (action) => (
        <Tag color={ACTION_COLORS[action] || 'default'} style={{ textTransform: 'capitalize', fontSize: 12 }}>
          {ACTION_LABELS[action] || action}
        </Tag>
      ),
    },
    {
      title: 'V',
      dataIndex: 'version',
      key: 'version',
      width: 40,
      align: 'center',
      render: (v) => <Text style={{ fontSize: 11, color: '#8c8c8c' }}>v{v}</Text>,
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
      title: 'Changes',
      key: 'changes',
      width: 240,
      render: (_, record) => renderChanges(record),
    },
    {
      title: 'Done By',
      key: 'user',
      width: 120,
      align: 'center',
      render: (_, r) => r.user
        ? (
          <Space direction="vertical" size={0} style={{ lineHeight: 1.3 }}>
            <Text strong style={{ fontSize: 12 }}>{r.user.username}</Text>
            <Text style={{ fontSize: 10, color: '#8c8c8c' }}>{r.user_role || r.user.role}</Text>
          </Space>
        )
        : <Text type="secondary" style={{ fontSize: 12 }}>System</Text>,
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date) => <Text style={{ fontSize: 12 }}>{formatDisplayDate(date)}</Text>,
    },
    {
      title: '',
      key: 'action_btn',
      width: 110,
      align: 'center',
      render: (_, record) => {
        const canRollback = ['delete', 'update', 'bulk_update'].includes(record.action) && !record.rolled_back
        if (!canRollback) {
          if (record.rolled_back) {
            return <Tag color="default" style={{ fontSize: 11 }}>Rolled Back</Tag>
          }
          return null
        }
        return (
          <Button
            type="primary"
            danger
            size="small"
            icon={<UndoOutlined />}
            onClick={() => handleRollback(record)}
          >
            Rollback
          </Button>
        )
      },
    },
  ]

  const stats = useMemo(() => {
    return { total: pagination.total }
  }, [pagination.total])

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0, color: '#0032a0' }}>Audit Logs</Title>
        <Text type="secondary">Immutable audit trail — all actions are recorded and cannot be modified</Text>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <FilterOutlined style={{ color: '#8c8c8c' }} />
        <Select
          placeholder="Entity Type"
          allowClear
          style={{ width: 140 }}
          value={filters.entity_type}
          onChange={(v) => setFilters(prev => ({ ...prev, entity_type: v || null }))}
        >
          <Option value="Student">Student</Option>
          <Option value="Disbursement">Disbursement</Option>
        </Select>
        <Select
          placeholder="Action"
          allowClear
          style={{ width: 140 }}
          value={filters.action}
          onChange={(v) => setFilters(prev => ({ ...prev, action: v || null }))}
        >
          <Option value="create">Create</Option>
          <Option value="update">Update</Option>
          <Option value="delete">Delete</Option>
          <Option value="rollback">Rollback</Option>
          <Option value="bulk_create">Bulk Create</Option>
          <Option value="bulk_update">Bulk Update</Option>
        </Select>
        <Text type="secondary" style={{ fontSize: 13, marginLeft: 'auto' }}>
          {stats.total} total logs
        </Text>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          size="middle"
          bordered
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
            onChange: (page, pageSize) => fetchLogs(page, pageSize),
            onShowSizeChange: (_, size) => fetchLogs(1, size),
          }}
          rowClassName={(record) => {
            if (record.rolled_back) return 'log-row-rolled-back'
            if (record.action === 'rollback') return 'log-row-rollback'
            return ''
          }}
        />
      </div>

      <style>{`
        .log-row-rolled-back td {
          background: #fafafa !important;
          opacity: 0.6;
        }
        .log-row-rollback td {
          background: #fff7e6 !important;
        }
        .log-row-rollback td:first-child {
          border-left: 3px solid #fa8c16 !important;
        }
      `}</style>

      {/* Detail Modal */}
      <Modal
        title={
          detailModal.log ? (
            <Space>
              <Tag color={ACTION_COLORS[detailModal.log.action] || 'default'}>
                {ACTION_LABELS[detailModal.log.action] || detailModal.log.action}
              </Tag>
              <Text>{detailModal.log.entity_type} #{detailModal.log.entity_id}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>v{detailModal.log.version}</Text>
            </Space>
          ) : 'Log Details'
        }
        open={detailModal.visible}
        onCancel={() => setDetailModal({ visible: false, log: null })}
        footer={null}
        width={600}
      >
        {detailModal.log && (() => {
          const log = detailModal.log
          const fields = log.changed_fields || Object.keys(log.data_after || {})

          return (
            <div>
              {/* Description */}
              <div style={{ background: '#f6f8fa', borderRadius: 6, padding: 12, marginBottom: 16 }}>
                <Text style={{ fontSize: 13 }}>{log.description}</Text>
              </div>

              {/* Metadata */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: 16 }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Done By</Text>
                  <Text strong>{log.user?.username || 'System'}</Text>
                  {log.user_role && <Tag style={{ marginLeft: 4, fontSize: 10 }}>{log.user_role}</Tag>}
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Date</Text>
                  <Text>{formatDisplayDate(log.created_at)}</Text>
                </div>
                {log.rollback_of && (
                  <div>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Rollback Of</Text>
                    <Tag color="orange">Log #{log.rollback_of}</Tag>
                  </div>
                )}
                {log.ip_address && (
                  <div>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>IP Address</Text>
                    <Text>{log.ip_address}</Text>
                  </div>
                )}
              </div>

              {/* Changed fields table */}
              {fields.length > 0 && log.data_before && log.data_after && (
                <>
                  <Text strong style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>Field Changes</Text>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', color: '#8c8c8c', fontWeight: 600, fontSize: 12 }}>Field</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', color: '#ff4d4f', fontWeight: 600, fontSize: 12 }}>Before</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', width: 30 }}></th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', color: '#52c41a', fontWeight: 600, fontSize: 12 }}>After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map(field => (
                        <tr key={field} style={{ borderBottom: '1px solid #f5f5f5' }}>
                          <td style={{ padding: '6px 12px', fontWeight: 500 }}>{field}</td>
                          <td style={{ padding: '6px 12px', color: '#ff4d4f' }}>{log.data_before[field] ?? <em style={{ color: '#bfbfbf' }}>null</em>}</td>
                          <td style={{ padding: '6px 12px', textAlign: 'center' }}><ArrowRightOutlined style={{ color: '#d9d9d9', fontSize: 10 }} /></td>
                          <td style={{ padding: '6px 12px', color: '#52c41a' }}>{log.data_after[field] ?? <em style={{ color: '#bfbfbf' }}>null</em>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}