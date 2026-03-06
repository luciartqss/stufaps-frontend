import { useState } from 'react'
import { Modal, Form, Input, Typography, message } from 'antd'
import { LockOutlined, SafetyOutlined, CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons'
import { API_BASE } from '../lib/config'

const { Text, Title } = Typography

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
    <div style={{ marginTop: 8, marginBottom: 8 }}>
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

export default function ForceChangePasswordModal({ open, userId, onSuccess }) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [newPassword, setNewPassword] = useState('')

  const validatePassword = (_, value) => {
    if (!value) return Promise.reject('Please enter your new password')
    const allPass = PASSWORD_RULES.every((r) => r.test(value))
    return allPass
      ? Promise.resolve()
      : Promise.reject('Password does not meet all requirements')
  }

  const handleFinish = async (values) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/profile/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, ...values }),
      })
      const data = await res.json()
      if (!res.ok) {
        message.error(data.message || 'Failed to change password')
      } else {
        message.success('Password updated! You can now continue.')
        form.resetFields()
        setNewPassword('')
        onSuccess?.()
      }
    } catch {
      message.error('Unable to reach server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      closable={false}
      maskClosable={false}
      keyboard={false}
      footer={null}
      centered
      width={460}
    >
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <SafetyOutlined style={{ fontSize: 48, color: '#3366cc', marginBottom: 12 }} />
        <Title level={4} style={{ marginBottom: 4 }}>Password Change Required</Title>
        <Text type="secondary">
          For security, you must change your password before continuing.
        </Text>
      </div>

      <Form form={form} layout="vertical" onFinish={handleFinish} autoComplete="off">
        <Form.Item
          name="current_password"
          label="Current Password"
          rules={[{ required: true, message: 'Please enter your current password' }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Enter current password" />
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
        >
          <Input.Password prefix={<SafetyOutlined />} placeholder="Re-enter new password" />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '10px 0', borderRadius: 6, border: 'none',
              background: '#3366cc', color: '#fff', fontSize: 15, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Changing Password...' : 'Change Password & Continue'}
          </button>
        </Form.Item>
      </Form>
    </Modal>
  )
}
