import { Layout as AntLayout } from 'antd'
import { Outlet } from 'react-router'
import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

const { Content } = AntLayout

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Main Layout */}
      <AntLayout
        style={{
          marginLeft: collapsed ? 80 : 260,
          backgroundColor: '#f5f5f5',
          transition: 'margin-left 0.2s ease',
        }}
      >
        {/* Header */}
        <Header collapsed={collapsed} setCollapsed={setCollapsed} />

        {/* Content */}
        <Content
          style={{
            minHeight: 'calc(100vh - 72px)',
            padding: '24px',
            transition: 'all 0.2s ease',
          }}
        >
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  )
}