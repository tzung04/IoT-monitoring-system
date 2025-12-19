import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Stack,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Button,
  Select,
  MenuItem,
  IconButton,
} from "@mui/material";
import DeviceHubIcon from "@mui/icons-material/DeviceHub";
import SensorsIcon from "@mui/icons-material/Sensors";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import OnlinePredictionIcon from "@mui/icons-material/OnlinePrediction";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import deviceService from "../services/device.service";
import alertService from "../services/alert.service";
import sensorService from "../services/sensor.service";
import dashboardLayoutService from "../services/dashboardLayout.service";
import useSocket from "../hooks/useSocket";
import HistoricalChart from "../components/Charts/HistoricalChart";

const MAX_EVENTS = 12;

const DashboardPage = () => {
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customWidgets, setCustomWidgets] = useState([]);
  const [selectedWidgetType, setSelectedWidgetType] = useState("device_type");
  const [savingLayout, setSavingLayout] = useState(false);
  const [layoutDirty, setLayoutDirty] = useState(false);

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
      const [deviceList, alertHistory, savedLayout] = await Promise.all([
        deviceService.getDevices(),
        sensorService.getAlertHistory(),
        dashboardLayoutService.getLayout(),
      ]);
      setDevices(Array.isArray(deviceList) ? deviceList : []);
      setAlerts(normalizeAlerts(Array.isArray(alertHistory) ? alertHistory : []));
      setCustomWidgets(Array.isArray(savedLayout) ? savedLayout : []);
      setLoading(false);
      setLayoutDirty(false);
    };
    load();
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
    const online = devices.filter((d) => (d.status || "").toLowerCase() === "online").length;
    const offline = total - online;
    const gateway = devices.filter((d) => d.type === "gateway").length;
    const sensor = total - gateway;
    return { total, online, offline, gateway, sensor };
  }, [devices]);

  const deviceTypeData = useMemo(() => {
    const counts = devices.reduce((acc, d) => {
      const key = d.type || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([type, count]) => ({ type, count }));
  }, [devices]);

  const alertSeverityData = useMemo(() => {
    const counts = alerts.reduce(
      (acc, a) => {
        acc[a.severity || "unknown"] = (acc[a.severity || "unknown"] || 0) + 1;
        return acc;
      },
      { low: 0, medium: 0, high: 0 }
    );
    return [
      { severity: "high", count: counts.high || 0 },
      { severity: "medium", count: counts.medium || 0 },
      { severity: "low", count: counts.low || 0 },
    ];
  }, [alerts]);

  const alertTrendData = useMemo(() => {
    const buckets = {};
    alerts.slice(0, 50).forEach((a) => {
      if (!a.timestamp) return;
      const key = new Date(a.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      buckets[key] = (buckets[key] || 0) + 1;
    });
    return Object.entries(buckets).map(([label, count]) => ({ label, count }));
  }, [alerts]);

  const recentAlerts = useMemo(() => alerts.slice(0, 5), [alerts]);

  const statusChip = (severity) => {
    if (severity === "high") return { color: "error", label: "High" };
    if (severity === "medium") return { color: "warning", label: "Medium" };
    return { color: "default", label: "Low" };
  };

  const statCards = [
    { label: "Tổng thiết bị", value: stats.total, icon: <DeviceHubIcon color="primary" /> },
    { label: "Online", value: stats.online, icon: <OnlinePredictionIcon color="success" /> },
    { label: "Offline", value: stats.offline, icon: <OnlinePredictionIcon color="disabled" /> },
    { label: "Alerts (24h)", value: alerts.slice(0, 24).length, icon: <WarningAmberIcon color="warning" /> },
  ];

  const widgetDefinitions = {
    device_type: {
      label: "Thiết bị theo loại",
      render: () => (
        deviceTypeData.length === 0 ? (
          <Typography color="text.secondary">Chưa có dữ liệu.</Typography>
        ) : (
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={deviceTypeData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <XAxis dataKey="type" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#1976d2" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )
      ),
    },
    alert_severity: {
      label: "Phân bố mức độ cảnh báo",
      render: () =>
        alertSeverityData.every((d) => d.count === 0) ? (
          <Typography color="text.secondary">Chưa có alert.</Typography>
        ) : (
          <Stack spacing={1}>
            {alertSeverityData.map((item) => {
              const chip = statusChip(item.severity);
              return (
                <Stack key={item.severity} direction="row" justifyContent="space-between" alignItems="center">
                  <Chip size="small" label={chip.label} color={chip.color} />
                  <Typography variant="h6">{item.count}</Typography>
                </Stack>
              );
            })}
          </Stack>
        ),
    },
    alert_trend: {
      label: "Xu hướng alert gần đây",
      render: () => (
        <HistoricalChart
          data={alertTrendData}
          xKey="label"
          series={[{ dataKey: "count", name: "Alerts", color: "#ef5350" }]}
        />
      ),
    },
  };

  const addCustomWidget = () => {
    const def = widgetDefinitions[selectedWidgetType];
    if (!def) return;
    setCustomWidgets((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), type: selectedWidgetType },
    ]);
    setLayoutDirty(true);
  };

  const removeCustomWidget = (id) => {
    setCustomWidgets((prev) => prev.filter((w) => w.id !== id));
    setLayoutDirty(true);
  };

  const moveWidget = (id, direction) => {
    setCustomWidgets((prev) => {
      const idx = prev.findIndex((w) => w.id === id);
      if (idx === -1) return prev;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.splice(targetIdx, 0, item);
      return next;
    });
    setLayoutDirty(true);
  };

  const saveLayout = async () => {
    try {
      setSavingLayout(true);
      const payload = customWidgets.map((w) => ({ id: w.id, type: w.type }));
      await dashboardLayoutService.saveLayout(payload);
      setLayoutDirty(false);
    } catch (err) {
      console.error("Save layout error", err);
    } finally {
      setSavingLayout(false);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h5" gutterBottom>
        Dashboard
      </Typography>

      <Grid container spacing={2}>
        {statCards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.label}>
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

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle1">Thiết bị theo loại</Typography>
                <SensorsIcon fontSize="small" />
              </Stack>
              {deviceTypeData.length === 0 ? (
                <Typography color="text.secondary">Chưa có dữ liệu.</Typography>
              ) : (
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart data={deviceTypeData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                      <XAxis dataKey="type" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#1976d2" isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle1">Xu hướng alert gần đây</Typography>
                <WarningAmberIcon fontSize="small" />
              </Stack>
              <HistoricalChart
                data={alertTrendData}
                xKey="label"
                series={[{ dataKey: "count", name: "Alerts", color: "#ef5350" }]}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Phân bố mức độ cảnh báo
              </Typography>
              {alertSeverityData.every((d) => d.count === 0) ? (
                <Typography color="text.secondary">Chưa có alert.</Typography>
              ) : (
                <Stack spacing={1}>
                  {alertSeverityData.map((item) => {
                    const chip = statusChip(item.severity);
                    return (
                      <Stack key={item.severity} direction="row" justifyContent="space-between" alignItems="center">
                        <Chip size="small" label={chip.label} color={chip.color} />
                        <Typography variant="h6">{item.count}</Typography>
                      </Stack>
                    );
                  })}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
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
      </Grid>

      <Card>
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center" mb={2}>
            <Typography variant="subtitle1" sx={{ flex: 1 }}>
              Widget tùy chỉnh
            </Typography>
            <Select
              size="small"
              value={selectedWidgetType}
              onChange={(e) => setSelectedWidgetType(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              {Object.entries(widgetDefinitions).map(([key, def]) => (
                <MenuItem key={key} value={key}>
                  {def.label}
                </MenuItem>
              ))}
            </Select>
            <Button variant="contained" onClick={addCustomWidget}>
              Thêm widget
            </Button>
            <Button
              variant="outlined"
              onClick={saveLayout}
              disabled={savingLayout || !layoutDirty}
            >
              {savingLayout ? "Đang lưu..." : "Lưu layout"}
            </Button>
            {!layoutDirty && customWidgets.length > 0 && (
              <Chip label="Đã lưu" size="small" color="success" variant="outlined" />
            )}
          </Stack>

          {customWidgets.length === 0 ? (
            <Typography color="text.secondary">Chưa có widget nào được thêm.</Typography>
          ) : (
            <Grid container spacing={2}>
              {customWidgets.map((w) => {
                const def = widgetDefinitions[w.type];
                if (!def) return null;
                return (
                  <Grid item xs={12} md={6} key={w.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="subtitle1">{def.label}</Typography>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <IconButton size="small" onClick={() => moveWidget(w.id, "up")} disabled={savingLayout}>
                              ↑
                            </IconButton>
                            <IconButton size="small" onClick={() => moveWidget(w.id, "down")} disabled={savingLayout}>
                              ↓
                            </IconButton>
                            <IconButton size="small" onClick={() => removeCustomWidget(w.id)} disabled={savingLayout}>
                              ✕
                            </IconButton>
                          </Stack>
                        </Stack>
                        {def.render()}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </CardContent>
      </Card>

      <Card>
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
    </Box>
  );
};

export default DashboardPage;
