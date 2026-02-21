import { Layout as AntLayout } from 'antd'
import { Outlet } from 'react-router'
import Sidebar from './Sidebar'
import Header from './Header'

const { Content } = AntLayout

const outerStyle = { minHeight: '100vh' }

const mainStyle = {
  marginLeft: 260,
  backgroundColor: '#f5f5f5',
}

const contentStyle = {
  minHeight: 'calc(100vh - 72px)',
  padding: '24px',
}

export default function Layout() {
  return (
    <AntLayout style={outerStyle}>
      <Sidebar />

      <AntLayout style={mainStyle}>
        <Header />

        <Content style={contentStyle}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  )
}