import { useState, useEffect } from 'react'
import { Typography, Table, Button, Input, Select, Modal, Form, Tag, Space, message, Popconfirm, Checkbox, Divider, Tooltip } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { API_BASE } from '../lib/config'

const { Title, Text } = Typography

const ROLE_COLORS = {
  master_admin: 'red',
  stufaps: 'blue',
  accounting: 'green',
  cashier: 'orange',
}

const ROLE_LABELS = {
  master_admin: 'Master Admin',
  stufaps: 'StuFAPs',
  accounting: 'Accounting',
  cashier: 'Cashier',
}

export function meta() {
  return [
    { title: 'Account Management | StuFAPs' },
    { name: 'description', content: 'Manage user accounts and roles' },
  ]
}

export default function AccountManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [form] = Form.useForm()
  const [assignmentOptions, setAssignmentOptions] = useState({ scholarship_programs: [], academic_years: [] })

  // Watch the role field to show/hide stufaps-specific fields
  const selectedRole = Form.useWatch('role', form)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/users`)
      if (!res.ok) throw new Error('Failed to fetch')
      setUsers(await res.json())
    } catch (err) {
      console.error(err)
      message.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const fetchAssignmentOptions = async () => {
    try {
      const res = await fetch(`${API_BASE}/users/assignment-options`)
      if (res.ok) setAssignmentOptions(await res.json())
    } catch (err) {
      console.error('Failed to fetch assignment options:', err)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchAssignmentOptions()
  }, [])

  const openCreate = () => {
    setEditingUser(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (user) => {
    setEditingUser(user)

    // Build assignments list for the form
    const programs = (user.assignments || []).map(a => a.scholarship_program)
    const years = (user.assignments || []).map(a => a.academic_year)
    const uniquePrograms = [...new Set(programs)]
    const uniqueYears = [...new Set(years)]

    form.setFieldsValue({
      username: user.username,
      email: user.email,
      role: user.role,
      password: '',
      accounting_access: user.accounting_access || false,
      cashier_access: user.cashier_access || false,
      assigned_programs: uniquePrograms,
      assigned_years: uniqueYears,
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      // Build assignments array from selected programs x years
      const assignments = []
      if (values.role === 'stufaps' && values.assigned_programs?.length && values.assigned_years?.length) {
        for (const program of values.assigned_programs) {
          for (const year of values.assigned_years) {
            assignments.push({ scholarship_program: program, academic_year: year })
          }
        }
      }

      if (editingUser) {
        const payload = {}
        if (values.username !== editingUser.username) payload.username = values.username
        if (values.email !== editingUser.email) payload.email = values.email
        if (values.role !== editingUser.role) payload.role = values.role
        if (values.password) payload.password = values.password

        // Always send access flags and assignments for stufaps
        if ((values.role || editingUser.role) === 'stufaps') {
          payload.accounting_access = values.accounting_access || false
          payload.cashier_access = values.cashier_access || false
          payload.assignments = assignments
        } else {
          // Reset flags if switching away from stufaps
          payload.accounting_access = false
          payload.cashier_access = false
          payload.assignments = []
        }

        const res = await fetch(`${API_BASE}/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) {
          if (res.status === 422 && data.errors) {
            throw new Error(Object.values(data.errors)[0]?.[0] || 'Validation failed')
          }
          throw new Error(data.message || 'Failed to update')
        }
        message.success(data.message)
      } else {
        const payload = {
          username: values.username,
          email: values.email,
          password: values.password,
          role: values.role,
          accounting_access: values.role === 'stufaps' ? (values.accounting_access || false) : false,
          cashier_access: values.role === 'stufaps' ? (values.cashier_access || false) : false,
          assignments: values.role === 'stufaps' ? assignments : [],
        }

        const res = await fetch(`${API_BASE}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) {
          if (res.status === 422 && data.errors) {
            throw new Error(Object.values(data.errors)[0]?.[0] || 'Validation failed')
          }
          throw new Error(data.message || 'Failed to create')
        }
        message.success(data.message)
      }

      setModalOpen(false)
      form.resetFields()
      fetchUsers()
    } catch (err) {
      if (err.errorFields) return
      message.error(err.message)
    }
  }

  const handleDelete = async (user) => {
    try {
      const res = await fetch(`${API_BASE}/users/${user.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to delete')
      message.success(data.message)
      fetchUsers()
    } catch (err) {
      message.error(err.message)
    }
  }

  const columns = [
    {
      title: '#',
      width: 50,
      align: 'center',
      render: (_, __, i) => <Text style={{ fontSize: 13, color: '#8c8c8c' }}>{i + 1}</Text>,
    },
    {
      title: 'Username',
      dataIndex: 'username',
      width: 150,
      render: (val) => <Text strong style={{ fontSize: 13 }}>{val}</Text>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      width: 220,
      render: (val) => <Text style={{ fontSize: 13 }}>{val}</Text>,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      width: 120,
      align: 'center',
      render: (role) => (
        <Tag color={ROLE_COLORS[role] || 'default'} style={{ margin: 0 }}>
          {ROLE_LABELS[role] || role}
        </Tag>
      ),
    },
    {
      title: 'Access',
      key: 'access',
      width: 200,
      render: (_, record) => {
        if (record.role === 'master_admin') {
          return <Text style={{ fontSize: 12, color: '#8c8c8c' }}>Full access</Text>
        }
        if (record.role === 'accounting') {
          return <Text style={{ fontSize: 12, color: '#8c8c8c' }}>Accounting only</Text>
        }
        if (record.role === 'cashier') {
          return <Text style={{ fontSize: 12, color: '#8c8c8c' }}>Cashier only</Text>
        }
        // stufaps
        const programs = [...new Set((record.assignments || []).map(a => a.scholarship_program))]
        const years = [...new Set((record.assignments || []).map(a => a.academic_year))]
        const hasAssignment = programs.length > 0 && years.length > 0
        const flags = []
        if (record.accounting_access) flags.push('Accounting')
        if (record.cashier_access) flags.push('Cashier')

        return (
          <div style={{ fontSize: 12, lineHeight: 1.6 }}>
            {hasAssignment ? (
              <Tooltip title={`Programs: ${programs.join(', ')}\nYears: ${years.join(', ')}`}>
                <Tag color="blue" style={{ margin: '0 4px 2px 0', cursor: 'pointer' }}>
                  {programs.length} program{programs.length !== 1 ? 's' : ''}, {years.length} year{years.length !== 1 ? 's' : ''}
                </Tag>
              </Tooltip>
            ) : (
              <Tag color="default" style={{ margin: '0 4px 2px 0' }}>Read-only</Tag>
            )}
            {flags.map(f => (
              <Tag key={f} color="cyan" style={{ margin: '0 4px 2px 0' }}>{f}</Tag>
            ))}
          </div>
        )
      },
    },
    {
      title: '',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => {
        if (record.role === 'master_admin') return null
        return (
          <Space size={4} split={<span style={{ color: '#d9d9d9' }}>|</span>}>
            <Button size="small" type="link" icon={<EditOutlined />} style={{ fontSize: 13, padding: 0 }} onClick={() => openEdit(record)}>
              Edit
            </Button>
            <Popconfirm
              title="Delete account"
              description="Are you sure? This cannot be undone."
              onConfirm={() => handleDelete(record)}
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" type="link" danger icon={<DeleteOutlined />} style={{ fontSize: 13, padding: 0 }}>
                Delete
              </Button>
            </Popconfirm>
          </Space>
        )
      },
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Account Management</Title>
          <Text style={{ color: '#6b7280', fontSize: 14 }}>
            Manage user accounts, roles, and permissions
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Create Account
        </Button>
      </div>

      <Table
        dataSource={users}
        columns={columns}
        rowKey="id"
        loading={loading}
        size="small"
        bordered
        pagination={false}
      />

      <Modal
        title={editingUser ? 'Edit Account' : 'Create Account'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        onOk={handleSubmit}
        okText={editingUser ? 'Save Changes' : 'Create'}
        width={520}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Username is required' }]}
          >
            <Input placeholder="Enter username" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Enter a valid email' },
            ]}
          >
            <Input placeholder="Enter email" />
          </Form.Item>
          <Form.Item
            name="password"
            label={editingUser ? 'New Password (leave blank to keep)' : 'Password'}
            rules={editingUser ? [] : [{ required: true, message: 'Password is required' }]}
          >
            <Input.Password placeholder={editingUser ? 'Leave blank to keep current' : 'Enter password'} />
          </Form.Item>
          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: 'Role is required' }]}
          >
            <Select placeholder="Select a role">
              <Select.Option value="stufaps">StuFAPs</Select.Option>
              <Select.Option value="accounting">Accounting</Select.Option>
              <Select.Option value="cashier">Cashier</Select.Option>
            </Select>
          </Form.Item>

          {/* StuFAPs-specific fields */}
          {selectedRole === 'stufaps' && (
            <>
              <Divider style={{ margin: '12px 0' }}>
                <Text style={{ fontSize: 13, color: '#8c8c8c' }}>StuFAPs Assignment & Access</Text>
              </Divider>

              <Form.Item
                name="assigned_programs"
                label={
                  <Space size={4}>
                    Scholarship Programs
                    <Tooltip title="Assign at least one program AND one academic year for full access. Without assignments, the user gets read-only access.">
                      <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                    </Tooltip>
                  </Space>
                }
              >
                <Select
                  mode="multiple"
                  placeholder="Select scholarship programs"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={assignmentOptions.scholarship_programs.map(p => ({ label: p, value: p }))}
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item
                name="assigned_years"
                label="Academic Years"
              >
                <Select
                  mode="multiple"
                  placeholder="Select academic years"
                  allowClear
                  options={assignmentOptions.academic_years.map(y => ({ label: y, value: y }))}
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
                <Form.Item name="accounting_access" valuePropName="checked" style={{ margin: 0 }}>
                  <Checkbox>Accounting access</Checkbox>
                </Form.Item>
                <Form.Item name="cashier_access" valuePropName="checked" style={{ margin: 0 }}>
                  <Checkbox>Cashier access</Checkbox>
                </Form.Item>
              </div>

              <div style={{ background: '#f6f8fa', borderRadius: 6, padding: '10px 14px', marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>
                  <strong>Note:</strong> Without program/year assignments, the user can still log in but has read-only access.
                  Checking Accounting/Cashier grants full edit access to those sections; unchecked grants view-only.
                </Text>
              </div>
            </>
          )}
        </Form>
      </Modal>
    </div>
  )
}