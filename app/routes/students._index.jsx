import { useEffect, useState } from 'react'
import { Typography, Table, Button, Input, Space, Select, Tag, message, Popover, Modal, Card } from 'antd'
import { InfoCircleOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { UploadOutlined } from '@ant-design/icons'
import { api } from '../lib/api'

const { Title } = Typography
const { Search } = Input
const { Option } = Select

export function meta() {
  return [
    { title: 'Students | StuFAPs' },
    { name: 'description', content: 'Manage student records' },
  ]
}

export default function StudentsIndex() {
  const [students, setStudents] = useState([])
  const [filteredStudents, setFilteredStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [statusFilter, setStatusFilter] = useState(null)
  const [programFilter, setProgramFilter] = useState(null)
  const [academicYearFilter, setAcademicYearFilter] = useState(null)
  const [semesterFilter, setSemesterFilter] = useState(null)
  const [courseFilter, setCourseFilter] = useState(null)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 })
  const [modalVisible, setModalVisible] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const response = await api.get('/api/students')
      if (!response.ok) {
        throw new Error('Failed to fetch students')
      }
      const data = await response.json()
      console.log('Fetched data:', data) // Debug log
      const studentsData = Array.isArray(data) ? data : data.data || []
      setStudents(studentsData)
      setFilteredStudents(studentsData)
    } catch (error) {
      console.error('Error fetching students:', error)
      message.error('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  // Define table columns
  const columns = [
    {
      title: 'SEQ',
      key: 'seq',
      render: (_, __, index) => {
        const page = (pagination?.current || 1)
        const pageSize = (pagination?.pageSize || 10)
        return (page - 1) * pageSize + index + 1
      },
      width: 70,
      align: 'center',
    },
    {
      title: 'Full Name',
      key: 'full_name',
      render: (_, student) => {
        const parts = [
          student.surname,
          student.first_name,
          student.middle_name,
          student.extension,
        ].filter(Boolean)
        return parts.join(' ')
      },
    },
    {
      title: 'School',
      dataIndex: 'name_of_institution',
      key: 'name_of_institution',
      render: (text) => text || 'N/A',
    },
    {
      title: 'Degree Program',
      dataIndex: 'degree_program',
      key: 'degree_program',
    },
    {
      title: 'Scholarship Program',
      dataIndex: 'scholarship_program',
      key: 'scholarship_program',
    },
    {
      title: 'Award Number',
      dataIndex: 'award_number',
      key: 'award_number',
    },
    {
      title: 'Contact Number',
      dataIndex: 'contact_number',
      key: 'contact_number',
      render: (text) => text || 'N/A',
    },
    {
      title: 'Email Address',
      dataIndex: 'email_address',
      key: 'email_address',
      render: (text) => text || 'N/A',
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, student) => (
        <Tag color={getStatusColor(student.scholarship_status)}>
          {student.scholarship_status}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, student) => (
        <Button type="primary" onClick={() => handleViewMore(student)}>
          View More
        </Button>
      ),
    },
  ]

  // Handle "View More" button click
  const handleViewMore = (student) => {
    navigate(`/students/${student.seq}`) // Use `seq` as the unique identifier
  }

  // Log action function
  const logAction = async (model, modelId, action, oldData, newData) => {
    try {
      await api.post('/api/logs', {
        model,
        model_id: modelId,
        action,
        old_data: oldData,
        new_data: newData,
        ip_address: 'client',
      })
    } catch (error) {
      console.error('Failed to log action:', error)
    }
  }

  // Handle "Add Student" button click
  const handleAddStudent = async () => {
    // Log the navigation (logging will happen in the create page)
    navigate('/students/create')
  }

  // Handle "Add Bulk" button click
  const handleBulkAdd = () => {
    navigate('/students/bulk')
  }

  // Handle "Extract PDF" button click
  const handleExtractPDF = () => {
    navigate('/students/pdf')
  }

  // Get color for status
  const getStatusColor = (status) => {
    switch (status) {
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

  // Handle search
  const handleSearch = (value) => {
    setSearchValue(value)
    applyFilters(value, statusFilter, programFilter, academicYearFilter, semesterFilter, courseFilter)
  }

  // Handle status filter
  const handleStatusChange = (value) => {
    setStatusFilter(value)
    applyFilters(searchValue, value, programFilter, academicYearFilter, semesterFilter, courseFilter)
  }

  // Handle program filter
  const handleProgramChange = (value) => {
    setProgramFilter(value)
    applyFilters(searchValue, statusFilter, value, academicYearFilter, semesterFilter, courseFilter)
  }

  // Handle academic year filter
  const handleAcademicYearChange = (value) => {
    setAcademicYearFilter(value)
    applyFilters(searchValue, statusFilter, programFilter, value, semesterFilter, courseFilter)
  }

  // Handle semester filter
  const handleSemesterChange = (value) => {
    setSemesterFilter(value)
    applyFilters(searchValue, statusFilter, programFilter, academicYearFilter, value, courseFilter)
  }

  // Handle course filter
  const handleCourseChange = (value) => {
    setCourseFilter(value)
    applyFilters(searchValue, statusFilter, programFilter, academicYearFilter, semesterFilter, value)
  }

  // Apply filters and search
  const applyFilters = (search, status, program, academicYear, semester, course) => {
    let filtered = [...students]

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter((student) => {
        const fullName = `${student.surname} ${student.first_name} ${student.middle_name || ''} ${student.extension || ''}`.toLowerCase()
        const scholarshipProgram = (student.scholarship_program || '').toLowerCase()
        const awardNumber = (student.award_number || '').toLowerCase()
        const contactNumber = (student.contact_number || '').toLowerCase()
        const emailAddress = (student.email_address || '').toLowerCase()

        return (
          fullName.includes(searchLower) ||
          scholarshipProgram.includes(searchLower) ||
          awardNumber.includes(searchLower) ||
          contactNumber.includes(searchLower) ||
          emailAddress.includes(searchLower)
        )
      })
    }

    // Apply status filter
    if (status) {
      filtered = filtered.filter((student) => student.scholarship_status === status)
    }

    // Apply program filter
    if (program) {
      filtered = filtered.filter((student) => student.scholarship_program === program)
    }

    // Apply academic year filter
    if (academicYear) {
      filtered = filtered.filter((student) => student.academic_year === academicYear)
    }

    // Apply semester filter
    if (semester) {
      filtered = filtered.filter((student) => student.semester === semester)
    }

    // Apply course filter
    if (course) {
      filtered = filtered.filter((student) => student.degree_program === course)
    }

    setFilteredStudents(filtered)
  }

  // Get unique values for filters
  const scholarshipPrograms = [...new Set(students.map((s) => s.scholarship_program))].filter(Boolean)
  const academicYears = [...new Set(students.map((s) => s.academic_year))].filter(Boolean)
  const semesters = [...new Set(students.map((s) => s.semester))].filter(Boolean)

  const searchInstructions = (
    <div style={{ maxWidth: 300 }}>
      <b>Search Instructions:</b>
      <ul style={{ paddingLeft: 18 }}>
        <li>Type any part of a student's name, program, award number, contact, or email.</li>
        <li>The table will filter results as you search.</li>
        <li>You can combine search with other filters for precise results.</li>
      </ul>
    </div>
  )

  const [field, setField] = useState('degree_program')
  const [oldValue, setOldValue] = useState('')
  const [newValue, setNewValue] = useState('')

  const fieldOptions = [
    { label: 'Course Name', value: 'degree_program' },
    { label: 'Institution Name', value: 'name_of_institution' },
  ]

  const oldValues = [...new Set(students.map(s => s[field])).values()].filter(Boolean)

  // Update the handleSubmit for Bulk Edit to include logging
  const handleSubmit = async () => {
    if (!oldValue || !newValue) {
      message.error('Please select and enter all fields.')
      return
    }
    
    // Log the bulk edit action
    await logAction('Student', 0, 'update', { [field]: oldValue }, { [field]: newValue })
    
    const res = await api.post('/api/students/bulk-update-field', { field, old_value: oldValue, new_value: newValue })
    const data = await res.json()
    if (res.ok) {
      message.success(data.message)
      fetchStudents()
      setModalVisible(false)
      setOldValue('')
      setNewValue('')
    } else {
      message.error(data.error || 'Failed to update')
    }
  }

  const refreshStudents = () => {
    fetchStudents()
  }

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Students</Title>
      <Space direction="vertical" style={{ width: '100%', marginBottom: '16px' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Space wrap>
            <Popover content={searchInstructions} title="How to use Search" trigger="click">
              <Button
                icon={<InfoCircleOutlined />}
                size="middle"
                style={{ marginRight: 4, padding: 0, width: 32, height: 32, minWidth: 32 }}
                type="text"
              />
            </Popover>
            <Search
              placeholder="Search"
              allowClear
              enterButton="Search"
              size="middle"
              onSearch={handleSearch}
              style={{ width: 300 }}
            />
            <Select
              placeholder="Status"
              allowClear
              size="middle"
              style={{ width: 120 }}
              onChange={handleStatusChange}
            >
              <Option value="On-going">On-going</Option>
              <Option value="Graduated">Graduated</Option>
              <Option value="Terminated">Terminated</Option>
            </Select>
            <Select
              placeholder="Program"
              allowClear
              size="middle"
              style={{ width: 150 }}
              onChange={handleProgramChange}
            >
              {scholarshipPrograms.map((program) => (
                <Option key={program} value={program}>
                  {program}
                </Option>
              ))}
            </Select>
            <Select
              placeholder="Academic Year"
              allowClear
              size="middle"
              style={{ width: 130 }}
              onChange={handleAcademicYearChange}
            >
              {academicYears.map((year) => (
                <Option key={year} value={year}>
                  {year}
                </Option>
              ))}
            </Select>
            <Select
              placeholder="Semester"
              allowClear
              size="middle"
              style={{ width: 110 }}
              onChange={handleSemesterChange}
            >
              {semesters.map((sem) => (
                <Option key={sem} value={sem}>
                  {sem}
                </Option>
              ))}
            </Select>
            <Select
              placeholder="Course"
              allowClear
              size="middle"
              style={{ width: 150 }}
              onChange={handleCourseChange}
            >
              {[...new Set(students.map((s) => s.degree_program))].filter(Boolean).map((course) => (
                <Option key={course} value={course}>
                  {course}
                </Option>
              ))}
            </Select>
          </Space>
          <Space>
            <Button
              type="default"
              size="middle"
              style={{
                backgroundColor: '#fff',
                color: '#d32f2f',
                borderColor: '#d32f2f',
                fontWeight: 600,
                width: 120,
              }}
              onClick={handleExtractPDF}
            >
              Extract PDF
            </Button>

            <Button
              type="primary"
              size="middle"
              style={{ width: 120 }}
              onClick={handleAddStudent}
            >
              Add Student
            </Button>
            <Button
              type="default"
              size="middle"
              style={{ width: 120 }}
              onClick={() => setModalVisible(true)}
            >
              Bulk Edit
            </Button>
          </Space>
        </Space>
      </Space>
      <Table
        bordered
        loading={loading}
        dataSource={filteredStudents}
        columns={columns}
        rowKey="seq"
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: filteredStudents.length,
          onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
        }}
      />
      <Modal open={modalVisible} onCancel={() => setModalVisible(false)} onOk={handleSubmit} title="Bulk Edit">
        <Select value={field} onChange={setField} style={{ width: '100%', marginBottom: 12 }}>
          {fieldOptions.map(opt => <Option key={opt.value} value={opt.value}>{opt.label}</Option>)}
        </Select>
        <Select
          value={oldValue}
          onChange={setOldValue}
          style={{ width: '100%', marginBottom: 12 }}
          placeholder="Select value to replace"
        >
          {oldValues.map(val => <Option key={val} value={val}>{val}</Option>)}
        </Select>
        <Input
          value={newValue}
          onChange={e => setNewValue(e.target.value)}
          placeholder="Enter new value"
        />
      </Modal>
      <Card
        styles={{
          body: { padding: 16 },
          header: { padding: '12px 16px' },
        }}
      >
        Content
      </Card>
    </div>
  )
}