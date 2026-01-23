import React from "react";
import { Layout, Typography, Avatar, Space, Dropdown, Button } from "antd";
import {
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { useAuth } from "../lib/AuthContext";

const { Header: AntHeader } = Layout;
const { Text } = Typography;

export default function Header({ collapsed, setCollapsed }) {
  const { logout, user } = useAuth();

  const handleMenuClick = async ({ key }) => {
    if (key === "logout") {
      await logout();
      // Auth state change will automatically show the login page
    }
  };

  const userMenuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
    },
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: "Settings",
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
      danger: true,
    },
  ];

  return (
    <AntHeader
      style={{
        backgroundColor: "#3366cc",
        borderBottom: "2px solid #2557b8",
        padding: "0 24px",
        height: "72px",
        lineHeight: "72px",
        position: "sticky",
        top: 0,
        zIndex: 99,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
      }}
    >
      {/* Left side: Collapse Button + Title */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Collapse Toggle Button */}
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => setCollapsed(!collapsed)}
          style={{
            fontSize: "18px",
            width: "40px",
            height: "40px",
            color: "#ffffff",
          }}
        />

        {/* Page Title */}
        <div>
          <Text
            strong
            style={{
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: 600,
              display: "block",
              lineHeight: "1.3",
            }}
          >
            Student Financial Assistance Programs
          </Text>
          <Text
            style={{
              color: "#e6f0ff",
              fontSize: "12px",
              display: "block",
              lineHeight: "1.2",
              fontWeight: 400,
            }}
          >
            Commission on Higher Education
          </Text>
        </div>
      </div>

      {/* Right side: User Info */}
      <Dropdown
        menu={{ items: userMenuItems, onClick: handleMenuClick }}
        trigger={["click"]}
        placement="bottomRight"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
            padding: "8px 12px",
            borderRadius: "6px",
            transition: "background-color 0.2s ease",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")
          }
        >
          <Space size="small">
            <div style={{ textAlign: "right" }}>
              <Text
                style={{
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 500,
                  display: "block",
                  lineHeight: "1.3",
                }}
              >
                {user?.username || "Administrator"}
              </Text>
              <Text
                style={{
                  color: "#b3d1ff",
                  fontSize: "12px",
                  display: "block",
                  lineHeight: "1.3",
                }}
              >
                {user?.role || "System Admin"}
              </Text>
            </div>
            <Avatar
              size={36}
              icon={<UserOutlined />}
              style={{
                backgroundColor: "#2557b8",
                color: "#ffffff",
              }}
            />
          </Space>
        </div>
      </Dropdown>
    </AntHeader>
  );
}
