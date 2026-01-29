import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Typography, Spin, Table, Card, Button, Row, Col, Tag, Space, Popconfirm, message, Input, Select } from 'antd'
import { PlusOutlined, ArrowLeftOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const { Title, Text } = Typography

export default function StudentDetails() {
  const params = useParams()
  const id = params.id

  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({})

  useEffect(() => {
    if (!id) {
      setError('No student ID provided')
      setLoading(false)
      return
    }

    fetch(`http://localhost:8000/api/students/${id}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
      })
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
  }, [id])

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`http://localhost:8000/api/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error(`Save failed (${res.status})`)
      const updated = await res.json()
      setStudent(updated)
      setFormData(updated)
      setEditMode(false)
      message.success('Student updated')
    } catch (err) {
      message.error(err.message)
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
      case 'On-going': return 'green'
      case 'Graduated': return 'blue'
      case 'Terminated': return 'red'
      default: return 'default'
    }
  }

  const getFullName = () => {
    if (!student) return ''
    return [student.surname, student.first_name, student.middle_name, student.extension]
      .filter(Boolean)
      .join(' ')
  }

  const handleEditDisbursement = (record) => {
    message.info(`Edit disbursement ID: ${record.id}`)
  }

  const handleDeleteDisbursement = (record) => {
    message.success(`Deleted disbursement ID: ${record.id}`)
  }

  const disbursementColumns = [
    {
      title: 'Academic Year',
      dataIndex: 'academic_year',
      key: 'academic_year',
      width: 120,
    },
    {
      title: 'Semester',
      dataIndex: 'semester',
      key: 'semester',
      width: 100,
    },
    {
      title: 'Year Level',
      dataIndex: 'curriculum_year_level',
      key: 'curriculum_year_level',
      width: 100,
    },
    {
      title: 'NTA',
      dataIndex: 'nta',
      key: 'nta',
      width: 120,
    },
    {
      title: 'Fund Source',
      dataIndex: 'fund_source',
      key: 'fund_source',
      width: 120,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      render: (amount) => formatCurrency(amount),
    },
    {
      title: 'Voucher No.',
      dataIndex: 'voucher_number',
      key: 'voucher_number',
      width: 140,
    },
    {
      title: 'Mode of Payment',
      dataIndex: 'mode_of_payment',
      key: 'mode_of_payment',
      width: 140,
    },
    {
      title: 'Account/Check No.',
      dataIndex: 'account_check_no',
      key: 'account_check_no',
      width: 140,
      render: (text) => text || 'N/A',
    },
    {
      title: 'Payment Amount',
      dataIndex: 'payment_amount',
      key: 'payment_amount',
      width: 130,
      align: 'right',
      render: (amount) => formatCurrency(amount),
    },
    {
      title: 'LDDAP No.',
      dataIndex: 'lddap_number',
      key: 'lddap_number',
      width: 130,
      render: (text) => text || 'N/A',
    },
    {
      title: 'Date',
      dataIndex: 'disbursement_date',
      key: 'disbursement_date',
      width: 110,
      render: (date) => formatDate(date),
    },
    {
      title: 'Remarks',
      dataIndex: 'remarks',
      key: 'remarks',
      width: 150,
      render: (text) => text || 'N/A',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEditDisbursement(record)}
          />
          <Popconfirm
            title="Delete record?"
            onConfirm={() => handleDeleteDisbursement(record)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // Simple field display
  const Field = ({ label, value, field, span = 12 }) => (
    <Col span={span}>
      <div style={{ marginBottom: '8px' }}>
        <Text type="secondary" style={{ fontSize: '11px' }}>{label}</Text>
        {editMode && field ? (
          <Input
            size="small"
            value={formData?.[field] ?? ''}
            onChange={(e) => handleChange(field, e.target.value)}
          />
        ) : (
          <div>{value || 'N/A'}</div>
        )}
      </div>
    </Col>
  )

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

  return (
    <div style={{ padding: '16px' }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
        <Col>
          <Button icon={<ArrowLeftOutlined />} onClick={() => window.history.back()}>
            Back
          </Button>
        </Col>
        <Col>
          <Title level={4} style={{ margin: 0 }}>{getFullName()}</Title>
        </Col>
        <Col>
          <Space>
            <Tag color={getStatusColor(student.scholarship_status)}>
              {student.scholarship_status}
            </Tag>
            {editMode ? (
              <>
                <Button size="small" onClick={() => { setFormData(student); setEditMode(false) }}>
                  Cancel
                </Button>
                <Button size="small" type="primary" loading={saving} onClick={handleSave}>
                  Save
                </Button>
              </>
            ) : (
              <Button size="small" icon={<EditOutlined />} onClick={() => setEditMode(true)}>
                Edit
              </Button>
            )}
          </Space>
        </Col>
      </Row>

      {/* Cards */}
      <Row gutter={16} style={{ marginBottom: '16px' }}>
        <Col xs={24} md={12}>
          <Card title="Personal Information" size="small">
            <Row>
              <Field label="ID" value={student.seq} />
              <Field label="Sex" value={student.sex} field="sex" />
              <Field label="Date of Birth" value={`${formatDate(student.date_of_birth)} (${calculateAge(student.date_of_birth)} years)`} field="date_of_birth" span={24} />
              <Field label="Special Group" value={student.special_group} field="special_group" />
              <Field label="Certification No." value={student.certification_number} field="certification_number" />
              <Field label="Surname" value={student.surname} field="surname" />
              <Field label="First Name" value={student.first_name} field="first_name" />
              <Field label="Middle Name" value={student.middle_name} field="middle_name" />
              <Field label="Extension" value={student.extension} field="extension" />
            </Row>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="Contact Details" size="small">
            <Row>
              <Field label="Contact" value={student.contact_number} field="contact_number" />
              <Field label="Email" value={student.email_address} field="email_address" />
              <Field label="Address" value={`${student.street_brgy}, ${student.municipality_city}, ${student.province}`} span={24} />
              <Field label="Street / Brgy" value={student.street_brgy} field="street_brgy" />
              <Field label="City / Municipality" value={student.municipality_city} field="municipality_city" />
              <Field label="Province" value={student.province} field="province" />
              <Field label="District" value={student.congressional_district} field="congressional_district" />
              <Field label="ZIP" value={student.zip_code} field="zip_code" />
            </Row>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="Institution & Program" size="small">
            <Row>
              <Field label="Institution" value={student.name_of_institution} field="name_of_institution" span={24} />
              <Field label="UII" value={student.uii} field="uii" />
              <Field label="Type" value={student.institutional_type} field="institutional_type" />
              <Field label="Region" value={student.region} field="region" />
              <Field label="Degree Program" value={student.degree_program} field="degree_program" />
              <Field label="Major" value={student.program_major} field="program_major" />
              <Field label="Discipline" value={student.program_discipline} field="program_discipline" />
              <Field label="Level" value={student.program_degree_level} field="program_degree_level" span={24} />
            </Row>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="Scholarship Details" size="small">
            <Row>
              <Field label="In-Charge" value={student.in_charge} field="in_charge" />
              <Field label="Award Year" value={student.award_year} field="award_year" />
              <Field label="Program" value={student.scholarship_program} field="scholarship_program" />
              <Field label="Award No." value={student.award_number} field="award_number" />
              <Field label="Authority Type" value={student.authority_type} field="authority_type" />
              <Field label="Authority No." value={student.authority_number} field="authority_number" />
              <Field label="Series" value={student.series} field="series" />
              <Col span={12}>
                <div style={{ marginBottom: '8px' }}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Priority</Text>
                  {editMode ? (
                    <Select
                      size="small"
                      value={formData?.is_priority ? 'yes' : 'no'}
                      onChange={(v) => handleChange('is_priority', v === 'yes')}
                      options={[
                        { label: 'Yes', value: 'yes' },
                        { label: 'No', value: 'no' },
                      ]}
                      style={{ width: '100%' }}
                    />
                  ) : (
                    <Tag color={student.is_priority ? 'red' : 'default'} size="small">
                      {student.is_priority ? 'Yes' : 'No'}
                    </Tag>
                  )}
                </div>
              </Col>
              <Field label="Basis CMO" value={student.basis_cmo} field="basis_cmo" />
              <Field label="Replacement" value={student.replacement_info} field="replacement_info" />
              <Field label="Termination" value={student.termination_reason} field="termination_reason" span={24} />
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Card
        title="Semester Transaction Records"
        size="small"
        extra={
          <Button type="primary" icon={<PlusOutlined />} size="small">
            Add
          </Button>
        }
      >
        <Table
          dataSource={student.disbursements || []}
          columns={disbursementColumns}
          rowKey="id"
          pagination={false}
          scroll={{ x: 1400 }}
          size="small"
        />
      </Card>
    </div>
  )
}