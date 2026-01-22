import { useEffect, useState } from 'react'
import { Table, Button, Tag, Typography, Space, message, Modal, Spin, Empty } from 'antd'
import { UndoOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

const API_URL = 'http://localhost:8000/api'

// Suppress Ant Design compatibility warning
const originalWarn = console.warn;
console.warn = (message) => {
  if (message.includes('antd v5 support React is 16 ~ 18')) {
    return;
  }
  originalWarn(message);
};

export function meta() {
  return [
    { title: 'Logs | StuFAPs' },
    { name: 'description', content: 'View system logs and audit trail' },
  ]
}

export default function LogsIndex() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 })

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/logs`)
      if (!res.ok) throw new Error('Failed to fetch logs')
      const data = await res.json()
      setLogs(data)
    } catch (error) {
      message.error('Failed to fetch logs')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleRollback = (log) => {
    Modal.confirm({
      title: 'Confirm Rollback',
      content: `Are you sure you want to rollback this ${log.action} action on ${log.model}?`,
      okText: 'Rollback',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const res = await fetch(`${API_URL}/logs/${log.id}/rollback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
          const data = await res.json()
          if (res.ok) {
            message.success(data.message)
            fetchLogs()
          } else {
            message.error(data.error || 'Failed to rollback')
          }
        } catch (error) {
          message.error('Failed to rollback')
          console.error(error)
        }
      },
    })
  }

  const getActionColor = (action) => {
    switch (action) {
      case 'create':
        return 'green'
      case 'update':
        return 'blue'
      case 'delete':
        return 'red'
      default:
        return 'default'
    }
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 70,
      align: 'center',
    },
    {
      title: 'Model',
      dataIndex: 'model',
      key: 'model',
      width: 100,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Record ID',
      dataIndex: 'model_id',
      key: 'model_id',
      width: 100,
      align: 'center',
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action) => (
        <Tag color={getActionColor(action)} style={{ textTransform: 'capitalize' }}>
          {action}
        </Tag>
      ),
    },
    {
      title: 'Changed Fields',
      dataIndex: 'changed_fields',
      key: 'changed_fields',
      render: (fields) => {
        if (!fields) return <Text type="secondary">-</Text>
        return (
          <Text style={{ fontSize: '12px' }} ellipsis title={fields}>
            {fields}
          </Text>
        )
      },
    },
    {
      title: 'User ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 80,
      align: 'center',
      render: (userId) => userId || <Text type="secondary">System</Text>,
    },
    {
      title: 'IP Address',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 120,
      render: (ip) => <Text style={{ fontSize: '12px' }}>{ip || '-'}</Text>,
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date) => {
        return new Date(date).toLocaleString()
      },
      sorter: (a, b) => new Date(b.created_at) - new Date(a.created_at),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Action',
      key: 'action_btn',
      width: 120,
      align: 'center',
      render: (_, record) => {
        if (record.action === 'delete' || record.action === 'update') {
          return (
            <Button
              type="primary"
              danger
              size="small"
              icon={<UndoOutlined />}
              onClick={() => handleRollback(record)}
            >
              Rollback
            </Button>
          )
        }
        return <Text type="secondary">-</Text>
      },
    },
  ]

  if (loading) {
    return (
      <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, color: '#0032a0' }}>
          Audit Logs
        </Title>
        <Text type="secondary">View system logs and rollback changes</Text>
      </div>

      {/* Stats */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '16px' }}>
        <div style={{ padding: '12px 16px', backgroundColor: '#f0f5ff', borderRadius: '8px', border: '1px solid #d6e4ff' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>Total Logs</Text>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0032a0' }}>{logs.length}</div>
        </div>
        <div style={{ padding: '12px 16px', backgroundColor: '#f6ffed', borderRadius: '8px', border: '1px solid #b7eb8f' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>Creates</Text>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a' }}>
            {logs.filter(l => l.action === 'create').length}
          </div>
        </div>
        <div style={{ padding: '12px 16px', backgroundColor: '#e6f7ff', borderRadius: '8px', border: '1px solid #91d5ff' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>Updates</Text>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>
            {logs.filter(l => l.action === 'update').length}
          </div>
        </div>
        <div style={{ padding: '12px 16px', backgroundColor: '#fff2f0', borderRadius: '8px', border: '1px solid #ffccc7' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>Deletes</Text>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ff4d4f' }}>
            {logs.filter(l => l.action === 'delete').length}
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        {logs.length > 0 ? (
          <Table
            columns={columns}
            dataSource={logs}
            rowKey="id"
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: logs.length,
              onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} logs`,
            }}
            bordered
            size="middle"
          />
        ) : (
          <Empty description="No logs found" style={{ padding: '50px 0' }} />
        )}
      </div>
    </div>
  )
}