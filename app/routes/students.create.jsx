import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Typography, Form, Input, Button, Select, message, DatePicker, Card, Row, Col, Divider, Space, Modal, Tag } from 'antd'
import {
  ArrowLeftOutlined, PlusOutlined, DeleteOutlined, SaveOutlined,
  UserOutlined, BankOutlined, BookOutlined, DollarOutlined,
  UploadOutlined, WarningOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Option } = Select

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// Fields tracked by data quality — missing ones trigger a warning on submit (not a block)
const DATA_QUALITY_FIELDS = {
  sex: 'Sex',
  date_of_birth: 'Date of Birth',
  contact_number: 'Contact No.',
  email_address: 'Email',
  street_brgy: 'Street/Brgy',
  municipality_city: 'City/Municipality',
  province: 'Province',
  congressional_district: 'District',
  zip_code: 'ZIP Code',
  name_of_institution: 'Institution',
  uii: 'UII',
  institutional_type: 'Inst. Type',
  region: 'Region',
  degree_program: 'Degree Program',
  program_degree_level: 'Degree Level',
  in_charge: 'In-Charge',
  award_year: 'Award Year',
  scholarship_program: 'Scholarship Program',
  authority_type: 'Authority Type',
  authority_number: 'Authority No.',
  series: 'Series',
  scholarship_status: 'Status',
  learner_reference_number: 'LRN',
  basis_cmo: 'Basis (CMO)',
}

