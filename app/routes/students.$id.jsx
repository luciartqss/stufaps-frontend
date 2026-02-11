import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Typography, Spin, Table, Card, Button, Row, Col, Tag, Space, Popconfirm, message, Input, Select, DatePicker, Modal, Form } from 'antd'
import { PlusOutlined, ArrowLeftOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const { Title, Text } = Typography

// API utility functions
const api = {
  async request(url, options = {}) {
    const response = await fetch(`http://localhost:8000/api${url}`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      ...options,
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
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
const Field = ({ label, value, field, span = 12, type = 'text', editMode, formData, handleChange, options = [], required = false }) => {
  const isEmpty = !value || value === '—' || value === 'N/A'
  const editFieldEmpty = editMode && required && field && (!formData?.[field] || formData[field] === '')
  const showWarning = required && isEmpty && !editMode
  const highlightStyle = editFieldEmpty ? {
    background: '#fffbe6',
    border: '1px solid #faad14',
    borderRadius: 6,
    padding: '8px 10px',
  } : { marginBottom: '16px' }
  return (
    <Col span={span}>
      <div style={{ marginBottom: '16px', ...highlightStyle }}>
        <Text strong style={{ fontSize: '13px', color: editFieldEmpty ? '#d97706' : showWarning ? '#d97706' : '#6b7280', display: 'block', marginBottom: '4px' }}>
          {label} {editFieldEmpty && <span style={{ color: '#d97706', fontSize: 11 }}>(incomplete)</span>}
          {showWarning && <span style={{ color: '#ef4444', fontSize: 11 }}>(missing)</span>}
        </Text>
        {editMode && field ? (
          type === 'date' ? (
            <DatePicker
              style={{ width: '100%' }}
              status={editFieldEmpty ? 'warning' : undefined}
              value={formData?.[field] ? dayjs(formData[field]) : null}
              onChange={(date) => handleChange(field, date ? date.format('YYYY-MM-DD') : null)}
              format="YYYY-MM-DD"
            />
          ) : type === 'email' ? (
            <Input
              type="email"
              status={editFieldEmpty ? 'warning' : undefined}
              value={formData?.[field] ?? ''}
              onChange={(e) => handleChange(field, e.target.value)}
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

  // Lookup function to auto-fill UII and authority fields
  const lookupAndFillFields = async (currentData) => {
    try {
      const response = await api.post('/students/lookup-program-info', {
        uii: currentData.uii || null,
        name_of_institution: currentData.name_of_institution || null,
        degree_program: currentData.degree_program || null,
        program_major: currentData.program_major || null,
      })
      
      // Update form with looked up values (only if they exist in response)
      setFormData(prev => ({
        ...prev,
        ...(response.uii && { uii: response.uii }),
        ...(response.name_of_institution && !prev.name_of_institution && { name_of_institution: response.name_of_institution }),
        ...(response.institutional_type && { institutional_type: response.institutional_type }),
        ...(response.authority_type && { authority_type: response.authority_type }),
        ...(response.authority_number && { authority_number: response.authority_number }),
        ...(response.series && { series: response.series }),
        ...(response.program_discipline && { program_discipline: response.program_discipline }),
        ...(response.program_degree_level && { program_degree_level: response.program_degree_level }),
      }))
    } catch (err) {
      console.error('Lookup error:', err)
      // Silently fail - user can still manually enter values
    }
  }

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

  const handleChange = (field, value) => {
    const newFormData = { ...formData, [field]: value }
    setFormData(newFormData)
    
    // Trigger lookup when institution, program, or major changes
    if (['name_of_institution', 'degree_program', 'program_major'].includes(field)) {
      // Clear dependent fields when institution changes
      if (field === 'name_of_institution') {
        newFormData.uii = null
        newFormData.institutional_type = null
        newFormData.authority_type = null
        newFormData.authority_number = null
        newFormData.series = null
        setFormData(newFormData)
      }
      
      // Debounce the lookup to avoid too many API calls
      if (window.lookupTimeout) {
        clearTimeout(window.lookupTimeout)
      }
      window.lookupTimeout = setTimeout(() => {
        lookupAndFillFields(newFormData)
      }, 500)
    }
  }

  // Check if form data has changed
  const hasChanges = () => {
    if (!student || !formData) return false
    
    // Compare relevant fields (excluding id, timestamps, etc.)
    const fieldsToCompare = [
      'sex', 'date_of_birth', 'special_group', 'certification_number', 'learner_reference_number',
      'surname', 'first_name', 'middle_name', 'extension',
      'contact_number', 'email_address', 'street_brgy', 'municipality_city',
      'province', 'congressional_district', 'zip_code', 'name_of_institution',
      'uii', 'institutional_type', 'region', 'degree_program', 'program_major',
      'program_discipline', 'program_degree_level', 'in_charge', 'award_year',
      'scholarship_program', 'award_number', 'authority_type', 'authority_number',
      'series', 'is_priority', 'basis_cmo', 'replacement_info', 'termination_reason',
      'scholarship_status'
    ]
    
    return fieldsToCompare.some(field => {
      const originalValue = student[field]
      const currentValue = formData[field]
      
      // Handle null/undefined/empty string comparisons
      const normalizeValue = (val) => {
        if (val === null || val === undefined || val === '') return ''
        return String(val)
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
      if (dataToSave.date_of_birth && dayjs(dataToSave.date_of_birth).isValid()) {
        dataToSave.date_of_birth = dayjs(dataToSave.date_of_birth).format('YYYY-MM-DD')
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
      message.error(err.message || 'Failed to update student')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return dayjs(date).format('MMM D, YYYY')
  }

  const formatCurrency = (amount) => {
    if (!amount) return '₱0.00'
    return `₱${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  }

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'N/A'
    const today = dayjs()
    const birthDate = dayjs(dateOfBirth)
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
      disbursement_date: record.disbursement_date ? dayjs(record.disbursement_date) : null,
      date_process: record.date_process ? dayjs(record.date_process) : null,
      voucher_date: record.voucher_date ? dayjs(record.voucher_date) : null,
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
    disbursementForm.setFieldsValue({ student_seq: student?.seq })
  }

  const handleDisbursementSubmit = async () => {
    setDisbursementLoading(true)
    try {
      const values = await disbursementForm.validateFields()
      
      // Format the data
      const formattedData = {
        ...values,
        disbursement_date: values.disbursement_date ? 
          dayjs(values.disbursement_date).format('YYYY-MM-DD') : null,
        date_process: values.date_process ? 
          dayjs(values.date_process).format('YYYY-MM-DD') : null,
        voucher_date: values.voucher_date ? 
          dayjs(values.voucher_date).format('YYYY-MM-DD') : null,
        amount: values.amount !== undefined && values.amount !== '' && values.amount !== null ? parseFloat(values.amount) : null,
        // Ensure student_seq is included
        student_seq: values.student_seq || student?.seq,
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
      if (err.message.includes('validation')) {
        message.error('Please check all required fields and try again')
      } else {
        message.error(err.message || `Failed to ${disbursementModal.mode === 'create' ? 'create' : 'update'} disbursement record`)
      }
    } finally {
      setDisbursementLoading(false)
    }
  }

  const disbursementColumns = [
    {
      title: 'Academic Year',
      dataIndex: 'academic_year',
      key: 'academic_year',
      width: 140,
    },
    {
      title: 'Semester',
      dataIndex: 'semester',
      key: 'semester',
      width: 120,
    },
    {
      title: 'Year Level',
      dataIndex: 'curriculum_year_level',
      key: 'curriculum_year_level',
      width: 110,
    },
    {
      title: 'NTA',
      dataIndex: 'nta',
      key: 'nta',
      width: 140,
    },
    {
      title: 'Fund Source',
      dataIndex: 'fund_source',
      key: 'fund_source',
      width: 160,
    },
    {
      title: 'Voucher Tracking No.',
      dataIndex: 'voucher_tracking_no',
      key: 'voucher_tracking_no',
      width: 180,
      render: (text) => text || 'N/A',
    },
    {
      title: 'Voucher No.',
      dataIndex: 'voucher_no',
      key: 'voucher_no',
      width: 160,
      render: (text) => text || 'N/A',
    },
    {
      title: 'Voucher Date',
      dataIndex: 'voucher_date',
      key: 'voucher_date',
      width: 140,
      render: (date) => formatDate(date),
    },
    {
      title: 'Mode of Payment',
      dataIndex: 'mode_of_payment',
      key: 'mode_of_payment',
      width: 180,
    },
    {
      title: 'ATM Account No.',
      dataIndex: 'atm_account_no',
      key: 'atm_account_no',
      width: 160,
      render: (text) => text || 'N/A',
    },
    {
      title: 'Date Process',
      dataIndex: 'date_process',
      key: 'date_process',
      width: 140,
      render: (date) => formatDate(date),
    },
    {
      title: 'Account/Check No.',
      dataIndex: 'account_check_no',
      key: 'account_check_no',
      width: 160,
      render: (text) => text || 'N/A',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      align: 'right',
      render: (amount) => formatCurrency(amount),
    },
    {
      title: 'LDDAP No.',
      dataIndex: 'lddap_no',
      key: 'lddap_no',
      width: 140,
      render: (text) => text || 'N/A',
    },
    {
      title: 'Disbursement Date',
      dataIndex: 'disbursement_date',
      key: 'disbursement_date',
      width: 140,
      render: (date) => formatDate(date),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (text) => text || 'N/A',
    },
    {
      title: 'Remarks',
      dataIndex: 'remarks',
      key: 'remarks',
      width: 200,
      render: (text) => text || 'N/A',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEditDisbursement(record)}
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
            />
          </Popconfirm>
        </Space>
      ),
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
    'surname', 'first_name', 'sex', 'date_of_birth',
    'contact_number', 'email_address', 'street_brgy', 'municipality_city',
    'province', 'congressional_district', 'zip_code',
    'name_of_institution', 'uii', 'institutional_type', 'region',
    'degree_program', 'program_degree_level',
    'in_charge', 'award_year', 'scholarship_program', 'award_number',
    'authority_type', 'authority_number', 'series', 'scholarship_status',
    'learner_reference_number', 'basis_cmo'
  ]
  const getMissingFields = () => requiredFields.filter(f => !student[f] || student[f] === '')
  const getIncompleteCount = () => getMissingFields().length

  return (
    <div style={{ background: '#fafbfc', minHeight: '100vh', margin: -24 }}>
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
            {editMode ? (
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
            ) : (
              <Button 
                type="primary" 
                icon={<EditOutlined />} 
                onClick={() => {
                  setEditMode(true)
                  // Auto-fill UII and related fields when entering edit mode if missing
                  if (formData.name_of_institution && !formData.uii) {
                    lookupAndFillFields(formData)
                  }
                }}
              >
                Edit Record
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '24px' }}>
      {/* Cards - Row 1 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col xs={24} lg={12}>
          <Card title="Personal Information" style={{ height: '100%', borderRadius: 12 }} headStyle={{ borderBottom: '1px solid #f0f0f0' }}>
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
                label="Date of Birth" 
                value={student.date_of_birth ? `${formatDate(student.date_of_birth)} (${calculateAge(student.date_of_birth)} yrs)` : null} 
                field="date_of_birth" 
                type="date"
                required
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
              <Field label="Learner Reference No. (LRN)" value={student.learner_reference_number} field="learner_reference_number" required editMode={editMode} formData={formData} handleChange={handleChange} />
            </Row>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Contact & Address" style={{ height: '100%', borderRadius: 12 }} headStyle={{ borderBottom: '1px solid #f0f0f0' }}>
            <Row gutter={[12, 8]}>
              <Field label="Contact Number" value={student.contact_number} field="contact_number" required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="Email Address" value={student.email_address} field="email_address" type="email" required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="Street / Barangay" value={student.street_brgy} field="street_brgy" required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="City / Municipality" value={student.municipality_city} field="municipality_city" required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="Province" value={student.province} field="province" required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="Congressional District" value={student.congressional_district} field="congressional_district" required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="ZIP Code" value={student.zip_code} field="zip_code" required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Col span={12} />
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Cards - Row 2 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col xs={24} lg={12}>
          <Card title="Institution & Academic Program" style={{ height: '100%', borderRadius: 12 }} headStyle={{ borderBottom: '1px solid #f0f0f0' }}>
            <Row gutter={[12, 8]}>
              <Field label="Name of Institution" value={student.name_of_institution} field="name_of_institution" span={24} required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="UII" value={student.uii} field="uii" required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="Institutional Type" value={student.institutional_type} field="institutional_type" required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="Region" value={student.region} field="region" required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="Degree Program" value={student.degree_program} field="degree_program" required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="Program Major" value={student.program_major} field="program_major" editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="Program Discipline" value={student.program_discipline} field="program_discipline" editMode={editMode} formData={formData} handleChange={handleChange} />
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
            </Row>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Scholarship & Authority" style={{ height: '100%', borderRadius: 12 }} headStyle={{ borderBottom: '1px solid #f0f0f0' }}>
            <Row gutter={[12, 8]}>
              <Field label="In-Charge" value={student.in_charge} field="in_charge" required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="Award Year" value={student.award_year} field="award_year" required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="Scholarship Program" value={student.scholarship_program} field="scholarship_program" required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="Award Number" value={student.award_number} field="award_number" required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field 
                label="Authority Type" 
                value={student.authority_type} 
                field="authority_type" 
                type="select" 
                required
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
              <Field label="Authority Number" value={student.authority_number} field="authority_number" required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="Series" value={student.series} field="series" required editMode={editMode} formData={formData} handleChange={handleChange} />
              <Field label="Basis (CMO)" value={student.basis_cmo} field="basis_cmo" required editMode={editMode} formData={formData} handleChange={handleChange} />
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Cards - Row 3: Status & Remarks */}
      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col xs={24} lg={12}>
          <Card title="Status & Priority" style={{ height: '100%', borderRadius: 12 }} headStyle={{ borderBottom: '1px solid #f0f0f0' }}>
            <Row gutter={[12, 8]}>
              <Field 
                label="Scholarship Status" 
                value={student.scholarship_status} 
                field="scholarship_status" 
                type="select" 
                required
                options={[
                  { label: 'Active', value: 'Active' },
                  { label: 'Graduated', value: 'Graduated' },
                  { label: 'Terminated', value: 'Terminated' }
                ]}
                editMode={editMode} 
                formData={formData} 
                handleChange={handleChange} 
              />
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
              <Field label="Replacement Info" value={student.replacement_info} field="replacement_info" span={24} editMode={editMode} formData={formData} handleChange={handleChange} />
            </Row>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Remarks" style={{ height: '100%', borderRadius: 12 }} headStyle={{ borderBottom: '1px solid #f0f0f0' }}>
            <Row gutter={[12, 8]}>
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
        title="Semester Transaction Records"
        style={{ borderRadius: 12 }}
        headStyle={{ borderBottom: '1px solid #f0f0f0' }}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateDisbursement}>
            Add Disbursement
          </Button>
        }
      >
        <Table
          dataSource={student.disbursements || []}
          columns={disbursementColumns}
          rowKey="id"
          pagination={false}
          scroll={{ x: 1800, y: 500 }}
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
        destroyOnClose={true}
      >
        <Form form={disbursementForm} layout="vertical">
          {/* Academic Information */}
          <div style={{ marginBottom: '24px' }}>
            <Text strong style={{ fontSize: '14px', color: '#262626', display: 'block', marginBottom: '16px' }}>
              Academic Information
            </Text>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="student_seq" label="Student ID" hidden>
                  <Input disabled />
                </Form.Item>
                <Form.Item 
                  name="academic_year" 
                  label="Academic Year"
                  rules={[{ required: true, message: 'Please enter academic year' }]}
                >
                  <Input placeholder="e.g., 2024-2025" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="semester" label="Semester">
                  <Select placeholder="Select semester">
                    <Select.Option value="First">First</Select.Option>
                    <Select.Option value="Second">Second</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  name="curriculum_year_level" 
                  label="Year Level"
                  rules={[{ required: true, message: 'Please select year level' }]}
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
            </Row>
          </div>

          {/* Financial Information */}
          <div style={{ marginBottom: '24px' }}>
            <Text strong style={{ fontSize: '14px', color: '#262626', display: 'block', marginBottom: '16px' }}>
              Financial Information
            </Text>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="nta" label="NTA">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="fund_source" label="Fund Source">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  name="amount" 
                  label="Amount"
                >
                  <Input 
                    type="number" 
                    step="0.01" 
                    prefix="₱" 
                    placeholder="0.00"
                    min={0}
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* Payment Details */}
          <div style={{ marginBottom: '24px' }}>
            <Text strong style={{ fontSize: '14px', color: '#262626', display: 'block', marginBottom: '16px' }}>
              Payment Details
            </Text>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="voucher_tracking_no" label="Voucher Tracking No.">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="voucher_no" label="Voucher No.">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="voucher_date" label="Voucher Date">
                  <DatePicker 
                    style={{ width: '100%' }}
                    placeholder="Select date"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="mode_of_payment" label="Mode of Payment">
                  <Select placeholder="Select mode of payment">
                    <Select.Option value="ATM">ATM</Select.Option>
                    <Select.Option value="Cheque">Cheque</Select.Option>
                    <Select.Option value="Through the HEI">Through the HEI</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="atm_account_no" label="ATM Account No.">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="date_process" label="Date Process">
                  <DatePicker 
                    style={{ width: '100%' }}
                    placeholder="Select date"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="account_check_no" label="Account/Check No.">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="lddap_no" label="LDDAP No.">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  name="disbursement_date" 
                  label="Disbursement Date"
                  rules={[{ required: true, message: 'Please select disbursement date' }]}
                >
                  <DatePicker 
                    style={{ width: '100%' }}
                    placeholder="Select date"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="status" label="Status">
                  <Input placeholder="e.g., Paid, Pending, etc." />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* Remarks */}
          <div>
            <Form.Item name="remarks" label="Remarks">
              <Input.TextArea 
                rows={3} 
                placeholder="Enter any additional remarks or notes..."
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>
      </div>
    </div>
  )
}