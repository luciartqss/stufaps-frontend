import React, { useEffect, useRef, useState } from 'react'
import { Card, Typography, Space, Row, Col, Avatar, Spin, Modal, Button, Input, Popconfirm, message, Select, Upload, Tabs } from 'antd'
import {
    InfoCircleOutlined,
    ProjectOutlined,
    GiftOutlined,
    UserOutlined,
    TeamOutlined,
    AuditOutlined,
    CheckCircleOutlined,
    BulbOutlined,
    SafetyOutlined,
    MailOutlined,
    FileOutlined,
    EditOutlined,
    DeleteOutlined,
    PlusOutlined,
    CameraOutlined,
} from '@ant-design/icons'
import { API_BASE } from '../lib/config'
import { useAuth } from '../lib/AuthContext'
import { useRealtime } from '../lib/useRealtime'

const { Text, Title } = Typography

export function meta() {
    return [
        { title: 'About STUFAPS | Student Financial Aid Processing System' },
        { name: 'description', content: 'Learn about STUFAPS - Student Financial Aid Processing System' },
    ]
}

// Simple error boundary local to this route to prevent full-page whiteouts
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, info) {
        // eslint-disable-next-line no-console
        console.error('Error in AboutUs route:', error, info)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 24 }}>
                    <Title level={3} style={{ color: '#d93025' }}>An error occurred while rendering this page</Title>
                    <Text style={{ display: 'block', marginTop: 12, color: '#6b7280' }}>{String(this.state.error)}</Text>
                </div>
            )
        }

        return this.props.children
    }
}

