import { useState, useEffect } from 'react'
import { Form, Input, Button, Card, Typography, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router'
import { useAuth } from '../lib/AuthContext'

const { Text } = Typography

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
    <div className="min-h-screen flex justify-center items-center bg-gray-900 p-5">
      <Card
        className="w-full max-w-md rounded-2xl shadow-2xl"
        bodyStyle={{ padding: '64px 48px' }}
        style={{ backgroundColor: 'white' }}
      >
        <div className="flex flex-col items-center w-full">
          {/* Logo Section (adjusted spacing) */}
          <div className="flex flex-col items-center mb-16">
            <img 
              src="/app/assets/images/CHED_Logo.png" 
              alt="CHED Logo" 
              className="w-32 h-32 mb-6 object-contain"
            />
            <Text
              strong
              style={{
                color: "#1f2937",
                fontSize: "20px",
                fontWeight: 700,
                display: "block",
                lineHeight: "1.15",
                textAlign: "center",
                whiteSpace: "nowrap",
                marginTop: 10,
                marginBottom: 4
              }}
            >
              Student Financial Assistance Programs
            </Text>
            <Text
              style={{
                color: "#6b7280",
                fontSize: "14px",
                display: "block",
                lineHeight: "1.25",
                fontWeight: 500,
                textAlign: "center",
                marginBottom: 24
              }}
            >
              Commission on Higher Education
            </Text>
          </div>

          <Form
            name="login"
            onFinish={onFinish}
            layout="vertical"
            size="large"
            autoComplete="off"
            className="w-full mt-2"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: 'Please enter your username' }]}
              style={{ marginBottom: 20 }}
            >
              <Input
                prefix={<UserOutlined className="text-gray-400" />}
                placeholder="Username"
                className="h-12 rounded-lg border-gray-300 hover:border-blue-400 focus:border-blue-500"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please enter your password' }]}
              style={{ marginBottom: 28 }}
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder="Password"
                className="h-12 rounded-lg border-gray-300 hover:border-blue-400 focus:border-blue-500"
              />
            </Form.Item>

            <Form.Item className="mb-0">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                className="h-12 rounded-lg font-semibold text-base bg-gradient-to-r from-blue-500 to-purple-600 border-0 hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
              >
                Sign In
              </Button>
            </Form.Item>
          </Form>

          <Text className="text-center text-xs text-gray-400 mt-12">
            © 2026 StuFAPs. All rights reserved.
          </Text>
        </div>
      </Card>
    </div>
  )
}
