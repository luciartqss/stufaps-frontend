import { useParams } from 'react-router-dom'
import { useEffect, useState, useMemo } from 'react'
import { Typography, Spin, Table, Card, Button, Row, Col, Tag, Space, Popconfirm, message, Input, Select, DatePicker, Modal, Form } from 'antd'
import { PlusOutlined, ArrowLeftOutlined, EditOutlined, DeleteOutlined, EyeOutlined, WarningOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { API_BASE } from '../lib/config'
import { useAuth } from '../lib/AuthContext'
import { formatDisplayDateOnly, parseDate, formatForApi } from '../lib/dateUtils'
import { useReferenceData } from '../lib/useReferenceData'
import { useRealtime } from '../lib/useRealtime'

const { Title, Text } = Typography

// API utility functions
const api = {
  async request(url, options = {}) {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
    const response = await fetch(`${API_BASE}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(storedUser?.id ? { 'X-User-Id': String(storedUser.id) } : {}),
        ...options.headers,
      },
      ...options,
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const err = new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`)
      err.status = response.status
      err.data = errorData
      throw err
    }
    
    return response.json()
  },
  
  get(url) {
    return this.request(url)
  },
  
  post(url, data) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
  
  put(url, data) {
    return this.request(url, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },
  
  delete(url) {
    return this.request(url, {
      method: 'DELETE',
    })
  }
}

// Simple field display with proper input types - moved outside to prevent focus loss
const Field = ({ label, value, field, span = 12, type = 'text', editMode, formData, handleChange, options = [], required = false, disabled = false }) => {
  const isEmpty = !value || value === '—' || value === 'N/A'
  const editFieldEmpty = editMode && required && field && (!formData?.[field] || formData[field] === '')
  const showWarning = required && isEmpty && !editMode
  const highlightStyle = editFieldEmpty ? {
    background: '#fffbe6',
    border: '1px solid #faad14',
    borderRadius: 6,
    padding: '8px 10px',
  } : {
    background: '#fff',
    border: '1px solid #d9d9d9',
    borderRadius: 8,
    padding: '10px 12px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  }
  return (
    <Col span={span}>
      <div style={{ marginBottom: '16px', ...highlightStyle }}>
        <Text strong style={{ fontSize: '13px', color: editFieldEmpty ? '#d97706' : showWarning ? '#d97706' : '#6b7280', display: 'block', marginBottom: '4px' }}>
          {label} {editFieldEmpty && <span style={{ color: '#d97706', fontSize: 11 }}>(incomplete)</span>}
          {showWarning && <span style={{ color: '#ef4444', fontSize: 11 }}>(missing)</span>}
          {editMode && disabled && <span style={{ color: '#8c8c8c', fontSize: 11, fontWeight: 400 }}>(auto-filled)</span>}
        </Text>
        {editMode && field ? (
          disabled ? (
            <Input
              value={formData?.[field] ?? ''}
              disabled
              style={{ color: '#595959', background: '#f5f5f5' }}
            />
          ) : type === 'date' ? (
            <DatePicker
              style={{ width: '100%' }}
              status={editFieldEmpty ? 'warning' : undefined}
              value={formData?.[field] ? parseDate(formData[field]) : null}
              onChange={(date) => handleChange(field, date ? date.format('YYYY-MM-DD') : null)}
              format="MM-DD-YYYY"
            />
          ) : type === 'email' ? (
            <Input
              type="email"
              status={editFieldEmpty ? 'warning' : undefined}
              value={formData?.[field] ?? ''}
              onChange={(e) => handleChange(field, e.target.value)}
            />
          ) : type === 'searchSelect' ? (
            <Select
              showSearch
              virtual
              value={formData?.[field] || undefined}
              onChange={(v) => handleChange(field, v)}
              placeholder={`Search ${label.toLowerCase()}...`}
              style={{ width: '100%' }}
              status={editFieldEmpty ? 'warning' : undefined}
              allowClear
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={options}
            />
          ) : type === 'select' ? (
            <Select
              value={formData?.[field] || undefined}
              onChange={(v) => handleChange(field, v)}
              placeholder={`Select ${label.toLowerCase()}`}
              style={{ width: '100%' }}
              status={editFieldEmpty ? 'warning' : undefined}
              allowClear
            >
              {options.map(option => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          ) : type === 'textarea' ? (
            <Input.TextArea
              value={formData?.[field] ?? ''}
              status={editFieldEmpty ? 'warning' : undefined}
              onChange={(e) => handleChange(field, e.target.value)}
              rows={3}
              placeholder={`Enter ${label.toLowerCase()}`}
            />
          ) : (
            <Input
              value={formData?.[field] ?? ''}
              status={editFieldEmpty ? 'warning' : undefined}
              onChange={(e) => handleChange(field, e.target.value)}
            />
          )
        ) : (
          <div style={{ 
            fontSize: '14px', 
            color: isEmpty ? '#d1d5db' : '#1a1a1a',
            fontStyle: isEmpty ? 'italic' : 'normal',
          }}>
            {value || '—'}
          </div>
        )}
      </div>
    </Col>
  )
}

export default function StudentDetails() {
  const { permissions } = useAuth()
  const isMasterAdmin = permissions?.role === 'master_admin'
  const assignedPrograms = permissions?.assigned_programs || []
  const assignedYears = permissions?.assigned_years || []
  const params = useParams()
  const id = params.id

  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({})
  const [disbursementModal, setDisbursementModal] = useState({ visible: false, mode: 'create', record: null })
  const [disbursementForm] = Form.useForm()
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [disbursementLoading, setDisbursementLoading] = useState(false)

  // Reference data from JSON files (loaded on first edit)
  const refData = useReferenceData(editMode)

  // Year level helpers
  const YEAR_LEVELS = ['I', 'II', 'III', 'IV', 'V', 'VI']

  const inferYearLevel = (targetAy, disbursements) => {
    if (!targetAy || !disbursements?.length) return null
    const m = targetAy.match(/^(\d{4})-(\d{4})$/)
    if (!m || Number(m[2]) !== Number(m[1]) + 1) return null
    const targetStart = Number(m[1])

    // Same AY already has a year level → use it
    const sameAy = disbursements.find(d => d.academic_year === targetAy && d.curriculum_year_level)
    if (sameAy) return sameAy.curriculum_year_level

    // Find closest AY with a year level and offset
    let best = null
    let bestDiff = Infinity
    for (const d of disbursements) {
      if (!d.academic_year || !d.curriculum_year_level) continue
      const dm = d.academic_year.match(/^(\d{4})-(\d{4})$/)
      if (!dm) continue
      const diff = targetStart - Number(dm[1])
      if (Math.abs(diff) < bestDiff) {
        bestDiff = Math.abs(diff)
        best = { level: d.curriculum_year_level, diff }
      }
    }
    if (!best) return null
    const idx = YEAR_LEVELS.indexOf(best.level)
    if (idx === -1) return null
    const newIdx = idx + best.diff
    return newIdx >= 0 && newIdx < YEAR_LEVELS.length ? YEAR_LEVELS[newIdx] : null
  }

  const handleDisbFormChange = (changed) => {
    if (changed.academic_year !== undefined) {
      const inferred = inferYearLevel(changed.academic_year, student?.disbursements)
      if (inferred) {
        disbursementForm.setFieldValue('curriculum_year_level', inferred)
        // Re-validate to clear any stale error
        disbursementForm.validateFields(['curriculum_year_level']).catch(() => {})
      }
    }
  }

  // ── Derived dropdown options from reference data ──

  // Institution options for searchable Select (alphabetical)
  const institutionOptions = useMemo(() =>
    refData.institutions.map(h => ({ label: h.name, value: h.name, uii: h.uii })),
    [refData.institutions]
  )

  // Programs available for the currently-selected institution
  const programOptions = useMemo(() => {
    const uii = formData?.uii
    if (!uii) return []
    return refData.getProgramsForUii(uii).map(p => ({ label: p.program, value: p.program }))
  }, [formData?.uii, refData])

  // Majors available for selected institution + program
  const majorOptions = useMemo(() => {
    const uii = formData?.uii
    const program = formData?.degree_program
    if (!uii || !program) return []
    return refData.getMajorsForProgram(uii, program).map(m => ({ label: m, value: m }))
  }, [formData?.uii, formData?.degree_program, refData])

  // Province options (alphabetical)
  const provinceOptions = useMemo(() =>
    refData.getProvinces().map(p => ({ label: p.name, value: p.name, psgc: p.psgc })),
    [refData]
  )

  // Municipality options based on selected province
  const municipalityOptions = useMemo(() => {
    const provPsgc = formData?.province_psgc_code
    if (!provPsgc) return []
    return refData.getMunicipalities(provPsgc).map(m => ({ label: m.name, value: m.name, psgc: m.psgc }))
  }, [formData?.province_psgc_code, refData])

  // Barangay options based on selected municipality
  const barangayOptions = useMemo(() => {
    const munPsgc = formData?.municipality_psgc_code
    if (!munPsgc) return []
    return refData.getBarangays(munPsgc).map(b => ({ label: b.name, value: b.name, psgc: b.psgc }))
  }, [formData?.municipality_psgc_code, refData])

  useEffect(() => {
    if (!id) {
      setError('No student ID provided')
      setLoading(false)
      return
    }

    api.get(`/students/${id}`)
      .then((data) => {
        setStudent(data)
        setFormData(data) // seed form with fetched student
        setLoading(false)
      })
      .catch((error) => {
        console.error('Error fetching student details:', error)
        setError(error.message)
        setLoading(false)
      })
  }, [id, refreshTrigger])

  useRealtime(['Student', 'Disbursement'], () => setRefreshTrigger(prev => prev + 1))

  const handleChange = (field, value) => {
    const newFormData = { ...formData, [field]: value }

    // ── Institution changed: auto-fill UII, type, clear program fields ──
    if (field === 'name_of_institution') {
      const inst = refData.institutions.find(h => h.name === value)
      if (inst) {
        newFormData.uii = inst.uii
        // Get institutional type from program offerings
        const programs = refData.getProgramsForUii(inst.uii)
        if (programs.length > 0) {
          const entry = refData.getProgramEntry(inst.uii, programs[0].program, null)
          newFormData.institutional_type = entry?.institutionalType || null
        }
      } else {
        newFormData.uii = null
        newFormData.institutional_type = null
      }
      // Clear dependent program fields
      newFormData.degree_program = null
      newFormData.program_major = null
      newFormData.authority_type = null
      newFormData.authority_number = null
      newFormData.series = null
      newFormData.prio_program_code = null
      newFormData.discipline_code = null
      newFormData.program_discipline = null
    }

    // ── Degree program changed: auto-fill authority + priority fields ──
    if (field === 'degree_program') {
      newFormData.program_major = null
      const uii = newFormData.uii
      const entry = refData.getProgramEntry(uii, value, null)
      if (entry) {
        newFormData.authority_type = entry.authorityType || null
        newFormData.authority_number = entry.authorityNumber || null
        newFormData.series = entry.series || null
      } else {
        newFormData.authority_type = null
        newFormData.authority_number = null
        newFormData.series = null
      }
      // Priority code lookup
      const priority = refData.getPriorityInfo(value)
      if (priority) {
        newFormData.prio_program_code = priority.code || null
        newFormData.discipline_code = priority.psced || null
        newFormData.program_discipline = priority.discipline || null
      } else {
        newFormData.prio_program_code = null
        newFormData.discipline_code = null
        newFormData.program_discipline = null
      }
    }

    // ── Program major changed: update authority from exact entry ──
    if (field === 'program_major') {
      const uii = newFormData.uii
      const program = newFormData.degree_program
      const entry = refData.getProgramEntry(uii, program, value)
      if (entry) {
        newFormData.authority_type = entry.authorityType || null
        newFormData.authority_number = entry.authorityNumber || null
        newFormData.series = entry.series || null
      }
    }

    // ── Province changed: auto-fill PSGC + clear dependents ──
    if (field === 'province') {
      const prov = provinceOptions.find(p => p.value === value)
      newFormData.province_psgc_code = prov?.psgc || null
      newFormData.municipality = null
      newFormData.municipality_psgc_code = null
      newFormData.brgy = null
      newFormData.brgy_psgc_code = null
      newFormData.zip_code = null
    }

    // ── Municipality changed: auto-fill PSGC + ZIP + clear brgy ──
    if (field === 'municipality') {
      const mun = municipalityOptions.find(m => m.value === value)
      newFormData.municipality_psgc_code = mun?.psgc || null
      newFormData.brgy = null
      newFormData.brgy_psgc_code = null
      // ZIP lookup
      const zip = refData.getZipCode(newFormData.province, value)
      newFormData.zip_code = zip || null
    }

    // ── Barangay changed: auto-fill PSGC ──
    if (field === 'brgy') {
      const brgy = barangayOptions.find(b => b.value === value)
      newFormData.brgy_psgc_code = brgy?.psgc || null
    }

    setFormData(newFormData)
  }

  // Check if form data has changed
  const hasChanges = () => {
    if (!student || !formData) return false
    
    // Compare relevant fields (excluding id, timestamps, etc.)
    const fieldsToCompare = [
      'in_charge', 'award_year', 'scholarship_program', 'award_number', 'learner_reference_number',
      'surname', 'first_name', 'middle_name', 'extension',
      'sex', 'civil_status', 'date_of_birth', 'contact_number', 'email_address',
      'street', 'brgy_psgc_code', 'brgy', 'municipality_psgc_code', 'municipality',
      'province_psgc_code', 'province', 'congressional_district', 'zip_code',
      'special_group', 'certification_number',
      'name_of_institution', 'uii', 'institutional_type', 'region', 'prio_program_code',
      'degree_program', 'program_major', 'discipline_code', 'program_discipline', 'program_degree_level',
      'authority_type', 'authority_number', 'series', 'is_priority', 'basis_cmo',
      'scholarship_status', 'replacement_info', 'termination_reason'
    ]
    
    return fieldsToCompare.some(field => {
      const originalValue = student[field]
      const currentValue = formData[field]
      
      // Handle null/undefined/empty string comparisons, trim whitespace, normalize booleans
      const normalizeValue = (val) => {
        if (val === null || val === undefined || val === '') return ''
        if (typeof val === 'boolean') return val ? '1' : '0'
        return String(val).trim()
      }
      
      return normalizeValue(originalValue) !== normalizeValue(currentValue)
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Prepare data with proper type conversion
      const dataToSave = { ...formData }
      
      // Convert boolean fields
      if (typeof dataToSave.is_priority === 'string') {
        dataToSave.is_priority = dataToSave.is_priority === 'yes' ? '1' : '0'
      }
      
      // Ensure award year is always a string
      if (dataToSave.award_year !== undefined && dataToSave.award_year !== null) {
        dataToSave.award_year = String(dataToSave.award_year)
      }
      
      // Format dates properly
      if (dataToSave.date_of_birth && (dayjs(dataToSave.date_of_birth).isValid() || parseDate(dataToSave.date_of_birth)?.isValid())) {
        dataToSave.date_of_birth = formatForApi(dataToSave.date_of_birth)
      }
      
      const response = await api.put(`/students/${id}`, dataToSave)
      // Preserve disbursements if not included in response
      const updatedStudent = response.data
      if (updatedStudent && !updatedStudent.disbursements && student?.disbursements) {
        updatedStudent.disbursements = student.disbursements
      }
      setStudent(updatedStudent)
      setFormData(updatedStudent)
      setEditMode(false)
      message.success('Student updated successfully')
    } catch (err) {
      console.error('Save error:', err)
      if (err.status === 409) {
        Modal.warning({
          title: 'Version Conflict',
          content: 'This record was modified by another staff member while you were editing. Your changes were NOT saved. The page will reload with the latest data.',
          okText: 'Reload',
          onOk: () => {
            setRefreshTrigger(prev => prev + 1)
            setEditMode(false)
          },
        })
      } else {
        message.error(err.message || 'Failed to update student')
      }
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return formatDisplayDateOnly(date)
  }

  const formatCurrency = (amount) => {
    if (!amount) return '₱0.00'
    return `₱${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  }

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'N/A'
    const today = dayjs()
    const birthDate = parseDate(dateOfBirth)
    if (!birthDate || !birthDate.isValid()) return 'N/A'
    return today.diff(birthDate, 'year')
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
      case 'On-going':
        return 'green'
      case 'Graduated':
        return 'blue'
      case 'Terminated':
        return 'red'
      case 'Replacement':
        return 'orange'
      default:
        return 'default'
    }
  }

  const getFullName = () => {
    if (!student) return ''
    return [student.surname, student.first_name, student.middle_name, student.extension]
      .filter(Boolean)
      .join(' ')
  }

  const handleEditDisbursement = (record) => {
    setDisbursementModal({ visible: true, mode: 'edit', record })
    disbursementForm.setFieldsValue({
      ...record,
      disbursement_date: record.disbursement_date ? parseDate(record.disbursement_date) : null,
      date_process: record.date_process ? parseDate(record.date_process) : null,
      voucher_date: record.voucher_date ? parseDate(record.voucher_date) : null,
      amount: record.amount,
    })
  }

  const handleDeleteDisbursement = async (record) => {
    try {
      await api.delete(`/disbursements/${record.id}`)
      message.success('Disbursement record deleted successfully')
      setRefreshTrigger(prev => prev + 1) // Refresh student data
    } catch (err) {
      console.error('Delete error:', err)
      message.error(err.message || 'Failed to delete disbursement record. Please try again.')
    }
  }

  const handleCreateDisbursement = () => {
    setDisbursementModal({ visible: true, mode: 'create', record: null })
    disbursementForm.resetFields()

    const defaults = { student_seq: student?.seq }
    const records = student?.disbursements || []

    if (records.length > 0) {
      // Sort by AY descending, then semester (Second > First)
      const sorted = [...records].sort((a, b) => {
        if (a.academic_year !== b.academic_year) return b.academic_year.localeCompare(a.academic_year)
        return a.semester === 'Second' ? -1 : 1
      })
      const latest = sorted[0]

      // Determine next semester & AY
      if (latest.academic_year && latest.semester) {
        if (latest.semester === 'First') {
          defaults.academic_year = latest.academic_year
          defaults.semester = 'Second'
        } else {
          const m = latest.academic_year.match(/^(\d{4})-(\d{4})$/)
          if (m) {
            const nextStart = Number(m[1]) + 1
            defaults.academic_year = `${nextStart}-${nextStart + 1}`
          }
          defaults.semester = 'First'
        }
      }

      // Infer year level for the new AY
      if (defaults.academic_year) {
        const inferred = inferYearLevel(defaults.academic_year, records)
        if (inferred) defaults.curriculum_year_level = inferred
      }

      // Carry forward payment method & ATM from latest record that has them
      const withPayment = sorted.find(d => d.mode_of_payment)
      if (withPayment) defaults.mode_of_payment = withPayment.mode_of_payment
      const withAtm = sorted.find(d => d.atm_account_no)
      if (withAtm) defaults.atm_account_no = withAtm.atm_account_no
    }

    disbursementForm.setFieldsValue(defaults)
  }

  const handleDisbursementSubmit = async () => {
    setDisbursementLoading(true)
    try {
      const values = await disbursementForm.validateFields()

      // Check for duplicate academic year + semester on create
      if (disbursementModal.mode === 'create') {
        const existing = (student.disbursements || []).find(
          d => d.academic_year === values.academic_year && d.semester === values.semester
        )
        if (existing) {
          message.error(`A disbursement record for ${values.academic_year} – ${values.semester} Semester already exists.`)
          setDisbursementLoading(false)
          return
        }
      }

      // On edit, check that we're not changing into a duplicate
      if (disbursementModal.mode === 'edit') {
        const existing = (student.disbursements || []).find(
          d => d.id !== disbursementModal.record.id &&
               d.academic_year === values.academic_year &&
               d.semester === values.semester
        )
        if (existing) {
          message.error(`A disbursement record for ${values.academic_year} – ${values.semester} Semester already exists.`)
          setDisbursementLoading(false)
          return
        }
      }

      // Format the data
      const formattedData = {
        ...values,
        disbursement_date: values.disbursement_date ? 
          formatForApi(values.disbursement_date) : null,
        date_process: values.date_process ? 
          formatForApi(values.date_process) : null,
        voucher_date: values.voucher_date ? 
          formatForApi(values.voucher_date) : null,
        amount: values.amount !== undefined && values.amount !== '' && values.amount !== null ? parseFloat(values.amount) : null,
        // Ensure student_seq is included
        student_seq: values.student_seq || student?.seq,
      }

      // Include version for optimistic concurrency on edits
      if (disbursementModal.mode === 'edit' && disbursementModal.record?.version !== undefined) {
        formattedData.version = disbursementModal.record.version
      }

      if (disbursementModal.mode === 'create') {
        await api.post('/disbursements', formattedData)
        message.success('Disbursement record created successfully')
      } else {
        await api.put(`/disbursements/${disbursementModal.record.id}`, formattedData)
        message.success('Disbursement record updated successfully')
      }
      
      setDisbursementModal({ visible: false, mode: 'create', record: null })
      disbursementForm.resetFields()
      setRefreshTrigger(prev => prev + 1) // Refresh student data
    } catch (err) {
      console.error('Disbursement submit error:', err)
      if (err.status === 409) {
        Modal.warning({
          title: 'Version Conflict',
          content: 'This disbursement was modified by another staff member while you were editing. Your changes were NOT saved. The page will reload with the latest data.',
          okText: 'Reload',
          onOk: () => {
            setDisbursementModal({ visible: false, mode: 'create', record: null })
            disbursementForm.resetFields()
            setRefreshTrigger(prev => prev + 1)
          },
        })
      } else if (err.message.includes('validation')) {
        message.error('Please check all required fields and try again')
      } else {
        message.error(err.message || `Failed to ${disbursementModal.mode === 'create' ? 'create' : 'update'} disbursement record`)
      }
    } finally {
      setDisbursementLoading(false)
    }
  }

  // StuFAPs-owned disbursement fields that should be complete
  const STUFAPS_REQUIRED_DISB_FIELDS = ['nta', 'fund_source', 'voucher_tracking_no', 'mode_of_payment', 'atm_account_no', 'date_process']

  const getDisbMissingCount = (record) => {
    return STUFAPS_REQUIRED_DISB_FIELDS.filter(f => !record[f] || record[f] === '').length
  }

  // Detail item for expanded row
  const DetailItem = ({ label, value, warn }) => {
    const empty = !value || value === 'N/A' || value === '—'
    return (
      <div style={{
        marginBottom: 8,
        ...(warn && empty ? { background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 4, padding: '4px 8px', margin: '0 -8px 8px' } : {}),
      }}>
        <Text style={{ fontSize: 12, color: warn && empty ? '#d48806' : '#8c8c8c', display: 'block', marginBottom: 2 }}>
          {label} {warn && empty && <span style={{ fontSize: 10, color: '#d48806' }}>(missing)</span>}
        </Text>
        <Text style={{ fontSize: 13, color: empty ? '#bfbfbf' : '#262626' }}>{empty ? '—' : value}</Text>
      </div>
    )
  }

  // Expanded row content — grouped to match backend $fillable sections
  const expandedRowRender = (record) => (
    <div style={{ padding: '8px 12px' }}>
      <Row gutter={[32, 4]}>
        {/* StuFAPs Fields */}
        <Col span={8}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <div style={{ width: 3, height: 14, background: '#1677ff', borderRadius: 2 }} />
            <Text strong style={{ fontSize: 12, color: '#1677ff', textTransform: 'uppercase', letterSpacing: 0.5 }}>StuFAPs</Text>
          </div>
          <DetailItem label="NTA" value={record.nta} warn />
          <DetailItem label="Fund Source" value={record.fund_source} warn />
          <DetailItem label="Voucher Tracking No." value={record.voucher_tracking_no} warn />
          <DetailItem label="Mode of Payment" value={record.mode_of_payment} warn />
          <DetailItem label="ATM Account No." value={record.atm_account_no} warn />
          <DetailItem label="Date Process" value={formatDate(record.date_process)} warn />
        </Col>
        {/* Accounting Fields */}
        <Col span={8}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <div style={{ width: 3, height: 14, background: '#722ed1', borderRadius: 2 }} />
            <Text strong style={{ fontSize: 12, color: '#722ed1', textTransform: 'uppercase', letterSpacing: 0.5 }}>Accounting</Text>
          </div>
          <DetailItem label="Voucher No." value={record.voucher_no} />
          <DetailItem label="Voucher Date" value={formatDate(record.voucher_date)} />
          <DetailItem label="Account/Check No." value={record.account_check_no} />
        </Col>
        {/* Cashier Fields */}
        <Col span={8}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <div style={{ width: 3, height: 14, background: '#389e0d', borderRadius: 2 }} />
            <Text strong style={{ fontSize: 12, color: '#389e0d', textTransform: 'uppercase', letterSpacing: 0.5 }}>Cashier</Text>
          </div>
          <DetailItem label="Amount" value={formatCurrency(record.amount)} />
          <DetailItem label="LDDAP No." value={record.lddap_no} />
          <DetailItem label="Disbursement Date" value={formatDate(record.disbursement_date)} />
        </Col>
      </Row>
    </div>
  )

  const disbursementColumns = [
    {
      title: 'Academic Year',
      dataIndex: 'academic_year',
      key: 'academic_year',
    },
    {
      title: 'Semester',
      dataIndex: 'semester',
      key: 'semester',
    },
    {
      title: 'Year Level',
      dataIndex: 'curriculum_year_level',
      key: 'curriculum_year_level',
      width: 100,
      align: 'center',
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        const hasLddap = record.lddap_no && record.lddap_no.trim() !== ''
        return <Tag color={hasLddap ? 'green' : 'orange'}>{hasLddap ? 'Paid' : 'Unpaid'}</Tag>
      },
    },
    {
      title: 'Remarks',
      dataIndex: 'remarks',
      key: 'remarks',
      ellipsis: true,
      render: (text) => text || <Text type="secondary">—</Text>,
    },
    {
      title: 'Completeness',
      key: 'completeness',
      width: 110,
      align: 'center',
      render: (_, record) => {
        const missing = getDisbMissingCount(record)
        if (missing === 0) return <Tag color="success" style={{ fontSize: 11 }}>Complete</Tag>
        return (
          <Tag color="warning" style={{ fontWeight: 600, fontSize: 11 }}>
            {missing} missing
          </Tag>
        )
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      align: 'center',
      render: (_, record) => {
        const canEditThisDisbursement = isMasterAdmin || (
          (assignedPrograms.includes('ALL') || assignedPrograms.includes(student?.scholarship_program)) &&
          (assignedYears.includes('ALL') || assignedYears.includes(record.academic_year))
        )
        return canEditThisDisbursement ? (
          <Space size={4}>
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={(e) => { e.stopPropagation(); handleEditDisbursement(record) }}
              title="Edit disbursement"
              size="small"
            />
            <Popconfirm
              title="Are you sure you want to delete this disbursement record?"
              description="This action cannot be undone."
              onConfirm={() => handleDeleteDisbursement(record)}
              okText="Yes, Delete"
              cancelText="Cancel"
              okType="danger"
            >
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />} 
                title="Delete disbursement"
                size="small"
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          </Space>
        ) : null
      },
    },
  ]

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Text type="danger">{error}</Text>
      </div>
    )
  }

  if (!student) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Text>Student not found</Text>
      </div>
    )
  }

  // Count incomplete fields — must match backend DashboardController $requiredFields exactly
  const requiredFields = [
    'in_charge', 'award_year', 'scholarship_program', 'award_number', 'learner_reference_number',
    'surname', 'first_name', 'sex', 'civil_status', 'date_of_birth',
    'contact_number', 'email_address',
    'street', 'brgy_psgc_code', 'brgy', 'municipality_psgc_code', 'municipality',
    'province_psgc_code', 'province', 'congressional_district', 'zip_code',
    'name_of_institution', 'uii', 'institutional_type', 'region', 'prio_program_code',
    'degree_program', 'discipline_code', 'program_discipline', 'program_degree_level',
    'authority_type', 'authority_number', 'series',
    'scholarship_status', 'basis_cmo'
  ]
  const getMissingFields = () => requiredFields.filter(f => !student[f] || student[f] === '')
  const getIncompleteCount = () => getMissingFields().length

  return (
    <div style={{ background: '#fafbfc', minHeight: '100vh', margin: -24 }}>
      {/* Read-only access banner */}
      {!isMasterAdmin && !(assignedPrograms.includes('ALL') || assignedPrograms.includes(student?.scholarship_program)) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            background: '#e6f4ff',
            borderBottom: '1px solid #91caff',
          }}
        >
          <EyeOutlined style={{ color: '#1677ff', fontSize: 14 }} />
          <span style={{ fontSize: 13, color: '#0958d9' }}>
            <strong>Read Only</strong> — You don't have access to this scholarship program. Editing is restricted.
          </span>
        </div>
      )}
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8eaed', padding: '20px 24px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => window.history.back()}
              style={{ marginTop: 4 }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <Title level={3} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                  {getFullName() || 'Unnamed Grantee'}
                </Title>
                <Tag 
                  color={getStatusColor(student.scholarship_status)} 
                  style={{ fontSize: 13, padding: '2px 12px', borderRadius: 6 }}
                >
                  {student.scholarship_status || 'N/A'}
                </Tag>
              </div>
              <Space size={24} style={{ marginTop: 8 }}>
                <div>
                  <Text style={{ color: '#6b7280', fontSize: 12, display: 'block' }}>Award No.</Text>
                  <Text strong style={{ fontSize: 14, color: student.award_number ? '#1a1a1a' : '#ef4444' }}>
                    {student.award_number || 'Not assigned'}
                  </Text>
                </div>
                <div style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: 24 }}>
                  <Text style={{ color: '#6b7280', fontSize: 12, display: 'block' }}>LRN</Text>
                  <Text strong style={{ fontSize: 14, color: student.learner_reference_number ? '#1a1a1a' : '#ef4444' }}>
                    {student.learner_reference_number || 'Not assigned'}
                  </Text>
                </div>
                <div style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: 24 }}>
                  <Text style={{ color: '#6b7280', fontSize: 12, display: 'block' }}>Contact</Text>
                  <Text style={{ fontSize: 14, color: student.contact_number ? '#1a1a1a' : '#d1d5db' }}>
                    {student.contact_number || '—'}
                  </Text>
                </div>
                <div style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: 24 }}>
                  <Text style={{ color: '#6b7280', fontSize: 12, display: 'block' }}>Email</Text>
                  <Text style={{ fontSize: 14, color: student.email_address ? '#1a1a1a' : '#d1d5db' }}>
                    {student.email_address || '—'}
                  </Text>
                </div>
                <div style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: 24 }}>
                  <Text style={{ color: '#6b7280', fontSize: 12, display: 'block' }}>Program</Text>
                  <Text style={{ fontSize: 14, color: student.scholarship_program ? '#1a1a1a' : '#d1d5db' }}>
                    {student.scholarship_program || '—'}
                  </Text>
                </div>
              </Space>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {getIncompleteCount() > 0 && !editMode && (
              <Tag color="warning" style={{ fontSize: 12 }}>
                {getIncompleteCount()} incomplete fields
              </Tag>
            )}
            {(() => {
              const canEditStudent = isMasterAdmin || assignedPrograms.includes('ALL') || assignedPrograms.includes(student?.scholarship_program)
              if (editMode) return (
                <Space>
                  <Button onClick={() => { setFormData(student); setEditMode(false) }}>
                    Cancel
                  </Button>
                  <Button 
                    type="primary" 
                    loading={saving} 
                    onClick={handleSave} 
                    disabled={!hasChanges()}
                  >
                    Save Changes
                  </Button>
                </Space>
              )
              if (canEditStudent) return (
                <Button 
                  type="primary" 
                  icon={<EditOutlined />} 
                  onClick={() => {
                    setEditMode(true)
                  }}
                >
                  Edit Record
                </Button>
              )
              return null
            })()}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '24px' }}>
      {/* Card 1: Scholarship Details */}
      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col xs={24} lg={12}>
          <Card title="Scholarship Details" style={{ height: '100%', borderRadius: 12 }} styles={{ header: { borderBottom: '1px solid #f0f0f0' } }}>
            <Row gutter={[12, 8]}>
              <Field label="In-Charge" value={student.in_charge} field="in_charge" required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="Award Year" value={student.award_year} field="award_year" required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="Scholarship Program" value={student.scholarship_program} field="scholarship_program" required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="Award Number" value={student.award_number} field="award_number" required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="Learner Reference No. (LRN)" value={student.learner_reference_number} field="learner_reference_number" required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field 
                label="Scholarship Status" 
                value={student.scholarship_status} 
                field="scholarship_status" 
                type="select" 
                required
                options={[
                  { label: 'Active', value: 'Active' },
                  { label: 'Graduated', value: 'Graduated' },
                  { label: 'Terminated', value: 'Terminated' },
                  { label: 'Replacement', value: 'Replacement' }
                ]}
                editMode={editMode} 
                formData={formData} 
                handleChange={handleChange} 
              />
              <Field 
                label="Special Group" 
                value={student.special_group} 
                field="special_group" 
                type="select" 
                options={[
                  { label: 'N/A', value: '' },
                  { label: 'IP', value: 'IP' },
                  { label: 'PWD', value: 'PWD' },
                  { label: 'Solo Parent', value: 'Solo Parent' }
                ]}
                editMode={editMode} 
                formData={formData} 
                handleChange={handleChange} 
              />
              <Field label="Certification No." value={student.certification_number} field="certification_number" editMode={editMode} formData={formData} handleChange={handleChange} />
            </Row>
          </Card>
        </Col>

        {/* Card 2: Personal Information */}
        <Col xs={24} lg={12}>
          <Card title="Personal Information" style={{ height: '100%', borderRadius: 12 }} styles={{ header: { borderBottom: '1px solid #f0f0f0' } }}>
            <Row gutter={[12, 8]}>
              <Field label="Surname" value={student.surname} field="surname" required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="First Name" value={student.first_name} field="first_name" required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="Middle Name" value={student.middle_name} field="middle_name" editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="Extension" value={student.extension} field="extension" editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field 
                label="Sex" 
                value={student.sex} 
                field="sex" 
                type="select" 
                required
                options={[
                  { label: 'Male', value: 'Male' },
                  { label: 'Female', value: 'Female' }
                ]}
                editMode={editMode} 
                formData={formData} 
                handleChange={handleChange} 
              />
              <Field 
                label="Civil Status" 
                value={student.civil_status} 
                field="civil_status" 
                type="select" 
                required
                options={[
                  { label: 'Single', value: 'Single' },
                  { label: 'Married', value: 'Married' },
                  { label: 'Widowed', value: 'Widowed' },
                  { label: 'Separated', value: 'Separated' }
                ]}
                editMode={editMode} 
                formData={formData} 
                handleChange={handleChange} 
              />
              <Field 
                label="Date of Birth" 
                value={student.date_of_birth ? `${formatDate(student.date_of_birth)} (${calculateAge(student.date_of_birth)} yrs)` : null} 
                field="date_of_birth" 
                type="date"
                required
                editMode={editMode}
                formData={formData}
                handleChange={handleChange}
              />
              <Field label="Contact Number" value={student.contact_number} field="contact_number" required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="Email Address" value={student.email_address} field="email_address" type="email" span={24} required editMode={editMode} formData={formData} handleChange={handleChange} />
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Card 3: Address */}
      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col xs={24}>
          <Card title="Address" style={{ borderRadius: 12 }} styles={{ header: { borderBottom: '1px solid #f0f0f0' } }}>
            <Row gutter={[12, 8]}>
              <Field label="Street" value={student.street} field="street" span={24} required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="Province" value={student.province} field="province" type="searchSelect" options={provinceOptions} required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="Province PSGC Code" value={student.province_psgc_code} field="province_psgc_code" required editMode={editMode} formData={formData} handleChange={handleChange} disabled />
              <Field label="Municipality" value={student.municipality} field="municipality" type="searchSelect" options={municipalityOptions} required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="Municipality PSGC Code" value={student.municipality_psgc_code} field="municipality_psgc_code" required editMode={editMode} formData={formData} handleChange={handleChange} disabled />
              <Field label="Barangay" value={student.brgy} field="brgy" type="searchSelect" options={barangayOptions} required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="Barangay PSGC Code" value={student.brgy_psgc_code} field="brgy_psgc_code" required editMode={editMode} formData={formData} handleChange={handleChange} disabled />
              <Field label="Congressional District" value={student.congressional_district} field="congressional_district" required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="ZIP Code" value={student.zip_code} field="zip_code" required editMode={editMode} formData={formData} handleChange={handleChange} disabled />
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Card 4: Institution & Academic Program */}
      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col xs={24}>
          <Card title="Institution & Academic Program" style={{ borderRadius: 12 }} styles={{ header: { borderBottom: '1px solid #f0f0f0' } }}>
            <Row gutter={[12, 8]}>
              <Field label="Name of Institution" value={student.name_of_institution} field="name_of_institution" type="searchSelect" options={institutionOptions} span={24} required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="UII" value={student.uii} field="uii" required editMode={editMode} formData={formData} handleChange={handleChange} disabled />
              <Field label="Institutional Type" value={student.institutional_type} field="institutional_type" required editMode={editMode} formData={formData} handleChange={handleChange} disabled />
              <Field 
                label="Degree Level" 
                value={student.program_degree_level} 
                field="program_degree_level" 
                type="select" 
                required
                options={[
                  { label: 'Pre-baccalaureate', value: 'Pre-baccalaureate' },
                  { label: 'Baccalaureate', value: 'Baccalaureate' },
                  { label: 'Post Baccalaureate', value: 'Post Baccalaureate' },
                  { label: "Master's", value: "Master's" },
                  { label: 'Doctorate', value: 'Doctorate' }
                ]}
                editMode={editMode} 
                formData={formData} 
                handleChange={handleChange} 
              />
              <Field label="Region of HEI" value={student.region} field="region" required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="Degree Program" value={student.degree_program} field="degree_program" type="searchSelect" options={programOptions} required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="Program Major" value={student.program_major} field="program_major" type="searchSelect" options={majorOptions} editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="Priority Program Code" value={student.prio_program_code} field="prio_program_code" required editMode={editMode} formData={formData} handleChange={handleChange} disabled />
              <Field label="Discipline Code" value={student.discipline_code} field="discipline_code" required editMode={editMode} formData={formData} handleChange={handleChange} disabled />
              <Field label="Program Discipline" value={student.program_discipline} field="program_discipline" required editMode={editMode} formData={formData} handleChange={handleChange} disabled />
              <Field 
                label="Authority Type" 
                value={student.authority_type} 
                field="authority_type" 
                type="select" 
                required
                disabled
                options={[
                  { label: 'GP', value: 'GP' },
                  { label: 'GR', value: 'GR' },
                  { label: 'RRPA', value: 'RRPA' },
                  { label: 'COPC', value: 'COPC' }
                ]}
                editMode={editMode} 
                formData={formData} 
                handleChange={handleChange} 
              />
              <Field label="Authority Number" value={student.authority_number} field="authority_number" required editMode={editMode} formData={formData} handleChange={handleChange} disabled />
              <Field label="Series" value={student.series} field="series" required editMode={editMode} formData={formData} handleChange={handleChange} disabled />
              <Col span={12}>
                <div style={{ marginBottom: '16px' }}>
                  <Text strong style={{ fontSize: '13px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Priority Program</Text>
                  {editMode ? (
                    <Select
                      value={formData?.is_priority ? 'yes' : 'no'}
                      onChange={(v) => handleChange('is_priority', v === 'yes')}
                      options={[
                        { label: 'Yes', value: 'yes' },
                        { label: 'No', value: 'no' },
                      ]}
                      style={{ width: '100%' }}
                    />
                  ) : (
                    <div style={{ fontSize: '14px', color: '#1a1a1a' }}>
                      <Tag color={student.is_priority ? 'green' : 'default'}>
                        {student.is_priority ? 'Yes' : 'No'}
                      </Tag>
                    </div>
                  )}
                </div>
              </Col>
              <Field label="Basis (CMO)" value={student.basis_cmo} field="basis_cmo" required editMode={editMode} formData={formData} handleChange={handleChange} />
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Card 5: Remarks */}
      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col xs={24}>
          <Card title="Remarks" style={{ borderRadius: 12 }} styles={{ header: { borderBottom: '1px solid #f0f0f0' } }}>
            <Row gutter={[12, 8]}>
              <Field label="Replacement Info" value={student.replacement_info} field="replacement_info" span={24} editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field 
                label="General Remarks / Notes" 
                value={student.termination_reason} 
                field="termination_reason" 
                span={24} 
                type="textarea"
                editMode={editMode} 
                formData={formData} 
                handleChange={handleChange} 
              />
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Card
        title={
          <Space>
            <span>Semester Transaction Records</span>
            {(() => {
              const totalMissing = (student.disbursements || []).reduce((sum, d) => sum + getDisbMissingCount(d), 0)
              if (totalMissing > 0) {
                return <Tag color="warning" style={{ fontSize: 11, fontWeight: 500 }}>{totalMissing} missing total</Tag>
              }
              return null
            })()}
          </Space>
        }
        style={{ borderRadius: 12 }}
        styles={{ header: { borderBottom: '1px solid #f0f0f0' } }}
        extra={
          (isMasterAdmin || (permissions?.can_add_disbursements && (assignedPrograms.includes('ALL') || assignedPrograms.includes(student?.scholarship_program)))) ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateDisbursement}>
              Add Disbursement
            </Button>
          ) : null
        }
      >
        <Table
          dataSource={student.disbursements || []}
          columns={disbursementColumns}
          rowKey="id"
          pagination={false}
          expandable={{
            expandedRowRender,
            expandRowByClick: true,
            rowExpandable: () => true,
          }}
          scroll={{ x: 'max-content' }}
          size="middle"
          locale={{ emptyText: 'No disbursement records yet' }}
        />
      </Card>

      {/* Disbursement Modal */}
      <Modal
        title={disbursementModal.mode === 'create' ? 'Add Disbursement Record' : 'Edit Disbursement Record'}
        open={disbursementModal.visible}
        onOk={handleDisbursementSubmit}
        onCancel={() => {
          setDisbursementModal({ visible: false, mode: 'create', record: null })
          disbursementForm.resetFields()
        }}
        width={800}
        okText={disbursementModal.mode === 'create' ? 'Create Record' : 'Update Record'}
        cancelText="Cancel"
        confirmLoading={disbursementLoading}
        destroyOnHidden={true}
      >
        <Form form={disbursementForm} layout="vertical" onValuesChange={handleDisbFormChange}>
          {/* StuFAPs Fields */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 4, height: 18, background: '#1677ff', borderRadius: 2 }} />
              <Text strong style={{ fontSize: 14, color: '#262626' }}>StuFAPs Fields</Text>
            </div>
            <Row gutter={16}>
              <Form.Item name="student_seq" hidden><Input /></Form.Item>
              <Col span={8}>
                <Form.Item 
                  name="academic_year" 
                  label="Academic Year"
                  rules={[
                    { required: true, message: 'Please enter academic year' },
                    {
                      validator: (_, value) => {
                        if (!value) return Promise.resolve()
                        const m = String(value).match(/^(\d{4})-(\d{4})$/)
                        if (!m) return Promise.reject('Format must be YYYY-YYYY (e.g. 2024-2025)')
                        if (Number(m[2]) !== Number(m[1]) + 1) return Promise.reject('Years must be consecutive (e.g. 2024-2025)')
                        return Promise.resolve()
                      },
                    },
                  ]}
                >
                  <Input placeholder="e.g., 2024-2025" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="semester" label="Semester" rules={[{ required: true, message: 'Please select semester' }]}>
                  <Select placeholder="Select semester">
                    <Select.Option value="First">First</Select.Option>
                    <Select.Option value="Second">Second</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item 
                  name="curriculum_year_level" 
                  label="Year Level"
                  dependencies={['academic_year']}
                  rules={[
                    { required: true, message: 'Please select year level' },
                    ({ getFieldValue }) => ({
                      validator: (_, value) => {
                        if (!value) return Promise.resolve()
                        const ay = getFieldValue('academic_year')
                        const expected = inferYearLevel(ay, student?.disbursements)
                        if (expected && value !== expected) {
                          return Promise.reject(`Expected ${expected} based on existing records`)
                        }
                        return Promise.resolve()
                      },
                    }),
                  ]}
                >
                  <Select placeholder="Select year level">
                    <Select.Option value="I">I</Select.Option>
                    <Select.Option value="II">II</Select.Option>
                    <Select.Option value="III">III</Select.Option>
                    <Select.Option value="IV">IV</Select.Option>
                    <Select.Option value="V">V</Select.Option>
                    <Select.Option value="VI">VI</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="nta" label="NTA">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="fund_source" label="Fund Source">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="voucher_tracking_no" label="Voucher Tracking No.">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="mode_of_payment" label="Mode of Payment">
                  <Select placeholder="Select mode">
                    <Select.Option value="ATM">ATM</Select.Option>
                    <Select.Option value="Cheque">Cheque</Select.Option>
                    <Select.Option value="Through the HEI">Through the HEI</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="atm_account_no" label="ATM Account No.">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="date_process" label="Date Process">
                  <DatePicker 
                    style={{ width: '100%' }}
                    placeholder="Select date"
                    format="MM-DD-YYYY"
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* Accounting Fields */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 4, height: 18, background: '#722ed1', borderRadius: 2 }} />
              <Text strong style={{ fontSize: 14, color: '#262626' }}>Accounting Fields</Text>
              <Tag style={{ marginLeft: 'auto', fontSize: 11 }}>Read Only</Tag>
            </div>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="voucher_no" label="Voucher No.">
                  <Input disabled style={{ color: '#595959', background: '#f5f5f5' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="voucher_date" label="Voucher Date">
                  <DatePicker 
                    style={{ width: '100%', color: '#595959', background: '#f5f5f5' }}
                    placeholder="—"
                    format="MM-DD-YYYY"
                    disabled
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="account_check_no" label="Account/Check No.">
                  <Input disabled style={{ color: '#595959', background: '#f5f5f5' }} />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* Cashier Fields */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 4, height: 18, background: '#389e0d', borderRadius: 2 }} />
              <Text strong style={{ fontSize: 14, color: '#262626' }}>Cashier Fields</Text>
              <Tag style={{ marginLeft: 'auto', fontSize: 11 }}>Read Only</Tag>
            </div>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="amount" label="Amount">
                  <Input type="number" prefix="₱" placeholder="0.00" disabled style={{ color: '#595959', background: '#f5f5f5' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="lddap_no" label="LDDAP No.">
                  <Input disabled style={{ color: '#595959', background: '#f5f5f5' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="disbursement_date" label="Disbursement Date">
                  <DatePicker 
                    style={{ width: '100%', color: '#595959', background: '#f5f5f5' }}
                    placeholder="—"
                    format="MM-DD-YYYY"
                    disabled
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* Status & Remarks */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 4, height: 18, background: '#8c8c8c', borderRadius: 2 }} />
              <Text strong style={{ fontSize: 14, color: '#262626' }}>Remarks</Text>
            </div>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item name="remarks" label="Remarks">
                  <Input.TextArea 
                    rows={2} 
                    placeholder="Enter any additional remarks or notes..."
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>
        </Form>
      </Modal>
      </div>
    </div>
  )
}