export default function AboutUs() {
    const { getAccess } = useAuth()
    const canEdit = getAccess('about_us') === 'full'
    const [teamLeaders, setTeamLeaders] = useState([])
    const [teamMembers, setTeamMembers] = useState([])
    const [teamInterns, setTeamInterns] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [refreshTrigger, setRefreshTrigger] = useState(0)
    const [selectedPerson, setSelectedPerson] = useState(null)
    const [modalOpen, setModalOpen] = useState(false)
    const [editModalOpen, setEditModalOpen] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [editedEmployee, setEditedEmployee] = useState(null)
    const [addModalOpen, setAddModalOpen] = useState(false)
    const [addStep, setAddStep] = useState('role') // 'role' or 'details'
    const [selectedRoleForAdd, setSelectedRoleForAdd] = useState(null)
    const [newEmployee, setNewEmployee] = useState({
        fname: '',
        middle_initial: '',
        last_name: '',
        name_extension: '',
        email: '',
        position: '',
        role: '',
        profile_picture: '',
    })

    const silentRef = useRef(false)

    useEffect(() => {
        if (!silentRef.current) {
            setLoading(true)
            setError(null)
        }

        // Debug log
        console.log('API_BASE:', API_BASE)
        console.log('Fetching employees from:', `${API_BASE}/employees`)

        if (!API_BASE) {
            console.warn('API_BASE is not defined!')
            setError('API configuration missing')
            setLoading(false)
            return
        }

        fetch(`${API_BASE}/employees`)
            .then(res => {
                console.log('Employees fetch response status:', res.status)
                if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch employees`)
                return res.json()
            })
            .then(data => {
                console.log('Employees data received:', data)
                const employees = Array.isArray(data) ? data : (data?.data || [])
                const teamLeaderList = employees.filter(emp => emp.role === 'Team Leader')
                const teamMemberList = employees.filter(emp => emp.role === 'Team Member')
                const teamInternList = employees.filter(emp => emp.role === 'Intern')
                setTeamLeaders(teamLeaderList)
                setTeamMembers(teamMemberList)
                setTeamInterns(teamInternList)
                setLoading(false)
                silentRef.current = false
            })
            .catch(err => {
                console.error('Error fetching employees:', err)
                if (!silentRef.current) setError(err.message)
                setLoading(false)
                silentRef.current = false
            })
    }, [refreshTrigger])

    useRealtime('Employee', () => {
        silentRef.current = true
        setRefreshTrigger(prev => prev + 1)
    })

    const handleEditClick = (employee) => {
        setSelectedPerson(employee)
        setEditedEmployee({ ...employee })
        setEditModalOpen(true)
        setIsEditMode(false)
    }

    const handleEnterEditMode = () => {
        setIsEditMode(true)
    }

    const handleCancelEdit = () => {
        setIsEditMode(false)
        setEditedEmployee({ ...selectedPerson })
    }

    const handleSaveEdit = async () => {
        try {
            const response = await fetch(`${API_BASE}/employees/${editedEmployee.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(editedEmployee),
            })

            if (!response.ok) throw new Error('Failed to update employee')

            // Update the employee in the lists
            const updatedTeamLeaders = teamLeaders.map(l => l.id === editedEmployee.id ? editedEmployee : l)
            const updatedTeamMembers = teamMembers.map(m => m.id === editedEmployee.id ? editedEmployee : m)
            const updatedTeamInterns = teamInterns.map(i => i.id === editedEmployee.id ? editedEmployee : i)
            setTeamLeaders(updatedTeamLeaders)
            setTeamMembers(updatedTeamMembers)
            setTeamInterns(updatedTeamInterns)
            setSelectedPerson(editedEmployee)
            setIsEditMode(false)
            message.success('Employee updated successfully')
        } catch (err) {
            console.error('Error updating employee:', err)
            message.error('Failed to update employee')
        }
    }

    const handleDeleteEmployee = async () => {
        try {
            const response = await fetch(`${API_BASE}/employees/${selectedPerson.id}`, {
                method: 'DELETE',
            })

            if (!response.ok) throw new Error('Failed to delete employee')

            // Remove from lists
            const updatedTeamLeaders = teamLeaders.filter(l => l.id !== selectedPerson.id)
            const updatedTeamMembers = teamMembers.filter(m => m.id !== selectedPerson.id)
            const updatedTeamInterns = teamInterns.filter(i => i.id !== selectedPerson.id)
            setTeamLeaders(updatedTeamLeaders)
            setTeamMembers(updatedTeamMembers)
            setTeamInterns(updatedTeamInterns)
            setEditModalOpen(false)
            setSelectedPerson(null)
            message.success('Employee deleted successfully')
        } catch (err) {
            console.error('Error deleting employee:', err)
            message.error('Failed to delete employee')
        }
    }

    const handleAddEmployee = async () => {
        try {
            if (!newEmployee.fname || !newEmployee.last_name || !newEmployee.email || !newEmployee.position || !selectedRoleForAdd) {
                message.error('Please fill in all required fields')
                return
            }

            const employeeData = {
                ...newEmployee,
                role: selectedRoleForAdd,
            }

            const response = await fetch(`${API_BASE}/employees`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(employeeData),
            })

            if (!response.ok) throw new Error('Failed to create employee')

            const createdEmployee = await response.json()

            // Add to appropriate list based on employee's role
            if (createdEmployee.role === 'Team Leader') {
                setTeamLeaders([...teamLeaders, createdEmployee])
            } else if (createdEmployee.role === 'Team Member') {
                setTeamMembers([...teamMembers, createdEmployee])
            } else if (createdEmployee.role === 'Intern') {
                setTeamInterns([...teamInterns, createdEmployee])
            }

            setAddModalOpen(false)
            setAddStep('role')
            setSelectedRoleForAdd(null)
            setNewEmployee({
                fname: '',
                middle_initial: '',
                last_name: '',
                name_extension: '',
                email: '',
                position: '',
                role: '',
            })
            message.success('Employee added successfully')
        } catch (err) {
            console.error('Error adding employee:', err)
            message.error('Failed to add employee')
        }
    }

    const handleCancelAdd = () => {
        setAddModalOpen(false)
        setAddStep('role')
        setSelectedRoleForAdd(null)
        setNewEmployee({
            fname: '',
            middle_initial: '',
            last_name: '',
            name_extension: '',
            email: '',
            position: '',
            role: '',
            profile_picture: '',
        })
    }

    const handleProfilePictureUpload = (file, isEdit = false) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const base64String = e.target.result
            if (isEdit) {
                setEditedEmployee({ ...editedEmployee, profile_picture: base64String })
            } else {
                setNewEmployee({ ...newEmployee, profile_picture: base64String })
            }
        }
        reader.readAsDataURL(file)
        return false // Prevent default upload behavior
    }

    return (
        <ErrorBoundary>
            <div style={{ background: '#fff', margin: -24, minHeight: 'calc(100vh - 72px)' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid #e8eaed', backgroundColor: '#fff' }}>
                    <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                        About STUFAPS
                    </Title>
                    <Text style={{ color: '#6b7280', fontSize: 16 }}>
                        Student Financial Assistance Program
                    </Text>
                </div>

                {/* Purpose Section */}
                <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed', background: '#fff' }}>
                    <Space size={12} align="start">
                        <InfoCircleOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
                        <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                            Our Purpose
                        </Title>
                    </Space>
                    <Text style={{ display: 'block', marginTop: 8, color: '#6b7280', fontSize: 16 }}>
                        STUFAPS exists to help educational institutions manage and distribute scholarships and financial aid to students
                        fairly and efficiently. We understand that finances can be a barrier to education, and our system is designed to
                        make the process of awarding and tracking aid simpler for administrators and more transparent for students.
                    </Text>
                    <Text style={{ display: 'block', marginTop: 12, color: '#6b7280', fontSize: 16 }}>
                        By streamlining how institutions handle scholarships and disbursements, we help ensure that deserving students
                        receive the support they need to pursue their education.
                    </Text>
                </div>

                {/* VISION Section */}
                <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed', background: '#fff' }}>
                    <Space size={12} align="start">
                        <ProjectOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
                        <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                            Vision
                        </Title>
                    </Space>
                    <Text style={{ display: 'block', marginTop: 8, color: '#6b7280', fontSize: 16 }}>
                        Philippine higher education system that is equitable and producing locally responsive, innovative, and globally competitive graduates and lifelong learners.
                    </Text>
                </div>

                {/* MISSION Section */}
                <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed', background: '#fff' }}>
                    <Space size={12} align="start">
                        <BulbOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
                        <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                            Mission
                        </Title>
                    </Space>
                    <Text style={{ display: 'block', marginTop: 8, color: '#6b7280', fontSize: 16 }}>
                        To promote equitable access and ensure quality and relevance of higher education institutions and their programs.
                    </Text>
                </div>

                {/* QUALITY POLICY Section */}
                <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed', background: '#fff' }}>
                    <Space size={12} align="start">
                        <SafetyOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
                        <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                            Quality Policy
                        </Title>
                    </Space>
                    <Text style={{ display: 'block', marginTop: 12, color: '#6b7280', fontSize: 16, fontWeight: 600 }}>
                        We, at the Commission on Higher Education (CHED), shall lead the Philippine higher education sector to:
                    </Text>
                    <Typography style={{ marginTop: 8, color: '#6b7280', fontSize: 16 }}>
                        <ul className="list-disc" style={{ paddingLeft: 20 }}>
                            <li style={{ marginBottom: 12 }}>
                                Cultivate an equitable and sustainable higher education landscape that produces locally responsive, innovative, globally competitive graduates, and lifelong learners;
                            </li>
                            <li style={{ marginBottom: 12 }}>
                                Harmonize mandates to promote inclusive access to higher education, ensure sustainable quality assurance of programs, and assert relevance of institutions;
                            </li>
                            <li style={{ marginBottom: 12 }}>
                                Exemplify resilience and humility in service, integrity, excellence, and development-driven mindset; and,
                            </li>
                            <li style={{ marginBottom: 12 }}>
                                Demonstrate commitment to fulfill statutory and regulatory requirements to maintain and achieve continual improvement in our Quality Management System to achieve our vision.
                            </li>
                        </ul>

                        <br />

                        <p>The Commission on Higher Education Regional Office IV (CHEDRO IV) commits to uphold equitable, inclusive, and quality higher education through effective and efficient service.</p>

                        <br />

                        <p>CHEDRO IV shall strictly adhere to laws, policies, and mandates to deliver services to its stakeholders with accountability, integrity, and excellence.</p>

                        <br />

                        <p>CHEDRO IV proactively adopts continual improvement in all its procedures, processes, and systems to achieve its vision.</p>

                    </Typography>
                </div>

                {/* Stufaps UNIT team Section */}
                <div style={{ padding: '12px 24px 24px', background: '#fff' }}>
                    <Space size={12} align="start" style={{ width: '100%' }}>
                        <TeamOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
                        <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                            Meet the Team
                        </Title>
                    </Space>
                    <br /> <br />
                    {canEdit && (<>
                        <Button
                            type="primary"
                            icon={<EditOutlined />}
                            onClick={() => {
                                setSelectedPerson(null)
                                setEditModalOpen(true)
                                setIsEditMode(false)
                            }}
                        >
                            Edit Employees
                        </Button>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => {
                                setAddModalOpen(true)
                                setAddStep('role')
                            }}
                            style={{ marginLeft: 8 }}
                        >
                            Add Employee
                        </Button>
                    </>)}

                    {/* Loading State */}
                    {loading && (
                        <div style={{ marginTop: 32, textAlign: 'center' }}>
                            <Spin size="large" tip="Loading team information..." />
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div style={{ marginTop: 32, padding: 16, backgroundColor: '#fff7e6', borderLeft: '4px solid #faad14', borderRadius: 4 }}>
                            <Text style={{ color: '#ad6800', fontSize: 14 }}>
                                Unable to load team information: {error}
                            </Text>
                        </div>
                    )}

                    {/* Team Leaders Section */}
                    {!loading && !error && (
                        <div style={{ marginTop: 10, borderBottom: '1px solid #e8eaed', paddingTop: 24, paddingBottom: 24 }}>
                            <Title level={4} style={{ color: '#1a1a1a', fontWeight: 600, marginBottom: 16 }}>
                                Team Leaders
                            </Title>

                            {teamLeaders.length > 0 ? (
                                <Row gutter={[24, 24]} justify="center" style={{ marginBottom: 32, paddingLeft: 24, paddingRight: 24 }}>
                                    {teamLeaders.map((leader) => (
                                        <Col key={leader.id || leader.email || leader.fname} xs={24} sm={12} md={8}>
                                            <Card
                                                bordered={false}
                                                style={{
                                                    textAlign: 'center',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                                    borderRadius: 0

                                                }}
                                                bodyStyle={{ padding: 16 }}
                                            >
                                                <div style={{ marginBottom: 12 }}>
                                                    <Avatar
                                                        size={80}
                                                        shape="square"
                                                        src={leader.profile_picture}
                                                        icon={<UserOutlined />}
                                                        style={{ backgroundColor: '#1890ff' }}
                                                    />
                                                </div>
                                                <Text strong style={{ display: 'block', fontSize: 16, color: '#1a1a1a', marginBottom: 4 }}>
                                                    {leader.fname}{leader.middle_initial && ' ' + leader.middle_initial + '.'} {leader.last_name}{leader.name_extension && ' ' + leader.name_extension}
                                                </Text>
                                                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                                    <Text style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#6b7280', fontSize: 14 }}>
                                                        <FileOutlined />
                                                        {leader.position}
                                                    </Text>
                                                    <Text style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#6b7280', fontSize: 13 }}>
                                                        <MailOutlined />
                                                        {leader.email}
                                                    </Text>
                                                </Space>
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>
                            ) : (
                                <Text style={{ display: 'block', color: '#6b7280', padding: '20px 0' }}>No team leaders found.</Text>
                            )}
                        </div>
                    )}

                    {/* Team Members Section */}
                    {!loading && !error && (
                        <div style={{ marginTop: 32, paddingTop: 24, paddingBottom: 24 }}>
                            <Title level={4} style={{ color: '#1a1a1a', fontWeight: 600, marginBottom: 16 }}>
                                Team Members
                            </Title>
                            {teamMembers.length > 0 ? (
                                <Row gutter={[24, 24]} justify="center" style={{ paddingLeft: 24, paddingRight: 24 }}>
                                    {teamMembers.map((member) => (
                                        <Col key={member.id} xs={24} sm={12} md={8}>
                                            <Card
                                                bordered={false}
                                                style={{
                                                    textAlign: 'center',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                                    borderRadius: 0,
                                                }}
                                                bodyStyle={{ padding: 16 }}
                                            >
                                                <div style={{ marginBottom: 12 }}>
                                                    <Avatar
                                                        size={80}
                                                        shape="square"
                                                        src={member.profile_picture}
                                                        icon={<UserOutlined />}
                                                        style={{ backgroundColor: '#52c41a' }}
                                                    />
                                                </div>
                                                <Text strong style={{ display: 'block', fontSize: 16, color: '#1a1a1a', marginBottom: 4 }}>
                                                    {member.fname}{member.middle_initial && ' ' + member.middle_initial + '.'} {member.last_name}{member.name_extension && ' ' + member.name_extension}
                                                </Text>
                                                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                                    <Text style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#6b7280', fontSize: 14 }}>
                                                        <FileOutlined />
                                                        {member.position}
                                                    </Text>
                                                    <Text style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#6b7280', fontSize: 13 }}>
                                                        <MailOutlined />
                                                        {member.email}
                                                    </Text>
                                                </Space>
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>
                            ) : (
                                <Text style={{ display: 'block', color: '#6b7280', padding: '20px 0' }}>No team members found yet.</Text>
                            )}
                        </div>
                    )}

                    {/* team Interns */}
                    {!loading && !error && (
                        <div style={{ marginTop: 32, paddingTop: 24, paddingBottom: 24 }}>
                            <Title level={4} style={{ color: '#1a1a1a', fontWeight: 600, marginBottom: 16 }}>
                                Interns
                            </Title>
                            {teamInterns.length > 0 ? (
                                <Row gutter={[24, 24]} justify="center" style={{ paddingLeft: 24, paddingRight: 24 }}>
                                    {teamInterns.map((intern) => (
                                        <Col key={intern.id} xs={24} sm={12} md={8}>
                                            <Card
                                                bordered={false}
                                                style={{
                                                    textAlign: 'center',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                                    borderRadius: 0
                                                }}
                                                bodyStyle={{ padding: 16 }}
                                            >
                                                <div style={{ marginBottom: 12 }}>
                                                    <Avatar
                                                        size={80}
                                                        shape="square"
                                                        src={intern.profile_picture}
                                                        icon={<UserOutlined />}
                                                        style={{ backgroundColor: '#faad14' }}
                                                    />
                                                </div>
                                                <Text strong style={{ display: 'block', fontSize: 16, color: '#1a1a1a', marginBottom: 4 }}>
                                                    {intern.fname}{intern.middle_initial && ' ' + intern.middle_initial + '.'} {intern.last_name}{intern.name_extension && ' ' + intern.name_extension}
                                                </Text>
                                                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                                    <Text style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#6b7280', fontSize: 14 }}>
                                                        <FileOutlined />
                                                        {intern.position}
                                                    </Text>
                                                    <Text style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#6b7280', fontSize: 13 }}>
                                                        <MailOutlined />
                                                        {intern.email}
                                                    </Text>
                                                </Space>
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>
                            ) : (
                                <Text style={{ display: 'block', color: '#6b7280', padding: '20px 0' }}>No interns found yet.</Text>
                            )}
                        </div>
                    )}

                    {/* Edit Employee Modal */}
                    <Modal
                        title={selectedPerson ? "Employee Details" : "Select Employee to Edit"}
                        open={editModalOpen}
                        onCancel={() => {
                            setEditModalOpen(false)
                            setSelectedPerson(null)
                            setIsEditMode(false)
                        }}
                        footer={null}
                        width={600}
                    >
                        {!selectedPerson ? (
                            <div>
                                <Text style={{ marginBottom: 16, display: 'block' }}>Select an employee to edit:</Text>
                                <Tabs
                                    style={{ width: '100%' }}
                                    items={[
                                        {
                                            key: 'leaders',
                                            label: `Team Leaders (${teamLeaders.length})`,
                                            children: teamLeaders.length > 0 ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                    {teamLeaders.map((employee) => (
                                                        <Button
                                                            key={employee.id}
                                                            onClick={() => {
                                                                setSelectedPerson(employee)
                                                                setEditedEmployee({ ...employee })
                                                            }}
                                                            style={{ justifyContent: 'flex-start', height: 'auto', padding: '12px' }}
                                                        >
                                                            <div style={{ textAlign: 'left', width: '100%' }}>
                                                                <div style={{ fontWeight: 600 }}>
                                                                    {employee.fname}{employee.middle_initial && ' ' + employee.middle_initial + '.'} {employee.last_name}{employee.name_extension && ' ' + employee.name_extension}
                                                                </div>
                                                                <div style={{ fontSize: 12, color: '#6b7280' }}>{employee.position}</div>
                                                            </div>
                                                        </Button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <Text style={{ color: '#6b7280' }}>No team leaders found.</Text>
                                            ),
                                        },
                                        {
                                            key: 'members',
                                            label: `Team Members (${teamMembers.length})`,
                                            children: teamMembers.length > 0 ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                    {teamMembers.map((employee) => (
                                                        <Button
                                                            key={employee.id}
                                                            onClick={() => {
                                                                setSelectedPerson(employee)
                                                                setEditedEmployee({ ...employee })
                                                            }}
                                                            style={{ justifyContent: 'flex-start', height: 'auto', padding: '12px' }}
                                                        >
                                                            <div style={{ textAlign: 'left', width: '100%' }}>
                                                                <div style={{ fontWeight: 600 }}>
                                                                    {employee.fname}{employee.middle_initial && ' ' + employee.middle_initial + '.'} {employee.last_name}{employee.name_extension && ' ' + employee.name_extension}
                                                                </div>
                                                                <div style={{ fontSize: 12, color: '#6b7280' }}>{employee.position}</div>
                                                            </div>
                                                        </Button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <Text style={{ color: '#6b7280' }}>No team members found.</Text>
                                            ),
                                        },
                                        {
                                            key: 'interns',
                                            label: `Interns (${teamInterns.length})`,
                                            children: teamInterns.length > 0 ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                    {teamInterns.map((employee) => (
                                                        <Button
                                                            key={employee.id}
                                                            onClick={() => {
                                                                setSelectedPerson(employee)
                                                                setEditedEmployee({ ...employee })
                                                            }}
                                                            style={{ justifyContent: 'flex-start', height: 'auto', padding: '12px' }}
                                                        >
                                                            <div style={{ textAlign: 'left', width: '100%' }}>
                                                                <div style={{ fontWeight: 600 }}>
                                                                    {employee.fname}{employee.middle_initial && ' ' + employee.middle_initial + '.'} {employee.last_name}{employee.name_extension && ' ' + employee.name_extension}
                                                                </div>
                                                                <div style={{ fontSize: 12, color: '#6b7280' }}>{employee.position}</div>
                                                            </div>
                                                        </Button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <Text style={{ color: '#6b7280' }}>No interns found.</Text>
                                            ),
                                        },
                                    ]}
                                />
                            </div>
                        ) : selectedPerson && (
                            <div>
                                {!isEditMode ? (
                                    <div>
                                        <Button
                                            onClick={() => {
                                                setSelectedPerson(null)
                                                setEditedEmployee(null)
                                                setIsEditMode(false)
                                            }}
                                            style={{ marginBottom: 16 }}
                                        >
                                            ← Back to Employees
                                        </Button>
                                        <div style={{ marginBottom: 20, textAlign: 'center' }}>
                                            <Avatar
                                                size={100}
                                                shape="square"
                                                src={selectedPerson.profile_picture}
                                                icon={<UserOutlined />}
                                                style={{ backgroundColor: '#1890ff' }}
                                            />
                                        </div>
                                        <div style={{ marginBottom: 16 }}>
                                            <Text strong style={{ fontSize: 14 }}>First Name:</Text>
                                            <Text style={{ display: 'block', fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
                                                {selectedPerson.fname}
                                            </Text>
                                        </div>
                                        <div style={{ marginBottom: 16 }}>
                                            <Text strong style={{ fontSize: 14 }}>Middle Initial:</Text>
                                            <Text style={{ display: 'block', fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
                                                {selectedPerson.middle_initial || 'N/A'}
                                            </Text>
                                        </div>
                                        <div style={{ marginBottom: 16 }}>
                                            <Text strong style={{ fontSize: 14 }}>Last Name:</Text>
                                            <Text style={{ display: 'block', fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
                                                {selectedPerson.last_name}
                                            </Text>
                                        </div>
                                        <div style={{ marginBottom: 16 }}>
                                            <Text strong style={{ fontSize: 14 }}>Name Extension:</Text>
                                            <Text style={{ display: 'block', fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
                                                {selectedPerson.name_extension || 'N/A'}
                                            </Text>
                                        </div>
                                        <div style={{ marginBottom: 16 }}>
                                            <Text strong style={{ fontSize: 14 }}>Email:</Text>
                                            <Text style={{ display: 'block', fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
                                                {selectedPerson.email}
                                            </Text>
                                        </div>
                                        <div style={{ marginBottom: 16 }}>
                                            <Text strong style={{ fontSize: 14 }}>Position:</Text>
                                            <Text style={{ display: 'block', fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
                                                {selectedPerson.position}
                                            </Text>
                                        </div>
                                        <Space style={{ width: '100%', marginTop: 24, gap: 8 }}>
                                            {canEdit && (<>
                                                <Button
                                                    type="primary"
                                                    icon={<EditOutlined />}
                                                    onClick={handleEnterEditMode}
                                                    style={{ flex: 1 }}
                                                >
                                                    Edit
                                                </Button>
                                                <Popconfirm
                                                    title="Delete Employee"
                                                    description="Are you sure you want to delete this employee?"
                                                    onConfirm={handleDeleteEmployee}
                                                    okText="Yes"
                                                    cancelText="No"
                                                >
                                                    <Button
                                                        danger
                                                        icon={<DeleteOutlined />}
                                                        style={{ flex: 1 }}
                                                    >
                                                        Delete
                                                    </Button>
                                                </Popconfirm>
                                            </>)}
                                        </Space>
                                    </div>
                                ) : (
                                    <div>
                                        <Button
                                            onClick={handleCancelEdit}
                                            style={{ marginBottom: 16 }}
                                        >
                                            ← Back to View
                                        </Button>
                                        <div style={{ marginBottom: 20, textAlign: 'center', position: 'relative' }}>
                                            <Avatar
                                                size={100}
                                                shape="square"
                                                src={editedEmployee.profile_picture}
                                                icon={<UserOutlined />}
                                                style={{ backgroundColor: '#1890ff' }}
                                            />
                                            <Upload
                                                beforeUpload={(file) => handleProfilePictureUpload(file, true)}
                                                showUploadList={false}
                                                accept="image/*"
                                            >
                                                <Button
                                                    type="primary"
                                                    size="small"
                                                    icon={<CameraOutlined />}
                                                    style={{
                                                        position: 'absolute',
                                                        bottom: 0,
                                                        right: 0,
                                                        borderRadius: '50%',
                                                    }}
                                                >
                                                    Change
                                                </Button>
                                            </Upload>
                                        </div>
                                        <div style={{ marginBottom: 16 }}>
                                            <Text strong style={{ fontSize: 14 }}>First Name:</Text>
                                            <Input
                                                value={editedEmployee.fname}
                                                onChange={(e) => setEditedEmployee({ ...editedEmployee, fname: e.target.value })}
                                                style={{ marginTop: 4 }}
                                            />
                                        </div>
                                        <div style={{ marginBottom: 16 }}>
                                            <Text strong style={{ fontSize: 14 }}>Middle Initial:</Text>
                                            <Input
                                                value={editedEmployee.middle_initial || ''}
                                                onChange={(e) => setEditedEmployee({ ...editedEmployee, middle_initial: e.target.value })}
                                                style={{ marginTop: 4 }}
                                                maxLength={2}
                                            />
                                        </div>
                                        <div style={{ marginBottom: 16 }}>
                                            <Text strong style={{ fontSize: 14 }}>Last Name:</Text>
                                            <Input
                                                value={editedEmployee.last_name}
                                                onChange={(e) => setEditedEmployee({ ...editedEmployee, last_name: e.target.value })}
                                                style={{ marginTop: 4 }}
                                            />
                                        </div>
                                        <div style={{ marginBottom: 16 }}>
                                            <Text strong style={{ fontSize: 14 }}>Name Extension:</Text>
                                            <Input
                                                value={editedEmployee.name_extension || ''}
                                                onChange={(e) => setEditedEmployee({ ...editedEmployee, name_extension: e.target.value })}
                                                style={{ marginTop: 4 }}
                                            />
                                        </div>
                                        <div style={{ marginBottom: 16 }}>
                                            <Text strong style={{ fontSize: 14 }}>Email:</Text>
                                            <Input
                                                type="email"
                                                value={editedEmployee.email}
                                                onChange={(e) => setEditedEmployee({ ...editedEmployee, email: e.target.value })}
                                                style={{ marginTop: 4 }}
                                            />
                                        </div>
                                        <div style={{ marginBottom: 16 }}>
                                            <Text strong style={{ fontSize: 14 }}>Position:</Text>
                                            <Input
                                                value={editedEmployee.position}
                                                onChange={(e) => setEditedEmployee({ ...editedEmployee, position: e.target.value })}
                                                style={{ marginTop: 4 }}
                                            />
                                        </div>
                                        <Space style={{ width: '100%', marginTop: 24, gap: 8 }}>
                                            <Button
                                                type="primary"
                                                onClick={handleSaveEdit}
                                                style={{ flex: 1 }}
                                            >
                                                Save
                                            </Button>
                                            <Button
                                                onClick={handleCancelEdit}
                                                style={{ flex: 1 }}
                                            >
                                                Cancel
                                            </Button>
                                        </Space>
                                    </div>
                                )}
                            </div>
                        )}
                    </Modal>

                    {/* Add Employee Modal */}
                    <Modal
                        title={addStep === 'role' ? 'Add New Employee - Select Role' : 'Add New Employee - Enter Details'}
                        open={addModalOpen}
                        onCancel={handleCancelAdd}
                        footer={null}
                        width={600}
                    >
                        {addStep === 'role' ? (
                            <div>
                                <Text style={{ marginBottom: 16, display: 'block' }}>Select the role for the new employee:</Text>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <Button
                                        onClick={() => {
                                            setSelectedRoleForAdd('Team Leader')
                                            setAddStep('details')
                                        }}
                                        size="large"
                                        style={{ height: 50, textAlign: 'left' }}
                                    >
                                        Team Leader
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setSelectedRoleForAdd('Team Member')
                                            setAddStep('details')
                                        }}
                                        size="large"
                                        style={{ height: 50, textAlign: 'left' }}
                                    >
                                        Team Member
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setSelectedRoleForAdd('Intern')
                                            setAddStep('details')
                                        }}
                                        size="large"
                                        style={{ height: 50, textAlign: 'left' }}
                                    >
                                        Intern
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <Button
                                    onClick={() => {
                                        setAddStep('role')
                                        setNewEmployee({
                                            fname: '',
                                            middle_initial: '',
                                            last_name: '',
                                            name_extension: '',
                                            email: '',
                                            position: '',
                                            role: '',
                                            profile_picture: '',
                                        })
                                    }}
                                    style={{ marginBottom: 16 }}
                                >
                                    ← Back to Role Selection
                                </Button>
                                <div style={{ marginBottom: 20, textAlign: 'center' }}>
                                    <Avatar
                                        size={100}
                                        shape="square"
                                        src={newEmployee.profile_picture}
                                        icon={<UserOutlined />}
                                        style={{ backgroundColor: '#1890ff' }}
                                    />
                                    <br />
                                    <Upload
                                        beforeUpload={(file) => handleProfilePictureUpload(file, false)}
                                        showUploadList={false}
                                        accept="image/*"
                                    >
                                        <Button
                                            type="primary"
                                            icon={<CameraOutlined />}
                                            style={{ marginTop: 8 }}
                                        >
                                            Upload Profile Picture
                                        </Button>
                                    </Upload>
                                </div>
                                <div style={{ marginBottom: 16 }}>
                                    <Text strong style={{ fontSize: 14 }}>First Name:</Text>
                                    <Input
                                        value={newEmployee.fname}
                                        onChange={(e) => setNewEmployee({ ...newEmployee, fname: e.target.value })}
                                        style={{ marginTop: 4 }}
                                        placeholder="First name"
                                    />
                                </div>
                                <div style={{ marginBottom: 16 }}>
                                    <Text strong style={{ fontSize: 14 }}>Middle Initial:</Text>
                                    <Input
                                        value={newEmployee.middle_initial}
                                        onChange={(e) => setNewEmployee({ ...newEmployee, middle_initial: e.target.value })}
                                        style={{ marginTop: 4 }}
                                        placeholder="M"
                                        maxLength={2}
                                    />
                                </div>
                                <div style={{ marginBottom: 16 }}>
                                    <Text strong style={{ fontSize: 14 }}>Last Name:</Text>
                                    <Input
                                        value={newEmployee.last_name}
                                        onChange={(e) => setNewEmployee({ ...newEmployee, last_name: e.target.value })}
                                        style={{ marginTop: 4 }}
                                        placeholder="Last name"
                                    />
                                </div>
                                <div style={{ marginBottom: 16 }}>
                                    <Text strong style={{ fontSize: 14 }}>Name Extension:</Text>
                                    <Input
                                        value={newEmployee.name_extension}
                                        onChange={(e) => setNewEmployee({ ...newEmployee, name_extension: e.target.value })}
                                        style={{ marginTop: 4 }}
                                        placeholder="Jr., Sr., III (optional)"
                                    />
                                </div>
                                <div style={{ marginBottom: 16 }}>
                                    <Text strong style={{ fontSize: 14 }}>Email:</Text>
                                    <Input
                                        type="email"
                                        value={newEmployee.email}
                                        onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                                        style={{ marginTop: 4 }}
                                        placeholder="name@example.com"
                                    />
                                </div>
                                <div style={{ marginBottom: 16 }}>
                                    <Text strong style={{ fontSize: 14 }}>Position:</Text>
                                    <Input
                                        value={newEmployee.position}
                                        onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                                        style={{ marginTop: 4 }}
                                        placeholder="Job position"
                                    />
                                </div>
                                <Space style={{ width: '100%', marginTop: 24, gap: 8 }}>
                                    <Button
                                        type="primary"
                                        onClick={handleAddEmployee}
                                        style={{ flex: 1 }}
                                    >
                                        Add Employee
                                    </Button>
                                    <Button
                                        onClick={handleCancelAdd}
                                        style={{ flex: 1 }}
                                    >
                                        Cancel
                                    </Button>
                                </Space>
                            </div>
                        )}
                    </Modal>
                </div>
            </div>
        </ErrorBoundary>
    )
}


