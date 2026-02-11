import { useState, useMemo, useCallback, useEffect } from 'react'
import { Typography, Button, Tag, Card, Space, Radio, Collapse, Badge, Progress, Modal, message, Tooltip, Empty, Divider } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  MergeOutlined,
  ArrowLeftOutlined,
  SendOutlined,
  LoadingOutlined,
  SafetyOutlined,
  ExclamationCircleOutlined,
  FileAddOutlined,
  EditOutlined,
  SwapOutlined,
  CheckOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'

const { Title, Text, Paragraph } = Typography

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// Human-readable field labels
const FIELD_LABELS = {
  in_charge: 'In-Charge',
  award_year: 'Award Year',
  scholarship_program: 'Scholarship Program',
  award_number: 'Award Number',
  learner_reference_number: 'Learner Reference Number',
  surname: 'Surname',
  first_name: 'First Name',
  middle_name: 'Middle Name',
  extension: 'Extension',
  sex: 'Sex',
  date_of_birth: 'Date of Birth',
  contact_number: 'Contact Number',
  email_address: 'Email Address',
  street_brgy: 'Street/Brgy',
  municipality_city: 'Municipality/City',
  province: 'Province',
  congressional_district: 'Congressional District',
  zip_code: 'Zip Code',
  special_group: 'Special Group',
  certification_number: 'Certification Number',
  name_of_institution: 'Name of Institution',
  uii: 'UII',
  institutional_type: 'Institutional Type',
  region: 'Region',
  degree_program: 'Degree Program',
  program_major: 'Program Major',
  program_discipline: 'Program Discipline',
  program_degree_level: 'Program Degree Level',
  authority_type: 'Authority Type',
  authority_number: 'Authority Number',
  series: 'Series',
  is_priority: 'Priority',
  basis_cmo: 'Basis (CMO)',
  scholarship_status: 'Scholarship Status',
  replacement_info: 'Replacement',
  termination_reason: 'Reason',
  // Disbursement fields
  curriculum_year_level: 'Curriculum Year Level',
  nta: 'NTA',
  fund_source: 'Fund Source',
  voucher_tracking_no: 'Voucher Tracking No.',
  mode_of_payment: 'Mode of Payment',
  atm_account_no: 'ATM Account No.',
  date_process: 'Date Process',
  voucher_no: 'Voucher No.',
  voucher_date: 'Voucher Date',
  account_check_no: 'Account/Check No.',
  amount: 'Amount',
  lddap_no: 'LDDAP No.',
  disbursement_date: 'Disbursement Date',
  status: 'Status',
  remarks: 'Remarks',
}

const fieldLabel = (key) => FIELD_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

// Status badge for each row category
const StatusBadge = ({ type }) => {
  switch (type) {
    case 'clean':
      return <Tag color="green" icon={<FileAddOutlined />}>New Student</Tag>
    case 'auto_merge':
      return <Tag color="blue" icon={<SafetyOutlined />}>Safe to Merge</Tag>
    case 'conflict':
      return <Tag color="red" icon={<WarningOutlined />}>Has Conflicts</Tag>
    default:
      return null
  }
}

