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
import { useState, useMemo, useCallback } from 'react'
// Note: DollarOutlined import kept for potential future use
import { Layout, Menu, Typography } from 'antd'
import CHEDLogo from '../assets/images/CHED_Logo.png'
import { useAuth } from '../lib/AuthContext'

const { Sider } = Layout
const { Text } = Typography

// ── Static styles hoisted out of render ──────────────────────────────
const siderBaseStyle = {
  backgroundColor: '#ffffff',
  borderRight: '1px solid #e8e8e8',
  height: '100vh',
  position: 'fixed',
  left: 0,
  top: 0,
  bottom: 0,
  zIndex: 100,
  boxShadow: '2px 0 8px rgba(0, 0, 0, 0.05)',
}

const logoSectionStyle = {
  padding: '0 20px',
  borderBottom: '1px solid #e8e8e8',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: '14px',
  height: '72px',
}

const logoContainerStyle = {
  width: '44px',
  height: '44px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

const logoImgStyle = {
  width: '44px',
  height: '44px',
  objectFit: 'contain',
}

const logoFallbackStyle = {
  color: '#0032a0',
  fontSize: '16px',
  fontWeight: 700,
  display: 'none',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
}

const titleStyle = {
  color: '#1a1a1a',
  fontSize: '15px',
  fontWeight: 600,
  display: 'block',
  lineHeight: '1.3',
  whiteSpace: 'nowrap',
  letterSpacing: '0.2px',
}

const subtitleStyle = {
  color: '#8c8c8c',
  fontSize: '11px',
  display: 'block',
  whiteSpace: 'nowrap',
  letterSpacing: '0.3px',
}

const menuStyle = {
  backgroundColor: 'transparent',
  borderRight: 'none',
  padding: '12px 8px',
}

const handleImgError = (e) => {
  e.target.style.display = 'none'
  e.target.nextSibling.style.display = 'flex'
}

// ── CSS moved to a module-level constant (parsed once, not every render) ──
const SIDEBAR_CSS = `
  .ant-menu-item {
    margin: 2px 0 !important;
    border-radius: 4px !important;
    height: 42px !important;
    line-height: 42px !important;
  }
  .ant-menu-item a {
    color: #434343 !important;
    text-decoration: none !important;
    font-weight: 500 !important;
    font-size: 13.5px !important;
    letter-spacing: 0.15px !important;
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
    font-size: 16px !important;
  }
  .ant-menu-item-selected .ant-menu-item-icon {
    color: #ffffff !important;
  }
  .ant-layout-sider-children {
    display: flex;
    flex-direction: column;
  }
  .ant-menu-submenu-title {
    margin: 2px 0 !important;
    border-radius: 4px !important;
    height: 42px !important;
    line-height: 42px !important;
    color: #434343 !important;
    font-weight: 500 !important;
    font-size: 13.5px !important;
    letter-spacing: 0.15px !important;
  }
  .ant-menu-submenu-title .ant-menu-item-icon {
    color: #8c8c8c !important;
    font-size: 16px !important;
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
`

export default function Sidebar() {
  const location = useLocation()
  const { user, getAccess } = useAuth()
  const [openKeys, setOpenKeys] = useState(() => {
    return location.pathname.startsWith('/data-quality') ? ['sub-data-quality'] : []
  })

  // Memoize menu items — only rebuilds when permissions change
  const menuItems = useMemo(() => {
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

    return [
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
        label: <NavLink to="/financial_assistance">Financial Assistance</NavLink>,
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
      ...(getAccess('sub-aro-nta') !== 'none' ? [{
        key: '/sub_aro_nta',
        icon: <FileTextOutlined />,
        label: <NavLink to="/sub_aro_nta">SUB-ARO/NTA</NavLink>,
      }] : []),
      ...(getAccess('about_us') !== 'none' ? [{
        key: '/about_us',
        icon: <InfoCircleOutlined />,
        label: <NavLink to="/about_us">About Us</NavLink>,
      }] : []),
    ]
  }, [getAccess])

  // Memoize selected key — only recalculates on route change
  const selectedKey = useMemo(() => {
    const path = location.pathname
    if (path === '/') return '/'
    if (path === '/data-quality') return '/data-quality/stufaps'
    for (const item of menuItems) {
      if (item.children) {
        const child = item.children.find(c => path.startsWith(c.key))
        if (child) return child.key
      }
      if (!item.children && item.key !== '/' && path.startsWith(item.key)) return item.key
    }
    return '/'
  }, [location.pathname, menuItems])

  const selectedKeys = useMemo(() => [selectedKey], [selectedKey])

  // Stable callback refs
  const handleOpenChange = useCallback((keys) => {
    setOpenKeys(keys)
  }, [])

  const handleMenuClick = useCallback(({ key }) => {
    if (!key.startsWith('/data-quality') && key !== 'sub-data-quality') {
      setOpenKeys([])
    }
  }, [])

  return (
    <Sider
      width={260}
      style={siderBaseStyle}
    >
      {/* Logo Section */}
      <div style={logoSectionStyle}>
        <div style={logoContainerStyle}>
          <img
            src={CHEDLogo}
            alt="CHED Logo"
            style={logoImgStyle}
            onError={handleImgError}
          />
          <Text strong style={logoFallbackStyle}>
            SF
          </Text>
        </div>

        <div style={{ overflow: 'hidden' }}>
          <Text strong style={titleStyle}>
            StuFAPs
          </Text>
          <Text style={subtitleStyle}>
            Operations Hub
          </Text>
        </div>
      </div>

      {/* Navigation Menu */}
      <Menu
        mode="inline"
        selectedKeys={selectedKeys}
        openKeys={openKeys}
        onOpenChange={handleOpenChange}
        onClick={handleMenuClick}
        items={menuItems}
        style={menuStyle}
        theme="light"
      />

      <style>{SIDEBAR_CSS}</style>
    </Sider>
  )
}