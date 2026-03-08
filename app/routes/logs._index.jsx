import { useEffect, useState, useCallback } from 'react'
import { Button, Tag, Typography, Space, message, Modal, Empty, Row, Col, Pagination, Spin } from 'antd'
import {
  UndoOutlined, ArrowRightOutlined,
  ClockCircleOutlined, UserOutlined, ExclamationCircleOutlined,
  WarningOutlined,
  PlusCircleOutlined, EditOutlined, DeleteOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography

import { API_BASE as API_URL } from '../lib/config'
import { formatDisplayDate } from '../lib/dateUtils'

export function meta() {
  return [
    { title: 'Logs | StuFAPs' },
    { name: 'description', content: 'System activity history' },
  ]
}

// ── Node styling per action type ──
const NODE_STYLES = {
  create:      { dot: '#52c41a', border: '#b7eb8f', icon: <PlusCircleOutlined />,  label: 'Created' },
  update:      { dot: '#1890ff', border: '#91d5ff', icon: <EditOutlined />,         label: 'Updated' },
  delete:      { dot: '#ff4d4f', border: '#ffa39e', icon: <DeleteOutlined />,       label: 'Deleted' },
  rollback:    { dot: '#fa8c16', border: '#ffd591', icon: <UndoOutlined />,         label: 'Restored' },
  bulk_create: { dot: '#722ed1', border: '#d3adf7', icon: <PlusCircleOutlined />,   label: 'Bulk Import' },
  bulk_update: { dot: '#13c2c2', border: '#87e8de', icon: <EditOutlined />,         label: 'Bulk Update' },
  bulk_delete: { dot: '#eb2f96', border: '#ffadd2', icon: <DeleteOutlined />,       label: 'Bulk Delete' },
}

const getNodeStyle = (log) => {
  if (log.rolled_back) {
    const base = NODE_STYLES[log.action] || {}
    return { dot: '#d9d9d9', border: '#e8e8e8', icon: base.icon, label: base.label || log.action }
  }
  return NODE_STYLES[log.action] || { dot: '#8c8c8c', border: '#d9d9d9', icon: null, label: log.action }
}

// ── Field comparison table ──
const FieldsComparison = ({ record }) => {
  const fields = record.changed_fields || Object.keys(record.data_after || {})
  if (!fields.length || !record.data_before || !record.data_after) return null
  const isRollback = record.action === 'rollback'

  return (
    <div style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid #f0f0f0' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#fafafa' }}>
            <th style={{ padding: '8px 14px', textAlign: 'left', color: '#8c8c8c', fontWeight: 600, fontSize: 11 }}>Field</th>
            <th style={{ padding: '8px 14px', textAlign: 'left', color: '#ff4d4f', fontWeight: 600, fontSize: 11 }}>Before</th>
            <th style={{ padding: '8px 14px', textAlign: 'center', width: 28 }}></th>
            <th style={{ padding: '8px 14px', textAlign: 'left', color: isRollback ? '#fa8c16' : '#52c41a', fontWeight: 600, fontSize: 11 }}>After</th>
          </tr>
        </thead>
        <tbody>
          {fields.map(field => (
            <tr key={field} style={{ borderTop: '1px solid #f5f5f5' }}>
              <td style={{ padding: '7px 14px', fontWeight: 500, fontSize: 12, color: '#262626' }}>{field}</td>
              <td style={{ padding: '7px 14px', color: '#ff4d4f', fontSize: 12 }}>{record.data_before[field] ?? <em style={{ color: '#d9d9d9' }}>empty</em>}</td>
              <td style={{ padding: '7px 14px', textAlign: 'center' }}><ArrowRightOutlined style={{ color: '#d9d9d9', fontSize: 9 }} /></td>
              <td style={{ padding: '7px 14px', color: isRollback ? '#fa8c16' : '#52c41a', fontSize: 12 }}>{record.data_after[field] ?? <em style={{ color: '#d9d9d9' }}>empty</em>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Conflict list for blocked rollbacks ──
const ConflictList = ({ conflicts }) => {
  if (!conflicts || conflicts.length === 0) return null
  return (
    <div style={{ maxHeight: 320, overflowY: 'auto' }}>
      {conflicts.map((c) => {
        const ns = NODE_STYLES[c.action] || { dot: '#8c8c8c', icon: null, label: c.action }
        return (
          <div key={c.id} style={{ padding: '10px 14px', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ color: ns.dot, fontSize: 14, marginTop: 2 }}>{ns.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong style={{ fontSize: 12 }}>{ns.label} — {c.entity_id > 0 ? c.entity_type || 'Record' : 'Batch'}</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>{formatDisplayDate(c.created_at)}</Text>
              </div>
              <Text style={{ fontSize: 12, color: '#595959', display: 'block' }}>{c.description}</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>by {c.user}</Text>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function LogsIndex() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })

  // Modals
  const [detailModal, setDetailModal] = useState({ visible: false, log: null })
  const [conflictModal, setConflictModal] = useState({ visible: false, conflicts: [], log: null })

  // ── Fetch paginated logs from /logs/batched ──
  const fetchLogs = useCallback(async (page = 1, pageSize = 20) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', page)
      params.set('per_page', pageSize)

      const res = await fetch(`${API_URL}/logs/batched?${params}`)
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
  }, [])

  useEffect(() => { fetchLogs(1, pagination.pageSize) }, [])

  // ── Rollback handler — simple confirm ──
  const handleRollback = (log) => {
    Modal.confirm({
      title: 'Confirm Restore',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p style={{ marginBottom: 8, fontSize: 13 }}>{log.description}</p>

          {log.action === 'bulk_create' && (
            <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 6, padding: 12, marginBottom: 8 }}>
              <Text strong style={{ color: '#cf1322' }}>This will permanently delete all {log.bulk_count || ''} imported students.</Text>
            </div>
          )}
          {log.action === 'bulk_update' && (
            <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 6, padding: 12, marginBottom: 8 }}>
              <Text strong style={{ color: '#cf1322' }}>This will reverse changes on {log.bulk_count || 'multiple'} students.</Text>
            </div>
          )}

          <div style={{ marginTop: 8, padding: 10, background: '#f6f8fa', borderRadius: 6 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Restoring creates a <strong>new version</strong> — history is never erased.
            </Text>
          </div>
        </div>
      ),
      okText: 'Restore',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
          const res = await fetch(`${API_URL}/logs/${log.id}/rollback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(storedUser?.id ? { 'X-User-Id': String(storedUser.id) } : {}) },
          })
          const data = await res.json()
          if (res.ok) {
            message.success(data.message)
            fetchLogs(pagination.current, pagination.pageSize)
            setDetailModal({ visible: false, log: null })
          } else {
            message.error(data.error || 'Restore failed')
          }
        } catch { message.error('Restore failed') }
      },
    })
  }

  // ── Show conflicts modal ──
  const showConflicts = (log) => {
    setConflictModal({ visible: true, conflicts: log.conflicts || [], log })
  }

  // ── Inline rollback / conflicts actions ──
  const renderNodeActions = (log) => {
    if (log.rolled_back) return null
    const canRollback = ['create', 'delete', 'update', 'bulk_update', 'bulk_create'].includes(log.action)
    if (!canRollback) return null

    // Blocked — show conflicts button
    if (!log.can_rollback && log.conflicts?.length > 0) {
      return (
        <Button
          size="small"
          style={{ fontSize: 12, color: '#fa8c16', borderColor: '#ffd591' }}
          icon={<WarningOutlined />}
          onClick={() => showConflicts(log)}
        >
          {log.conflicts.length} Conflict{log.conflicts.length !== 1 ? 's' : ''}
        </Button>
      )
    }

    // Can rollback
    if (log.can_rollback) {
      return (
        <Button size="small" type="primary" danger icon={<UndoOutlined />} onClick={() => handleRollback(log)} style={{ fontSize: 12 }}>
          Restore
        </Button>
      )
    }

    return null
  }

  // ── Detail modal content ──
  const renderDetailContent = (log) => {
    if (!log) return null
    const ns = getNodeStyle(log)

    return (
      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ color: ns.dot, fontSize: 16 }}>{ns.icon}</span>
          <Text strong style={{ fontSize: 15 }}>{ns.label}</Text>
          <Text type="secondary">•</Text>
          <Text type="secondary">{log.entity_type}</Text>
          {log.entity_id === 0 && <Tag color="purple" style={{ fontSize: 10, margin: 0 }}>Batch</Tag>}
        </div>

        {/* Description */}
        <Text style={{ fontSize: 13, display: 'block', marginBottom: 16, color: '#262626' }}>{log.description}</Text>

        {/* Rollback origin banner */}
        {log.action === 'rollback' && log.rollback_of && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fff7e6', border: '1px solid #ffe58f', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <UndoOutlined style={{ color: '#fa8c16' }} />
            <Text style={{ fontSize: 12, color: '#d48806' }}>Restored state from an earlier version</Text>
          </div>
        )}

        {/* Superseded banner */}
        {log.rolled_back && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#f5f5f5', border: '1px solid #e8e8e8', borderRadius: 6 }}>
            <Text style={{ fontSize: 12, color: '#8c8c8c' }}>
              This action was restored
              {log.rolled_back_by && <> by <strong>{log.rolled_back_by.username}</strong> on {formatDisplayDate(log.rolled_back_by.created_at)}</>}
            </Text>
          </div>
        )}

        {/* Update / Rollback: identity context + field comparison */}
        {(log.action === 'update' || log.action === 'rollback') && log.data_before && log.data_after && log.changed_fields && (
          <div style={{ marginBottom: 16 }}>
            {log.context && (
              <div style={{ padding: '10px 14px', background: '#f6f8fa', border: '1px solid #e8eaed', borderRadius: 6, marginBottom: 10 }}>
                {log.context.name && (
                  <div style={{ display: 'flex', marginBottom: 2 }}>
                    <Text type="secondary" style={{ fontSize: 11, minWidth: 72, flexShrink: 0 }}>Name</Text>
                    <Text style={{ fontSize: 12, fontWeight: 500 }}>{log.context.name}</Text>
                  </div>
                )}
                {log.context.award_number && (
                  <div style={{ display: 'flex', marginBottom: 2 }}>
                    <Text type="secondary" style={{ fontSize: 11, minWidth: 72, flexShrink: 0 }}>Award No.</Text>
                    <Text style={{ fontSize: 12 }}>{log.context.award_number}</Text>
                  </div>
                )}
                {log.context.learner_reference_number && (
                  <div style={{ display: 'flex', marginBottom: 2 }}>
                    <Text type="secondary" style={{ fontSize: 11, minWidth: 72, flexShrink: 0 }}>LRN</Text>
                    <Text style={{ fontSize: 12 }}>{log.context.learner_reference_number}</Text>
                  </div>
                )}
                {(log.context.academic_year || log.context.semester) && (
                  <div style={{ display: 'flex', gap: 16, marginBottom: 2 }}>
                    {log.context.academic_year && (
                      <div style={{ display: 'flex' }}>
                        <Text type="secondary" style={{ fontSize: 11, minWidth: 72, flexShrink: 0 }}>AY</Text>
                        <Text style={{ fontSize: 12 }}>{log.context.academic_year}</Text>
                      </div>
                    )}
                    {log.context.semester && (
                      <div style={{ display: 'flex' }}>
                        <Text type="secondary" style={{ fontSize: 11, minWidth: 32, flexShrink: 0 }}>Sem</Text>
                        <Text style={{ fontSize: 12 }}>{log.context.semester}</Text>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8, color: '#8c8c8c' }}>Changes</Text>
            <FieldsComparison record={log} />
          </div>
        )}

        {/* Create: summary */}
        {log.action === 'create' && (log.context || log.data_after) && (
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8, color: '#8c8c8c' }}>Record Created</Text>
            <div style={{ padding: '10px 14px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
              {log.entity_type === 'User' ? (
                <>
                  {[{ label: 'Username', value: log.data_after?.username },
                    { label: 'Role', value: log.data_after?.role },
                    { label: 'Email', value: log.data_after?.email },
                  ].filter(i => i.value).map(item => (
                    <div key={item.label} style={{ display: 'flex', marginBottom: 4 }}>
                      <Text type="secondary" style={{ fontSize: 11, minWidth: 72, flexShrink: 0 }}>{item.label}</Text>
                      <Text style={{ fontSize: 12, color: '#52c41a' }}>{item.value}</Text>
                    </div>
                  ))}
                </>
              ) : (
                <>
              {[{
                  label: 'Name',
                  value: log.context?.name || [log.data_after?.surname, log.data_after?.first_name].filter(Boolean).join(', '),
                }, {
                  label: 'Award No.',
                  value: log.context?.award_number || log.data_after?.award_number,
                }, {
                  label: 'LRN',
                  value: log.context?.learner_reference_number || log.data_after?.learner_reference_number,
                },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', marginBottom: 4 }}>
                  <Text type="secondary" style={{ fontSize: 11, minWidth: 72, flexShrink: 0 }}>{item.label}</Text>
                  <Text style={{ fontSize: 12, color: '#52c41a' }}>{item.value || '—'}</Text>
                </div>
              ))}
              {(log.context?.academic_year || log.context?.semester) && (
                <div style={{ display: 'flex', gap: 16, marginBottom: 4 }}>
                  {log.context.academic_year && (
                    <div style={{ display: 'flex' }}>
                      <Text type="secondary" style={{ fontSize: 11, minWidth: 72, flexShrink: 0 }}>AY</Text>
                      <Text style={{ fontSize: 12, color: '#52c41a' }}>{log.context.academic_year}</Text>
                    </div>
                  )}
                  {log.context.semester && (
                    <div style={{ display: 'flex' }}>
                      <Text type="secondary" style={{ fontSize: 11, minWidth: 32, flexShrink: 0 }}>Sem</Text>
                      <Text style={{ fontSize: 12, color: '#52c41a' }}>{log.context.semester}</Text>
                    </div>
                  )}
                </div>
              )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Delete: summary */}
        {log.action === 'delete' && (log.context || log.data_before) && (
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8, color: '#8c8c8c' }}>Record Deleted</Text>
            <div style={{ padding: '10px 14px', background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 6 }}>
              {log.entity_type === 'User' ? (
                <>
                  {[{ label: 'Username', value: log.data_before?.username },
                    { label: 'Role', value: log.data_before?.role },
                    { label: 'Email', value: log.data_before?.email },
                  ].filter(i => i.value).map(item => (
                    <div key={item.label} style={{ display: 'flex', marginBottom: 4 }}>
                      <Text type="secondary" style={{ fontSize: 11, minWidth: 72, flexShrink: 0 }}>{item.label}</Text>
                      <Text style={{ fontSize: 12, color: '#ff4d4f' }}>{item.value}</Text>
                    </div>
                  ))}
                </>
              ) : (
                <>
              {[{
                  label: 'Name',
                  value: log.context?.name || [log.data_before?.surname, log.data_before?.first_name].filter(Boolean).join(', '),
                }, {
                  label: 'Award No.',
                  value: log.context?.award_number || log.data_before?.award_number,
                }, {
                  label: 'LRN',
                  value: log.context?.learner_reference_number || log.data_before?.learner_reference_number,
                },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', marginBottom: 4 }}>
                  <Text type="secondary" style={{ fontSize: 11, minWidth: 72, flexShrink: 0 }}>{item.label}</Text>
                  <Text style={{ fontSize: 12, color: '#ff4d4f' }}>{item.value || '—'}</Text>
                </div>
              ))}
              {(log.context?.academic_year || log.context?.semester) && (
                <div style={{ display: 'flex', gap: 16, marginBottom: 4 }}>
                  {log.context.academic_year && (
                    <div style={{ display: 'flex' }}>
                      <Text type="secondary" style={{ fontSize: 11, minWidth: 72, flexShrink: 0 }}>AY</Text>
                      <Text style={{ fontSize: 12, color: '#ff4d4f' }}>{log.context.academic_year}</Text>
                    </div>
                  )}
                  {log.context.semester && (
                    <div style={{ display: 'flex' }}>
                      <Text type="secondary" style={{ fontSize: 11, minWidth: 32, flexShrink: 0 }}>Sem</Text>
                      <Text style={{ fontSize: 12, color: '#ff4d4f' }}>{log.context.semester}</Text>
                    </div>
                  )}
                </div>
              )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Bulk info */}
        {(log.action === 'bulk_create' || log.action === 'bulk_update') && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#f9f0ff', border: '1px solid #d3adf7', borderRadius: 6 }}>
            <Text style={{ fontSize: 12 }}>{log.bulk_count || '?'} {(log.entity_type || 'record').toLowerCase()}{log.bulk_count !== 1 ? 's' : ''} affected</Text>
          </div>
        )}
        {log.action === 'bulk_update' && log.data_before && log.data_after && log.changed_fields && (
          <FieldsComparison record={log} />
        )}

        {/* Rollback of create (soft-delete) — show removed record summary */}
        {log.action === 'rollback' && log.data_before && (!log.data_after || Object.keys(log.data_after).length === 0) && (
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8, color: '#8c8c8c' }}>Record Removed</Text>
            <div style={{ padding: '10px 14px', background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 6 }}>
              {[{
                  label: 'Name',
                  value: log.context?.name || [log.data_before?.surname, log.data_before?.first_name].filter(Boolean).join(', '),
                }, {
                  label: 'Award No.',
                  value: log.context?.award_number || log.data_before?.award_number,
                }, {
                  label: 'LRN',
                  value: log.context?.learner_reference_number || log.data_before?.learner_reference_number,
                },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', marginBottom: 4 }}>
                  <Text type="secondary" style={{ fontSize: 11, minWidth: 72, flexShrink: 0 }}>{item.label}</Text>
                  <Text style={{ fontSize: 12, color: '#ff4d4f' }}>{item.value || '—'}</Text>
                </div>
              ))}
              {(log.context?.academic_year || log.context?.semester) && (
                <div style={{ display: 'flex', gap: 16, marginBottom: 4 }}>
                  {log.context.academic_year && (
                    <div style={{ display: 'flex' }}>
                      <Text type="secondary" style={{ fontSize: 11, minWidth: 72, flexShrink: 0 }}>AY</Text>
                      <Text style={{ fontSize: 12, color: '#ff4d4f' }}>{log.context.academic_year}</Text>
                    </div>
                  )}
                  {log.context.semester && (
                    <div style={{ display: 'flex' }}>
                      <Text type="secondary" style={{ fontSize: 11, minWidth: 32, flexShrink: 0 }}>Sem</Text>
                      <Text style={{ fontSize: 12, color: '#ff4d4f' }}>{log.context.semester}</Text>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Meta */}
        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12, marginTop: 8 }}>
          <Row gutter={[16, 8]}>
            <Col span={12}>
              <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Performed by</Text>
              <Text style={{ fontSize: 12 }}>
                {log.user?.username || 'System'}
                {(log.user_role || log.user?.role) && <Text type="secondary"> ({log.user_role || log.user?.role})</Text>}
              </Text>
            </Col>
            <Col span={12}>
              <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Date & Time</Text>
              <Text style={{ fontSize: 12 }}>{formatDisplayDate(log.created_at)}</Text>
            </Col>
            {log.action_source && log.action_source !== 'web' && (
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Source</Text>
                <Tag style={{ fontSize: 11, margin: 0 }}>{log.action_source}</Tag>
              </Col>
            )}
          </Row>
        </div>

        {/* Footer actions */}
        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12, marginTop: 12, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <div onClick={e => e.stopPropagation()}>
            {renderNodeActions(log)}
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <Title level={2} style={{ margin: 0, color: '#0032a0', fontSize: 22, fontWeight: 600 }}>Activity History</Title>
          <Text type="secondary" style={{ fontSize: 13, marginTop: 2, display: 'block' }}>All changes are recorded — newest activity appears first</Text>
        </div>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {pagination.total} {pagination.total === 1 ? 'entry' : 'entries'}
        </Text>
      </div>

      {/* Legend */}
      <div style={{ marginBottom: 20, padding: '10px 16px', background: '#fafbfc', borderRadius: 8, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { color: '#52c41a', label: 'Created', desc: 'New record added' },
          { color: '#1890ff', label: 'Updated', desc: 'Record modified' },
          { color: '#ff4d4f', label: 'Deleted', desc: 'Record removed' },
          { color: '#722ed1', label: 'Bulk Import', desc: 'Multiple records added' },
          { color: '#13c2c2', label: 'Bulk Update', desc: 'Multiple records changed' },
          { color: '#d9d9d9', label: 'Restored', desc: 'Action undone by restore' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 170 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
            <div>
              <Text style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.2, display: 'block' }}>{item.label}</Text>
              <Text type="secondary" style={{ fontSize: 11, lineHeight: 1.2 }}>{item.desc}</Text>
            </div>
          </div>
        ))}
      </div>

      {/* ── Timeline Feed ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      ) : logs.length === 0 ? (
        <Empty description="No activity recorded" style={{ padding: 80 }} />
      ) : (
        <div className="audit-feed">
          {logs.map(log => {
            const ns = getNodeStyle(log)
            const isSuperseded = log.rolled_back

            return (
              <div key={log.id} className="tl-node" style={{ opacity: isSuperseded ? 0.5 : 1 }}>
                <div className="tl-dot" style={{ background: ns.dot }} />
                <div
                  className="tl-card"
                  style={{ borderLeftColor: ns.border }}
                  onClick={() => setDetailModal({ visible: true, log })}
                >
                  {/* Row 1: Action + Entity */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Space size={6}>
                      <span style={{ color: isSuperseded ? '#bfbfbf' : ns.dot, fontSize: 14 }}>{ns.icon}</span>
                      <Text strong style={{ fontSize: 13, color: isSuperseded ? '#8c8c8c' : '#262626' }}>{ns.label}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{log.entity_type}</Text>
                      {log.entity_id === 0 && <Tag color="purple" style={{ fontSize: 10, margin: 0, lineHeight: '16px', padding: '0 5px' }}>Batch</Tag>}
                    </Space>
                  </div>

                  {/* Row 2: Description */}
                  <Text style={{ fontSize: 12.5, color: isSuperseded ? '#8c8c8c' : '#434343', display: 'block', marginBottom: 6, lineHeight: 1.5 }}>
                    {log.description}
                  </Text>

                  {/* Rolled back by info */}
                  {isSuperseded && log.rolled_back_by && (
                    <div style={{ marginBottom: 6 }}>
                      <Text style={{ fontSize: 11, color: '#8c8c8c', fontStyle: 'italic' }}>
                        Restored by {log.rolled_back_by.username} · {formatDisplayDate(log.rolled_back_by.created_at)}
                      </Text>
                    </div>
                  )}

                  {/* Row 3: Actor + Timestamp + Rollback/Conflicts */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                    <Space size={12} style={{ flexWrap: 'wrap' }}>
                      <Space size={4}>
                        <UserOutlined style={{ fontSize: 11, color: '#bfbfbf' }} />
                        <Text style={{ fontSize: 12, color: '#595959' }}>
                          {log.user?.username || 'System'}
                          {(log.user_role || log.user?.role) ? <Text type="secondary" style={{ fontSize: 11 }}> ({log.user_role || log.user?.role})</Text> : null}
                        </Text>
                      </Space>
                      <Space size={4}>
                        <ClockCircleOutlined style={{ fontSize: 11, color: '#bfbfbf' }} />
                        <Text style={{ fontSize: 12, color: '#8c8c8c' }}>{formatDisplayDate(log.created_at)}</Text>
                      </Space>
                    </Space>

                    <div onClick={e => e.stopPropagation()}>
                      {renderNodeActions(log)}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && logs.length > 0 && (
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
          <Pagination
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={pagination.total}
            showSizeChanger
            pageSizeOptions={['10', '20', '50', '100']}
            showTotal={(total, range) => `${range[0]}–${range[1]} of ${total}`}
            onChange={(page, pageSize) => fetchLogs(page, pageSize)}
            onShowSizeChange={(_, size) => fetchLogs(1, size)}
          />
        </div>
      )}

      {/* ── Detail Modal ── */}
      <Modal
        title={null}
        open={detailModal.visible}
        onCancel={() => setDetailModal({ visible: false, log: null })}
        footer={null}
        width={640}
        styles={{ body: { maxHeight: '75vh', overflowY: 'auto', overflowX: 'hidden' } }}
      >
        {renderDetailContent(detailModal.log)}
      </Modal>

      {/* ── Conflicts Modal ── */}
      <Modal
        title={
          <Space>
            <WarningOutlined style={{ color: '#fa8c16' }} />
            <Text strong>Restore Blocked</Text>
            <Text type="secondary">— {conflictModal.conflicts.length} conflict{conflictModal.conflicts.length !== 1 ? 's' : ''}</Text>
          </Space>
        }
        open={conflictModal.visible}
        onCancel={() => setConflictModal({ visible: false, conflicts: [], log: null })}
        footer={
          <Text type="secondary" style={{ fontSize: 12 }}>
            Restore these changes first (newest first) to unblock this action.
          </Text>
        }
        width={520}
      >
        <ConflictList conflicts={conflictModal.conflicts} />
      </Modal>

      {/* ── CSS ── */}
      <style>{`
        .audit-feed {
          position: relative;
          padding-left: 32px;
        }
        .audit-feed::before {
          content: '';
          position: absolute;
          left: 11px;
          top: 8px;
          bottom: 8px;
          width: 2px;
          background: #e8e8e8;
          border-radius: 1px;
        }
        .tl-node {
          position: relative;
          margin-bottom: 14px;
          transition: opacity 0.2s;
        }
        .tl-dot {
          position: absolute;
          left: -27px;
          top: 18px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          box-shadow: 0 0 0 3px #fff;
          z-index: 1;
        }
        .tl-card {
          border-radius: 8px;
          padding: 16px 20px;
          border-left: 3px solid #e8e8e8;
          background: #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          cursor: pointer;
          transition: box-shadow 0.15s, transform 0.1s;
        }
        .tl-card:hover {
          box-shadow: 0 3px 12px rgba(0,0,0,0.08);
          transform: translateX(2px);
        }
      `}</style>
    </div>
  )
}
