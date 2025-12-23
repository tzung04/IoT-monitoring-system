import React, { useState } from "react";
import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, IconButton, Box } from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DevicesIcon from "@mui/icons-material/Devices";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import WarningIcon from "@mui/icons-material/Warning";
import HistoryIcon from "@mui/icons-material/History";
import TimelineIcon from "@mui/icons-material/Timeline";
import AssessmentIcon from "@mui/icons-material/Assessment";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useNavigate, useLocation } from "react-router-dom";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { text: "Dashboard", icon: <DashboardIcon />, path: "/" },
    { text: "Devices", icon: <DevicesIcon />, path: "/devices" },
    { text: "Places", icon: <LocationOnIcon />, path: "/places" },
    { text: "Alerts", icon: <WarningIcon />, path: "/alerts" },
    { text: "Alert History", icon: <HistoryIcon />, path: "/alert-history" },
    { text: "Data Explorer", icon: <TimelineIcon />, path: "/data-explorer" },
    { text: "Reports", icon: <AssessmentIcon />, path: "/reports" },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: collapsed ? 80 : 220,
        flexShrink: 0,
        transition: "width 0.3s ease",
        [`& .MuiDrawer-paper`]: {
          width: collapsed ? 80 : 220,
          boxSizing: "border-box",
          backgroundColor: "#1e293b",
          color: "#fff",
          transition: "width 0.3s ease",
        },
      }}
    >
      <Box sx={{ p: 1, display: "flex", justifyContent: "center" }}>
        <IconButton
          onClick={() => setCollapsed(!collapsed)}
          sx={{ color: "#fff" }}
          size="small"
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Box>
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.text : ""}
              sx={{
                "&.Mui-selected": {
                  backgroundColor: "#334155",
                },
                "&:hover": {
                  backgroundColor: "#475569",
                },
                justifyContent: collapsed ? "center" : "flex-start",
              }}
            >
              <ListItemIcon sx={{ color: "#fff", justifyContent: "center" }}>{item.icon}</ListItemIcon>
              {!collapsed && <ListItemText primary={item.text} />}
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};

export default Sidebar;