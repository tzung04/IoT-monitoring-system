import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Card, CardContent, Typography, Grid, Stack, Chip, Avatar,
  ListItem, ListItemText, CircularProgress, Alert, Skeleton, Divider
} from "@mui/material";
import DeviceHubIcon from "@mui/icons-material/DeviceHub";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import OnlinePredictionIcon from "@mui/icons-material/OnlinePrediction";
import TimelineIcon from "@mui/icons-material/Timeline";
import deviceService from "../services/device.service";
import dashboardService from "../services/dashboard.service";
import * as sensorService from "../services/sensor.service";

const DashboardPage = () => {
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grafanaUrl, setGrafanaUrl] = useState("");
  const [grafanaError, setGrafanaError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [deviceList, alertHistory, dashboardData] = await Promise.all([
          deviceService.getDevices(),
          sensorService.getAllAlertHistory(),
          dashboardService.getDashboardUrl(),
        ]);
        
        setDevices(Array.isArray(deviceList) ? deviceList : []);
        setAlerts(normalizeAlerts(Array.isArray(alertHistory) ? alertHistory : []));
        if (dashboardData?.embedUrl) setGrafanaUrl(dashboardData.embedUrl);
        else setGrafanaError("Chưa có cấu hình dashboard!");
      } catch (err) {
        setGrafanaError(err.message || "Lỗi khi kết nối hệ thống");
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  const normalizeAlerts = (list) => {
    return [...list].sort((a, b) => 
      new Date(b.triggered_at || b.timestamp).getTime() - new Date(a.triggered_at || a.timestamp).getTime()
    ).slice(0, 10);
  };

  const stats = useMemo(() => {
    const total = devices.length;
    const online = devices.filter((d) => d.status === "online").length;
    const offline = devices.filter((d) => d.status === "offline").length;
    const inactive = devices.filter((d) => d.status === "inactive").length;
    const recentAlertsCount = alerts.filter(a => 
      new Date(a.triggered_at || a.timestamp).getTime() > Date.now() - 86400000
    ).length;
    return { total, online, offline, inactive, recentAlertsCount };
  }, [devices, alerts]);

  const statCards = [
    { label: "Tổng thiết bị", value: stats.total, icon: <DeviceHubIcon />, color: "#1976d2" },
    { label: "Online", value: stats.online, icon: <OnlinePredictionIcon />, color: "#2e7d32" },
    { label: "Offline", value: stats.offline, icon: <OnlinePredictionIcon />, color: "#d32f2f" },
    { label: "Inactive", value: stats.inactive, icon: <OnlinePredictionIcon />, color: "#9e9e9e" },
    { label: "Cảnh báo (24h)", value: stats.recentAlertsCount, icon: <WarningAmberIcon />, color: "#ed6c02" },
  ];

  return (
    <Box sx={{ p: { xs: 1, md: 3 }, display: "flex", flexDirection: "column", gap: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>Dashboard</Typography>

      {/* 1. Stats Cards - 5 Cột cân đối */}
      <Grid container spacing={2}>
        {statCards.map((card) => (
          <Grid item xs={12} sm={6} md={2.4} key={card.label}>
            <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: `${card.color}15`, color: card.color }}>{card.icon}</Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>{card.label}</Typography>
                    <Typography variant="h5" fontWeight={800}>{loading ? <Skeleton width={40} /> : card.value}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 2. Grafana Dashboard - FULL WIDTH */}
      <Card sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TimelineIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>Sensor Data Visualization</Typography>
          </Stack>
          <Chip label="LIVE" size="small" color="error" variant="outlined" sx={{ fontWeight: 800 }} />
        </Box>
        <Divider />
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ height: 600, display: "flex", justifyContent: "center", alignItems: "center" }}><CircularProgress /></Box>
          ) : grafanaError ? (
            <Box sx={{ p: 4 }}><Alert severity="warning">{grafanaError}</Alert></Box>
          ) : (
            <Box sx={{ width: "100%", height: 700, bgcolor: "#f8fafc" }}>
              <iframe src={grafanaUrl} width="100%" height="100%" style={{ border: "none" }} title="Grafana" allowFullScreen />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 3. Alert History - DƯỚI CÙNG & FULL WIDTH */}
      <Card sx={{ borderRadius: 3 }}>
        <Box sx={{ p: 2, bgcolor: "#fcfcfc" }}>
          <Typography variant="h6" fontWeight={700}>Lịch sử cảnh báo</Typography>
        </Box>
        <Divider />
        <CardContent sx={{ p: 0 }}>
          {alerts.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}><Typography color="text.secondary">Chưa có dữ liệu cảnh báo.</Typography></Box>
          ) : (
            <Grid container>
              {alerts.map((a, idx) => (
                <Grid item xs={12} md={6} key={a.id || idx}>
                  <ListItem divider sx={{ py: 2 }}>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Chip 
                            label={a.severity?.toUpperCase() || "MEDIUM"} 
                            color={a.severity === "high" ? "error" : "warning"} 
                            size="small" 
                            sx={{ fontWeight: 700, width: 80 }} 
                          />
                          <Typography variant="body2" fontWeight={700}>{a.message || "Cảnh báo thiết bị"}</Typography>
                        </Stack>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 12.5, display: 'block', mt: 0.5 }}>
                          Thiết bị: <b>{a.device_name || `ID ${a.device_id}`}</b> • {new Date(a.triggered_at || a.timestamp).toLocaleString("vi-VN")}
                        </Typography>
                      }
                    />
                  </ListItem>
                </Grid>
              ))}
            </Grid>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default DashboardPage;