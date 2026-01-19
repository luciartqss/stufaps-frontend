import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Typography, Form, Input, Button, Select, message, DatePicker, Checkbox } from 'antd'
import dayjs from 'dayjs'

const { Title } = Typography
const { Option } = Select

export default function CreateStudent() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()

  // Handle form submission
  const handleSubmit = async (values) => {
    setLoading(true)
    try {
      // Format the date of birth
      const formattedValues = {
        ...values,
        date_of_birth: values.date_of_birth ? values.date_of_birth.format('YYYY-MM-DD') : null,
      }

      const response = await fetch('http://localhost:8000/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedValues),
      })

      if (!response.ok) {
        throw new Error('Failed to create student')
      }

      message.success('Student added successfully')
      navigate('/students') // Redirect back to the students list
    } catch (error) {
      console.error('Error creating student:', error)
      message.error('Failed to add student')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Add Student</Title>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        style={{ maxWidth: '800px', margin: '0 auto' }}
      >
        {/* Personal Information */}
        <Title level={4}>Personal Information</Title>
        <Form.Item
          label="First Name"
          name="first_name"
          rules={[{ required: true, message: 'Please enter the first name' }]}
        >
          <Input placeholder="Enter first name" />
        </Form.Item>
        <Form.Item
          label="Middle Name"
          name="middle_name"
        >
          <Input placeholder="Enter middle name" />
        </Form.Item>
        <Form.Item
          label="Surname"
          name="surname"
          rules={[{ required: true, message: 'Please enter the surname' }]}
        >
          <Input placeholder="Enter surname" />
        </Form.Item>
        <Form.Item
          label="Extension (e.g., Jr., Sr.)"
          name="extension"
        >
          <Input placeholder="Enter extension (if applicable)" />
        </Form.Item>
        <Form.Item
          label="Sex"
          name="sex"
          rules={[{ required: true, message: 'Please select the sex' }]}
        >
          <Select placeholder="Select sex">
            <Option value="Male">Male</Option>
            <Option value="Female">Female</Option>
          </Select>
        </Form.Item>
        <Form.Item
          label="Date of Birth"
          name="date_of_birth"
          rules={[{ required: true, message: 'Please select the date of birth' }]}
        >
          <DatePicker
            placeholder="Select date of birth"
            style={{ width: '100%' }}
            disabledDate={(current) => current && current > dayjs().endOf('day')}
          />
        </Form.Item>
        <Form.Item
          label="Special Group"
          name="special_group"
        >
          <Select placeholder="Select special group">
            <Option value="IP">Indigenous People (IP)</Option>
            <Option value="PWD">Person with Disability (PWD)</Option>
            <Option value="Solo Parent">Solo Parent</Option>
          </Select>
        </Form.Item>
        <Form.Item
          label="Certification Number"
          name="certification_number"
        >
          <Input placeholder="Enter certification number" />
        </Form.Item>

        {/* Contact Information */}
        <Title level={4}>Contact Information</Title>
        <Form.Item
          label="Contact Number"
          name="contact_number"
          rules={[{ required: true, message: 'Please enter the contact number' }]}
        >
          <Input placeholder="Enter contact number" />
        </Form.Item>
        <Form.Item
          label="Email Address"
          name="email_address"
          rules={[{ type: 'email', message: 'Please enter a valid email address' }]}
        >
          <Input placeholder="Enter email address" />
        </Form.Item>
        <Form.Item
          label="Street/Barangay"
          name="street_brgy"
        >
          <Input placeholder="Enter street and barangay" />
        </Form.Item>
        <Form.Item
          label="Municipality/City"
          name="municipality_city"
        >
          <Input placeholder="Enter municipality or city" />
        </Form.Item>
        <Form.Item
          label="Province"
          name="province"
        >
          <Input placeholder="Enter province" />
        </Form.Item>
        <Form.Item
          label="ZIP Code"
          name="zip_code"
        >
          <Input placeholder="Enter ZIP code" />
        </Form.Item>
        <Form.Item
          label="Congressional District"
          name="congressional_district"
        >
          <Input placeholder="Enter congressional district" />
        </Form.Item>

        {/* Institution Information */}
        <Title level={4}>Institution Information</Title>
        <Form.Item
          label="Name of Institution"
          name="name_of_institution"
          rules={[{ required: true, message: 'Please enter the name of the institution' }]}
        >
          <Input placeholder="Enter name of institution" />
        </Form.Item>
        <Form.Item
          label="UII"
          name="uii"
          rules={[{ required: true, message: 'Please enter the UII' }]}
        >
          <Input placeholder="Enter UII" />
        </Form.Item>
        <Form.Item
          label="Institutional Type"
          name="institutional_type"
          rules={[{ required: true, message: 'Please select the institutional type' }]}
        >
          <Select placeholder="Select institutional type">
            <Option value="Public">Public</Option>
            <Option value="Private">Private</Option>
          </Select>
        </Form.Item>
        <Form.Item
          label="Region"
          name="region"
          rules={[{ required: true, message: 'Please enter the region' }]}
        >
          <Input placeholder="Enter region" />
        </Form.Item>
        <Form.Item
          label="Degree Program"
          name="degree_program"
          rules={[{ required: true, message: 'Please enter the degree program' }]}
        >
          <Input placeholder="Enter degree program" />
        </Form.Item>
        <Form.Item
          label="Program Major"
          name="program_major"
        >
          <Input placeholder="Enter program major" />
        </Form.Item>
        <Form.Item
          label="Program Discipline"
          name="program_discipline"
        >
          <Input placeholder="Enter program discipline" />
        </Form.Item>
        <Form.Item
          label="Program Degree Level"
          name="program_degree_level"
          rules={[{ required: true, message: 'Please select the degree level' }]}
        >
          <Select placeholder="Select degree level">
            <Option value="Pre-baccalaureate">Pre-baccalaureate</Option>
            <Option value="Baccalaureate">Baccalaureate</Option>
            <Option value="Post Baccalaureate">Post Baccalaureate</Option>
            <Option value="Master's">Master's</Option>
            <Option value="Doctorate">Doctorate</Option>
          </Select>
        </Form.Item>

        {/* Scholarship Information */}
        <Title level={4}>Scholarship Information</Title>
        <Form.Item
          label="In-Charge"
          name="in_charge"
          rules={[{ required: true, message: 'Please enter the in-charge person' }]}
        >
          <Input placeholder="Enter in-charge person" />
        </Form.Item>
        <Form.Item
          label="Award Year"
          name="award_year"
          rules={[{ required: true, message: 'Please enter the award year' }]}
        >
          <Input placeholder="Enter award year" />
        </Form.Item>
        <Form.Item
          label="Scholarship Program"
          name="scholarship_program"
          rules={[{ required: true, message: 'Please select a scholarship program' }]}
        >
          <Select placeholder="Select scholarship program">
            <Option value="Program A">Program A</Option>
            <Option value="Program B">Program B</Option>
            <Option value="Program C">Program C</Option>
          </Select>
        </Form.Item>
        <Form.Item
          label="Award Number"
          name="award_number"
          rules={[{ required: true, message: 'Please enter the award number' }]}
        >
          <Input placeholder="Enter award number" />
        </Form.Item>
        <Form.Item
          label="Authority Type"
          name="authority_type"
          rules={[{ required: true, message: 'Please select the authority type' }]}
        >
          <Select placeholder="Select authority type">
            <Option value="GP">GP</Option>
            <Option value="GR">GR</Option>
            <Option value="RRPA">RRPA</Option>
            <Option value="COPC">COPC</Option>
          </Select>
        </Form.Item>
        <Form.Item
          label="Authority Number"
          name="authority_number"
          rules={[{ required: true, message: 'Please enter the authority number' }]}
        >
          <Input placeholder="Enter authority number" />
        </Form.Item>
        <Form.Item
          label="Series"
          name="series"
          rules={[{ required: true, message: 'Please enter the series' }]}
        >
          <Input placeholder="Enter series" />
        </Form.Item>
        <Form.Item
          label="Is Priority"
          name="is_priority"
          valuePropName="checked"
        >
          <Checkbox>Priority</Checkbox>
        </Form.Item>
        <Form.Item
          label="Basis (CMO)"
          name="basis_cmo"
        >
          <Input placeholder="Enter basis (CMO)" />
        </Form.Item>
        <Form.Item
          label="Scholarship Status"
          name="scholarship_status"
          rules={[{ required: true, message: 'Please select a scholarship status' }]}
        >
          <Select placeholder="Select scholarship status">
            <Option value="On-going">On-going</Option>
            <Option value="Graduated">Graduated</Option>
            <Option value="Terminated">Terminated</Option>
          </Select>
        </Form.Item>
        <Form.Item
          label="Replacement Info"
          name="replacement_info"
        >
          <Input placeholder="Enter replacement info" />
        </Form.Item>
        <Form.Item
          label="Termination Reason"
          name="termination_reason"
        >
          <Input placeholder="Enter termination reason" />
        </Form.Item>

        {/* Submit Button */}
        <Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Add Student
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
}