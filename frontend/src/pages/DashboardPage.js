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
  Tabs,
  Tab,
} from "@mui/material";
import DeviceHubIcon from "@mui/icons-material/DeviceHub";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import OnlinePredictionIcon from "@mui/icons-material/OnlinePrediction";
import TimelineIcon from "@mui/icons-material/Timeline";
import deviceService from "../services/device.service";
import dashboardService from "../services/dashboard.service";
import useSocket from "../hooks/useSocket";
import * as sensorService from "../services/sensor.service"

const MAX_EVENTS = 12;

const DashboardPage = () => {
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grafanaUrl, setGrafanaUrl] = useState("");
  const [grafanaError, setGrafanaError] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);

  const normalizeAlerts = (list, limit = 50) => {
    const seen = new Set();
    const sorted = [...list].sort(
      (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
    );
    const uniq = [];
    sorted.forEach((item) => {
      const key = item.id || `${item.type}-${item.timestamp}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniq.push(item);
      }
    });
    return uniq.slice(0, limit);
  };

  const pushEvent = (item) => {
    setEvents((prev) => {
      const key = item.key;
      const filtered = key ? prev.filter((e) => e.key !== key) : prev;
      const next = [item, ...filtered];
      return next.slice(0, MAX_EVENTS);
    });
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
          setGrafanaError("Không thể tải Grafana dashboard");
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
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  useSocket((message) => {
    if (!message || !message.type) return;
    
    if (message.type === "device_status") {
      setDevices((prev) =>
        prev.map((d) => (d.id === message.data.id ? { ...d, ...message.data } : d))
      );
      pushEvent({
        ts: Date.now(),
        label: `Device #${message.data.id} ${message.data.status || "unknown"}`,
        type: "device",
      });
    }
    
    if (message.type === "device_added") {
      setDevices((prev) => [...prev, message.data]);
      pushEvent({ ts: Date.now(), label: `Device #${message.data.id} added`, type: "device" });
    }
    
    if (message.type === "device_updated") {
      setDevices((prev) => prev.map((d) => (d.id === message.data.id ? message.data : d)));
      pushEvent({ ts: Date.now(), label: `Device #${message.data.id} updated`, type: "device" });
    }
    
    if (message.type === "device_deleted") {
      setDevices((prev) => prev.filter((d) => d.id !== message.data.id));
      pushEvent({ ts: Date.now(), label: `Device #${message.data.id} deleted`, type: "device" });
    }
    
    if (message.type === "alert") {
      setAlerts((prev) => normalizeAlerts([message.data, ...prev]));
      pushEvent({
        key: `alert-${message.data?.id || message.data?.timestamp || Date.now()}`,
        ts: Date.now(),
        label: message.data?.message || "New alert",
        type: "alert",
        severity: message.data?.severity,
      });
    }
  });

  const stats = useMemo(() => {
    const total = devices.length;
    const online = devices.filter((d) => d.status === "online").length;
    const offline = devices.filter((d) => d.status === "offline").length;
    const inactive = devices.filter((d) => d.status === "inactive").length;
    const recentAlerts = alerts.filter((a) => {
      if (!a.timestamp) return false;
      const alertTime = new Date(a.timestamp).getTime();
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

          <Tabs value={selectedTab} onChange={(e, val) => setSelectedTab(val)} sx={{ mb: 2 }}>
            <Tab label="Overview Dashboard" />
            <Tab label="Temperature" />
            <Tab label="Humidity" />
          </Tabs>

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
                                Device #{a.deviceId} • {a.type} {a.condition || ""} {a.value}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {a.timestamp ? new Date(a.timestamp).toLocaleString() : ""}
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

        <Grid item xs={12} md={6}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Hoạt động realtime
              </Typography>
              {events.length === 0 ? (
                <Typography color="text.secondary">Chưa có hoạt động.</Typography>
              ) : (
                <List dense>
                  {events.map((e, idx) => (
                    <React.Fragment key={`${e.ts}-${idx}`}>
                      <ListItem>
                        <ListItemText
                          primary={e.label}
                          secondary={new Date(e.ts).toLocaleTimeString()}
                        />
                      </ListItem>
                      {idx !== events.length - 1 && <Divider component="li" />}
                    </React.Fragment>
                  ))}
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