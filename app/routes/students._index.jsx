import { useEffect, useState } from 'react'
import { Typography, Table, Button, Input, Space, Select, Tag, message } from 'antd'
import { useNavigate } from 'react-router-dom'

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
  const navigate = useNavigate()

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/students')
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

  // Handle "Add Student" button click
  const handleAddStudent = () => {
    navigate('/students/create')
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
    applyFilters(value, statusFilter, programFilter, academicYearFilter, semesterFilter)
  }

  // Handle status filter
  const handleStatusChange = (value) => {
    setStatusFilter(value)
    applyFilters(searchValue, value, programFilter, academicYearFilter, semesterFilter)
  }

  // Handle program filter
  const handleProgramChange = (value) => {
    setProgramFilter(value)
    applyFilters(searchValue, statusFilter, value, academicYearFilter, semesterFilter)
  }

  // Handle academic year filter
  const handleAcademicYearChange = (value) => {
    setAcademicYearFilter(value)
    applyFilters(searchValue, statusFilter, programFilter, value, semesterFilter)
  }

  // Handle semester filter
  const handleSemesterChange = (value) => {
    setSemesterFilter(value)
    applyFilters(searchValue, statusFilter, programFilter, academicYearFilter, value)
  }

  // Apply filters and search
  const applyFilters = (search, status, program, academicYear, semester) => {
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

    setFilteredStudents(filtered)
  }

  // Get unique values for filters
  const scholarshipPrograms = [...new Set(students.map((s) => s.scholarship_program))].filter(Boolean)
  const academicYears = [...new Set(students.map((s) => s.academic_year))].filter(Boolean)
  const semesters = [...new Set(students.map((s) => s.semester))].filter(Boolean)

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Students</Title>
      <Space direction="vertical" style={{ width: '100%', marginBottom: '16px' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Space wrap>
            <Search
              placeholder="Search by name, program, award number, contact, or email"
              allowClear
              enterButton="Search"
              size="large"
              onSearch={handleSearch}
              style={{ width: 400 }}
            />
            <Select
              placeholder="Filter by Status"
              allowClear
              size="large"
              style={{ width: 150 }}
              onChange={handleStatusChange}
            >
              <Option value="On-going">On-going</Option>
              <Option value="Graduated">Graduated</Option>
              <Option value="Terminated">Terminated</Option>
            </Select>
            <Select
              placeholder="Filter by Program"
              allowClear
              size="large"
              style={{ width: 180 }}
              onChange={handleProgramChange}
            >
              {scholarshipPrograms.map((program) => (
                <Option key={program} value={program}>
                  {program}
                </Option>
              ))}
            </Select>
            <Select
              placeholder="Filter by Academic Year"
              allowClear
              size="large"
              style={{ width: 160 }}
              onChange={handleAcademicYearChange}
            >
              {academicYears.map((year) => (
                <Option key={year} value={year}>
                  {year}
                </Option>
              ))}
            </Select>
            <Select
              placeholder="Filter by Semester"
              allowClear
              size="large"
              style={{ width: 140 }}
              onChange={handleSemesterChange}
            >
              {semesters.map((sem) => (
                <Option key={sem} value={sem}>
                  {sem}
                </Option>
              ))}
            </Select>
          </Space>
          <Space>
            <Button
              type="default"
              size="large"
              style={{
                backgroundColor: '#fff',
                color: '#d32f2f',
                borderColor: '#d32f2f',
                fontWeight: 600,
              }}
            >
              Extract PDF
            </Button>
            <Button type="default" size="large" style={{ backgroundColor: '#52c41a', color: '#fff', borderColor: '#52c41a' }}>
              Add Bulk
            </Button>
            <Button type="primary" size="large" onClick={handleAddStudent}>
              Add Student
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
        pagination={true}
      />
    </div>
  )
}