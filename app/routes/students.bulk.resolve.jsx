import { useState, useMemo, useCallback, useEffect } from 'react'
import { Typography, Button, Tag, Card, Space, Collapse, Progress, Modal, message, Empty, Tooltip } from 'antd'
import {
  CheckCircleOutlined,
  WarningOutlined,
  MergeOutlined,
  ArrowLeftOutlined,
  SendOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
  FileAddOutlined,
  SwapOutlined,
  CheckOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'

import { API_BASE } from '../lib/config'

const { Title, Text } = Typography

// ─── Human-readable field labels ───
const FIELD_LABELS = {
  in_charge: 'In-Charge', award_year: 'Award Year', scholarship_program: 'Scholarship Program',
  award_number: 'Award Number', learner_reference_number: 'LRN', surname: 'Surname',
  first_name: 'First Name', middle_name: 'Middle Name', extension: 'Extension',
  sex: 'Sex', date_of_birth: 'Date of Birth', contact_number: 'Contact Number',
  email_address: 'Email Address', street_brgy: 'Street/Brgy', municipality_city: 'Municipality/City',
  province: 'Province', congressional_district: 'Congressional District', zip_code: 'Zip Code',
  special_group: 'Special Group', certification_number: 'Certification Number',
  name_of_institution: 'Name of Institution', uii: 'UII', institutional_type: 'Institutional Type',
  region: 'Region', degree_program: 'Degree Program', program_major: 'Program Major',
  program_discipline: 'Program Discipline', program_degree_level: 'Program Degree Level',
  authority_type: 'Authority Type', authority_number: 'Authority Number', series: 'Series',
  is_priority: 'Priority', basis_cmo: 'Basis (CMO)', scholarship_status: 'Scholarship Status',
  replacement_info: 'Replacement', termination_reason: 'Reason',
  curriculum_year_level: 'CYL', nta: 'NTA', fund_source: 'Fund Source',
  voucher_tracking_no: 'Voucher Tracking No.', mode_of_payment: 'Mode of Payment',
  atm_account_no: 'ATM Account No.', date_process: 'Date Process', voucher_no: 'Voucher No.',
  voucher_date: 'Voucher Date', account_check_no: 'Account/Check No.', amount: 'Amount',
  lddap_no: 'LDDAP No.', disbursement_date: 'Disbursement Date', status: 'Status', remarks: 'Remarks',
}
const fl = (k) => FIELD_LABELS[k] || k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

// ─── Match type badge ───
const MatchBadge = ({ type, score }) => {
  if (type === 'award_number') return <Tag color="orange">Award # Match</Tag>
  if (type === 'fuzzy_name') return <Tag color="purple">Name Match ({score}%)</Tag>
  if (type === 'lrn') return <Tag color="cyan">LRN Match</Tag>
  return null
}

// ─── Single diff row ───
const DiffRow = ({ field, status, dbValue, importValue, choice, onPick }) => {
  const isFill = status === 'fill'
  const isConflict = status === 'conflict'

  return (
    <div style={{
      display: 'flex', alignItems: 'stretch',
      borderBottom: '1px solid #f0f0f0', fontSize: 13,
    }}>
      {/* Field label */}
      <div style={{
        width: 180, minWidth: 180, padding: '8px 12px',
        background: '#fafafa', borderRight: '1px solid #f0f0f0',
        display: 'flex', alignItems: 'center', fontWeight: 500,
      }}>
        {isConflict && <SwapOutlined style={{ color: '#ff4d4f', marginRight: 6, fontSize: 11 }} />}
        {isFill && <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 6, fontSize: 11 }} />}
        {fl(field)}
      </div>

      {/* DB value */}
      <div
        onClick={() => isConflict && onPick?.('db')}
        style={{
          flex: 1, padding: '8px 12px',
          background: choice === 'db' ? '#f6ffed' : isConflict ? '#fff1f0' : '#fff',
          borderRight: '1px solid #f0f0f0',
          cursor: isConflict ? 'pointer' : 'default',
          fontFamily: 'monospace',
          color: dbValue != null ? '#1f2937' : '#d1d5db',
          display: 'flex', alignItems: 'center', gap: 6,
          transition: 'background 0.15s',
        }}
      >
        {choice === 'db' && <CheckOutlined style={{ color: '#52c41a', fontSize: 11, flexShrink: 0 }} />}
        {dbValue ?? '(empty)'}
      </div>

      {/* Import value */}
      <div
        onClick={() => (isConflict || isFill) && onPick?.('import')}
        style={{
          flex: 1, padding: '8px 12px',
          background: choice === 'import' || (isFill && choice !== 'db') ? '#f6ffed' : isConflict ? '#fff1f0' : '#fff',
          cursor: isConflict ? 'pointer' : 'default',
          fontFamily: 'monospace',
          color: importValue != null ? '#1f2937' : '#d1d5db',
          display: 'flex', alignItems: 'center', gap: 6,
          transition: 'background 0.15s',
        }}
      >
        {(choice === 'import' || (isFill && choice !== 'db')) &&
          <CheckOutlined style={{ color: '#52c41a', fontSize: 11, flexShrink: 0 }} />}
        {importValue ?? '(empty)'}
        {isFill && <Tag color="green" style={{ margin: 0, fontSize: 10, marginLeft: 'auto' }}>FILL</Tag>}
      </div>
    </div>
  )
}

