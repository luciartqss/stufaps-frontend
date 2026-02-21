import React, { useCallback, useMemo } from "react";
import { Layout, Typography, Avatar, Space, Dropdown } from "antd";
import {
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router";
import { useAuth } from "../lib/AuthContext";

const { Header: AntHeader } = Layout;
const { Text } = Typography;

// ── Static styles & data hoisted out of render ──────────────────────
const headerStyle = {
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
};

const leftGroupStyle = { display: "flex", alignItems: "center", gap: "16px" };

const pageTitleStyle = {
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: 600,
  display: "block",
  lineHeight: "1.3",
};

const pageSubtitleStyle = {
  color: "#e6f0ff",
  fontSize: "12px",
  display: "block",
  lineHeight: "1.2",
  fontWeight: 400,
};

const dropdownTriggerStyle = {
  display: "flex",
  alignItems: "center",
  cursor: "pointer",
  padding: "8px 12px",
  borderRadius: "6px",
  transition: "background-color 0.2s ease",
};

const userNameStyle = {
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 500,
  display: "block",
  lineHeight: "1.3",
};

const userRoleStyle = {
  color: "#b3d1ff",
  fontSize: "12px",
  display: "block",
  lineHeight: "1.3",
};

const avatarStyle = {
  backgroundColor: "#2557b8",
  color: "#ffffff",
};

const USER_MENU_ITEMS = [
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

export default function Header() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleMenuClick = useCallback(({ key }) => {
    if (key === "logout") {
      logout();
      navigate("/");
    }
  }, [logout, navigate]);

  const menuProp = useMemo(
    () => ({ items: USER_MENU_ITEMS, onClick: handleMenuClick }),
    [handleMenuClick]
  );

  return (
    <AntHeader style={headerStyle}>
      {/* Left side: Title */}
      <div style={leftGroupStyle}>
        <div>
          <Text strong style={pageTitleStyle}>
            Student Financial Assistance Programs
          </Text>
          <Text style={pageSubtitleStyle}>
            Commission on Higher Education
          </Text>
        </div>
      </div>

      {/* Right side: User Info */}
      <Dropdown
        menu={menuProp}
        trigger={["click"]}
        placement="bottomRight"
      >
        <div
          style={dropdownTriggerStyle}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")
          }
        >
          <Space size="small">
            <div style={{ textAlign: "right" }}>
              <Text style={userNameStyle}>
                {user?.username || "Administrator"}
              </Text>
              <Text style={userRoleStyle}>
                {user?.role || "System Admin"}
              </Text>
            </div>
            <Avatar
              size={36}
              icon={<UserOutlined />}
              style={avatarStyle}
            />
          </Space>
        </div>
      </Dropdown>
    </AntHeader>
  );
}
