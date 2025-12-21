import React, { useEffect, useState } from "react";
import {
  Box, Card, CardContent, Typography, Stack, TextField, Select, MenuItem,
  Button, Chip, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, CircularProgress, Snackbar, Alert, Grid
} from "@mui/material";

import {
  Refresh as RefreshIcon,
  FileDownload as FileDownloadIcon,
  Clear as ClearIcon,
  FilterList as FilterListIcon,
  Thermostat,           // Nhiệt độ
  WaterDrop,            // Độ ẩm
  NotificationsActive,  // Cảnh báo chung
  Sensors,              // Thiết bị
  AccessTime            // Thời gian
} from "@mui/icons-material";

import sensorService from "../services/sensor.service";
import deviceService from "../services/device.service";
import { trackEvent } from "../observability/faro";

// Helper map icon
const METRIC_ICONS = {
  temperature: <Thermostat color="error" fontSize="small" />,
  humidity: <WaterDrop color="primary" fontSize="small" />,
};

// Helper: Parse type từ message
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
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  const [toast, setToast] = useState({ open: false, message: "", severity: "info" });

  // Filter states
  const [filters, setFilters] = useState({
    deviceId: "",
    severity: "",
    fromDate: "",
    toDate: "",
  });

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

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
      console.error("Load initial data error:", err);
      setToast({ open: true, message: "Không thể tải dữ liệu", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Hàm nội bộ để fetch và transform data
  const fetchAlertsInternal = async (currentFilters) => {
    const params = {};
    if (currentFilters.deviceId) params.device_id = Number(currentFilters.deviceId);
    if (currentFilters.fromDate) params.from = currentFilters.fromDate;
    if (currentFilters.toDate) params.to = currentFilters.toDate;

    const data = await sensorService.getAlertHistory(
      params.device_id || null,
      params.from || null,
      params.to || null
    );

    let transformed = (data || [])
      .sort((a, b) => new Date(b.triggered_at || b.timestamp) - new Date(a.triggered_at || a.timestamp))
      .map((alert) => {
        const type = parseAlertType(alert.message);
        const value = alert.value_at_time;
        const severity = alert.rule_severity ; 
        
        return {
          ...alert,
          id: alert.id || alert.rule_id,
          deviceId: alert.device_id,
          deviceName: alert.device_name, 
          timestamp: alert.triggered_at || alert.timestamp,
          severity: severity,
          type: type,
          value: value 
        };
      });

    // Client-side filtering cho severity
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
      trackEvent("alert_history_filter", filters);
    } catch (err) {
      setToast({ open: true, message: "Lỗi khi lọc dữ liệu", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    const emptyFilters = { deviceId: "", severity: "", fromDate: "", toDate: "" };
    setFilters(emptyFilters);
    setLoading(true);
    fetchAlertsInternal(emptyFilters)
      .then(data => setAlerts(data))
      .finally(() => setLoading(false));
  };

  const handleRefresh = () => {
    handleApplyFilters();
    setToast({ open: true, message: "Đã làm mới dữ liệu", severity: "success" });
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleExportCSV = () => {
    if (alerts.length === 0) {
      setToast({ open: true, message: "Không có dữ liệu để xuất", severity: "warning" });
      return;
    }

    const headers = ["Thời gian", "Thiết bị", "Loại cảnh báo", "Giá trị", "Mức độ", "Tin nhắn"];
    const rows = alerts.map((alert) => [
      new Date(alert.timestamp).toLocaleString("vi-VN"),
      alert.deviceName || `Device #${alert.deviceId}`,
      alert.type,
      alert.value || "N/A",
      alert.severity,
      alert.message || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `alert_history_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    trackEvent("alert_history_exported", { count: alerts.length });
    setToast({ open: true, message: "Đã xuất dữ liệu thành công", severity: "success" });
  };

  const displayedAlerts = alerts.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 2 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <AccessTime color="primary" sx={{ fontSize: 40 }} />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Lịch sử Cảnh báo
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Xem lại toàn bộ sự kiện cảnh báo đã xảy ra
          </Typography>
        </Box>
      </Box>

      {/* Filters Card */}
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" alignItems="center" gap={1} mb={2}>
            <FilterListIcon color="action" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Bộ lọc tìm kiếm
            </Typography>
          </Stack>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Select
                fullWidth
                size="small"
                displayEmpty
                value={filters.deviceId}
                onChange={(e) => setFilters({ ...filters, deviceId: e.target.value })}
              >
                <MenuItem value="">
                  <span style={{ color: "#9e9e9e" }}>Tất cả thiết bị</span>
                </MenuItem>
                {devices.map((device) => (
                  <MenuItem key={device.id} value={device.id}>
                    {device.name} (#{device.id})
                  </MenuItem>
                ))}
              </Select>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Select
                fullWidth
                size="small"
                displayEmpty
                value={filters.severity}
                onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
              >
                <MenuItem value="">
                  <span style={{ color: "#9e9e9e" }}>Tất cả mức độ</span>
                </MenuItem>
                <MenuItem value="high">🔴 High (Cao)</MenuItem>
                <MenuItem value="medium">🟡 Medium (Trung bình)</MenuItem>
                <MenuItem value="low">🟢 Low (Thấp)</MenuItem>
              </Select>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                type="datetime-local"
                label="Từ ngày"
                InputLabelProps={{ shrink: true }}
                value={filters.fromDate}
                onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                type="datetime-local"
                label="Đến ngày"
                InputLabelProps={{ shrink: true }}
                value={filters.toDate}
                onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
              />
            </Grid>
          </Grid>

          <Stack direction="row" spacing={1} sx={{ mt: 3, justifyContent: 'flex-end' }}>
            <Button variant="outlined" color="inherit" onClick={handleClearFilters} startIcon={<ClearIcon />}>
              Xóa bộ lọc
            </Button>
            <Button variant="contained" onClick={handleApplyFilters} startIcon={<FilterListIcon />}>
              Áp dụng
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <Grid container spacing={2}>
        {[
          { label: "Tổng số", value: alerts.length, color: "text.primary" },
          { label: "Nguy hiểm (High)", value: alerts.filter(a => a.severity === 'high').length, color: "error.main" },
          { label: "Cảnh báo (Medium)", value: alerts.filter(a => a.severity === 'medium').length, color: "warning.main" },
          { label: "Thông tin (Low)", value: alerts.filter(a => a.severity === 'low').length, color: "success.main" },
        ].map((stat, index) => (
           <Grid item xs={6} sm={3} key={index}>
             <Card variant="outlined">
               <CardContent sx={{ textAlign: "center", py: 2 }}>
                 <Typography variant="h4" sx={{ fontWeight: 700, color: stat.color }}>
                   {stat.value}
                 </Typography>
                 <Typography variant="body2" color="textSecondary">
                   {stat.label}
                 </Typography>
               </CardContent>
             </Card>
           </Grid>
        ))}
      </Grid>

      {/* Action Bar */}
      <Stack direction="row" justifyContent="flex-end" spacing={1}>
        <Button size="small" startIcon={<RefreshIcon />} onClick={handleRefresh}>
          Làm mới
        </Button>
        <Button size="small" startIcon={<FileDownloadIcon />} onClick={handleExportCSV}>
          Xuất CSV
        </Button>
      </Stack>

      {/* Alerts Table */}
      <Card variant="outlined">
        {loading ? (
           <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
             <CircularProgress />
           </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Thời gian</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Thiết bị</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Loại cảnh báo</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Giá trị</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Mức độ</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Nội dung</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedAlerts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        Không tìm thấy dữ liệu cảnh báo phù hợp.
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedAlerts.map((alert) => {
                      return (
                        <TableRow
                          key={alert.id}
                          hover
                          sx={{
                            backgroundColor:
                              alert.severity === "high" ? "#fff0f0" : 
                              alert.severity === "medium" ? "#fffde7" : "inherit",
                          }}
                        >
                          <TableCell>
                            {new Date(alert.timestamp).toLocaleString("vi-VN")}
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Sensors fontSize="small" color="action"/>
                                <Typography variant="body2">
                                    {alert.deviceName || `Device #${alert.deviceId}`}
                                </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                {METRIC_ICONS[alert.type] || <NotificationsActive fontSize="small" color="disabled"/>}
                                <span style={{ textTransform: 'capitalize' }}>{alert.type}</span>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                            {alert.value !== null && alert.value !== undefined ? alert.value : "-"}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={alert.severity}
                              color={
                                alert.severity === "high" ? "error" : 
                                alert.severity === "medium" ? "warning" : "default"
                              }
                              size="small"
                              variant={alert.severity === "low" ? "outlined" : "filled"}
                            />
                          </TableCell>
                          <TableCell>{alert.message}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={alerts.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Số hàng:"
            />
          </>
        )}
      </Card>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })} sx={{ width: "100%" }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AlertHistoryPage;