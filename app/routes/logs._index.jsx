import { useEffect, useState, useCallback } from 'react'
import { Button, Tag, Typography, Space, message, Modal, Select, Tooltip, Empty, Row, Col, Pagination, Spin, Collapse } from 'antd'
import {
  UndoOutlined, FilterOutlined, ArrowRightOutlined, HistoryOutlined,
  ClockCircleOutlined, UserOutlined, ExclamationCircleOutlined,
  WarningOutlined, StopOutlined, SafetyCertificateOutlined,
  PlusCircleOutlined, EditOutlined, DeleteOutlined, InfoCircleOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography
const { Option } = Select

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

// ── Confidence status config ──
const STATUS_CONFIG = {
  SAFE:    { color: '#52c41a', bg: '#f6ffed', border: '#b7eb8f', label: 'Safe',    dot: '🟢' },
  CAUTION: { color: '#faad14', bg: '#fffbe6', border: '#ffe58f', label: 'Caution', dot: '🟡' },
  UNSAFE:  { color: '#ff4d4f', bg: '#fff2f0', border: '#ffccc7', label: 'Unsafe',  dot: '🔴' },
}

// ── Student field groups for detail view ──
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

// ── Record detail view (supports Student + generic entities) ──
const RecordFormView = ({ data, action, entityType }) => {
  if (!data) return <Text type="secondary" style={{ padding: 12, display: 'block' }}>No data recorded</Text>
  const valueColor = action === 'delete' ? '#ff4d4f' : '#52c41a'

  if (entityType === 'Student') {
    return (
      <div>
        {STUDENT_FIELD_GROUPS.map(group => {
          const hasAnyValue = group.fields.some(f => data[f.key] != null && data[f.key] !== '')
          if (!hasAnyValue && action === 'create') return null
          return (
            <div key={group.title} style={{ marginBottom: 16 }}>
              <Text strong style={{ fontSize: 13, color: '#0032a0', display: 'block', marginBottom: 8, borderBottom: '1px solid #f0f0f0', paddingBottom: 4 }}>
                {group.title}
              </Text>
              <Row gutter={[16, 4]}>
                {group.fields.map(field => {
                  const val = data[field.key]
                  const isEmpty = val == null || val === ''
                  return (
                    <Col xs={24} sm={12} md={8} key={field.key}>
                      <div style={{ marginBottom: 6 }}>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{field.label}</Text>
                        {isEmpty
                          ? <Text italic style={{ fontSize: 12, color: '#d9d9d9' }}>—</Text>
                          : <Text style={{ fontSize: 12, color: valueColor }}>{String(val)}</Text>
                        }
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

  // Generic key-value for non-Student entities
  const entries = Object.entries(data).filter(([k]) => !['created_at', 'updated_at', 'deleted_at', 'version'].includes(k))
  return (
    <Row gutter={[16, 8]}>
      {entries.map(([key, val]) => (
        <Col xs={24} sm={12} key={key}>
          <div style={{ marginBottom: 6 }}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{key}</Text>
            <Text style={{ fontSize: 12, color: valueColor }}>{val != null ? String(val) : '—'}</Text>
          </div>
        </Col>
      ))}
    </Row>
  )
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

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function LogsIndex() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [filters, setFilters] = useState({ entity_type: null, action: null })

  // Modals
  const [detailModal, setDetailModal] = useState({ visible: false, log: null })
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

  // ── Fetch entity timeline (newest first) ──
  const openTimeline = (entityType, entityId) => {
    if (entityId === 0) return
    setTimelineModal({ visible: true, entityType, entityId, data: [], loading: true })
    fetch(`${API_URL}/logs/timeline/${entityType}/${entityId}`)
      .then(res => res.json())
      .then(data => setTimelineModal(prev => ({ ...prev, data: [...data].reverse(), loading: false })))
      .catch(() => {
        message.error('Failed to load timeline')
        setTimelineModal(prev => ({ ...prev, loading: false }))
      })
  }

  // ── Rollback handler with pre-flight check ──
  const handleRollback = (log) => {
    const eligibility = log.rollback_eligibility

    // UNSAFE — block with explanation
    if (eligibility && !eligibility.rollback_allowed) {
      Modal.warning({
        title: 'Rollback Unavailable',
        icon: <StopOutlined style={{ color: '#ff4d4f' }} />,
        content: (
          <div>
            <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 6, padding: 12, marginBottom: 12 }}>
              <Text strong style={{ color: '#cf1322' }}>
                🔴 Confidence: {eligibility.confidence_score}/100
              </Text>
            </div>
            {eligibility.reasons?.map((r, i) => (
              <div key={i} style={{ fontSize: 13, color: '#595959', marginBottom: 4, paddingLeft: 8 }}>• {r}</div>
            ))}
          </div>
        ),
        okText: 'Understood',
      })
      return
    }

    const isCaution = eligibility?.status === 'CAUTION'
    const cfg = eligibility ? STATUS_CONFIG[eligibility.status] : null

    Modal.confirm({
      title: 'Confirm Rollback',
      icon: isCaution ? <WarningOutlined style={{ color: '#faad14' }} /> : <ExclamationCircleOutlined />,
      content: (
        <div>
          {cfg && (
            <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 6, padding: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <SafetyCertificateOutlined style={{ color: cfg.color, fontSize: 16 }} />
              <div>
                <Text strong style={{ color: cfg.color, fontSize: 13 }}>
                  {cfg.dot} {cfg.label} — Score: {eligibility.confidence_score}/100
                </Text>
                {eligibility.reasons?.length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    {eligibility.reasons.map((r, i) => (
                      <div key={i} style={{ fontSize: 12, color: '#595959' }}>• {r}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <p style={{ marginBottom: 8, fontSize: 13 }}>{log.description}</p>

          {log.action === 'bulk_create' && (
            <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 6, padding: 12, marginBottom: 8 }}>
              <Text strong style={{ color: '#cf1322' }}>This will soft-delete all {log.bulk_count || ''} imported records.</Text>
            </div>
          )}
          {log.action === 'bulk_update' && (
            <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 6, padding: 12, marginBottom: 8 }}>
              <Text strong style={{ color: '#cf1322' }}>This will reverse changes on {log.bulk_count || 'multiple'} records.</Text>
            </div>
          )}

          <div style={{ marginTop: 8, padding: 10, background: '#f6f8fa', borderRadius: 6 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Rollback creates a <strong>new version</strong> — history is never erased.
            </Text>
          </div>
        </div>
      ),
      okText: isCaution ? 'Rollback Anyway' : 'Rollback',
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
            message.error(data.eligibility?.reasons?.[0] || data.error || 'Rollback failed')
          }
        } catch { message.error('Rollback failed') }
      },
    })
  }

  // ── Inline rollback actions (badge + button) ──
  const renderNodeActions = (log) => {
    if (log.rolled_back || log.action === 'rollback') return null
    const canRollback = ['delete', 'update', 'bulk_update', 'bulk_create'].includes(log.action)
    if (!canRollback) return null

    const elig = log.rollback_eligibility
    const isUnsafe = elig && !elig.rollback_allowed
    const cfg = elig ? STATUS_CONFIG[elig.status] : null

    return (
      <Space size={6}>
        {cfg && (
          <Tooltip
            title={
              <div>
                <div style={{ fontWeight: 600 }}>{cfg.dot} {cfg.label} — {elig.confidence_score}/100</div>
                {elig.reasons?.map((r, i) => <div key={i} style={{ fontSize: 12 }}>• {r}</div>)}
              </div>
            }
          >
            <Tag style={{ fontSize: 10, fontWeight: 600, borderRadius: 10, padding: '0 6px', color: cfg.color, borderColor: cfg.border, background: cfg.bg, cursor: 'help', lineHeight: '18px', margin: 0 }}>
              {cfg.dot} {elig.confidence_score}
            </Tag>
          </Tooltip>
        )}
        {isUnsafe ? (
          <Tooltip title={elig.reasons?.[0]}>
            <Button size="small" disabled icon={<UndoOutlined />} style={{ fontSize: 12 }}>Rollback</Button>
          </Tooltip>
        ) : (
          <Button size="small" type="primary" danger icon={<UndoOutlined />} onClick={() => handleRollback(log)} style={{ fontSize: 12 }}>Rollback</Button>
        )}
      </Space>
    )
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
          <Text type="secondary">{log.entity_type} {log.entity_id > 0 ? `#${log.entity_id}` : ''}</Text>
          {log.entity_id === 0 && <Tag color="purple" style={{ fontSize: 10, margin: 0 }}>Batch</Tag>}
          <div style={{ marginLeft: 'auto' }}>
            <Tag style={{ fontSize: 11, fontWeight: 600, borderRadius: 10, padding: '0 8px', color: ns.dot === '#d9d9d9' ? '#8c8c8c' : ns.dot, borderColor: ns.border, background: 'transparent' }}>
              v{log.version}
            </Tag>
          </div>
        </div>

        {/* Description */}
        <Text style={{ fontSize: 13, display: 'block', marginBottom: 16, color: '#262626' }}>{log.description}</Text>

        {/* Rollback origin banner */}
        {log.action === 'rollback' && log.rollback_of && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fff7e6', border: '1px solid #ffe58f', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <UndoOutlined style={{ color: '#fa8c16' }} />
            <Text style={{ fontSize: 12, color: '#d48806' }}>Restored state from an earlier version (Log #{log.rollback_of})</Text>
            {log.rollback_confidence != null && (
              <Tag style={{ fontSize: 10, borderRadius: 10, margin: 0, color: STATUS_CONFIG[log.rollback_status]?.color, borderColor: STATUS_CONFIG[log.rollback_status]?.border, background: STATUS_CONFIG[log.rollback_status]?.bg }}>
                {STATUS_CONFIG[log.rollback_status]?.dot} {log.rollback_confidence}/100
              </Tag>
            )}
          </div>
        )}

        {/* Superseded banner */}
        {log.rolled_back && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#f5f5f5', border: '1px solid #e8e8e8', borderRadius: 6 }}>
            <Text style={{ fontSize: 12, color: '#8c8c8c' }}>This action was superseded by a later rollback.</Text>
          </div>
        )}

        {/* Update / Rollback: field comparison */}
        {(log.action === 'update' || log.action === 'rollback') && log.data_before && log.data_after && log.changed_fields && (
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8, color: '#8c8c8c' }}>Changes</Text>
            <FieldsComparison record={log} />
          </div>
        )}

        {/* Create: full record */}
        {log.action === 'create' && log.data_after && (
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8, color: '#8c8c8c' }}>Record Created</Text>
            <RecordFormView data={log.data_after} action="create" entityType={log.entity_type} />
          </div>
        )}

        {/* Delete: full record */}
        {log.action === 'delete' && log.data_before && (
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8, color: '#8c8c8c' }}>Record Deleted</Text>
            <RecordFormView data={log.data_before} action="delete" entityType={log.entity_type} />
          </div>
        )}

        {/* Bulk info */}
        {(log.action === 'bulk_create' || log.action === 'bulk_update') && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#f9f0ff', border: '1px solid #d3adf7', borderRadius: 6 }}>
            <Text style={{ fontSize: 12 }}>{log.bulk_count || '?'} record(s) affected</Text>
            {log.changed_fields?.length > 0 && (
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>Fields: {log.changed_fields.join(', ')}</Text>
            )}
          </div>
        )}
        {log.action === 'bulk_update' && log.data_before && log.data_after && log.changed_fields && (
          <FieldsComparison record={log} />
        )}

        {/* Rollback of create (soft-delete) — show deleted record */}
        {log.action === 'rollback' && log.data_before && (!log.data_after || Object.keys(log.data_after).length === 0) && (
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8, color: '#8c8c8c' }}>Record Before Removal</Text>
            <RecordFormView data={log.data_before} action="delete" entityType={log.entity_type} />
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
        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12, marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {log.entity_id > 0 ? (
            <Button
              type="link" size="small" icon={<HistoryOutlined />} style={{ padding: 0, fontSize: 12 }}
              onClick={() => { setDetailModal({ visible: false, log: null }); openTimeline(log.entity_type, log.entity_id) }}
            >
              View full timeline
            </Button>
          ) : <div />}

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
    <div style={{ padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Title level={2} style={{ margin: 0, color: '#0032a0', fontSize: 22, fontWeight: 600 }}>Activity History</Title>
        <Text type="secondary" style={{ fontSize: 13, marginTop: 2, display: 'block' }}>All changes are recorded — newest activity appears first</Text>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <FilterOutlined style={{ color: '#bfbfbf' }} />
        <Select placeholder="Entity Type" allowClear style={{ width: 150 }} value={filters.entity_type} onChange={(v) => setFilters(prev => ({ ...prev, entity_type: v || null }))}>
          <Option value="Student">Student</Option>
          <Option value="Disbursement">Disbursement</Option>
        </Select>
        <Select placeholder="Action" allowClear style={{ width: 150 }} value={filters.action} onChange={(v) => setFilters(prev => ({ ...prev, action: v || null }))}>
          <Option value="create">Created</Option>
          <Option value="update">Updated</Option>
          <Option value="delete">Deleted</Option>
          <Option value="rollback">Restored</Option>
          <Option value="bulk_create">Bulk Import</Option>
          <Option value="bulk_update">Bulk Update</Option>
        </Select>
        <Text type="secondary" style={{ fontSize: 12, marginLeft: 'auto' }}>
          {pagination.total} {pagination.total === 1 ? 'entry' : 'entries'}
        </Text>
      </div>

      {/* Legend & Rules */}
      <Collapse
        size="small"
        bordered={false}
        style={{ marginBottom: 20, background: '#fafbfc', borderRadius: 8 }}
        items={[
          {
            key: 'guide',
            label: (
              <Space size={6}>
                <QuestionCircleOutlined style={{ color: '#0032a0', fontSize: 13 }} />
                <Text style={{ fontSize: 12.5, color: '#595959' }}>Legend & How It Works</Text>
              </Space>
            ),
            children: (
              <div style={{ padding: '4px 0' }}>
                {/* Color Legend */}
                <Text strong style={{ fontSize: 12, color: '#262626', display: 'block', marginBottom: 10 }}>Timeline Color Legend</Text>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
                  {[
                    { color: '#52c41a', label: 'Created', desc: 'New record added' },
                    { color: '#1890ff', label: 'Updated', desc: 'Record modified' },
                    { color: '#ff4d4f', label: 'Deleted', desc: 'Record removed' },
                    { color: '#fa8c16', label: 'Restored', desc: 'Rolled back to prior state' },
                    { color: '#722ed1', label: 'Bulk Import', desc: 'Multiple records added' },
                    { color: '#13c2c2', label: 'Bulk Update', desc: 'Multiple records changed' },
                    { color: '#d9d9d9', label: 'Superseded', desc: 'Action undone by rollback' },
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

                {/* Confidence Scores */}
                <Text strong style={{ fontSize: 12, color: '#262626', display: 'block', marginBottom: 8 }}>Rollback Confidence</Text>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
                  {[
                    { dot: '🟢', label: 'Safe (90–100)', desc: 'No conflicts detected, safe to rollback' },
                    { dot: '🟡', label: 'Caution (60–89)', desc: 'Minor conflicts — review before proceeding' },
                    { dot: '🔴', label: 'Unsafe (0–59)', desc: 'Major conflicts — rollback blocked' },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 200 }}>
                      <span style={{ fontSize: 12, flexShrink: 0 }}>{item.dot}</span>
                      <div>
                        <Text style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.2, display: 'block' }}>{item.label}</Text>
                        <Text type="secondary" style={{ fontSize: 11, lineHeight: 1.2 }}>{item.desc}</Text>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Rules */}
                <Text strong style={{ fontSize: 12, color: '#262626', display: 'block', marginBottom: 8 }}>How the Log System Works</Text>
                <div style={{ display: 'grid', gap: 6, fontSize: 12, color: '#434343', lineHeight: 1.6 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <InfoCircleOutlined style={{ color: '#1890ff', marginTop: 3, flexShrink: 0 }} />
                    <span>Every create, update, delete, and bulk operation is <strong>automatically logged</strong> with full before/after snapshots.</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <InfoCircleOutlined style={{ color: '#1890ff', marginTop: 3, flexShrink: 0 }} />
                    <span>Logs are <strong>immutable</strong> — once recorded, an entry is never modified or erased.</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <InfoCircleOutlined style={{ color: '#fa8c16', marginTop: 3, flexShrink: 0 }} />
                    <span>Rollback <strong>restores state</strong>, it does not replay actions. It creates a <strong>new version</strong> rather than erasing history.</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <InfoCircleOutlined style={{ color: '#fa8c16', marginTop: 3, flexShrink: 0 }} />
                    <span>When a rollback occurs, the original action is marked <strong>"Superseded"</strong> (grayed out) and the new restored state gets the next version number.</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <InfoCircleOutlined style={{ color: '#52c41a', marginTop: 3, flexShrink: 0 }} />
                    <span>Each rollback is <strong>scored for safety</strong> (0–100). Factors that lower the score: conflicting edits by other users, version distance, deleted dependencies, and batch size.</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <InfoCircleOutlined style={{ color: '#ff4d4f', marginTop: 3, flexShrink: 0 }} />
                    <span>Rollbacks scored <strong>below 60 are blocked</strong> to prevent data corruption. Caution rollbacks (60–89) require manual confirmation.</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <InfoCircleOutlined style={{ color: '#1890ff', marginTop: 3, flexShrink: 0 }} />
                    <span>Click any card to view full details. Click the <strong>entity ID</strong> (e.g. #537) to view the complete version history of that record.</span>
                  </div>
                </div>
              </div>
            ),
          },
        ]}
      />

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
            const isRollbackAction = log.action === 'rollback'

            return (
              <div key={log.id} className="tl-node" style={{ opacity: isSuperseded ? 0.5 : 1 }}>
                <div className="tl-dot" style={{ background: ns.dot }} />
                <div
                  className="tl-card"
                  style={{
                    borderLeftColor: ns.border,
                    background: isRollbackAction && !isSuperseded ? '#fffcf5' : '#fff',
                  }}
                  onClick={() => setDetailModal({ visible: true, log })}
                >
                  {/* Row 1: Action + Entity + Version */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Space size={6}>
                      <span style={{ color: isSuperseded ? '#bfbfbf' : ns.dot, fontSize: 14 }}>{ns.icon}</span>
                      <Text strong style={{ fontSize: 13, color: isSuperseded ? '#8c8c8c' : '#262626' }}>{ns.label}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{log.entity_type}</Text>
                      {log.entity_id > 0 && (
                        <a
                          onClick={(e) => { e.stopPropagation(); openTimeline(log.entity_type, log.entity_id) }}
                          style={{ fontSize: 11, color: '#1890ff' }}
                        >
                          #{log.entity_id}
                        </a>
                      )}
                      {log.entity_id === 0 && <Tag color="purple" style={{ fontSize: 10, margin: 0, lineHeight: '16px', padding: '0 5px' }}>Batch</Tag>}
                    </Space>
                    <Space size={4}>
                      {log.previous_version && (
                        <>
                          <Tag style={{ fontSize: 10, margin: 0, color: '#8c8c8c', borderColor: '#d9d9d9', background: 'transparent', borderRadius: 8, padding: '0 6px' }}>v{log.previous_version}</Tag>
                          <ArrowRightOutlined style={{ fontSize: 8, color: '#d9d9d9' }} />
                        </>
                      )}
                      <Tag style={{
                        fontSize: 10, margin: 0, fontWeight: 600, borderRadius: 8, padding: '0 6px', background: 'transparent',
                        color: isSuperseded ? '#8c8c8c' : isRollbackAction ? '#fa8c16' : '#0032a0',
                        borderColor: isSuperseded ? '#d9d9d9' : ns.border,
                      }}>v{log.version}</Tag>
                    </Space>
                  </div>

                  {/* Row 2: Description */}
                  <Text style={{ fontSize: 12.5, color: isSuperseded ? '#8c8c8c' : '#434343', display: 'block', marginBottom: 6, lineHeight: 1.5 }}>
                    {log.description}
                  </Text>

                  {/* Status badges */}
                  {isRollbackAction && !isSuperseded && (
                    <div style={{ marginBottom: 6 }}>
                      <Tag color="orange" style={{ fontSize: 11, borderRadius: 4, margin: 0 }}>
                        <UndoOutlined style={{ marginRight: 4 }} />Restored from earlier version
                      </Tag>
                    </div>
                  )}
                  {isSuperseded && (
                    <div style={{ marginBottom: 6 }}>
                      <Tag style={{ fontSize: 11, color: '#8c8c8c', borderColor: '#d9d9d9', background: '#f5f5f5', margin: 0 }}>Superseded</Tag>
                    </div>
                  )}

                  {/* Row 3: Actor + Timestamp + Rollback */}
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

      {/* ── Entity Timeline Modal ── */}
      <Modal
        title={
          <Space>
            <HistoryOutlined style={{ color: '#0032a0' }} />
            <Text strong>Timeline</Text>
            <Text type="secondary">{timelineModal.entityType} #{timelineModal.entityId}</Text>
          </Space>
        }
        open={timelineModal.visible}
        onCancel={() => setTimelineModal({ visible: false, entityType: null, entityId: null, data: [], loading: false })}
        footer={null}
        width={600}
        styles={{ body: { maxHeight: '75vh', overflowY: 'auto' } }}
      >
        {timelineModal.loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : timelineModal.data.length === 0 ? (
          <Empty description="No history found" />
        ) : (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <Tag color="blue">{timelineModal.data.length} version{timelineModal.data.length !== 1 ? 's' : ''}</Tag>
              <Tag color="green">Current: v{timelineModal.data[0]?.version}</Tag>
            </div>

            <div className="audit-feed tl-compact">
              {timelineModal.data.map((entry, idx) => {
                const entryNs = getNodeStyle(entry)
                const isFirst = idx === 0
                const isActive = isFirst && !entry.rolled_back
                const isRb = entry.action === 'rollback'

                return (
                  <div key={entry.id} className="tl-node" style={{ opacity: entry.rolled_back ? 0.45 : 1 }}>
                    <div className="tl-dot" style={{ background: isActive ? '#52c41a' : entryNs.dot, boxShadow: isActive ? '0 0 0 3px #f6ffed, 0 0 0 5px #b7eb8f' : undefined }} />
                    <div className="tl-card tl-card-compact" style={{ borderLeftColor: isActive ? '#b7eb8f' : entryNs.border }}>

                      {/* Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <Space size={6}>
                          <Text strong style={{ fontSize: 12, color: entry.rolled_back ? '#8c8c8c' : '#262626' }}>{entryNs.label}</Text>
                          {isActive && <Tag color="green" style={{ fontSize: 10, margin: 0, lineHeight: '16px', padding: '0 5px', borderRadius: 4 }}>Current</Tag>}
                          {entry.rolled_back && <Tag style={{ fontSize: 10, margin: 0, color: '#8c8c8c', borderColor: '#d9d9d9', background: '#f5f5f5' }}>Superseded</Tag>}
                          {isRb && entry.rollback_target_version && (
                            <Text style={{ fontSize: 11, color: '#fa8c16' }}>restored from v{entry.rollback_target_version}</Text>
                          )}
                          {isRb && entry.rollback_confidence != null && (
                            <Tag style={{ fontSize: 10, borderRadius: 10, padding: '0 5px', margin: 0, color: STATUS_CONFIG[entry.rollback_status]?.color, borderColor: STATUS_CONFIG[entry.rollback_status]?.border, background: STATUS_CONFIG[entry.rollback_status]?.bg }}>
                              {STATUS_CONFIG[entry.rollback_status]?.dot} {entry.rollback_confidence}
                            </Tag>
                          )}
                        </Space>
                        <Tag style={{
                          fontSize: 10, fontWeight: 600, margin: 0, borderRadius: 8, padding: '0 6px', background: 'transparent',
                          color: isActive ? '#52c41a' : isRb ? '#fa8c16' : '#8c8c8c',
                          borderColor: isActive ? '#b7eb8f' : entryNs.border,
                        }}>v{entry.version}</Tag>
                      </div>

                      {/* Description */}
                      <Text style={{ fontSize: 12, color: entry.rolled_back ? '#8c8c8c' : '#434343', display: 'block', marginBottom: 4 }}>
                        {entry.description}
                      </Text>

                      {/* Meta */}
                      <Text style={{ fontSize: 11, color: '#8c8c8c' }}>
                        {entry.user?.username || 'System'}{entry.user_role ? ` (${entry.user_role})` : ''} · {formatDisplayDate(entry.created_at)}
                      </Text>

                      {/* Inline field changes (max 3 shown) */}
                      {(entry.action === 'update' || isRb) && entry.changed_fields?.length > 0 && entry.data_before && entry.data_after && (
                        <div style={{ marginTop: 6, padding: '5px 10px', background: isRb ? '#fff7e6' : '#f6f8fa', borderRadius: 4, fontSize: 12 }}>
                          {entry.changed_fields.slice(0, 3).map(f => (
                            <div key={f}>
                              <Text type="secondary" style={{ fontSize: 11 }}>{f}: </Text>
                              <Text delete style={{ color: '#ff4d4f', fontSize: 11 }}>{entry.data_before[f] ?? 'empty'}</Text>
                              <Text style={{ color: '#bfbfbf', fontSize: 11 }}> → </Text>
                              <Text style={{ color: isRb ? '#fa8c16' : '#52c41a', fontSize: 11 }}>{entry.data_after[f] ?? 'empty'}</Text>
                            </div>
                          ))}
                          {entry.changed_fields.length > 3 && (
                            <Text type="secondary" style={{ fontSize: 11 }}>+{entry.changed_fields.length - 3} more</Text>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
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
        .tl-card-compact {
          padding: 10px 14px;
          cursor: default;
        }
        .tl-card-compact:hover {
          transform: none;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .tl-compact .tl-node {
          margin-bottom: 8px;
        }
        .tl-compact .tl-dot {
          top: 14px;
          width: 8px;
          height: 8px;
          left: -25px;
        }
      `}</style>
    </div>
  )
}