// ─── Duplicate card ───
const DuplicateCard = ({ dup, resolution, onAction, onFieldPick, onDisbFieldPick }) => {
  const { db_student: db, match_type, match_score, has_conflict, fields, disbursements, import_index } = dup
  const name = [db.surname, db.first_name, db.middle_name].filter(Boolean).join(', ')
  const action = resolution?.action

  const conflicts = (fields || []).filter(f => f.status === 'conflict')
  const fills = (fields || []).filter(f => f.status === 'fill')
  const disbConflicts = (disbursements || []).filter(d =>
    d.status === 'existing' && (d.fields || []).some(f => f.status === 'conflict')
  )
  const newDisb = (disbursements || []).filter(d => d.status === 'new')

  const totalConflicts = conflicts.length +
    disbConflicts.reduce((s, d) => s + (d.fields || []).filter(f => f.status === 'conflict').length, 0)
  const resolvedCount = Object.keys(resolution?.fields || {}).filter(k =>
    conflicts.some(c => c.field === k)
  ).length +
    Object.values(resolution?.disbFields || {}).reduce((s, obj) => s + Object.keys(obj).length, 0)
  const isFullyResolved = action === 'skip' || (action === 'update' && resolvedCount >= totalConflicts)
  const borderColor = action === 'skip' ? '#d9d9d9' : isFullyResolved ? '#52c41a' : '#ff4d4f'

  return (
    <Card
      size="small"
      style={{
        marginBottom: 12,
        borderLeft: `4px solid ${borderColor}`,
        opacity: action === 'skip' ? 0.6 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
        <Space size={8} wrap>
          {isFullyResolved
            ? <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
            : <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />}
          <Text strong style={{ fontSize: 14 }}>{name}</Text>
          <MatchBadge type={match_type} score={match_score} />
          {db.award_number && <Text type="secondary" style={{ fontSize: 11 }}>#{db.award_number}</Text>}
          <Tag style={{ fontSize: 10 }}>SEQ {db.seq}</Tag>
        </Space>

        <Space size={4}>
          {has_conflict && action !== 'skip' && (
            <Tag color={resolvedCount >= totalConflicts ? 'green' : 'red'} style={{ fontSize: 10 }}>
              {resolvedCount}/{totalConflicts}
            </Tag>
          )}
          <Tooltip title="Use all import values (overwrite DB)">
            <Button size="small" type={action === 'update' ? 'primary' : 'default'}
              style={action === 'update' && isFullyResolved ? { background: '#52c41a', borderColor: '#52c41a', color: '#fff' } : {}}
              onClick={() => onAction(import_index, 'update')}>
              Accept Import
            </Button>
          </Tooltip>
          <Tooltip title="Skip — don't touch this student">
            <Button size="small" type={action === 'skip' ? 'primary' : 'default'} danger={action === 'skip'}
              onClick={() => onAction(import_index, 'skip')}>
              Skip
            </Button>
          </Tooltip>
          {action && (
            <Tooltip title="Reset choices">
              <Button size="small" icon={<UndoOutlined />} onClick={() => onAction(import_index, null)} />
            </Tooltip>
          )}
        </Space>
      </div>

      {action === 'skip' && (
        <Text type="secondary" style={{ fontSize: 12 }}>This student will be skipped (no changes to DB)</Text>
      )}

      {action !== 'skip' && (fields?.length > 0 || disbursements?.length > 0) && (
        <>
          {/* Diff table header */}
          <div style={{
            display: 'flex', background: '#e6f7ff', borderRadius: '4px 4px 0 0',
            border: '1px solid #91d5ff', borderBottom: 'none', fontSize: 11, fontWeight: 600,
          }}>
            <div style={{ width: 180, minWidth: 180, padding: '6px 12px' }}>Field</div>
            <div style={{ flex: 1, padding: '6px 12px', borderLeft: '1px solid #91d5ff' }}>
              <Tag color="orange" style={{ margin: 0, fontSize: 10 }}>DATABASE</Tag>
            </div>
            <div style={{ flex: 1, padding: '6px 12px', borderLeft: '1px solid #91d5ff' }}>
              <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>IMPORT</Tag>
            </div>
          </div>

          {/* Field diff rows */}
          <div style={{ border: '1px solid #f0f0f0', borderRadius: '0 0 4px 4px', marginBottom: 8 }}>
            {(fields || []).map((f, i) => (
              <DiffRow
                key={i}
                field={f.field}
                status={f.status}
                dbValue={f.db_value}
                importValue={f.import_value}
                choice={
                  f.status === 'fill'
                    ? (resolution?.fields?.[f.field] || 'import')
                    : resolution?.fields?.[f.field]
                }
                onPick={(choice) => onFieldPick(import_index, f.field, choice)}
              />
            ))}
          </div>

          {/* New disbursements */}
          {newDisb.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                <FileAddOutlined /> New disbursements (will be added):
              </Text>
              <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {newDisb.map((d, i) => (
                  <Tag key={i} color="green" style={{ fontSize: 11 }}>
                    + {d.academic_year} {d.semester}
                  </Tag>
                ))}
              </div>
            </div>
          )}

          {/* Disbursement conflicts */}
          {disbConflicts.length > 0 && disbConflicts.map((dc, di) => (
            <div key={di} style={{ marginBottom: 6 }}>
              <Text style={{ fontSize: 11, color: '#cf1322', fontWeight: 600 }}>
                <WarningOutlined /> {dc.academic_year} — {dc.semester}
              </Text>
              <div style={{ border: '1px solid #f0f0f0', borderRadius: 4, marginTop: 4 }}>
                {(dc.fields || []).map((f, fi) => (
                  <DiffRow
                    key={fi}
                    field={f.field}
                    status={f.status}
                    dbValue={f.db_value}
                    importValue={f.import_value}
                    choice={
                      f.status === 'fill'
                        ? (resolution?.disbFields?.[dc.existing_id]?.[f.field] || 'import')
                        : resolution?.disbFields?.[dc.existing_id]?.[f.field]
                    }
                    onPick={(choice) => onDisbFieldPick(import_index, dc.existing_id, f.field, choice)}
                  />
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </Card>
  )
}

// ─── Main Page ───
export default function BulkResolve() {
  const navigate = useNavigate()
  const location = useLocation()
  const [resolveData, setResolveData] = useState(null)
  const [resolutions, setResolutions] = useState({})
  const [merging, setMerging] = useState(false)
  const [mergeProgress, setMergeProgress] = useState(null)

  useEffect(() => {
    if (!location.state?.resolveData) {
      message.warning('No import data. Start from Bulk Import.')
      navigate('/students/bulk')
      return
    }
    setResolveData(location.state.resolveData)
  }, [location.state, navigate])

  const summary = resolveData?.summary || { clean_count: 0, duplicate_count: 0, total: 0 }
  const cleanRows = resolveData?.clean || []
  const duplicates = resolveData?.duplicates || []

  // ─── Resolution tracking ───
  const { totalConflicts, resolvedConflicts, allResolved } = useMemo(() => {
    let total = 0
    let resolved = 0
    let noAction = 0

    duplicates.forEach((dup) => {
      const res = resolutions[dup.import_index]
      if (!res?.action) { noAction++; return }
      if (res.action === 'skip') return

      const conflicts = (dup.fields || []).filter(f => f.status === 'conflict')
      total += conflicts.length
      resolved += conflicts.filter(f => res.fields?.[f.field]).length

      ;(dup.disbursements || []).forEach(d => {
        if (d.status !== 'existing') return
        const dConflicts = (d.fields || []).filter(f => f.status === 'conflict')
        total += dConflicts.length
        resolved += dConflicts.filter(f => res.disbFields?.[d.existing_id]?.[f.field]).length
      })
    })

    return {
      totalConflicts: total + noAction,
      resolvedConflicts: resolved,
      allResolved: noAction === 0 && resolved >= total,
    }
  }, [duplicates, resolutions])

  // ─── Actions ───
  const handleAction = useCallback((importIndex, action) => {
    setResolutions(prev => {
      if (action === null) {
        const next = { ...prev }
        delete next[importIndex]
        return next
      }

      const dup = duplicates.find(d => d.import_index === importIndex)
      if (!dup) return prev

      if (action === 'skip') {
        return { ...prev, [importIndex]: { action: 'skip', fields: {}, disbFields: {} } }
      }

      // 'update' — accept all import values
      const fields = {}
      ;(dup.fields || []).forEach(f => { fields[f.field] = 'import' })

      const disbFields = {}
      ;(dup.disbursements || []).forEach(d => {
        if (d.status === 'existing') {
          disbFields[d.existing_id] = {}
          ;(d.fields || []).forEach(f => { disbFields[d.existing_id][f.field] = 'import' })
        }
      })

      return { ...prev, [importIndex]: { action: 'update', fields, disbFields } }
    })
  }, [duplicates])

  const handleFieldPick = useCallback((importIndex, field, choice) => {
    setResolutions(prev => {
      const cur = prev[importIndex] || { action: 'update', fields: {}, disbFields: {} }
      return {
        ...prev,
        [importIndex]: {
          ...cur,
          action: cur.action || 'update',
          fields: { ...cur.fields, [field]: choice },
        },
      }
    })
  }, [])

  const handleDisbFieldPick = useCallback((importIndex, existingId, field, choice) => {
    setResolutions(prev => {
      const cur = prev[importIndex] || { action: 'update', fields: {}, disbFields: {} }
      return {
        ...prev,
        [importIndex]: {
          ...cur,
          action: cur.action || 'update',
          disbFields: {
            ...cur.disbFields,
            [existingId]: { ...(cur.disbFields?.[existingId] || {}), [field]: choice },
          },
        },
      }
    })
  }, [])

  // ─── Merge ───
  const handleMerge = async () => {
    if (!allResolved) {
      message.error('Resolve all conflicts first')
      return
    }

    setMerging(true)
    setMergeProgress({ phase: 'Preparing...', percent: 0 })

    try {
      const resolvedEntries = duplicates.map(dup => {
        const res = resolutions[dup.import_index] || {}
        if (res.action === 'skip') {
          return { import_index: dup.import_index, db_seq: dup.db_seq, action: 'skip' }
        }

        const fieldResolutions = (dup.fields || []).map(f => ({
          field: f.field,
          choice: res.fields?.[f.field] || (f.status === 'fill' ? 'import' : 'db'),
          value: f.import_value,
        }))

        const disbursementResolutions = (dup.disbursements || []).map(d => {
          if (d.status === 'new') return { action: 'new', data: d.data }
          if (d.status === 'existing') {
            return {
              action: 'update',
              existing_id: d.existing_id,
              field_resolutions: (d.fields || []).map(f => ({
                field: f.field,
                choice: res.disbFields?.[d.existing_id]?.[f.field] || (f.status === 'fill' ? 'import' : 'db'),
                value: f.import_value,
              })),
            }
          }
          return null
        }).filter(Boolean)

        return {
          import_index: dup.import_index,
          db_seq: dup.db_seq,
          action: 'update',
          field_resolutions: fieldResolutions,
          disbursement_resolutions: disbursementResolutions,
        }
      })

      const cleanDisb = location.state?.cleanDisbursements || []

      setMergeProgress({ phase: 'Merging...', percent: 40 })

      const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
      const userHeaders = { 'Content-Type': 'application/json', ...(storedUser?.id ? { 'X-User-Id': String(storedUser.id) } : {}) }
      const res = await fetch(`${API_BASE}/students/merge-import`, {
        method: 'POST',
        headers: userHeaders,
        body: JSON.stringify({
          clean: cleanRows,
          resolved: resolvedEntries,
          disbursements: cleanDisb,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Merge failed')
      }

      const result = await res.json()
      setMergeProgress({ phase: 'Updating slots...', percent: 85 })
      await fetch(`${API_BASE}/scholarship_programs/update-slots`, { method: 'POST' }).catch(() => {})

      setMergeProgress({ phase: 'Done!', percent: 100 })
      await new Promise(r => setTimeout(r, 600))

      const s = result.stats || {}
      message.success(`${s.inserted || 0} inserted, ${s.updated || 0} updated, ${s.skipped || 0} skipped`)
      navigate('/students')
    } catch (err) {
      console.error('Merge error:', err)
      message.error(err.message || 'Merge failed')
    } finally {
      setMerging(false)
      setMergeProgress(null)
    }
  }

  if (!resolveData) {
    return <div style={{ padding: 60, textAlign: 'center' }}><LoadingOutlined style={{ fontSize: 36 }} /></div>
  }

  const canMerge = allResolved && !merging

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24, paddingBottom: 80 }}>
      {/* Back */}
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/students/bulk')} style={{ marginBottom: 16 }}>
        Back to Bulk Import
      </Button>

      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <MergeOutlined style={{ fontSize: 26, color: '#1890ff' }} />
        <div>
          <Title level={3} style={{ margin: 0 }}>Resolve Import</Title>
          <Text type="secondary">Review duplicates before importing</Text>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Card size="small" style={{ flex: 1, borderTop: '3px solid #52c41a', textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#52c41a' }}>{summary.clean_count}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>New Students</Text>
        </Card>
        <Card size="small" style={{ flex: 1, borderTop: `3px solid ${summary.duplicate_count > 0 ? '#fa8c16' : '#52c41a'}`, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: summary.duplicate_count > 0 ? '#fa8c16' : '#52c41a' }}>
            {summary.duplicate_count}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>Duplicates</Text>
        </Card>
      </div>

      {/* Merge status bar */}
      <Card size="small" style={{
        marginBottom: 20,
        background: canMerge ? '#f6ffed' : '#fff7e6',
        border: `1px solid ${canMerge ? '#b7eb8f' : '#ffe58f'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <Space>
            {canMerge
              ? <CheckCircleOutlined style={{ fontSize: 20, color: '#52c41a' }} />
              : <ExclamationCircleOutlined style={{ fontSize: 20, color: '#fa8c16' }} />}
            <div>
              <Text strong style={{ color: canMerge ? '#389e0d' : '#d46b08' }}>
                {canMerge ? 'Ready to merge!' : `${resolvedConflicts}/${totalConflicts} resolved`}
              </Text>
              {!canMerge && totalConflicts > 0 && (
                <Progress
                  percent={totalConflicts > 0 ? Math.round((resolvedConflicts / totalConflicts) * 100) : 0}
                  size="small" style={{ width: 180, marginTop: 2 }}
                  strokeColor={canMerge ? '#52c41a' : '#fa8c16'}
                />
              )}
            </div>
          </Space>
          <Button
            type="primary" size="large" icon={<SendOutlined />}
            onClick={handleMerge} disabled={!canMerge} loading={merging}
            style={canMerge ? { background: '#52c41a', borderColor: '#52c41a' } : {}}
          >
            {canMerge ? 'Merge & Import' : 'Resolve All First'}
          </Button>
        </div>
      </Card>

      {/* Clean rows */}
      {cleanRows.length > 0 && (
        <Collapse
          style={{ marginBottom: 16 }}
          items={[{
            key: 'clean',
            label: (
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <Text strong>New Students ({cleanRows.length})</Text>
                <Tag color="green">Ready to insert</Tag>
              </Space>
            ),
            children: (
              <div style={{ maxHeight: 250, overflowY: 'auto' }}>
                {cleanRows.map((item, i) => {
                  const d = item.data || {}
                  return (
                    <div key={i} style={{
                      padding: '5px 12px', background: i % 2 === 0 ? '#f6ffed' : '#fff',
                      borderRadius: 3, marginBottom: 1, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
                    }}>
                      <FileAddOutlined style={{ color: '#52c41a', fontSize: 12 }} />
                      <Text>{[d.surname, d.first_name, d.middle_name].filter(Boolean).join(', ')}</Text>
                      {d.award_number && <Tag style={{ fontSize: 10 }}>{d.award_number}</Tag>}
                    </div>
                  )
                })}
              </div>
            ),
          }]}
        />
      )}

      {/* Duplicates */}
      {duplicates.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <WarningOutlined style={{ color: '#fa8c16' }} />
            <Title level={5} style={{ margin: 0 }}>Duplicates ({duplicates.length})</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              — Click DATABASE or IMPORT column to pick, or use quick action buttons
            </Text>
          </div>

          {duplicates.map(dup => (
            <DuplicateCard
              key={dup.import_index}
              dup={dup}
              resolution={resolutions[dup.import_index]}
              onAction={handleAction}
              onFieldPick={handleFieldPick}
              onDisbFieldPick={handleDisbFieldPick}
            />
          ))}
        </div>
      )}

      {/* All clean (no duplicates at all) */}
      {summary.duplicate_count === 0 && cleanRows.length > 0 && (
        <Card style={{ textAlign: 'center', padding: 20 }}>
          <CheckCircleOutlined style={{ fontSize: 40, color: '#52c41a', marginBottom: 8 }} />
          <Title level={4} style={{ color: '#389e0d', margin: 0 }}>All Clear!</Title>
          <Text type="secondary">{cleanRows.length} new students ready to import.</Text>
        </Card>
      )}

      {summary.total === 0 && <Empty description="No import data" />}

      {/* Sticky bottom bar */}
      {summary.total > 0 && (
        <div style={{
          position: 'sticky', bottom: 0, background: '#fff', padding: '10px 16px',
          borderTop: '2px solid #e8e8e8', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', zIndex: 100, boxShadow: '0 -2px 8px rgba(0,0,0,0.05)',
        }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {summary.clean_count} new + {summary.duplicate_count} duplicates
            {totalConflicts > 0 && ` · ${resolvedConflicts}/${totalConflicts} resolved`}
          </Text>
          <Button
            type="primary" icon={<SendOutlined />}
            onClick={handleMerge} disabled={!canMerge} loading={merging}
            style={canMerge ? { background: '#52c41a', borderColor: '#52c41a' } : {}}
          >
            {canMerge ? 'Merge & Import' : `${totalConflicts - resolvedConflicts} remaining`}
          </Button>
        </div>
      )}

      {/* Progress modal */}
      <Modal open={!!mergeProgress} closable={false} footer={null} centered maskClosable={false} width={340}>
        {mergeProgress && (
          <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
            {mergeProgress.percent >= 100
              ? <CheckCircleOutlined style={{ fontSize: 36, color: '#52c41a', marginBottom: 12 }} />
              : <LoadingOutlined style={{ fontSize: 36, color: '#1890ff', marginBottom: 12 }} />}
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{mergeProgress.phase}</div>
            <Progress percent={mergeProgress.percent} status={mergeProgress.percent >= 100 ? 'success' : 'active'} />
          </div>
        )}
      </Modal>
    </div>
  )
}