// Diff line component — shows DB vs Import like GitHub
const DiffLine = ({ field, dbValue, importValue, choice, onChange, readOnly }) => {
  const db = dbValue ?? '(empty)'
  const imp = importValue ?? '(empty)'

  return (
    <div style={{
      border: '1px solid #e8e8e8',
      borderRadius: 6,
      marginBottom: 8,
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '6px 12px',
        background: '#f6f8fa',
        borderBottom: '1px solid #e8e8e8',
        gap: 8,
      }}>
        <SwapOutlined style={{ color: '#cf1322' }} />
        <Text strong style={{ fontSize: 13 }}>{fieldLabel(field)}</Text>
      </div>
      <div style={{ display: 'flex' }}>
        {/* DB side */}
        <div
          style={{
            flex: 1,
            padding: '8px 12px',
            background: choice === 'db' ? '#f6ffed' : '#ffeef0',
            borderRight: '1px solid #e8e8e8',
            cursor: readOnly ? 'default' : 'pointer',
            transition: 'background 0.2s',
          }}
          onClick={() => !readOnly && onChange?.('db')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Tag color="orange" style={{ margin: 0, fontSize: 10 }}>DATABASE</Tag>
            {choice === 'db' && <CheckOutlined style={{ color: '#52c41a', fontSize: 12 }} />}
          </div>
          <Text
            style={{
              color: dbValue ? '#1f2937' : '#9ca3af',
              fontFamily: 'monospace',
              fontSize: 13,
              fontWeight: choice === 'db' ? 600 : 400,
            }}
          >
            {db}
          </Text>
        </div>
        {/* Import side */}
        <div
          style={{
            flex: 1,
            padding: '8px 12px',
            background: choice === 'import' ? '#f6ffed' : '#ffeef0',
            cursor: readOnly ? 'default' : 'pointer',
            transition: 'background 0.2s',
          }}
          onClick={() => !readOnly && onChange?.('import')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>IMPORT</Tag>
            {choice === 'import' && <CheckOutlined style={{ color: '#52c41a', fontSize: 12 }} />}
          </div>
          <Text
            style={{
              color: importValue ? '#1f2937' : '#9ca3af',
              fontFamily: 'monospace',
              fontSize: 13,
              fontWeight: choice === 'import' ? 600 : 400,
            }}
          >
            {imp}
          </Text>
        </div>
      </div>
    </div>
  )
}

// Fill line — DB was null, import has data (always safe)
const FillLine = ({ field, importValue }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    padding: '6px 12px',
    background: '#f6ffed',
    borderRadius: 6,
    marginBottom: 4,
    border: '1px solid #b7eb8f',
    gap: 8,
  }}>
    <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 14 }} />
    <Text style={{ fontSize: 13, color: '#389e0d', flex: 1 }}>
      <Text strong>{fieldLabel(field)}</Text>: <Text code>{importValue}</Text>
    </Text>
    <Tag color="green" style={{ margin: 0, fontSize: 10 }}>AUTO-FILL</Tag>
  </div>
)

// Conflict card for a single student
const ConflictCard = ({ entry, resolutions, onResolve }) => {
  const { db_student, import_data, fills, conflicts, new_disbursements, disbursement_conflicts, import_index } = entry
  const name = `${db_student.surname || ''}, ${db_student.first_name || ''} ${db_student.middle_name || ''}`.trim()

  const totalConflicts = (conflicts?.length || 0) +
    (disbursement_conflicts || []).reduce((sum, dc) => sum + (dc.conflicts?.length || 0), 0)
  const resolvedCount = Object.keys(resolutions?.fields || {}).length +
    Object.values(resolutions?.disbursements || {}).reduce(
      (sum, dr) => sum + Object.keys(dr).length, 0
    , 0)

  const allResolved = resolvedCount >= totalConflicts

  return (
    <Card
      size="small"
      style={{
        marginBottom: 16,
        borderLeft: `4px solid ${allResolved ? '#52c41a' : '#ff4d4f'}`,
        borderColor: allResolved ? '#b7eb8f' : '#ffccc7',
      }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Space>
            {allResolved
              ? <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
              : <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />
            }
            <Text strong style={{ fontSize: 15 }}>{name}</Text>
            {db_student.award_number && (
              <Text type="secondary" style={{ fontSize: 12 }}>Award: {db_student.award_number}</Text>
            )}
          </Space>
          <Space>
            <Tag color={allResolved ? 'green' : 'red'}>
              {resolvedCount}/{totalConflicts} resolved
            </Tag>
            <Tag color="orange">DB SEQ: {db_student.seq}</Tag>
          </Space>
        </div>
      }
    >
      {/* Safe fills */}
      {fills?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
            <SafetyOutlined /> AUTO-FILL ({fills.length} fields — DB was empty, import has data)
          </Text>
          {fills.map((f, i) => (
            <FillLine key={i} field={f.field} importValue={f.import_value} />
          ))}
        </div>
      )}

      {/* Student field conflicts */}
      {conflicts?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8, color: '#cf1322' }}>
            <WarningOutlined /> CONFLICTS ({conflicts.length} fields — choose which value to keep)
          </Text>
          {conflicts.map((c, i) => (
            <DiffLine
              key={i}
              field={c.field}
              dbValue={c.db_value}
              importValue={c.import_value}
              choice={resolutions?.fields?.[c.field]}
              onChange={(choice) => onResolve(import_index, 'field', c.field, choice, {
                db_value: c.db_value,
                import_value: c.import_value,
              })}
            />
          ))}
        </div>
      )}

      {/* New disbursements (safe additions) */}
      {new_disbursements?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
            <FileAddOutlined /> NEW DISBURSEMENTS ({new_disbursements.length} records — will be added)
          </Text>
          {new_disbursements.map((d, i) => (
            <Tag key={i} color="green" style={{ marginBottom: 4 }}>
              {d.academic_year} - {d.semester} {d.curriculum_year_level && `(${d.curriculum_year_level})`}
            </Tag>
          ))}
        </div>
      )}

      {/* Disbursement conflicts */}
      {disbursement_conflicts?.length > 0 && (
        <div>
          <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8, color: '#cf1322' }}>
            <WarningOutlined /> DISBURSEMENT CONFLICTS
          </Text>
          {disbursement_conflicts.map((dc, di) => (
            <Card
              key={di}
              size="small"
              type="inner"
              style={{ marginBottom: 8, background: '#fffbe6' }}
              title={
                <Text style={{ fontSize: 13 }}>
                  {dc.academic_year} — {dc.semester}
                </Text>
              }
            >
              {dc.fills?.length > 0 && dc.fills.map((f, fi) => (
                <FillLine key={fi} field={f.field} importValue={f.import_value} />
              ))}
              {dc.conflicts.map((c, ci) => (
                <DiffLine
                  key={ci}
                  field={c.field}
                  dbValue={c.db_value}
                  importValue={c.import_value}
                  choice={resolutions?.disbursements?.[dc.existing_id]?.[c.field]}
                  onChange={(choice) => onResolve(import_index, 'disbursement', c.field, choice, {
                    existing_id: dc.existing_id,
                    db_value: c.db_value,
                    import_value: c.import_value,
                  })}
                />
              ))}
            </Card>
          ))}
        </div>
      )}
    </Card>
  )
}

