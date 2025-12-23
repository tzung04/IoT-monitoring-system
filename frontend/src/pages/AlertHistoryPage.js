import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Card, CardContent, Typography, Stack, TextField, Select, MenuItem,
  Button, Chip, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, CircularProgress, Snackbar, Alert, Grid,
  Paper, IconButton, Tooltip, Divider, Container
} from "@mui/material";

import {
  Refresh as RefreshIcon,
  FileDownload as FileDownloadIcon,
  Clear as ClearIcon,
  FilterList as FilterListIcon,
  Thermostat,
  WaterDrop,
  NotificationsActive,
  Sensors,
  AccessTime,
  HistoryEdu,
  Search
} from "@mui/icons-material";

import sensorService from "../services/sensor.service";
import deviceService from "../services/device.service";

const METRIC_ICONS = {
  temperature: <Thermostat sx={{ color: "#ef4444", fontSize: 18 }} />,
  humidity: <WaterDrop sx={{ color: "#3b82f6", fontSize: 18 }} />,
};

const parseAlertType = (message) => {
  if (!message) return "unknown";
  const msg = message.toLowerCase();
  if (msg.includes("temperature") || msg.includes("nhiệt độ")) return "temperature";
  if (msg.includes("humidity") || msg.includes("độ ẩm")) return "humidity";
  return "unknown";
};

const AlertHistoryPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [toast, setToast] = useState({ open: false, message: "", severity: "info" });

  const [filters, setFilters] = useState({
    deviceId: "",
    severity: "",
    fromDate: "",
    toDate: "",
  });

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [deviceList, alertData] = await Promise.all([
        deviceService.getDevices(),
        fetchAlertsInternal({})
      ]);
      setDevices(deviceList || []);
      setAlerts(alertData || []);
    } catch (err) {
      setToast({ open: true, message: "Lỗi tải dữ liệu hệ thống", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadInitialData(); }, []);

  const fetchAlertsInternal = async (currentFilters) => {
    const data = await sensorService.getAlertHistory(
      currentFilters.deviceId || null,
      currentFilters.fromDate || null,
      currentFilters.toDate || null
    );

    let transformed = (data || [])
      .sort((a, b) => new Date(b.triggered_at || b.timestamp) - new Date(a.triggered_at || a.timestamp))
      .map((alert) => ({
        ...alert,
        id: alert.id || alert.rule_id,
        deviceName: alert.device_name, 
        timestamp: alert.triggered_at || alert.timestamp,
        severity: alert.rule_severity,
        type: parseAlertType(alert.message),
        value: alert.value_at_time 
      }));

    if (currentFilters.severity) {
      transformed = transformed.filter((a) => a.severity === currentFilters.severity);
    }
    return transformed;
  };

  const handleApplyFilters = async () => {
    setLoading(true);
    try {
      const data = await fetchAlertsInternal(filters);
      setAlerts(data);
      setPage(0);
      setToast({ open: true, message: "Đã cập nhật kết quả lọc", severity: "success" });
    } catch (err) {
      setToast({ open: true, message: "Lỗi khi lọc dữ liệu", severity: "error" });
    } finally { setLoading(false); }
  };

  const handleClearFilters = () => {
    setFilters({ deviceId: "", severity: "", fromDate: "", toDate: "" });
    loadInitialData();
  };

  const handleExportCSV = () => {
    if (alerts.length === 0) return setToast({ open: true, message: "Không có dữ liệu để xuất", severity: "warning" });
    const headers = ["Thời gian", "Thiết bị", "Loại", "Giá trị", "Mức độ", "Nội dung"];
    const rows = alerts.map(a => [
      new Date(a.timestamp).toLocaleString("vi-VN"),
      a.deviceName || `Device #${a.deviceId}`,
      a.type, a.value || "N/A", a.severity, a.message || ""
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Log_Canh_Bao_${new Date().toLocaleDateString()}.csv`;
    link.click();
  };

  const displayedAlerts = alerts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box sx={{ bgcolor: "#f1f5f9", minHeight: "100vh", py: 4 }}>
      <Container maxWidth="lg">
        {/* Header Section */}
        <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ p: 1.5, bgcolor: "primary.main", borderRadius: 3, display: "flex", color: "white", boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)" }}>
              <HistoryEdu fontSize="large" />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: "#1e293b", letterSpacing: "-1px" }}>
                Nhật ký Sự kiện
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Truy xuất và phân tích lịch sử cảnh báo của toàn hệ thống
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Làm mới dữ liệu">
              <IconButton onClick={handleApplyFilters} sx={{ bgcolor: "white", boxShadow: 1 }}><RefreshIcon /></IconButton>
            </Tooltip>
            <Button variant="contained" startIcon={<FileDownloadIcon />} onClick={handleExportCSV} sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}>
              Xuất báo cáo
            </Button>
          </Stack>
        </Box>

        {/* Filters Panel */}
        <Card sx={{ borderRadius: 4, mb: 4, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" }}>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block', color: '#64748b' }}>THIẾT BỊ</Typography>
                <Select
                  fullWidth size="small" displayEmpty value={filters.deviceId}
                  onChange={(e) => setFilters({ ...filters, deviceId: e.target.value })}
                  sx={{ borderRadius: 2, bgcolor: "#f8fafc" }}
                >
                  <MenuItem value="">Tất cả thiết bị</MenuItem>
                  {devices.map(d => <MenuItem key={d.id} value={d.id}>{d.name} (#{d.id})</MenuItem>)}
                </Select>
              </Grid>
              <Grid item xs={12} md={2}>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block', color: '#64748b' }}>MỨC ĐỘ</Typography>
                <Select
                  fullWidth size="small" displayEmpty value={filters.severity}
                  onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                  sx={{ borderRadius: 2, bgcolor: "#f8fafc" }}
                >
                  <MenuItem value="">Mọi mức độ</MenuItem>
                  <MenuItem value="high">🔴 Nguy hiểm</MenuItem>
                  <MenuItem value="medium">🟡 Cảnh báo</MenuItem>
                  <MenuItem value="low">🟢 Thông tin</MenuItem>
                </Select>
              </Grid>
              <Grid item xs={12} md={2.5}>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block', color: '#64748b' }}>TỪ NGÀY</Typography>
                <TextField fullWidth size="small" type="date" value={filters.fromDate} onChange={(e) => setFilters({...filters, fromDate: e.target.value})} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#f8fafc" } }} />
              </Grid>
              <Grid item xs={12} md={2.5}>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block', color: '#64748b' }}>ĐẾN NGÀY</Typography>
                <TextField fullWidth size="small" type="date" value={filters.toDate} onChange={(e) => setFilters({...filters, toDate: e.target.value})} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#f8fafc" } }} />
              </Grid>
              <Grid item xs={12} md={2}>
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Button fullWidth variant="outlined" color="inherit" onClick={handleClearFilters} sx={{ borderRadius: 2, textTransform: 'none' }}><ClearIcon fontSize="small" /></Button>
                  <Button fullWidth variant="contained" onClick={handleApplyFilters} sx={{ borderRadius: 2, textTransform: 'none' }}><Search fontSize="small" /></Button>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Metrics Grid */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[
            { label: "Tổng sự kiện", value: alerts.length, color: "#1e293b", bg: "#f1f5f9" },
            { label: "Nguy hiểm (High)", value: alerts.filter(a => a.severity === 'high').length, color: "#ef4444", bg: "#fef2f2" },
            { label: "Cảnh báo (Medium)", value: alerts.filter(a => a.severity === 'medium').length, color: "#f59e0b", bg: "#fffbeb" },
            { label: "Thông tin (Low)", value: alerts.filter(a => a.severity === 'low').length, color: "#10b981", bg: "#f0fdf4" },
          ].map((stat, i) => (
            <Grid item xs={6} sm={3} key={i}>
              <Paper sx={{ p: 2, borderRadius: 4, textAlign: "center", bgcolor: stat.bg, border: "1px solid rgba(0,0,0,0.05)" }} elevation={0}>
                <Typography variant="h4" sx={{ fontWeight: 900, color: stat.color }}>{stat.value}</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", textTransform: 'uppercase' }}>{stat.label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Data Table */}
        <Card sx={{ borderRadius: 5, overflow: 'hidden', border: "1px solid #e2e8f0", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05)" }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}><CircularProgress thickness={5} /></Box>
          ) : (
            <>
              <TableContainer>
                <Table sx={{ minWidth: 800 }}>
                  <TableHead sx={{ bgcolor: "#f8fafc" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, color: "#475569" }}>THỜI GIAN</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: "#475569" }}>THIẾT BỊ</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: "#475569" }}>LOẠI</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: "#475569" }}>GIÁ TRỊ</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: "#475569" }}>MỨC ĐỘ</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: "#475569" }}>NỘI DUNG CHI TIẾT</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {displayedAlerts.length === 0 ? (
                      <TableRow><TableCell colSpan={6} align="center" sx={{ py: 10, color: '#94a3b8' }}>Không có dữ liệu lịch sử nào được tìm thấy.</TableCell></TableRow>
                    ) : (
                      displayedAlerts.map((alert) => (
                        <TableRow key={alert.id} hover sx={{ 
                          transition: '0.2s',
                          "&:hover": { bgcolor: "#f8fafc !important" },
                          bgcolor: alert.severity === 'high' ? "rgba(239, 68, 68, 0.02)" : "inherit"
                        }}>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <AccessTime sx={{ fontSize: 16, color: "#94a3b8" }} />
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>{new Date(alert.timestamp).toLocaleString("vi-VN")}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Sensors sx={{ fontSize: 18, color: "primary.main" }} />
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{alert.deviceName || `ID: ${alert.deviceId}`}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              {METRIC_ICONS[alert.type]}
                              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>{alert.type}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ px: 1.5, py: 0.5, bgcolor: "#f1f5f9", borderRadius: 1.5, display: 'inline-block', fontWeight: 800, color: "#1e293b", fontFamily: 'monospace' }}>
                              {alert.value || "-"}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={alert.severity} 
                              size="small"
                              sx={{ 
                                fontWeight: 800, fontSize: 10, textTransform: 'uppercase',
                                bgcolor: alert.severity === 'high' ? "#ef4444" : alert.severity === 'medium' ? "#f59e0b" : "#10b981",
                                color: "white"
                              }} 
                            />
                          </TableCell>
                          <TableCell sx={{ color: "#475569", fontSize: '0.875rem', maxWidth: 300 }}>{alert.message}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <Divider />
              <TablePagination
                rowsPerPageOptions={[10, 25, 50]}
                component="div"
                count={alerts.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(e, p) => setPage(p)}
                onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                labelRowsPerPage="Hiển thị:"
              />
            </>
          )}
        </Card>
      </Container>

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast({ ...toast, open: false })} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={toast.severity} sx={{ borderRadius: 3, fontWeight: 600 }}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AlertHistoryPage;