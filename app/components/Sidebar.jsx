import { NavLink, useLocation } from 'react-router'
import {
  DashboardOutlined,
  TeamOutlined,
  DollarOutlined,
  CalendarOutlined,
  BarChartOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { Layout, Menu, Typography } from 'antd'
import CHEDLogo from '../assets/images/CHED_Logo.png'

const { Sider } = Layout
const { Text } = Typography

export default function Sidebar({ collapsed, setCollapsed }) {
  const location = useLocation()

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: <NavLink to="/">Dashboard</NavLink>,
    },
    {
      key: '/students',
      icon: <TeamOutlined />,
      label: <NavLink to="/students">Students</NavLink>,
    },
    {
      key: '/logs',
      icon: <FileTextOutlined />,
      label: <NavLink to="/logs">Logs</NavLink>,
    },
    {
      key: '/disbursements',
      icon: <DollarOutlined />,
      label: <NavLink to="/disbursements">Disbursements</NavLink>,
    },
    {
      key: '/financial_assistance',
      icon: <BarChartOutlined />,
      label: <NavLink to="/financial_assistance">Financial Assistances</NavLink>,
    },
  ]

  const getSelectedKey = () => {
    const path = location.pathname
    if (path === '/') return '/'
    const match = menuItems.find(item => item.key !== '/' && path.startsWith(item.key))
    return match ? match.key : '/'
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
      `}</style>
    </Sider>
  )
}