import { useState, useEffect } from 'react'
import { Typography, Table, Button, Input, Select, Modal, Form, Tag, Space, message, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
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

  useEffect(() => { fetchUsers() }, [])

  const openCreate = () => {
    setEditingUser(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (user) => {
    setEditingUser(user)
    form.setFieldsValue({
      username: user.username,
      email: user.email,
      role: user.role,
      password: '',
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      if (editingUser) {
        // Only send changed fields
        const payload = {}
        if (values.username !== editingUser.username) payload.username = values.username
        if (values.email !== editingUser.email) payload.email = values.email
        if (values.role !== editingUser.role) payload.role = values.role
        if (values.password) payload.password = values.password

        if (Object.keys(payload).length === 0) {
          setModalOpen(false)
          return
        }

        const res = await fetch(`${API_BASE}/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || 'Failed to update')
        message.success(data.message)
      } else {
        const res = await fetch(`${API_BASE}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
        const data = await res.json()
        if (!res.ok) {
          // Handle validation errors
          if (res.status === 422 && data.errors) {
            const firstError = Object.values(data.errors)[0]?.[0]
            throw new Error(firstError || 'Validation failed')
          }
          throw new Error(data.message || 'Failed to create')
        }
        message.success(data.message)
      }

      setModalOpen(false)
      form.resetFields()
      fetchUsers()
    } catch (err) {
      if (err.errorFields) return // form validation error, antd shows inline
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
      width: 180,
      render: (val) => <Text strong style={{ fontSize: 13 }}>{val}</Text>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      width: 250,
      render: (val) => <Text style={{ fontSize: 13 }}>{val}</Text>,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      width: 140,
      align: 'center',
      render: (role) => (
        <Tag color={ROLE_COLORS[role] || 'default'} style={{ margin: 0 }}>
          {ROLE_LABELS[role] || role}
        </Tag>
      ),
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
        width={440}
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
        </Form>
      </Modal>
    </div>
  )
}
