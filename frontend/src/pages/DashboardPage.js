import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Stack,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Alert,
} from "@mui/material";
import DeviceHubIcon from "@mui/icons-material/DeviceHub";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import OnlinePredictionIcon from "@mui/icons-material/OnlinePrediction";
import TimelineIcon from "@mui/icons-material/Timeline";
import deviceService from "../services/device.service";
import dashboardService from "../services/dashboard.service";
import * as sensorService from "../services/sensor.service"


const DashboardPage = () => {
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grafanaUrl, setGrafanaUrl] = useState("");
  const [grafanaError, setGrafanaError] = useState(null);

  const normalizeAlerts = (list, limit = 50) => {
    const seen = new Set();
    const sorted = [...list].sort(
      (a, b) => new Date(b.triggered_at || 0).getTime() - new Date(a.triggered_at || 0).getTime()
    );
    const uniq = [];
    sorted.forEach((item) => {
      const key = item.id || `${item.type}-${item.triggered_at}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniq.push({
          ...item,
          severity: item.rule_severity || "medium"
        });
      }
    });
    return uniq.slice(0, limit);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [deviceList, alertHistory, dashboardData] = await Promise.all([
          deviceService.getDevices(),
          sensorService.getAllAlertHistory(),
          dashboardService.getDashboardUrl(),
        ]);
        
        setDevices(Array.isArray(deviceList) ? deviceList : []);
        setAlerts(normalizeAlerts(Array.isArray(alertHistory) ? alertHistory : []));
        
        if (dashboardData && dashboardData.embedUrl) {
          setGrafanaUrl(dashboardData.embedUrl);
        } else {
          setGrafanaError("Chưa có thiết bị để hiển thị!");
        }
      } catch (err) {
        console.error("Load dashboard error:", err);
        setGrafanaError(err.message || "Lỗi khi tải dashboard");
      } finally {
        setLoading(false);
      }
    };
    load();
    
    // Auto-refresh mỗi 60 giây
    const interval = setInterval(() => {
      deviceService.getDevices().then(deviceList => {
        setDevices(Array.isArray(deviceList) ? deviceList : []);
      }).catch(err => {
        console.error("Auto-refresh error:", err);
      });
      
      sensorService.getAllAlertHistory().then(alertHistory => {
        setAlerts(normalizeAlerts(Array.isArray(alertHistory) ? alertHistory : []));
      }).catch(err => {
        console.error("Alert refresh error:", err);
      });
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    const total = devices.length;
    const online = devices.filter((d) => d.status === "online").length;
    const offline = devices.filter((d) => d.status === "offline").length;
    const inactive = devices.filter((d) => d.status === "inactive").length;
    
    const recentAlerts = alerts.filter((a) => {
      const timestamp = a.triggered_at || a.timestamp;
      if (!timestamp) return false;
      const alertTime = new Date(timestamp).getTime();
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      return alertTime > oneDayAgo;
    }).length;
    
    return { total, online, offline, inactive, recentAlerts };
  }, [devices, alerts]);

  const recentAlerts = useMemo(() => alerts.slice(0, 5), [alerts]);

  const statusChip = (severity) => {
    if (severity === "high") return { color: "error", label: "High" };
    if (severity === "medium") return { color: "warning", label: "Medium" };
    return { color: "default", label: "Low" };
  };

  const statCards = [
    { label: "Tổng thiết bị", value: stats.total, icon: <DeviceHubIcon color="primary" /> },
    { label: "Online", value: stats.online, icon: <OnlinePredictionIcon color="success" /> },
    { label: "Offline", value: stats.offline, icon: <OnlinePredictionIcon color="error" /> },
    { label: "Inactive", value: stats.inactive, icon: <OnlinePredictionIcon sx={{ color: '#9e9e9e' }} /> },
    { label: "Alerts (24h)", value: stats.recentAlerts, icon: <WarningAmberIcon color="warning" /> },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h5" gutterBottom>
        Dashboard
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={2}>
        {statCards.map((card) => (
          <Grid item xs={12} sm={6} md={2.4} key={card.label}>
            <Card>
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: "#e3f2fd", color: "#1976d2" }}>{card.icon}</Avatar>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      {card.label}
                    </Typography>
                    <Typography variant="h5">{loading ? "…" : card.value}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Grafana Dashboard */}
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <TimelineIcon color="primary" />
              <Typography variant="h6">Sensor Data Visualization</Typography>
            </Stack>
            <Chip 
              label="Powered by Grafana" 
              size="small" 
              variant="outlined" 
              color="primary"
            />
          </Stack>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress />
            </Box>
          ) : grafanaError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {grafanaError}
            </Alert>
          ) : (
            <Box sx={{ position: "relative", width: "100%", height: 700, minHeight: 500, bgcolor: "#f5f5f5", borderRadius: 1 }}>
              <iframe
                src={grafanaUrl}
                width="100%"
                height="100%"
                style={{
                  border: "none",
                  borderRadius: "4px",
                }}
                title="Grafana Dashboard"
              />
            </Box>
          )}

          {!loading && !grafanaError && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              Dashboard hiển thị dữ liệu real-time từ tất cả thiết bị của bạn.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Recent Alerts & Activity */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Alert mới nhất
              </Typography>
              {recentAlerts.length === 0 ? (
                <Typography color="text.secondary">Chưa có alert.</Typography>
              ) : (
                <List dense>
                  {recentAlerts.map((a) => {
                    const chip = statusChip(a.severity);
                    const timestamp = a.triggered_at || a.timestamp;
                    return (
                      <ListItem key={a.id} alignItems="flex-start" divider>
                        <ListItemText
                          primary={
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Chip label={chip.label} color={chip.color} size="small" />
                              <Typography fontWeight={600}>{a.message || `${a.type} alert`}</Typography>
                            </Stack>
                          }
                          slotProps={{
                            secondary: {
                              component: 'div'
                            }
                          }}
                          secondary={
                            <Stack spacing={0.5}>
                              <Typography variant="body2" color="text.secondary">
                                Device #{a.device_id} • {a.device_name || `Device ${a.device_id}`}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {timestamp ? new Date(timestamp).toLocaleString() : ""}
                              </Typography>
                            </Stack>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;