import React, { useEffect, useState, useMemo } from "react";
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
  CircularProgress,
  Snackbar,
  Alert,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import ClearIcon from "@mui/icons-material/Clear";
import sensorService from "../services/sensor.service";
import deviceService from "../services/device.service";
import HistoricalChart from "../components/Charts/HistoricalChart";
import { trackEvent } from "../observability/faro";

const DataExplorerPage = () => {
  const [devices, setDevices] = useState([]);
  const [sensorData, setSensorData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [toast, setToast] = useState({ open: false, message: "", severity: "info" });

  // Filter states
  const [filters, setFilters] = useState({
    deviceId: "",
    hours: "24",
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
      
      // Set first device as default
      if (deviceList && deviceList.length > 0) {
        setFilters({ ...filters, deviceId: String(deviceList[0].id) });
      }
    } catch (err) {
      console.error("Load initial data error:", err);
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
      const hours = filters.hours ? Number(filters.hours) : 24;

      console.log(`Loading sensor data for device ${deviceId}, hours: ${hours}`);
      
      const response = await sensorService.getDeviceData(deviceId, hours);
      
      // Extract data points
      const dataPoints = response.data || [];
      
      setSensorData(dataPoints);
      
      // Transform data for chart
      const chartDataMap = new Map();

      dataPoints.forEach((point) => {
        const timeKey = new Date(point.timestamp).toLocaleTimeString("vi-VN", {
          hour: '2-digit',
          minute: '2-digit'
        });
        
        if (!chartDataMap.has(timeKey)) {
          chartDataMap.set(timeKey, {
            label: timeKey,
            timestamp: point.timestamp
          });
        }
        
        const entry = chartDataMap.get(timeKey);
        if (point.metric_type === "temperature") {
          entry.temperature = Number(point.value);
        } else if (point.metric_type === "humidity") {
          entry.humidity = Number(point.value);
        }
      });

      // Convert Map to sorted array
      const chartDataArray = Array.from(chartDataMap.values()).sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );

      setChartData({
        data: chartDataArray,
        series: [
          { dataKey: "temperature", name: "🌡️ Temperature (°C)", color: "#ff6b6b" },
          { dataKey: "humidity", name: "💧 Humidity (%)", color: "#4ecdc4" }
        ],
        device: response.device,
        timeRange: response.timeRange,
      });

      setPage(0);
      
      trackEvent("sensor_data_loaded", {
        deviceId,
        hours,
        dataPoints: dataPoints.length,
      });

      setToast({ open: true, message: `Tải ${dataPoints.length} điểm dữ liệu thành công`, severity: "success" });
    } catch (err) {
      console.error("Load data error:", err);
      setToast({ open: true, message: err.message || "Không thể tải dữ liệu cảm biến", severity: "error" });
      setSensorData([]);
      setChartData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleLoadData = () => {
    loadData();
  };

  const handleRefresh = () => {
    loadData();
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleExportCSV = () => {
    if (sensorData.length === 0) {
      setToast({ open: true, message: "Không có dữ liệu để xuất", severity: "warning" });
      return;
    }

    const device = devices.find((d) => d.id === Number(filters.deviceId));
    const headers = ["Time", "Device", "Metric", "value"];
    const rows = sensorData.map((data) => [
      new Date(data.timestamp).toLocaleString("vi-VN"),
      device?.name || `Device #${filters.deviceId}`,
      data.metric_type || "N/A",
      data.value || "N/A",
    ]);

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
      `sensor_data_${filters.deviceId}_${new Date().getTime()}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    trackEvent("sensor_data_exported", { deviceId: filters.deviceId, count: sensorData.length });
    setToast({ open: true, message: "Đã xuất dữ liệu", severity: "success" });
  };

  const displayedData = useMemo(() => {
    return sensorData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [sensorData, page, rowsPerPage]);

  const stats = useMemo(() => {
    if (sensorData.length === 0) return null;

    const tempData = sensorData.filter((d) => d.metric_type === "temperature").map((d) => Number(d.value));
    const humidityData = sensorData.filter((d) => d.metric_type === "humidity").map((d) => Number(d.value));

    const calculateStats = (data) => {
      if (data.length === 0) return null;
      const min = Math.min(...data);
      const max = Math.max(...data);
      const avg = (data.reduce((a, b) => a + b, 0) / data.length).toFixed(2);
      return { min, max, avg };
    };

    return {
      temperature: calculateStats(tempData),
      humidity: calculateStats(humidityData),
    };
  }, [sensorData]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 2 }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          📈 Trình khám phá Dữ liệu
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Khám phá và phân tích dữ liệu cảm biến lịch sử từ các thiết bị
        </Typography>
      </Box>

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
                    <span style={{ color: "#9e9e9e" }}>Chọn thiết bị</span>
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
                value={filters.hours}
                onChange={(e) => handleFilterChange("hours", e.target.value)}
              >
                <MenuItem value="1">1 giờ</MenuItem>
                <MenuItem value="6">6 giờ</MenuItem>
                <MenuItem value="12">12 giờ</MenuItem>
                <MenuItem value="24">24 giờ</MenuItem>
                <MenuItem value="72">3 ngày</MenuItem>
                <MenuItem value="168">7 ngày</MenuItem>
              </Select>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                type="datetime-local"
                label="Từ ngày (tùy chọn)"
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
                label="Đến ngày (tùy chọn)"
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
              onClick={handleLoadData}
              disabled={loading}
            >
              {loading ? "Đang tải..." : "Tải dữ liệu"}
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={loading || sensorData.length === 0}
            >
              Làm mới
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportCSV}
              disabled={sensorData.length === 0}
            >
              Xuất CSV
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ClearIcon />}
              onClick={() => {
                setSensorData([]);
                setChartData(null);
              }}
              disabled={sensorData.length === 0}
            >
              Xóa dữ liệu
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {sensorData.length > 0 && (
        <>
          {/* Statistics */}
          <Grid container spacing={2}>
            {stats?.temperature && (
              <>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent sx={{ textAlign: "center" }}>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                        🌡️ Temp Min
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: "primary.main" }}>
                        {stats.temperature.min.toFixed(1)}°C
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent sx={{ textAlign: "center" }}>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                        🌡️ Temp Avg
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: "primary.main" }}>
                        {stats.temperature.avg}°C
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent sx={{ textAlign: "center" }}>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                        🌡️ Temp Max
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: "error.main" }}>
                        {stats.temperature.max.toFixed(1)}°C
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </>
            )}
            {stats?.humidity && (
              <>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent sx={{ textAlign: "center" }}>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                        💧 Humidity Min
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: "primary.main" }}>
                        {stats.humidity.min.toFixed(1)}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent sx={{ textAlign: "center" }}>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                        💧 Humidity Avg
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: "info.main" }}>
                        {stats.humidity.avg}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent sx={{ textAlign: "center" }}>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                        💧 Humidity Max
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: "error.main" }}>
                        {stats.humidity.max.toFixed(1)}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </>
            )}
          </Grid>

          {/* Chart */}
          {chartData && chartData.data && (
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  📊 Biểu đồ dữ liệu
                </Typography>
                <HistoricalChart 
                  data={chartData.data}
                  series={chartData.series}
                  xKey="label"
                  height={400}
                  stacked={false}
                />
              </CardContent>
            </Card>
          )}

          {/* Data Table */}
          <Card>
            <TableContainer>
              <Table>
                <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Thời gian</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Loại metric</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Giá trị</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                        <Typography color="textSecondary">
                          Không có dữ liệu nào.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedData.map((data, idx) => (
                      <TableRow key={idx} sx={{ "&:hover": { backgroundColor: "#f9f9f9" } }}>
                        <TableCell sx={{ fontSize: "0.875rem" }}>
                          {new Date(data.timestamp).toLocaleString("vi-VN")}
                        </TableCell>
                        <TableCell sx={{ fontSize: "0.875rem" }}>
                          {data.metric_type === "temperature"
                            ? "🌡️ Temperature"
                            : data.metric_type === "humidity"
                            ? "💧 Humidity"
                            : data.metric_type}
                        </TableCell>
                        <TableCell sx={{ fontSize: "0.875rem", fontWeight: 600 }}>
                          {Number(data.value).toFixed(2)}
                          {data.metric_type === "temperature" ? "°C" : data.metric_type === "humidity" ? "%" : ""}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50, 100]}
              component="div"
              count={sensorData.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Hàng mỗi trang:"
            />
          </Card>
        </>
      )}

      {!loading && sensorData.length === 0 && !chartData && (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 8 }}>
            <Typography color="textSecondary">
              Chọn thiết bị và nhấn "Tải dữ liệu" để bắt đầu khám phá
            </Typography>
          </CardContent>
        </Card>
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

export default DataExplorerPage;
