import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Box, AppBar, Toolbar, Typography, Button, Menu, MenuItem } from "@mui/material";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import useAuth from "../../hooks/useAuth";
import authService from "../../services/auth.service";
import Sidebar from "./Sidebar";

const MainLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuOpen = (e) => {
    setAnchorEl(e.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleChangePassword = () => {
    navigate("/change-password");
    handleMenuClose();
  };

  const handleLogout = async () => {
    handleMenuClose();
    try {
      await authService.logout();
    } catch (err) {
      console.error("Logout API error", err);
    }
    logout();
    navigate("/login");
  };

  return (
    <Box sx={{ display: "flex", height: "100vh", backgroundColor: "#f4f6f8" }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Content area */}
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <AppBar position="static" color="primary" sx={{ zIndex: 1 }}>
          <Toolbar sx={{ justifyContent: "space-between" }}>
            <Typography variant="h6">IoT Monitoring System</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Button
                color="inherit"
                startIcon={<AccountCircleIcon />}
                onClick={handleMenuOpen}
              >
                {user?.username || "Guest"}
              </Button>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
              >
                <MenuItem disabled>
                  {user?.email && `${user.email}`}
                </MenuItem>
                <MenuItem onClick={handleChangePassword}>
                  Đổi mật khẩu
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  Đăng xuất
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Page content */}
        <Box sx={{ flexGrow: 1, overflow: "auto", padding: 3 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;