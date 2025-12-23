import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Card, CardContent, Typography, Grid, Stack, Button, Chip,
  Snackbar, Alert, CircularProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, Divider, Avatar
} from "@mui/material";
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Devices as DevicesIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  Warning as WarningIcon,
  Assessment as AssessmentIcon
} from "@mui/icons-material";
import HistoricalChart from "../components/Charts/HistoricalChart";
import deviceService from "../services/device.service";
import sensorService from "../services/sensor.service";

const ReportPage = () => {
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
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
    } catch (err) {
      setToast({ open: true, message: "Không thể tải dữ liệu báo cáo", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Thống kê thiết bị
  const deviceStats = useMemo(() => {
    const total = devices.length;
    const online = devices.filter((d) => d.is_active).length;
    return { total, online, offline: total - online };
  }, [devices]);

  // Thống kê cảnh báo
  const alertStats = useMemo(() => ({
    total: alerts.length,
    high: alerts.filter((a) => a.severity === "high").length,
    medium: alerts.filter((a) => a.severity === "medium").length,
    low: alerts.filter((a) => a.severity === "low").length,
  }), [alerts]);

  // Biểu đồ xu hướng
  const alertTrend = useMemo(() => {
    const grouped = {};
    alerts.forEach((alert) => {
      const date = new Date(alert.triggered_at || alert.timestamp).toLocaleDateString("vi-VN");
      grouped[date] = (grouped[date] || 0) + 1;
    });
    return Object.entries(grouped)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => new Date(a.label.split('/').reverse().join('-')) - new Date(b.label.split('/').reverse().join('-')))
      .slice(-7);
  }, [alerts]);

  const handleExportCSV = () => {
    const headers = ["ID", "Tên thiết bị", "MAC Address", "Trạng thái"];
    const rows = devices.map(d => [d.id, d.name, d.mac_address || "N/A", d.is_active ? "Online" : "Offline"]);
    
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Report_Devices_${new Date().getTime()}.csv`;
    link.click();
    setToast({ open: true, message: "Đã xuất báo cáo CSV thành công", severity: "success" });
  };

  const SummaryCard = ({ title, value, icon, color }) => (
    <Card sx={{ height: '100%', borderBottom: `4px solid ${color}` }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ bgcolor: `${color}15`, color: color }}>{icon}</Avatar>
          <Box>
            <Typography variant="body2" color="textSecondary">{title}</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>{value}</Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  if (loading) return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 10 }}>
      <CircularProgress thickness={5} size={50} />
    </Box>
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, p: { xs: 1, md: 3 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#1e293b" }}>Báo cáo hệ thống</Typography>
          <Typography variant="body2" color="textSecondary">Tổng hợp trạng thái thiết bị và lịch sử cảnh báo</Typography>
        </Box>
        <Button variant="contained" startIcon={<RefreshIcon />} onClick={loadData} sx={{ borderRadius: 2 }}>
          Làm mới
        </Button>
      </Box>

      {/* Summary Row */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard title="Tổng thiết bị" value={deviceStats.total} icon={<DevicesIcon />} color="#6366f1" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard title="Đang Online" value={deviceStats.online} icon={<WifiIcon />} color="#22c55e" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard title="Đang Offline" value={deviceStats.offline} icon={<WifiOffIcon />} color="#ef4444" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard title="Tổng cảnh báo" value={alertStats.total} icon={<WarningIcon />} color="#f59e0b" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Trend Chart */}
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AssessmentIcon color="primary" /> Biến thiên cảnh báo (7 ngày qua)
              </Typography>
              <HistoricalChart
                data={alertTrend}
                xKey="label"
                series={[{ dataKey: "count", name: "Số cảnh báo", color: "#6366f1" }]}
                height={300}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Severity Breakdown */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Mức độ nghiêm trọng</Typography>
              <Stack spacing={3}>
                {[
                  { label: "Cao (High)", count: alertStats.high, color: "error" },
                  { label: "Trung bình (Medium)", count: alertStats.medium, color: "warning" },
                  { label: "Thấp (Low)", count: alertStats.low, color: "success" }
                ].map((item) => (
                  <Box key={item.label}>
                    <Stack direction="row" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" fontWeight={600}>{item.label}</Typography>
                      <Typography variant="body2" fontWeight={800}>{item.count}</Typography>
                    </Stack>
                    <Box sx={{ width: '100%', height: 8, bgcolor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                      <Box sx={{ 
                        width: `${alertStats.total ? (item.count / alertStats.total) * 100 : 0}%`, 
                        height: '100%', 
                        bgcolor: `${item.color}.main`,
                        transition: 'width 1s ease-in-out'
                      }} />
                    </Box>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Device Table */}
      <Card sx={{ borderRadius: 3 }}>
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Chi tiết thiết bị</Typography>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportCSV}>
            Xuất Excel (CSV)
          </Button>
        </Box>
        <Divider />
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: "#f8fafc" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>TÊN THIẾT BỊ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ĐỊA CHỈ MAC</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>TRẠNG THÁI</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {devices.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((device) => (
                <TableRow key={device.id} hover>
                  <TableCell>#{device.id}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{device.name}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{device.mac_address || "---"}</TableCell>
                  <TableCell>
                    <Chip
                      label={device.is_active ? "Đang chạy" : "Ngắt kết nối"}
                      size="small"
                      sx={{ 
                        fontWeight: 700, 
                        bgcolor: device.is_active ? "#dcfce7" : "#fee2e2",
                        color: device.is_active ? "#166534" : "#991b1b"
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={devices.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="Số hàng:"
        />
      </Card>

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast({ ...toast, open: false })}>
        <Alert severity={toast.severity} variant="filled">{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default ReportPage;