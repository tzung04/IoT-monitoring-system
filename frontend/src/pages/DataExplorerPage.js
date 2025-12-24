import React, { useEffect, useState, useMemo } from "react";
import {
  Box, Card, CardContent, Typography, Stack, TextField, Select, MenuItem,
  Button, CircularProgress, Snackbar, Alert, Grid, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TablePagination, Collapse
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import ClearIcon from "@mui/icons-material/Clear";
import sensorService from "../services/sensor.service";
import deviceService from "../services/device.service";
import HistoricalChart from "../components/Charts/HistoricalChart";

const DataExplorerPage = () => {
  const [devices, setDevices] = useState([]);
  const [sensorData, setSensorData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [toast, setToast] = useState({ open: false, message: "", severity: "info" });

  // Khởi tạo: fromDate và toDate mặc định là chuỗi rỗng
  const [filters, setFilters] = useState({
    deviceId: "",
    hours: "24",
    fromDate: "",
    toDate: "",
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const deviceList = await deviceService.getDevices();
      setDevices(deviceList || []);
      if (deviceList && deviceList.length > 0) {
        setFilters(prev => ({ ...prev, deviceId: String(deviceList[0].id) }));
      }
    } catch (err) {
      setToast({ open: true, message: "Không thể tải danh sách thiết bị", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    if (!filters.deviceId) {
      setToast({ open: true, message: "Vui lòng chọn thiết bị", severity: "warning" });
      return;
    }

    try {
      setLoading(true);
      const deviceId = Number(filters.deviceId);
      const hours = filters.hours === "custom" ? 0 : Number(filters.hours);

      // Kiểm tra nếu chọn custom mà chưa nhập ngày
      if (filters.hours === "custom" && (!filters.fromDate || !filters.toDate)) {
        setToast({ open: true, message: "Vui lòng chọn đầy đủ khoảng ngày", severity: "warning" });
        setLoading(false);
        return;
      }

      const response = await sensorService.getDeviceData(deviceId, hours, filters.fromDate, filters.toDate);
      const dataPoints = response.data || [];
      setSensorData(dataPoints);
      
      const chartDataMap = new Map();
      dataPoints.forEach((point) => {
        const timeKey = new Date(point.timestamp).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' });
        if (!chartDataMap.has(timeKey)) chartDataMap.set(timeKey, { label: timeKey, timestamp: point.timestamp });
        const entry = chartDataMap.get(timeKey);
        if (point.metric_type === "temperature") entry.temperature = Number(point.value);
        else if (point.metric_type === "humidity") entry.humidity = Number(point.value);
      });

      const chartDataArray = Array.from(chartDataMap.values()).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      setChartData({
        data: chartDataArray,
        series: [
          { dataKey: "temperature", name: "🌡️ Temperature (°C)", color: "#ff6b6b" },
          { dataKey: "humidity", name: "💧 Humidity (%)", color: "#4ecdc4" }
        ],
      });
      setPage(0);
      setToast({ open: true, message: `Tải ${dataPoints.length} điểm dữ liệu thành công`, severity: "success" });
    } catch (err) {
      setToast({ open: true, message: err.message || "Không thể tải dữ liệu cảm biến", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!sensorData || sensorData.length === 0) {
      setToast({ open: true, message: "Không có dữ liệu để xuất!", severity: "warning" });
      return;
    }

    try {
      const headers = ["Thời gian", "Loại metric", "Giá trị"];

      const rows = sensorData.map((item) => {
        const time = new Date(item.timestamp).toLocaleString("vi-VN").replace(/,/g, ""); 
        
        return [
          time,
          item.metric_type === "temperature" ? "Nhiệt độ" : "Độ ẩm",
          item.value
        ].join(","); 
      });

      const csvContent = [headers.join(","), ...rows].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `sensor_data_export_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setToast({ open: true, message: "Xuất file CSV thành công!", severity: "success" });
    } catch (error) {
      console.error(error);
      setToast({ open: true, message: "Có lỗi khi xuất file", severity: "error" });
    }
  };

  const handleClear = () => {
    setSensorData([]);
    setChartData(null);
    setFilters(prev => ({
        ...prev,
        hours: "24",
        fromDate: "",
        toDate: ""
    }));
  };

  const stats = useMemo(() => {
    if (sensorData.length === 0) return null;
    const calculateStats = (type) => {
      const data = sensorData.filter((d) => d.metric_type === type).map((d) => Number(d.value));
      if (data.length === 0) return null;
      return { 
        min: Math.min(...data).toFixed(1), 
        max: Math.max(...data).toFixed(1), 
        avg: (data.reduce((a, b) => a + b, 0) / data.length).toFixed(1) 
      };
    };
    return { temperature: calculateStats("temperature"), humidity: calculateStats("humidity") };
  }, [sensorData]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 2 }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>📈 Trình khám phá Dữ liệu</Typography>
        <Typography variant="body2" color="textSecondary">Khám phá dữ liệu cảm biến lịch sử</Typography>
      </Box>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>🔍 Bộ lọc</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={6}>
              <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>Thiết bị</Typography>
              <Select
                fullWidth size="small"
                value={filters.deviceId}
                onChange={(e) => setFilters({ ...filters, deviceId: e.target.value })}
              >
                {devices.map((device) => (
                  <MenuItem key={device.id} value={device.id}>{device.name} (#{device.id})</MenuItem>
                ))}
              </Select>
            </Grid>

            <Grid item xs={12} sm={6} md={6}>
              <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>Khoảng thời gian</Typography>
              <Select
                fullWidth size="small"
                value={filters.hours}
                onChange={(e) => setFilters({ ...filters, hours: e.target.value })}
              >
                <MenuItem value="1">1 giờ</MenuItem>
                <MenuItem value="12">12 giờ</MenuItem>
                <MenuItem value="24">24 giờ</MenuItem>
                <MenuItem value="168">7 ngày</MenuItem>
                <MenuItem value="custom" sx={{ fontWeight: 'bold', color: 'primary.main' }}>📅 Tùy chỉnh ngày...</MenuItem>
              </Select>
            </Grid>

            {/* COLLAPSE AREA: Chỉ hiện khi user chọn "custom" */}
            <Grid item xs={12}>
              <Collapse in={filters.hours === "custom"} unmountOnExit>
                <Grid container spacing={2} sx={{ mt: 0.5, p: 2, bgcolor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 2 }}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth size="small" type="datetime-local" label="Từ ngày"
                      InputLabelProps={{ shrink: true }}
                      value={filters.fromDate}
                      onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth size="small" type="datetime-local" label="Đến ngày"
                      InputLabelProps={{ shrink: true }}
                      value={filters.toDate}
                      onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                    />
                  </Grid>
                </Grid>
              </Collapse>
            </Grid>
          </Grid>

          <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
            <Button variant="contained" size="small" onClick={loadData} disabled={loading}>
              {loading ? <CircularProgress size={20} color="inherit" /> : "Tải dữ liệu"}
            </Button>
            <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={loadData} disabled={loading || !filters.deviceId}>
              Làm mới
            </Button>
            <Button variant="outlined" size="small" startIcon={<FileDownloadIcon />} onClick={handleExportCSV} disabled={sensorData.length === 0}>
              Xuất CSV
            </Button>
            <Button variant="outlined" size="small" startIcon={<ClearIcon />} onClick={handleClear} disabled={sensorData.length === 0} color="error">
              Xóa
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Hiển thị Thống kê, Biểu đồ và Bảng nếu có dữ liệu (Giữ nguyên như code cũ của bạn) */}
      {sensorData.length > 0 && (
        <>
          <Grid container spacing={2}>
            {[
              { label: "Temp Min", val: stats.temperature?.min, unit: "°C", color: "primary.main" },
              { label: "Temp Avg", val: stats.temperature?.avg, unit: "°C", color: "primary.main" },
              { label: "Temp Max", val: stats.temperature?.max, unit: "°C", color: "error.main" },
              { label: "Humid Min", val: stats.humidity?.min, unit: "%", color: "info.main" },
              { label: "Humid Avg", val: stats.humidity?.avg, unit: "%", color: "info.main" },
              { label: "Humid Max", val: stats.humidity?.max, unit: "%", color: "error.main" },
            ].map((s, idx) => (
              <Grid item xs={6} sm={2} key={idx}>
                <Card><CardContent sx={{ textAlign: "center", p: "16px !important" }}>
                  <Typography variant="caption" color="textSecondary">{s.label}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: s.color }}>{s.val}{s.unit}</Typography>
                </CardContent></Card>
              </Grid>
            ))}
          </Grid>

          {chartData && (
            <Card><CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>📊 Biểu đồ xu hướng</Typography>
              <HistoricalChart data={chartData.data} series={chartData.series} xKey="label" height={400} />
            </CardContent></Card>
          )}

          <Card>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Thời gian</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Loại metric</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Giá trị</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sensorData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((data, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>{new Date(data.timestamp).toLocaleString("vi-VN")}</TableCell>
                      <TableCell>{data.metric_type === "temperature" ? "🌡️ Temp" : "💧 Humid"}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {Number(data.value).toFixed(1)}
                        {data.metric_type === "temperature" ? "°C" : "%"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50]}
              component="div"
              count={sensorData.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(e, p) => setPage(p)}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            />
          </Card>
        </>
      )}

      <Snackbar 
        open={toast.open} 
        autoHideDuration={4000} 
        onClose={() => setToast({ ...toast, open: false })}
      >
        <Alert severity={toast.severity} variant="filled">{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default DataExplorerPage;