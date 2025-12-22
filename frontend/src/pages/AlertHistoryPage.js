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

      const response = await sensorService.getDeviceData(
        deviceId, 
        hours, 
        filters.fromDate, 
        filters.toDate
      );
      
      const dataPoints = response.data || [];
      setSensorData(dataPoints);
      
      const chartDataMap = new Map();
      dataPoints.forEach((point) => {
        const timeKey = new Date(point.timestamp).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' });
        if (!chartDataMap.has(timeKey)) {
          chartDataMap.set(timeKey, { label: timeKey, timestamp: point.timestamp });
        }
        const entry = chartDataMap.get(timeKey);
        if (point.metric_type === "temperature") entry.temperature = Number(point.value);
        else if (point.metric_type === "humidity") entry.humidity = Number(point.value);
      });

      const chartDataArray = Array.from(chartDataMap.values()).sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );

      setChartData({
        data: chartDataArray,
        series: [
          { dataKey: "temperature", name: "🌡️ Nhiệt độ (°C)", color: "#ff6b6b" },
          { dataKey: "humidity", name: "💧 Độ ẩm (%)", color: "#4ecdc4" }
        ],
      });
      setPage(0);
      setToast({ open: true, message: `Tải ${dataPoints.length} bản ghi thành công`, severity: "success" });
    } catch (err) {
      setToast({ open: true, message: "Lỗi tải dữ liệu", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (sensorData.length === 0) return;
    const device = devices.find((d) => d.id === Number(filters.deviceId));
    const headers = ["Thời gian", "Thiết bị", "Loại", "Giá trị"];
    const rows = sensorData.map((d) => [
      new Date(d.timestamp).toLocaleString("vi-VN"),
      device?.name || filters.deviceId,
      d.metric_type,
      Number(d.value).toFixed(1)
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Data_Report_${new Date().getTime()}.csv`;
    link.click();
  };

  const stats = useMemo(() => {
    if (sensorData.length === 0) return null;
    const calc = (type) => {
      const vals = sensorData.filter(d => d.metric_type === type).map(d => Number(d.value));
      if (vals.length === 0) return null;
      return {
        min: Math.min(...vals).toFixed(1),
        max: Math.max(...vals).toFixed(1),
        avg: (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
      };
    };
    return { temperature: calc("temperature"), humidity: calc("humidity") };
  }, [sensorData]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 2 }}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>📈 Trình khám phá Dữ liệu</Typography>

      {/* Filter Section */}
      <Card>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="textSecondary">Thiết bị</Typography>
              <Select fullWidth size="small" value={filters.deviceId} onChange={(e) => setFilters({...filters, deviceId: e.target.value})}>
                {devices.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
              </Select>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="textSecondary">Khoảng thời gian</Typography>
              <Select fullWidth size="small" value={filters.hours} onChange={(e) => setFilters({...filters, hours: e.target.value})}>
                <MenuItem value="1">1 giờ</MenuItem>
                <MenuItem value="24">24 giờ</MenuItem>
                <MenuItem value="168">7 ngày</MenuItem>
                <MenuItem value="custom" sx={{ color: 'primary.main', fontWeight: 700 }}>📅 Tùy chỉnh ngày...</MenuItem>
              </Select>
            </Grid>
            
            <Grid item xs={12}>
              <Collapse in={filters.hours === "custom"}>
                <Stack direction="row" spacing={2} sx={{ mt: 1, p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                  <TextField fullWidth size="small" type="datetime-local" label="Từ ngày" InputLabelProps={{ shrink: true }} value={filters.fromDate} onChange={(e) => setFilters({...filters, fromDate: e.target.value})} />
                  <TextField fullWidth size="small" type="datetime-local" label="Đến ngày" InputLabelProps={{ shrink: true }} value={filters.toDate} onChange={(e) => setFilters({...filters, toDate: e.target.value})} />
                </Stack>
              </Collapse>
            </Grid>
          </Grid>

          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button variant="contained" onClick={loadData} disabled={loading}>Tải dữ liệu</Button>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadData}>Làm mới</Button>
            <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={handleExportCSV} disabled={sensorData.length === 0}>Xuất CSV</Button>
            <Button variant="outlined" color="error" startIcon={<ClearIcon />} onClick={() => setSensorData([])}>Xóa</Button>
          </Stack>
        </CardContent>
      </Card>

      {sensorData.length > 0 && (
        <>
          {/* Stats Display */}
          <Grid container spacing={2}>
            {stats.temperature && ["min", "avg", "max"].map(key => (
              <Grid item xs={4} sm={2} key={`temp-${key}`}>
                <Card sx={{ textAlign: 'center', bgcolor: key === 'avg' ? '#fff1f2' : 'white' }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="caption">Nhiệt độ {key.toUpperCase()}</Typography>
                    <Typography variant="h6" fontWeight={700} color="#f43f5e">{stats.temperature[key]}°C</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {stats.humidity && ["min", "avg", "max"].map(key => (
              <Grid item xs={4} sm={2} key={`humid-${key}`}>
                <Card sx={{ textAlign: 'center', bgcolor: key === 'avg' ? '#f0f9ff' : 'white' }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="caption">Độ ẩm {key.toUpperCase()}</Typography>
                    <Typography variant="h6" fontWeight={700} color="#0ea5e9">{stats.humidity[key]}%</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Chart */}
          <Card>
            <CardContent>
              <HistoricalChart data={chartData.data} series={chartData.series} xKey="label" height={400} />
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Thời gian</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Metric</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Giá trị</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sensorData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, i) => (
                    <TableRow key={i} hover>
                      <TableCell>{new Date(row.timestamp).toLocaleString("vi-VN")}</TableCell>
                      <TableCell>{row.metric_type === "temperature" ? "🌡️ Nhiệt độ" : "💧 Độ ẩm"}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{Number(row.value).toFixed(1)}{row.metric_type === "temperature" ? "°C" : "%"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={sensorData.length} rowsPerPage={rowsPerPage} page={page} onPageChange={(e, p) => setPage(p)} onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))} />
          </Card>
        </>
      )}

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({...toast, open: false})}>
        <Alert severity={toast.severity} variant="filled">{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default DataExplorerPage;