export default function BulkResolve() {
  const navigate = useNavigate()
  const location = useLocation()
  const [resolveData, setResolveData] = useState(null)
  const [resolutions, setResolutions] = useState({}) // { [import_index]: { fields: {}, disbursements: {} } }
  const [merging, setMerging] = useState(false)
  const [mergeProgress, setMergeProgress] = useState(null)

  // Receive data from bulk import page via location state
  useEffect(() => {
    const state = location.state
    if (!state?.resolveData) {
      // No data passed — redirect back
      message.warning('No import data to resolve. Please start from Bulk Import.')
      navigate('/students/bulk')
      return
    }
    setResolveData(state.resolveData)
    // Also store the raw data needed for merge
  }, [location.state, navigate])

  // Count totals
  const summary = resolveData?.summary || { clean_count: 0, auto_merge_count: 0, conflict_count: 0, total: 0 }
  const cleanRows = resolveData?.clean || []
  const autoMergeRows = resolveData?.auto_merge || []
  const conflictRows = resolveData?.conflicts || []

  // Track resolution progress
  const { totalConflicts, resolvedConflicts, allResolved } = useMemo(() => {
    let total = 0
    let resolved = 0

    conflictRows.forEach((entry) => {
      const idx = entry.import_index
      const res = resolutions[idx] || {}

      // Student field conflicts
      const fieldConflicts = entry.conflicts?.length || 0
      total += fieldConflicts
      resolved += Object.keys(res.fields || {}).length

      // Disbursement conflicts
      ;(entry.disbursement_conflicts || []).forEach((dc) => {
        const dcCount = dc.conflicts?.length || 0
        total += dcCount
        resolved += Object.keys(res.disbursements?.[dc.existing_id] || {}).length
      })
    })

    return { totalConflicts: total, resolvedConflicts: resolved, allResolved: total === 0 || resolved >= total }
  }, [conflictRows, resolutions])

  // Handle resolution choice
  const handleResolve = useCallback((importIndex, type, field, choice, meta) => {
    setResolutions(prev => {
      const next = { ...prev }
      if (!next[importIndex]) next[importIndex] = { fields: {}, disbursements: {} }

      if (type === 'field') {
        next[importIndex] = {
          ...next[importIndex],
          fields: { ...next[importIndex].fields, [field]: { choice, ...meta } },
        }
      } else if (type === 'disbursement') {
        const existingId = meta.existing_id
        if (!next[importIndex].disbursements[existingId]) {
          next[importIndex].disbursements[existingId] = {}
        }
        next[importIndex] = {
          ...next[importIndex],
          disbursements: {
            ...next[importIndex].disbursements,
            [existingId]: {
              ...next[importIndex].disbursements[existingId],
              [field]: { choice, ...meta },
            },
          },
        }
      }

      return next
    })
  }, [])

  // Build merge payload and submit
  const handleMerge = async () => {
    if (!allResolved) {
      message.error('Please resolve all conflicts before merging')
      return
    }

    setMerging(true)
    setMergeProgress({ phase: 'Preparing merge...', percent: 0 })

    try {
      // Build resolved conflict entries
      const resolvedEntries = conflictRows.map((entry) => {
        const idx = entry.import_index
        const res = resolutions[idx] || { fields: {}, disbursements: {} }

        // Build field resolutions
        const fieldResolutions = Object.entries(res.fields || {}).map(([field, val]) => ({
          field,
          choice: val.choice,
          db_value: val.db_value,
          import_value: val.import_value,
        }))

        // Build disbursement resolutions
        const disbursementResolutions = Object.entries(res.disbursements || {}).map(([existingId, fields]) => ({
          existing_id: Number(existingId),
          field_resolutions: Object.entries(fields).map(([f, v]) => ({
            field: f,
            choice: v.choice,
            db_value: v.db_value,
            import_value: v.import_value,
          })),
        }))

        return {
          import_index: idx,
          db_seq: entry.db_seq,
          fills: entry.fills,
          new_disbursements: entry.new_disbursements,
          resolutions: fieldResolutions,
          disbursement_resolutions: disbursementResolutions,
        }
      })

      // Get stored disbursements and extra data from location state
      const extraDisb = location.state?.cleanDisbursements || []

      setMergeProgress({ phase: 'Merging data...', percent: 30 })

      const response = await fetch(`${API_BASE}/students/merge-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clean: cleanRows,
          auto_merge: autoMergeRows,
          resolved: resolvedEntries,
          disbursements: extraDisb,
        }),
      })

      setMergeProgress({ phase: 'Processing...', percent: 70 })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.message || 'Merge failed')
      }

      const result = await response.json()
      setMergeProgress({ phase: 'Updating slots...', percent: 90 })

      // Update scholarship slots
      await fetch(`${API_BASE}/scholarship_programs/update-slots`, { method: 'POST' }).catch(() => {})

      setMergeProgress({ phase: 'Complete!', percent: 100 })
      await new Promise(r => setTimeout(r, 800))

      const stats = result.stats || {}
      message.success(
        `Import complete! ${stats.inserted || 0} inserted, ${stats.updated || 0} updated, ` +
        `${stats.disbursements_created || 0} disbursements added`
      )
      navigate('/students')
    } catch (error) {
      console.error('Merge error:', error)
      message.error(error.message || 'Merge failed')
    } finally {
      setMerging(false)
      setMergeProgress(null)
    }
  }

  if (!resolveData) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <LoadingOutlined style={{ fontSize: 40 }} />
      </div>
    )
  }

  const canMerge = allResolved && !merging

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/students/bulk')}
          style={{ marginBottom: 12 }}
        >
          Back to Bulk Import
        </Button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <MergeOutlined style={{ fontSize: 28, color: '#1890ff' }} />
          <div>
            <Title level={3} style={{ margin: 0 }}>Import Merge Resolution</Title>
            <Text type="secondary">Review and resolve conflicts before importing</Text>
          </div>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <Card size="small" style={{ flex: 1, minWidth: 180, borderTop: '3px solid #52c41a' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#52c41a' }}>{summary.clean_count}</div>
              <Text type="secondary">New Students</Text>
              <div><Tag color="green">Safe to insert</Tag></div>
            </div>
          </Card>
          <Card size="small" style={{ flex: 1, minWidth: 180, borderTop: '3px solid #1890ff' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1890ff' }}>{summary.auto_merge_count}</div>
              <Text type="secondary">Auto-Merge</Text>
              <div><Tag color="blue">Fills empty fields</Tag></div>
            </div>
          </Card>
          <Card size="small" style={{ flex: 1, minWidth: 180, borderTop: `3px solid ${summary.conflict_count > 0 ? '#ff4d4f' : '#52c41a'}` }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: summary.conflict_count > 0 ? '#ff4d4f' : '#52c41a' }}>
                {summary.conflict_count}
              </div>
              <Text type="secondary">Conflicts</Text>
              <div>
                {summary.conflict_count > 0 ? (
                  <Tag color="red">Needs resolution</Tag>
                ) : (
                  <Tag color="green">All clear</Tag>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Overall merge status bar */}
        <Card
          size="small"
          style={{
            background: canMerge
              ? 'linear-gradient(90deg, #f6ffed 0%, #e6fffb 100%)'
              : 'linear-gradient(90deg, #fff2e8 0%, #fff1f0 100%)',
            border: `1px solid ${canMerge ? '#b7eb8f' : '#ffccc7'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <Space size="large">
              {canMerge ? (
                <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />
              ) : (
                <ExclamationCircleOutlined style={{ fontSize: 24, color: '#fa8c16' }} />
              )}
              <div>
                <Text strong style={{ fontSize: 15, color: canMerge ? '#389e0d' : '#d46b08' }}>
                  {canMerge
                    ? 'All conflicts resolved — safe to merge!'
                    : `${resolvedConflicts}/${totalConflicts} conflicts resolved`
                  }
                </Text>
                {!canMerge && totalConflicts > 0 && (
                  <Progress
                    percent={Math.round((resolvedConflicts / totalConflicts) * 100)}
                    size="small"
                    style={{ width: 200, marginTop: 4 }}
                    strokeColor={resolvedConflicts >= totalConflicts ? '#52c41a' : '#fa8c16'}
                  />
                )}
              </div>
            </Space>

            <Button
              type="primary"
              size="large"
              icon={<SendOutlined />}
              onClick={handleMerge}
              disabled={!canMerge}
              loading={merging}
              style={{
                background: canMerge ? '#52c41a' : undefined,
                borderColor: canMerge ? '#52c41a' : undefined,
              }}
            >
              {canMerge ? 'Merge & Import' : 'Resolve All Conflicts First'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Section: New Students (clean) */}
      {cleanRows.length > 0 && (
        <Collapse
          defaultActiveKey={[]}
          style={{ marginBottom: 16 }}
          items={[{
            key: 'clean',
            label: (
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <Text strong>New Students ({cleanRows.length})</Text>
                <Tag color="green">Will be inserted</Tag>
              </Space>
            ),
            children: (
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {cleanRows.map((item, i) => {
                  const d = item.data || {}
                  const name = `${d.surname || ''}, ${d.first_name || ''} ${d.middle_name || ''}`.trim()
                  return (
                    <div
                      key={i}
                      style={{
                        padding: '6px 12px',
                        background: i % 2 === 0 ? '#f6ffed' : '#fff',
                        borderRadius: 4,
                        marginBottom: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <FileAddOutlined style={{ color: '#52c41a' }} />
                      <Text style={{ fontSize: 13 }}>{name}</Text>
                      {d.award_number && <Tag style={{ fontSize: 11 }}>{d.award_number}</Tag>}
                      {d.name_of_institution && (
                        <Text type="secondary" style={{ fontSize: 11 }}>{d.name_of_institution}</Text>
                      )}
                    </div>
                  )
                })}
              </div>
            ),
          }]}
        />
      )}

      {/* Section: Auto-Merge (safe) */}
      {autoMergeRows.length > 0 && (
        <Collapse
          defaultActiveKey={[]}
          style={{ marginBottom: 16 }}
          items={[{
            key: 'auto_merge',
            label: (
              <Space>
                <SafetyOutlined style={{ color: '#1890ff' }} />
                <Text strong>Auto-Merge ({autoMergeRows.length})</Text>
                <Tag color="blue">Will fill empty fields</Tag>
              </Space>
            ),
            children: (
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {autoMergeRows.map((item, i) => {
                  const db = item.db_student || {}
                  const name = `${db.surname || ''}, ${db.first_name || ''} ${db.middle_name || ''}`.trim()
                  const fillCount = (item.fills?.length || 0)
                  const newDisbCount = (item.new_disbursements?.length || 0)

                  return (
                    <Card key={i} size="small" style={{ marginBottom: 8, borderLeft: '3px solid #1890ff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Space>
                          <SafetyOutlined style={{ color: '#1890ff' }} />
                          <Text strong style={{ fontSize: 13 }}>{name}</Text>
                          <Tag style={{ fontSize: 11 }}>SEQ: {db.seq}</Tag>
                        </Space>
                        <Space>
                          {fillCount > 0 && <Tag color="green">{fillCount} fields filled</Tag>}
                          {newDisbCount > 0 && <Tag color="cyan">{newDisbCount} new disbursements</Tag>}
                        </Space>
                      </div>
                      {item.fills?.length > 0 && (
                        <div>
                          {item.fills.map((f, fi) => (
                            <FillLine key={fi} field={f.field} importValue={f.import_value} />
                          ))}
                        </div>
                      )}
                      {item.new_disbursements?.length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          {item.new_disbursements.map((d, di) => (
                            <Tag key={di} color="cyan" style={{ marginBottom: 2 }}>
                              + {d.academic_year} {d.semester}
                            </Tag>
                          ))}
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            ),
          }]}
        />
      )}

      {/* Section: Conflicts */}
      {conflictRows.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <WarningOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
            <Title level={4} style={{ margin: 0, color: '#cf1322' }}>
              Conflicts ({conflictRows.length})
            </Title>
            <Text type="secondary">— Click on DATABASE or IMPORT side to choose which value to keep</Text>
          </div>

          {conflictRows.map((entry, i) => (
            <ConflictCard
              key={entry.import_index}
              entry={entry}
              resolutions={resolutions[entry.import_index]}
              onResolve={handleResolve}
            />
          ))}
        </div>
      )}

      {/* No conflicts at all */}
      {summary.conflict_count === 0 && summary.auto_merge_count === 0 && cleanRows.length > 0 && (
        <Card style={{ textAlign: 'center', padding: 24 }}>
          <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 12 }} />
          <Title level={4} style={{ color: '#389e0d' }}>All Clear!</Title>
          <Paragraph type="secondary">
            All {cleanRows.length} students are new records with no conflicts. Ready to import.
          </Paragraph>
        </Card>
      )}

      {/* Empty state */}
      {summary.total === 0 && (
        <Empty description="No import data to resolve" />
      )}

      {/* Bottom merge bar (sticky) */}
      {summary.total > 0 && (
        <div style={{
          position: 'sticky',
          bottom: 0,
          background: 'white',
          padding: '12px 16px',
          borderTop: '2px solid #e8e8e8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 100,
          borderRadius: '8px 8px 0 0',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
        }}>
          <Space>
            <Text type="secondary">
              {summary.clean_count} new + {summary.auto_merge_count} merge + {summary.conflict_count} conflicts = {summary.total} total
            </Text>
            {totalConflicts > 0 && (
              <Tag color={allResolved ? 'green' : 'orange'}>
                {resolvedConflicts}/{totalConflicts} resolved
              </Tag>
            )}
          </Space>
          <Button
            type="primary"
            size="large"
            icon={<SendOutlined />}
            onClick={handleMerge}
            disabled={!canMerge}
            loading={merging}
            style={{
              background: canMerge ? '#52c41a' : undefined,
              borderColor: canMerge ? '#52c41a' : undefined,
            }}
          >
            {canMerge ? 'Merge & Import All' : `Resolve ${totalConflicts - resolvedConflicts} remaining`}
          </Button>
        </div>
      )}

      {/* Merge Progress Modal */}
      <Modal
        open={!!mergeProgress}
        closable={false}
        footer={null}
        centered
        maskClosable={false}
        width={380}
      >
        {mergeProgress && (
          <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
            {mergeProgress.percent >= 100 ? (
              <CheckCircleOutlined style={{ fontSize: 40, color: '#52c41a', marginBottom: 16 }} />
            ) : (
              <LoadingOutlined style={{ fontSize: 40, color: '#1890ff', marginBottom: 16 }} />
            )}
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#1f2937' }}>
              {mergeProgress.phase}
            </div>
            <Progress
              percent={mergeProgress.percent}
              status={mergeProgress.percent >= 100 ? 'success' : 'active'}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}
