import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  TextField,
  Select,
  MenuItem,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
  Snackbar,
  Alert,
  Grid,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import ClearIcon from "@mui/icons-material/Clear";
import sensorService from "../services/sensor.service";
import deviceService from "../services/device.service";
import { trackEvent } from "../observability/faro";

const AlertHistoryPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
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
      const deviceList = await deviceService.getDevices();
      setDevices(deviceList || []);
      await loadAlerts();
    } catch (err) {
      console.error("Load initial data error:", err);
      setToast({ open: true, message: "Không thể tải dữ liệu", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const params = {};
      if (filters.deviceId) params.device_id = Number(filters.deviceId);
      if (filters.fromDate) params.from = filters.fromDate;
      if (filters.toDate) params.to = filters.toDate;

      const alertHistory = await sensorService.getAlertHistory(
        params.device_id || null,
        params.from || null,
        params.to || null
      );

      // Transform and filter alerts
      let transformedAlerts = (alertHistory || [])
        .sort((a, b) => new Date(b.triggered_at || b.timestamp) - new Date(a.triggered_at || a.timestamp))
        .map((alert) => ({
          ...alert,
          id: alert.id || alert.alert_rule_id,
          deviceId: alert.device_id,
          timestamp: alert.triggered_at || alert.timestamp,
          severity: alert.severity || "medium",
        }));

      // Filter by severity if specified
      if (filters.severity) {
        transformedAlerts = transformedAlerts.filter(
          (a) => a.severity === filters.severity
        );
      }

      setAlerts(transformedAlerts);
      setPage(0); // Reset to first page
      
      trackEvent("alert_history_loaded", {
        count: transformedAlerts.length,
        filters: Object.keys(filters).reduce((acc, key) => {
          if (filters[key]) acc[key] = 1;
          return acc;
        }, {}),
      });
    } catch (err) {
      console.error("Load alerts error:", err);
      setToast({ open: true, message: "Không thể tải lịch sử cảnh báo", severity: "error" });
      setAlerts([]);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleApplyFilters = () => {
    loadAlerts();
  };

  const handleClearFilters = () => {
    setFilters({
      deviceId: "",
      severity: "",
      fromDate: "",
      toDate: "",
    });
    // Load alerts without filters
    setTimeout(() => loadAlerts(), 0);
  };

  const handleRefresh = () => {
    loadAlerts();
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
    const rows = alerts.map((alert) => {
      const device = devices.find((d) => d.id === alert.deviceId);
      return [
        new Date(alert.timestamp).toLocaleString("vi-VN"),
        device?.name || `Device #${alert.deviceId}`,
        alert.type || "Unknown",
        alert.value || "N/A",
        alert.severity || "N/A",
        alert.message || "",
      ];
    });

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `alert_history_${new Date().getTime()}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    trackEvent("alert_history_exported", { count: alerts.length });
    setToast({ open: true, message: "Đã xuất dữ liệu", severity: "success" });
  };

  const displayedAlerts = alerts.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 2 }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          📊 Lịch sử Cảnh báo
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Xem và quản lý tất cả các sự kiện cảnh báo từ các thiết bị
        </Typography>
      </Box>

      {loading && alerts.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Filters */}
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                🔍 Bộ lọc
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Select
                    fullWidth
                    size="small"
                    displayEmpty
                    value={filters.deviceId}
                    onChange={(e) => handleFilterChange("deviceId", e.target.value)}
                    renderValue={(value) =>
                      value ? (
                        devices.find((d) => d.id === Number(value))?.name || `Device #${value}`
                      ) : (
                        <span style={{ color: "#9e9e9e" }}>Tất cả thiết bị</span>
                      )
                    }
                  >
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
                    onChange={(e) => handleFilterChange("severity", e.target.value)}
                    renderValue={(value) =>
                      value ? (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          {value === "high" && "🔴"}
                          {value === "medium" && "🟡"}
                          {value === "low" && "🟢"}
                          {value.charAt(0).toUpperCase() + value.slice(1)}
                        </Box>
                      ) : (
                        <span style={{ color: "#9e9e9e" }}>Tất cả mức độ</span>
                      )
                    }
                  >
                    <MenuItem value="high">🔴 High</MenuItem>
                    <MenuItem value="medium">🟡 Medium</MenuItem>
                    <MenuItem value="low">🟢 Low</MenuItem>
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
                    onChange={(e) => handleFilterChange("fromDate", e.target.value)}
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
                    onChange={(e) => handleFilterChange("toDate", e.target.value)}
                  />
                </Grid>
              </Grid>

              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleApplyFilters}
                >
                  Áp dụng bộ lọc
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ClearIcon />}
                  onClick={handleClearFilters}
                >
                  Xóa bộ lọc
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={handleRefresh}
                >
                  Làm mới
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FileDownloadIcon />}
                  onClick={handleExportCSV}
                >
                  Xuất CSV
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {/* Stats */}
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent sx={{ textAlign: "center" }}>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    Tổng cộng
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {alerts.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent sx={{ textAlign: "center" }}>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    🔴 High
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "error.main" }}>
                    {alerts.filter((a) => a.severity === "high").length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent sx={{ textAlign: "center" }}>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    🟡 Medium
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "warning.main" }}>
                    {alerts.filter((a) => a.severity === "medium").length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent sx={{ textAlign: "center" }}>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    🟢 Low
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "success.main" }}>
                    {alerts.filter((a) => a.severity === "low").length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Alerts Table */}
          <Card>
            <TableContainer>
              <Table>
                <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Thời gian</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Thiết bị</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Loại cảnh báo</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Giá trị</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Mức độ</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Tin nhắn</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedAlerts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography color="textSecondary">
                          Không có cảnh báo nào phù hợp.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedAlerts.map((alert) => {
                      const device = devices.find((d) => d.id === alert.deviceId);
                      return (
                        <TableRow
                          key={alert.id}
                          sx={{
                            "&:hover": { backgroundColor: "#f9f9f9" },
                            backgroundColor:
                              alert.severity === "high"
                                ? "#ffebee"
                                : alert.severity === "medium"
                                ? "#fff8e1"
                                : "transparent",
                          }}
                        >
                          <TableCell sx={{ fontSize: "0.875rem" }}>
                            {new Date(alert.timestamp).toLocaleString("vi-VN")}
                          </TableCell>
                          <TableCell sx={{ fontSize: "0.875rem" }}>
                            {device?.name || `Device #${alert.deviceId}`}
                          </TableCell>
                          <TableCell sx={{ fontSize: "0.875rem" }}>
                            {alert.type || "Unknown"}
                          </TableCell>
                          <TableCell sx={{ fontSize: "0.875rem" }}>
                            {alert.value || "N/A"}
                          </TableCell>
                          <TableCell sx={{ fontSize: "0.875rem" }}>
                            <Chip
                              label={alert.severity || "N/A"}
                              color={
                                alert.severity === "high"
                                  ? "error"
                                  : alert.severity === "medium"
                                  ? "warning"
                                  : "default"
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell sx={{ fontSize: "0.875rem" }}>
                            {alert.message || "-"}
                          </TableCell>
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
              labelRowsPerPage="Hàng mỗi trang:"
            />
          </Card>
        </>
      )}

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast({ ...toast, open: false })}
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AlertHistoryPage;
