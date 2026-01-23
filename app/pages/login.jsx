import { useState, useEffect } from 'react'
import { Form, Input, Button, Card, Typography, message, Space } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router'
import { useAuth } from '../lib/AuthContext'

const { Title, Text } = Typography

export default function Login() {
  const [loading, setLoading] = useState(false)
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  const onFinish = async (values) => {
    setLoading(true)
    
    // Simulate a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const result = login(values.username, values.password)
    
    if (result.success) {
      message.success('Login successful!')
      navigate('/dashboard')
    } else {
      message.error(result.message || 'Login failed')
    }
    
    setLoading(false)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          borderRadius: 12,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
        }}
        bodyStyle={{ padding: '40px' }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={2} style={{ marginBottom: 8, color: '#1a1a2e' }}>
              StuFAPs
            </Title>
            <Text type="secondary">
              Student Financial Assistance Programs
            </Text>
          </div>

          <Form
            name="login"
            onFinish={onFinish}
            layout="vertical"
            size="large"
            autoComplete="off"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: 'Please enter your username' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="Username"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="Password"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{
                  height: 48,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  fontWeight: 600,
                }}
              >
                Sign In
              </Button>
            </Form.Item>
          </Form>

          <Text
            type="secondary"
            style={{
              display: 'block',
              textAlign: 'center',
              fontSize: 12,
            }}
          >
            © 2026 StuFAPs. All rights reserved.
          </Text>
        </Space>
      </Card>
    </div>
  )
}
