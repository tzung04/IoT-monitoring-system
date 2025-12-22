import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Stack,
  Button,
  Chip,
  Snackbar,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import HistoricalChart from "../components/Charts/HistoricalChart";
import deviceService from "../services/device.service";
import sensorService from "../services/sensor.service";
import { trackEvent } from "../observability/faro";

const ITEMS_PER_PAGE = 10;

const ReportPage = () => {
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState({ open: false, message: "", severity: "info" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [deviceList, alertHistory] = await Promise.all([
        deviceService.getDevices(),
        sensorService.getAlertHistory(),
      ]);
      
      setDevices(deviceList || []);
      setAlerts(alertHistory || []);
      trackEvent("report_page_loaded", { deviceCount: deviceList?.length, alertCount: alertHistory?.length });
    } catch (err) {
      console.error("Load report data error:", err);
      setToast({ open: true, message: "Không thể tải dữ liệu báo cáo", severity: "error" });
    } finally {
      setLoading(false);
    }
  };


  const downloadFile = (fileName, content, mimeType) => {
    try {
      const blob = new Blob([content], { type: mimeType });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error("download file error", err);
    }
  };

  const exportReport = () => {
    try {
      setExporting(true);
      const content = `BÁO CÁO HỆ THỐNG IOT
Ngày: ${new Date().toLocaleString("vi-VN")}

THỐNG KÊ THIẾT BỊ
- Tổng thiết bị: ${deviceStats.total}
- Online: ${deviceStats.online}
- Offline: ${deviceStats.offline}

THỐNG KÊ CẢNH BÁO
- Tổng cảnh báo: ${alertStats.total}
- Cao: ${alertStats.high}
- Trung bình: ${alertStats.medium}
- Thấp: ${alertStats.low}

CHI TIẾT CẢNH BÁO (${alerts.length} cảnh báo)
${alerts.map((a, idx) => `${idx + 1}. ${a.device_id} - ${a.severity?.toUpperCase() || "UNKNOWN"} - ${new Date(a.triggered_at || a.timestamp).toLocaleString("vi-VN")}`).join("\n")}

DANH SÁCH THIẾT BỊ (${devices.length} thiết bị)
${devices.map((d) => `- ${d.name} (ID: ${d.id}, Status: ${d.is_active ? "Online" : "Offline"})`).join("\n")}`;
      
      const fileName = `report_${new Date().toISOString().split("T")[0]}.txt`;
      downloadFile(fileName, content, "text/plain");
      trackEvent("report_exported", { format: "txt" });
      setToast({ open: true, message: "Đã tải xuống báo cáo", severity: "success" });
    } catch (err) {
      console.error("export report error", err);
      setToast({ open: true, message: "Export thất bại", severity: "error" });
    } finally {
      setExporting(false);
    }
  };

  const handleRefresh = () => {
    loadData();
    setToast({ open: true, message: "Đã làm mới báo cáo", severity: "success" });
  };

  // Calculate statistics from loaded data
  const deviceStats = useMemo(() => {
    const total = devices.length;
    const online = devices.filter((d) => d.is_active).length;
    const offline = total - online;
    return { total, online, offline };
  }, [devices]);

  const alertStats = useMemo(() => {
    const total = alerts.length;
    const high = alerts.filter((a) => a.severity === "high").length;
    const medium = alerts.filter((a) => a.severity === "medium").length;
    const low = alerts.filter((a) => a.severity === "low").length;
    return { total, high, medium, low };
  }, [alerts]);

  const alertTrend = useMemo(() => {
    if (alerts.length === 0) return [];
    
    // Group alerts by date
    const grouped = {};
    alerts.forEach((alert) => {
      const date = new Date(alert.triggered_at || alert.timestamp).toLocaleDateString("vi-VN");
      grouped[date] = (grouped[date] || 0) + 1;
    });
    
    return Object.entries(grouped)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => new Date(a.label) - new Date(b.label))
      .slice(-7); // Last 7 days
  }, [alerts]);

  const totalPages = Math.ceil(devices.length / ITEMS_PER_PAGE);
  const paginatedDevices = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return devices.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [devices, currentPage]);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 2 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Báo cáo & Xuất dữ liệu
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Xem tóm tắt hệ thống và lên lịch gửi báo cáo tự động
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={loading}
        >
          Làm mới
        </Button>
      </Box>

      {/* Summary Statistics */}
      <Grid container spacing={2}>
        {/* Device Statistics */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                Tổng thiết bị
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: "primary.main" }}>
                {deviceStats.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                Online
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: "success.main" }}>
                {deviceStats.online}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                Offline
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: "error.main" }}>
                {deviceStats.offline}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                Tổng cảnh báo
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: "warning.main" }}>
                {alertStats.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alert Severity Statistics */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Phân loại cảnh báo
              </Typography>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">High (Cao)</Typography>
                  <Chip
                    label={alertStats.high}
                    color="error"
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Medium (Trung bình)</Typography>
                  <Chip
                    label={alertStats.medium}
                    color="warning"
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Low (Thấp)</Typography>
                  <Chip
                    label={alertStats.low}
                    color="success"
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Alert Trend Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Xu hướng cảnh báo (7 ngày gần đây)
              </Typography>
              {alertTrend && alertTrend.length > 0 ? (
                <HistoricalChart
                  data={alertTrend}
                  xKey="label"
                  series={[{ dataKey: "count", name: "Cảnh báo", color: "#ef5350" }]}
                  stacked={false}
                  height={250}
                />
              ) : (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Typography color="textSecondary">Không có dữ liệu xu hướng</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detailed Statistics Table */}
      {devices && devices.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Danh sách thiết bị
            </Typography>
            <TableContainer>
              <Table>
                <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Tên thiết bị</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>MAC Address</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedDevices.map((device) => (
                    <TableRow key={device.id} sx={{ "&:hover": { backgroundColor: "#fafafa" } }}>
                      <TableCell>{device.id}</TableCell>
                      <TableCell>{device.name}</TableCell>
                      <TableCell sx={{ fontSize: "0.875rem" }}>{device.mac_address || "N/A"}</TableCell>
                      <TableCell>
                        <Chip
                          label={device.is_active ? "Online" : "Offline"}
                          color={device.is_active ? "success" : "error"}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Pagination */}
            {devices.length > 0 && (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 2, mt: 3 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                >
                  ← Trước
                </Button>
                <Typography variant="body2" sx={{ minWidth: "100px", textAlign: "center" }}>
                  Trang {currentPage} / {totalPages}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  Sau →
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Export Options */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            📥 Xuất báo cáo
          </Typography>
          <Stack spacing={2}>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={exportReport}
              disabled={exporting}
              sx={{ alignSelf: "flex-start" }}
            >
              {exporting ? "Đang xuất..." : "Tải xuống báo cáo (TXT)"}
            </Button>
            <Typography variant="caption" color="textSecondary">
              💾 Tải xuống toàn bộ thông tin hệ thống dưới dạng tệp TXT (thống kê, cảnh báo, danh sách thiết bị).
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {/* Snackbar */}
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

export default ReportPage;