export default function CreateStudent() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const [disbursements, setDisbursements] = useState([])

  const addDisbursement = () => {
    setDisbursements(prev => [...prev, { id: Date.now() }])
  }

  const removeDisbursement = (id) => {
    setDisbursements(prev => prev.filter(d => d.id !== id))
  }

  const submitStudent = async (values) => {
    setLoading(true)
    try {
      const studentData = { ...values }
      if (studentData.date_of_birth) {
        studentData.date_of_birth = studentData.date_of_birth.format('YYYY-MM-DD')
      }
      if (studentData.is_priority !== undefined) {
        studentData.is_priority = studentData.is_priority === 'Yes' ? '1' : '0'
      }

      const disbursementEntries = []
      Object.keys(studentData).forEach(key => {
        if (key.startsWith('disb_')) {
          const match = key.match(/^disb_(\d+)_(.+)$/)
          if (match) {
            const idx = Number(match[1])
            const field = match[2]
            if (!disbursementEntries[idx]) disbursementEntries[idx] = {}
            disbursementEntries[idx][field] = studentData[key]
          }
          delete studentData[key]
        }
      })

      const studentRes = await fetch(`${API_BASE}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData),
      })

      if (!studentRes.ok) {
        const err = await studentRes.json().catch(() => ({}))
        throw new Error(err.message || 'Failed to create student')
      }

      const studentJson = await studentRes.json()
      const studentSeq = studentJson.data?.seq

      if (studentSeq && disbursementEntries.length > 0) {
        const validDisbursements = disbursementEntries
          .filter(d => d && (d.academic_year || d.semester || d.amount))
          .map(d => ({
            student_seq: studentSeq,
            academic_year: d.academic_year || null,
            semester: d.semester || null,
            curriculum_year_level: d.curriculum_year_level || null,
            nta: d.nta || null,
            fund_source: d.fund_source || null,
            voucher_tracking_no: d.voucher_tracking_no || null,
            voucher_no: d.voucher_no || null,
            voucher_date: d.voucher_date ? dayjs(d.voucher_date).format('YYYY-MM-DD') : null,
            mode_of_payment: d.mode_of_payment || null,
            atm_account_no: d.atm_account_no || null,
            date_process: d.date_process ? dayjs(d.date_process).format('YYYY-MM-DD') : null,
            account_check_no: d.account_check_no || null,
            amount: d.amount ? parseFloat(d.amount) : null,
            lddap_no: d.lddap_no || null,
            disbursement_date: d.disbursement_date ? dayjs(d.disbursement_date).format('YYYY-MM-DD') : null,
            status: d.status || null,
            remarks: d.remarks || null,
          }))

        if (validDisbursements.length > 0) {
          await fetch(`${API_BASE}/disbursements/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ disbursements: validDisbursements }),
          })
        }
      }

      await fetch(`${API_BASE}/scholarship_programs/update-slots`, { method: 'POST' }).catch(() => {})

      message.success('Student added successfully')
      navigate('/students')
    } catch (error) {
      console.error('Error creating student:', error)
      message.error(error.message || 'Failed to add student')
    } finally {
      setLoading(false)
    }
  }

  const handleFormSubmit = () => {
    form.validateFields().then(values => {
      const missingFields = Object.entries(DATA_QUALITY_FIELDS)
        .filter(([key]) => !values[key])
        .map(([, label]) => label)

      if (missingFields.length > 0) {
        Modal.confirm({
          title: 'Incomplete Information',
          icon: <WarningOutlined style={{ color: '#fa8c16' }} />,
          content: (
            <div>
              <p style={{ marginBottom: 8 }}>
                The following fields are empty and will be flagged in Data Quality:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {missingFields.map(f => (
                  <Tag key={f} color="orange" style={{ fontSize: 12 }}>{f}</Tag>
                ))}
              </div>
            </div>
          ),
          okText: 'Save Anyway',
          cancelText: 'Go Back & Fill',
          onOk: () => submitStudent(values),
        })
      } else {
        submitStudent(values)
      }
    }).catch(() => {
      message.error('Please fill in the required fields (Name and Award No.)')
    })
  }

  const sectionTitle = (icon, title) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      {icon}
      <Text strong style={{ fontSize: 15, color: '#1a1a1a' }}>{title}</Text>
    </div>
  )

  return (
    <div style={{ background: '#fafbfc', minHeight: '100vh', margin: -24 }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8eaed', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => window.history.back()} />
            <Title level={4} style={{ margin: 0, fontWeight: 600 }}>Add New Student</Title>
          </div>
          <Space>
            <Button icon={<UploadOutlined />} onClick={() => navigate('/students/bulk')}>
              Bulk Import
            </Button>
            <Button onClick={() => navigate('/students')}>Cancel</Button>
            <Button type="primary" icon={<SaveOutlined />} loading={loading} onClick={handleFormSubmit}>
              Save Student
            </Button>
          </Space>
        </div>
      </div>

      {/* Form */}
      <div style={{ padding: 24 }}>
        <Form form={form} layout="vertical" requiredMark="optional" size="middle">

          {/* Personal Information */}
          <Card style={{ borderRadius: 12, marginBottom: 16 }}>
            {sectionTitle(<UserOutlined style={{ fontSize: 16, color: '#3b82f6' }} />, 'Personal Information')}
            <Row gutter={16}>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Surname" name="surname" rules={[{ required: true, message: 'Required' }]}>
                  <Input placeholder="e.g. Dela Cruz" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="First Name" name="first_name" rules={[{ required: true, message: 'Required' }]}>
                  <Input placeholder="e.g. Juan" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Middle Name" name="middle_name">
                  <Input placeholder="e.g. Santos" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Extension" name="extension">
                  <Input placeholder="e.g. Jr., Sr., III" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Sex" name="sex">
                  <Select placeholder="Select" allowClear>
                    <Option value="Male">Male</Option>
                    <Option value="Female">Female</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Date of Birth" name="date_of_birth">
                  <DatePicker style={{ width: '100%' }} placeholder="Select date" disabledDate={(c) => c && c > dayjs().endOf('day')} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Special Group" name="special_group">
                  <Select placeholder="Select (if applicable)" allowClear>
                    <Option value="IP">Indigenous People (IP)</Option>
                    <Option value="PWD">Person with Disability (PWD)</Option>
                    <Option value="Solo Parent">Solo Parent</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Certification No." name="certification_number">
                  <Input placeholder="If applicable" />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: '12px 0 16px' }} />
            <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>Contact & Address</Text>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Learner Reference No. (LRN)" name="learner_reference_number">
                  <Input placeholder="Enter LRN" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Contact Number" name="contact_number">
                  <Input placeholder="e.g. 09171234567" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Email Address" name="email_address" rules={[{ type: 'email', message: 'Invalid email' }]}>
                  <Input placeholder="e.g. juan@email.com" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Street / Barangay" name="street_brgy">
                  <Input placeholder="Enter street/barangay" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="City / Municipality" name="municipality_city">
                  <Input placeholder="Enter city/municipality" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Province" name="province">
                  <Input placeholder="Enter province" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Congressional District" name="congressional_district">
                  <Input placeholder="Enter district" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="ZIP Code" name="zip_code">
                  <Input placeholder="Enter ZIP code" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Institution & Program */}
          <Card style={{ borderRadius: 12, marginBottom: 16 }}>
            {sectionTitle(<BankOutlined style={{ fontSize: 16, color: '#10b981' }} />, 'Institution & Program')}
            <Row gutter={16}>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Name of Institution" name="name_of_institution">
                  <Input placeholder="Enter institution name" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="UII" name="uii">
                  <Input placeholder="Enter UII" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Institutional Type" name="institutional_type">
                  <Select placeholder="Select" allowClear>
                    <Option value="SUC">SUC</Option>
                    <Option value="LUC">LUC</Option>
                    <Option value="Private">Private</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Region (School Location)" name="region">
                  <Input placeholder="Enter region" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Degree Program" name="degree_program">
                  <Input placeholder="Enter degree program" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Program Major" name="program_major">
                  <Input placeholder="Enter major" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Program Discipline" name="program_discipline">
                  <Input placeholder="Enter discipline" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Degree Level" name="program_degree_level">
                  <Select placeholder="Select" allowClear>
                    <Option value="Pre-baccalaureate">Pre-baccalaureate</Option>
                    <Option value="Baccalaureate">Baccalaureate</Option>
                    <Option value="Post Baccalaureate">Post Baccalaureate</Option>
                    <Option value="Masters">Masters</Option>
                    <Option value="Doctorate">Doctorate</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Scholarship & Authority */}
          <Card style={{ borderRadius: 12, marginBottom: 16 }}>
            {sectionTitle(<BookOutlined style={{ fontSize: 16, color: '#8b5cf6' }} />, 'Scholarship & Authority')}
            <Row gutter={16}>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="In-Charge" name="in_charge">
                  <Input placeholder="Enter in-charge" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Award Year" name="award_year">
                  <Input placeholder="e.g. 2024" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Scholarship Program" name="scholarship_program">
                  <Input placeholder="Enter program" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Award Number" name="award_number" rules={[{ required: true, message: 'Required' }]}>
                  <Input placeholder="Enter award number" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Authority Type" name="authority_type">
                  <Select placeholder="Select" allowClear>
                    <Option value="GP">GP</Option>
                    <Option value="GR">GR</Option>
                    <Option value="RRPA">RRPA</Option>
                    <Option value="COPC">COPC</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Authority Number" name="authority_number">
                  <Input placeholder="Enter authority number" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Series" name="series">
                  <Input placeholder="Enter series" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Scholarship Status" name="scholarship_status">
                  <Select placeholder="Select" allowClear>
                    <Option value="On-going">On-going</Option>
                    <Option value="Graduated">Graduated</Option>
                    <Option value="Terminated">Terminated</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Priority Program" name="is_priority">
                  <Select placeholder="Select" allowClear>
                    <Option value="Yes">Yes</Option>
                    <Option value="No">No</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Basis (CMO)" name="basis_cmo">
                  <Input placeholder="Enter CMO" />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: '12px 0 16px' }} />
            <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>Remarks</Text>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label="Replacement Info" name="replacement_info">
                  <Input placeholder="If applicable" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Reason / Notes" name="termination_reason">
                  <Input.TextArea rows={2} placeholder="Enter any remarks" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Disbursement Records */}
          <Card style={{ borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              {sectionTitle(<DollarOutlined style={{ fontSize: 16, color: '#f59e0b' }} />, 'Disbursement Records')}
              <Button type="dashed" icon={<PlusOutlined />} onClick={addDisbursement}>
                Add Semester Record
              </Button>
            </div>

            {disbursements.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
                <DollarOutlined style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />
                <Text type="secondary">No disbursement records yet. Click "Add Semester Record" to add one.</Text>
              </div>
            ) : (
              disbursements.map((disb, index) => (
                <Card
                  key={disb.id}
                  size="small"
                  style={{ marginBottom: 12, borderRadius: 8, background: '#fafbfc' }}
                  title={<Text strong style={{ fontSize: 13 }}>Semester Record #{index + 1}</Text>}
                  extra={
                    <Button type="text" danger icon={<DeleteOutlined />} size="small" onClick={() => removeDisbursement(disb.id)}>
                      Remove
                    </Button>
                  }
                >
                  <Row gutter={16}>
                    <Col xs={24} sm={8} md={6}>
                      <Form.Item label="Academic Year" name={`disb_${index}_academic_year`}>
                        <Input placeholder="e.g. 2024-2025" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8} md={6}>
                      <Form.Item label="Semester" name={`disb_${index}_semester`}>
                        <Select placeholder="Select" allowClear>
                          <Option value="First">First</Option>
                          <Option value="Second">Second</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8} md={6}>
                      <Form.Item label="Year Level" name={`disb_${index}_curriculum_year_level`}>
                        <Select placeholder="Select" allowClear>
                          <Option value="I">I</Option>
                          <Option value="II">II</Option>
                          <Option value="III">III</Option>
                          <Option value="IV">IV</Option>
                          <Option value="V">V</Option>
                          <Option value="VI">VI</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8} md={6}>
                      <Form.Item label="NTA" name={`disb_${index}_nta`}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8} md={6}>
                      <Form.Item label="Fund Source" name={`disb_${index}_fund_source`}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8} md={6}>
                      <Form.Item label="Amount" name={`disb_${index}_amount`}>
                        <Input type="number" prefix="₱" placeholder="0.00" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8} md={6}>
                      <Form.Item label="Voucher Tracking No." name={`disb_${index}_voucher_tracking_no`}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8} md={6}>
                      <Form.Item label="Voucher No." name={`disb_${index}_voucher_no`}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8} md={6}>
                      <Form.Item label="Voucher Date" name={`disb_${index}_voucher_date`}>
                        <DatePicker style={{ width: '100%' }} placeholder="Select date" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8} md={6}>
                      <Form.Item label="Mode of Payment" name={`disb_${index}_mode_of_payment`}>
                        <Select placeholder="Select" allowClear>
                          <Option value="ATM">ATM</Option>
                          <Option value="Cheque">Cheque</Option>
                          <Option value="Through the HEI">Through the HEI</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8} md={6}>
                      <Form.Item label="ATM Account No." name={`disb_${index}_atm_account_no`}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8} md={6}>
                      <Form.Item label="Date Process" name={`disb_${index}_date_process`}>
                        <DatePicker style={{ width: '100%' }} placeholder="Select date" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8} md={6}>
                      <Form.Item label="Account/Check No." name={`disb_${index}_account_check_no`}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8} md={6}>
                      <Form.Item label="LDDAP No." name={`disb_${index}_lddap_no`}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8} md={6}>
                      <Form.Item label="Disbursement Date" name={`disb_${index}_disbursement_date`}>
                        <DatePicker style={{ width: '100%' }} placeholder="Select date" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Form.Item label="Status" name={`disb_${index}_status`}>
                        <Input placeholder="e.g. Paid" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Form.Item label="Remarks" name={`disb_${index}_remarks`}>
                        <Input placeholder="Optional" />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
              ))
            )}
          </Card>
        </Form>
      </div>
    </div>
  )
}
