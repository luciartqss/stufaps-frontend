import { useState, useEffect } from 'react'
import {
  Card, Form, Input, Button, Typography, message, Divider, Space, Row, Col, Tag,
} from 'antd'
import {
  LockOutlined, MailOutlined, UserOutlined, SafetyOutlined,
  CheckCircleFilled, CloseCircleFilled,
} from '@ant-design/icons'
import { useAuth } from '../lib/AuthContext'
import { API_BASE } from '../lib/config'

const { Title, Text } = Typography

const PASSWORD_RULES = [
  { key: 'length', label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { key: 'lower', label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { key: 'number', label: 'One number', test: (v) => /\d/.test(v) },
  { key: 'symbol', label: 'One special character', test: (v) => /[^A-Za-z0-9]/.test(v) },
]

function PasswordStrength({ value = '' }) {
  if (!value) return null

  return (
    <div style={{ marginTop: 8 }}>
      {PASSWORD_RULES.map((rule) => {
        const pass = rule.test(value)
        return (
          <div key={rule.key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            {pass
              ? <CheckCircleFilled style={{ color: '#52c41a', fontSize: 12 }} />
              : <CloseCircleFilled style={{ color: '#ff4d4f', fontSize: 12 }} />}
            <Text style={{ fontSize: 12, color: pass ? '#52c41a' : '#8c8c8c' }}>{rule.label}</Text>
          </div>
        )
      })}
    </div>
  )
}

export function meta() {
  return [
    { title: 'Profile - StuFAPs' },
    { name: 'description', content: 'Manage your account profile' },
  ]
}

export default function Profile() {
  const { user, logout } = useAuth()
  const [passwordForm] = Form.useForm()
  const [emailForm] = Form.useForm()
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    fetch(`${API_BASE}/profile?user_id=${user.id}`)
      .then((r) => r.json())
      .then(setProfile)
      .catch(() => {})
  }, [user?.id])

  const handlePasswordChange = async (values) => {
    setPasswordLoading(true)
    try {
      const res = await fetch(`${API_BASE}/profile/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, ...values }),
      })
      const data = await res.json()
      if (!res.ok) {
        message.error(data.message || 'Failed to change password')
      } else {
        message.success(data.message)
        passwordForm.resetFields()
        setNewPassword('')
      }
    } catch {
      message.error('Unable to reach server')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleEmailChange = async (values) => {
    setEmailLoading(true)
    try {
      const res = await fetch(`${API_BASE}/profile/change-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, ...values }),
      })
      const data = await res.json()
      if (!res.ok) {
        message.error(data.message || 'Failed to change email')
      } else {
        message.success(data.message)
        emailForm.resetFields()
        setProfile((prev) => ({ ...prev, email: data.email }))
        // Update stored user
        const stored = JSON.parse(localStorage.getItem('user') || '{}')
        stored.email = data.email
        localStorage.setItem('user', JSON.stringify(stored))
      }
    } catch {
      message.error('Unable to reach server')
    } finally {
      setEmailLoading(false)
    }
  }

  const validatePassword = (_, value) => {
    if (!value) return Promise.reject('Please enter your new password')
    const allPass = PASSWORD_RULES.every((r) => r.test(value))
    return allPass
      ? Promise.resolve()
      : Promise.reject('Password does not meet all requirements')
  }

  const roleColors = {
    master_admin: 'red',
    stufaps: 'blue',
    accounting: 'green',
    cashier: 'orange',
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <Title level={3} style={{ marginBottom: 24 }}>My Profile</Title>

      {/* Account info summary */}
      <Card style={{ marginBottom: 24, borderRadius: 8 }}>
        <Row gutter={24} align="middle">
          <Col>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', background: '#3366cc',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UserOutlined style={{ fontSize: 28, color: '#fff' }} />
            </div>
          </Col>
          <Col>
            <Text strong style={{ fontSize: 18, display: 'block' }}>
              {profile?.username || user?.username}
            </Text>
            <Text type="secondary" style={{ display: 'block' }}>
              {profile?.email || user?.email}
            </Text>
            <Tag color={roleColors[profile?.role || user?.role] || 'default'} style={{ marginTop: 4 }}>
              {(profile?.role || user?.role || '').replace('_', ' ').toUpperCase()}
            </Tag>
          </Col>
        </Row>
      </Card>

      <Row gutter={24} align="stretch">
        {/* Change Password Section */}
        <Col xs={24} lg={12} style={{ display: 'flex' }}>
          <Card
            title={
              <Space><LockOutlined /> <span>Change Password</span></Space>
            }
            style={{ borderRadius: 8, marginBottom: 24, flex: 1, display: 'flex', flexDirection: 'column' }}
            styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column' } }}
          >
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={handlePasswordChange}
              autoComplete="off"
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
              <Form.Item
                name="current_password"
                label="Current Password"
                rules={[{ required: true, message: 'Please enter your current password' }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Enter current password"
                />
              </Form.Item>

              <Form.Item
                name="new_password"
                label="New Password"
                rules={[{ validator: validatePassword }]}
              >
                <Input.Password
                  prefix={<SafetyOutlined />}
                  placeholder="Enter new password"
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </Form.Item>

              <PasswordStrength value={newPassword} />

              <Form.Item
                name="new_password_confirmation"
                label="Confirm New Password"
                dependencies={['new_password']}
                rules={[
                  { required: true, message: 'Please confirm your new password' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('new_password') === value) return Promise.resolve()
                      return Promise.reject('Passwords do not match')
                    },
                  }),
                ]}
                style={{ marginTop: 12 }}
              >
                <Input.Password
                  prefix={<SafetyOutlined />}
                  placeholder="Re-enter new password"
                />
              </Form.Item>

              <div style={{ flex: 1 }} />
              <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
                <Button type="primary" htmlType="submit" loading={passwordLoading} block>
                  Update Password
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* Change Email Section */}
        <Col xs={24} lg={12} style={{ display: 'flex' }}>
          <Card
            title={
              <Space><MailOutlined /> <span>Change Email</span></Space>
            }
            style={{ borderRadius: 8, marginBottom: 24, flex: 1, display: 'flex', flexDirection: 'column' }}
            styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column' } }}
          >
            <Form
              form={emailForm}
              layout="vertical"
              onFinish={handleEmailChange}
              autoComplete="off"
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
              <Form.Item label="Current Email">
                <Input
                  prefix={<MailOutlined />}
                  value={profile?.email || user?.email}
                  disabled
                />
              </Form.Item>

              <Form.Item
                name="new_email"
                label="New Email Address"
                rules={[
                  { required: true, message: 'Please enter your new email' },
                  { type: 'email', message: 'Please enter a valid email' },
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="Enter new email"
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="Confirm Password"
                rules={[{ required: true, message: 'Password is required to change email' }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Enter your password"
                />
              </Form.Item>

              <div style={{ flex: 1 }} />
              <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
                <Button type="primary" htmlType="submit" loading={emailLoading} block>
                  Update Email
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
