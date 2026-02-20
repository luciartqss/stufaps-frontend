import { NavLink, useLocation } from 'react-router'
import {
  DashboardOutlined,
  TeamOutlined,
  DollarOutlined,
  InfoCircleOutlined,
  BarChartOutlined,
  FileTextOutlined,
  WarningOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useState } from 'react'
import { Layout, Menu, Typography } from 'antd'
import CHEDLogo from '../assets/images/CHED_Logo.png'
import { useAuth } from '../lib/AuthContext'

const { Sider } = Layout
const { Text } = Typography

export default function Sidebar({ collapsed, setCollapsed }) {
  const location = useLocation()
  const { user, getAccess } = useAuth()
  const [openKeys, setOpenKeys] = useState(() => {
    return location.pathname.startsWith('/data-quality') ? ['sub-data-quality'] : []
  })

  // Build Data Quality children based on access
  const dataQualityChildren = []
  if (getAccess('data-quality-stufaps') !== 'none') {
    dataQualityChildren.push({
      key: '/data-quality/stufaps',
      label: <NavLink to="/data-quality">StuFAPs</NavLink>,
    })
  }
  if (getAccess('data-quality-accounting') !== 'none') {
    dataQualityChildren.push({
      key: '/data-quality/accounting',
      label: <NavLink to="/data-quality/accounting">Accounting</NavLink>,
    })
  }
  if (getAccess('data-quality-cashier') !== 'none') {
    dataQualityChildren.push({
      key: '/data-quality/cashier',
      label: <NavLink to="/data-quality/cashier">Cashier</NavLink>,
    })
  }

  const menuItems = [
    ...(getAccess('dashboard') !== 'none' ? [{
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: <NavLink to="/dashboard">Dashboard</NavLink>,
    }] : []),
    ...(getAccess('students') !== 'none' ? [{
      key: '/students',
      icon: <TeamOutlined />,
      label: <NavLink to="/students">Students</NavLink>,
    }] : []),
    ...(dataQualityChildren.length > 0 ? [{
      key: 'sub-data-quality',
      icon: <WarningOutlined />,
      label: 'Data Quality',
      children: dataQualityChildren,
    }] : []),
    ...(getAccess('financial_assistance') !== 'none' ? [{
      key: '/financial_assistance',
      icon: <BarChartOutlined />,
      label: <NavLink to="/financial_assistance">Financial Assistances</NavLink>,
    }] : []),
    ...(getAccess('logs') !== 'none' ? [{
      key: '/logs',
      icon: <FileTextOutlined />,
      label: <NavLink to="/logs">Logs</NavLink>,
    }] : []),
    ...(getAccess('account-management') !== 'none' ? [{
      key: '/account-management',
      icon: <UserOutlined />,
      label: <NavLink to="/account-management">Account Management</NavLink>,
    }] : []),
    ...(getAccess('about_us') !== 'none' ? [{
      key: '/about_us',
      icon: <InfoCircleOutlined />,
      label: <NavLink to="/about_us">About us</NavLink>,
    }] : []),
  ]

  const getSelectedKey = () => {
    const path = location.pathname
    if (path === '/') return '/'
    // Exact match for /data-quality (StuFAPs)
    if (path === '/data-quality') return '/data-quality/stufaps'
    for (const item of menuItems) {
      if (item.children) {
        const child = item.children.find(c => path.startsWith(c.key))
        if (child) return child.key
      }
      if (!item.children && item.key !== '/' && path.startsWith(item.key)) return item.key
    }
    return '/'
  }

  const handleOpenChange = (keys) => {
    setOpenKeys(keys)
  }

  const handleMenuClick = ({ key }) => {
    // Collapse submenu when clicking a non-data-quality item
    if (!key.startsWith('/data-quality') && key !== 'sub-data-quality') {
      setOpenKeys([])
    }
  }

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={setCollapsed}
      trigger={null}
      width={260}
      collapsedWidth={80}
      style={{
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e8e8e8',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
        boxShadow: '2px 0 8px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Logo Section */}
      <div
        style={{
          padding: collapsed ? '20px 16px' : '20px 24px',
          borderBottom: '1px solid #e8e8e8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: '12px',
          height: '72px',
          transition: 'all 0.2s ease',
        }}
      >
        {/* CHED Logo */}
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
            backgroundColor: '#f8f9fa',
            border: '1px solid #e8e8e8',
          }}
        >
          <img
            src={CHEDLogo}
            alt="CHED Logo"
            style={{
              width: '32px',
              height: '32px',
              objectFit: 'contain',
            }}
            onError={(e) => {
              e.target.style.display = 'none'
              e.target.nextSibling.style.display = 'flex'
            }}
          />
          <Text 
            strong 
            style={{ 
              color: '#0032a0', 
              fontSize: '14px',
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%'
            }}
          >
            SF
          </Text>
        </div>

        {/* Title - Hidden when collapsed */}
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <Text
              strong
              style={{
                color: '#0032a0',
                fontSize: '16px',
                display: 'block',
                lineHeight: '1.3',
                whiteSpace: 'nowrap',
              }}
            >
              StuFAPs
            </Text>
            <Text
              style={{
                color: '#8c8c8c',
                fontSize: '12px',
                display: 'block',
                whiteSpace: 'nowrap',
              }}
            >
              Operations Hub
            </Text>
          </div>
        )}
      </div>

      {/* Navigation Menu */}
      <Menu
        mode="inline"
        selectedKeys={[getSelectedKey()]}
        openKeys={openKeys}
        onOpenChange={handleOpenChange}
        onClick={handleMenuClick}
        items={menuItems}
        style={{
          backgroundColor: 'transparent',
          borderRight: 'none',
          padding: '12px 8px',
        }}
        theme="light"
      />

      {/* Custom Styles */}
      <style>{`
        .ant-menu-item {
          margin: 4px 0 !important;
          border-radius: 6px !important;
          height: 44px !important;
          line-height: 44px !important;
        }

        .ant-menu-item a {
          color: #595959 !important;
          text-decoration: none !important;
          font-weight: 500 !important;
        }

        .ant-menu-item:hover {
          background-color: #f0f5ff !important;
        }

        .ant-menu-item:hover a {
          color: #0032a0 !important;
        }

        .ant-menu-item-selected {
          background-color: #3366cc !important;
        }

        .ant-menu-item-selected a {
          color: #ffffff !important;
        }

        .ant-menu-item-selected::after {
          display: none !important;
        }

        .ant-menu-item .ant-menu-item-icon {
          color: #8c8c8c !important;
          font-size: 18px !important;
        }

        .ant-menu-item-selected .ant-menu-item-icon {
          color: #ffffff !important;
        }

        .ant-menu-item:hover .ant-menu-item-icon {
          color: #0032a0 !important;
        }

        .ant-layout-sider-children {
          display: flex;
          flex-direction: column;
        }

        .ant-menu-inline-collapsed > .ant-menu-item {
          padding: 0 calc(50% - 18px) !important;
        }

        .ant-menu-submenu-title {
          margin: 4px 0 !important;
          border-radius: 6px !important;
          height: 44px !important;
          line-height: 44px !important;
          color: #595959 !important;
          font-weight: 500 !important;
        }

        .ant-menu-submenu-title:hover {
          background-color: #f0f5ff !important;
          color: #0032a0 !important;
        }

        .ant-menu-submenu-title .ant-menu-item-icon {
          color: #8c8c8c !important;
          font-size: 18px !important;
        }

        .ant-menu-submenu-title:hover .ant-menu-item-icon {
          color: #0032a0 !important;
        }

        .ant-menu-submenu-selected > .ant-menu-submenu-title {
          color: #0032a0 !important;
        }

        .ant-menu-submenu-selected > .ant-menu-submenu-title .ant-menu-item-icon {
          color: #0032a0 !important;
        }

        .ant-menu-sub.ant-menu-inline {
          background: transparent !important;
        }

        .ant-menu-sub .ant-menu-item {
          padding-left: 48px !important;
          height: 38px !important;
          line-height: 38px !important;
        }
      `}</style>
    </Sider>
  )
}