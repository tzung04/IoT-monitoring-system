import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Grid,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { CircularProgress } from "@mui/material";
import deviceService from "../services/device.service";
import placeService from "../services/place.service";
import sensorService from "../services/sensor.service";
import useSocket from "../hooks/useSocket";
import { trackEvent } from "../observability/faro";

const ITEMS_PER_PAGE = 5;

const DeviceManagementPage = () => {
  const [devices, setDevices] = useState([]);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [latestData, setLatestData] = useState({});
  const [loadingLatest, setLoadingLatest] = useState({});
  const [form, setForm] = useState({ 
    name: "", 
    mac_address: "",
    place_id: ""
  });
  const [formErrors, setFormErrors] = useState({});
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ search: "", status: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState({ open: false, message: "", severity: "info" });
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    const data = await deviceService.getDevices();
    setDevices(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const loadPlaces = async () => {
      try {
        const data = await placeService.getPlaces();
        setPlaces(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error loading places:", err);
      }
    };
    loadPlaces();
  }, []);

  useEffect(() => {
    const loadLatestData = async () => {
      if (devices.length === 0) return;
      const newLatestData = { ...latestData };
      for (const device of devices) {
        if (newLatestData[device.id]) continue;
        setLoadingLatest((prev) => ({ ...prev, [device.id]: true }));
        try {
          const data = await sensorService.getLatestData(device.id);
          if (data && data.latest_data) {
            newLatestData[device.id] = {
              temperature: data.latest_data.temperature,
              humidity: data.latest_data.humidity,
              timestamp: data.latest_data.timestamp,
            };
          }
        } catch (err) {
          console.warn(`Failed to load latest data for device ${device.id}:`, err);
          newLatestData[device.id] = null;
        } finally {
          setLoadingLatest((prev) => ({ ...prev, [device.id]: false }));
        }
      }
      setLatestData(newLatestData);
    };
    loadLatestData();
  }, [devices.length]);

  const upsertDevice = (list, device) => {
    const exists = list.some((d) => d.id === device.id);
    if (exists) {
      return list.map((d) => (d.id === device.id ? { ...d, ...device } : d));
    }
    return [...list, device];
  };

  useSocket((message) => {
    if (!message || !message.type) return;
    if (message.type === "device_status") {
      setDevices((prev) => upsertDevice(prev, message.data));
    }
    if (message.type === "device_added") {
      setDevices((prev) => upsertDevice(prev, message.data));
    }
    if (message.type === "device_updated") {
      setDevices((prev) => upsertDevice(prev, message.data));
    }
    if (message.type === "device_deleted") {
      setDevices((prev) => prev.filter((d) => d.id !== message.data.id));
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: "" });
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!form.name.trim()) {
      errors.name = "Tên thiết bị là bắt buộc";
    } else if (form.name.length < 3) {
      errors.name = "Tên phải có ít nhất 3 ký tự";
    }
    
    if (!form.mac_address.trim()) {
      errors.mac_address = "Địa chỉ MAC là bắt buộc";
    } else if (!/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(form.mac_address)) {
      errors.mac_address = "Định dạng MAC không hợp lệ (VD: AA:BB:CC:DD:EE:FF)";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFilterChange = (e) => {
    const next = { ...filters, [e.target.name]: e.target.value };
    setFilters(next);
    trackEvent("device_filter_applied", {
      field: e.target.name,
      value: e.target.value ? String(e.target.value).slice(0, 50) : "",
    });
  };


  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const created = await deviceService.createDevice({
        name: form.name,
        mac_address: form.mac_address.toUpperCase(),
        place_id: form.place_id ? Number(form.place_id) : null
      });
      
      if (created && created.id) {
        setDevices((d) => upsertDevice(d, created));
        trackEvent("device_added", { id: created.id });
        setToast({ 
          open: true, 
          message: `Đã thêm thiết bị "${created.name}"`, 
          severity: "success" 
        });
      }
      setForm({ name: "", mac_address: "", place_id: "" });
      setFormErrors({});
    } catch (err) {
      console.error("Add device error:", err);
      const errorMsg = err.message || "Không thể thêm thiết bị";
      setError(errorMsg);
      setToast({ 
        open: true, 
        message: errorMsg, 
        severity: "error" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa thiết bị này?")) return;
    try {
      await deviceService.deleteDevice(id);
      setDevices((d) => d.filter((x) => x.id !== id));
      trackEvent("device_deleted", { id });
      setToast({ open: true, message: "Đã xóa thiết bị", severity: "success" });
    } catch (err) {
      setError("Xóa không thành công");
      setToast({ open: true, message: "Xóa thiết bị thất bại", severity: "error" });
    }
  };



  const formatLatestData = (deviceId) => {
    const data = latestData[deviceId];
    if (!data) return null;
    let display = [];
    if (data.temperature !== undefined && data.temperature !== null) {
      display.push(`🌡️ ${Number(data.temperature).toFixed(1)}°C`);
    }
    if (data.humidity !== undefined && data.humidity !== null) {
      display.push(`💧 ${Number(data.humidity).toFixed(1)}%`);
    }
    return display.join(" | ") || null;
  };

  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      const query = filters.search.trim().toLowerCase();
      if (!query) return true;
      return (
        d.name?.toLowerCase().includes(query) ||
        d.device_serial?.toLowerCase().includes(query) ||
        d.mac_address?.toLowerCase().includes(query) ||
        String(d.id).includes(query)
      );
    });
  }, [devices, filters]);

  const totalPages = Math.ceil(filteredDevices.length / ITEMS_PER_PAGE);
  const paginatedDevices = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDevices.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredDevices, currentPage]);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <>
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, p: 2 }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Quản lý Thiết bị
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Tạo, chỉnh sửa và theo dõi các thiết bị IoT của bạn
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Form thêm thiết bị */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Thêm Thiết bị Mới
              </Typography>
              
              <Stack component="form" spacing={1.5} onSubmit={handleAdd}>
                <TextField
                  label="Tên thiết bị *"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  size="small"
                  fullWidth
                  placeholder="VD: Cảm biến phòng khách"
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                />

                <TextField
                  label="Địa chỉ MAC *"
                  name="mac_address"
                  value={form.mac_address}
                  onChange={handleChange}
                  size="small"
                  fullWidth
                  placeholder="AA:BB:CC:DD:EE:FF"
                  error={!!formErrors.mac_address}
                  helperText={formErrors.mac_address}
                />

                <Select
                  name="place_id"
                  value={form.place_id}
                  onChange={handleChange}
                  size="small"
                  fullWidth
                  displayEmpty
                >
                  <MenuItem value="">-- Chọn vị trí (tuỳ chọn) --</MenuItem>
                  {places.map((place) => (
                    <MenuItem key={place.id} value={place.id}>
                      {place.name}
                    </MenuItem>
                  ))}
                </Select>

                <Button 
                  type="submit" 
                  variant="contained"
                  sx={{ mt: 0.5 }}
                  disabled={loading}
                  fullWidth
                >
                  {loading ? "⏳ Đang thêm..." : "Thêm Thiết bị"}
                </Button>

                {error && (
                  <Box sx={{ 
                    background: "#ffebee", 
                    p: 1.5, 
                    borderRadius: 1,
                    border: "1px solid #ffcdd2"
                  }}>
                    <Typography variant="body2" sx={{ color: "#c62828" }}>
                      ⚠️ {error}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Danh sách thiết bị */}
        <Grid item xs={12} md={7}>
          <Stack spacing={2}>
            {/* Search bar */}
            <TextField
              name="search"
              placeholder="🔍 Tìm kiếm theo tên, MAC, serial hoặc ID..."
              value={filters.search}
              onChange={handleFilterChange}
              size="small"
              fullWidth
              sx={{ 
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                }
              }}
            />

            {/* Device list */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, maxHeight: "1600px", overflow: "auto"}}>
              {loading ? (
                <Typography sx={{ textAlign: "center", py: 4, color: "textSecondary" }}>
                  ⏳ Đang tải thiết bị...
                </Typography>
              ) : filteredDevices.length === 0 ? (
                <Card sx={{ p: 3, textAlign: "center" }}>
                  <Typography color="textSecondary">
                    📭 Không có thiết bị nào. Hãy thêm thiết bị đầu tiên của bạn!
                  </Typography>
                </Card>
              ) : (
                paginatedDevices.map((device) => (
                  <Card key={device.id} sx={{ 
                    p: 2, 
                    border: "2px solid #f0f0f0",
                    transition: "all 0.2s",
                    "&:hover": { borderColor: "#667eea", boxShadow: "0 4px 12px rgba(102,126,234,0.15)" }
                  }}>
                    <Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start", mb: 1.5 }}>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {device.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            ID: {device.id}
                          </Typography>
                        </Box>
                        <Chip 
                          label={device.is_active ? "🟢 Hoạt động" : "🔴 Ngừng hoạt động"}
                          size="small"
                          sx={{ fontWeight: 600 }}
                          color={device.is_active ? "success" : "default"}
                        />
                      </Box>

                      <Stack spacing={0.5} sx={{ mb: 2, fontSize: "0.875rem" }}>
                        <Typography variant="body2">
                          <strong>MAC:</strong> {device.mac_address}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Serial:</strong> {device.device_serial}
                        </Typography>
                        {device.description && (
                          <Typography variant="body2" color="textSecondary">
                            <strong>Mô tả:</strong> {device.description}
                          </Typography>
                        )}
                        <Typography variant="body2" color="textSecondary">
                          <strong>Topic:</strong> {device.topic}
                        </Typography>

                        {/* Latest Data */}
                        <Box sx={{ 
                          mt: 1, 
                          p: 1, 
                          backgroundColor: "#f0f9ff", 
                          borderRadius: 1,
                          border: "1px solid #cce5ff"
                        }}>
                          {loadingLatest[device.id] ? (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <CircularProgress size={16} />
                              <Typography variant="caption" color="textSecondary">
                                Đang tải...
                              </Typography>
                            </Box>
                          ) : latestData[device.id] === null ? (
                            <Typography variant="caption" color="error">
                              ❌ Không thể tải dữ liệu
                            </Typography>
                          ) : formatLatestData(device.id) ? (
                            <Typography variant="body2" sx={{ fontWeight: 600, color: "#0369a1" }}>
                              📊 {formatLatestData(device.id)}
                            </Typography>
                          ) : (
                            <Typography variant="caption" color="textSecondary">
                              ⏳ Chưa có dữ liệu
                            </Typography>
                          )}
                        </Box>
                      </Stack>

                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Tooltip title="Xem chi tiết">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => navigate(`/devices/${device.id}`)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Xóa">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDelete(device.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </Card>
                ))
              )}
            </Box>

            {/* Pagination */}
            {!loading && filteredDevices.length > 0 && (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 2, mt: 2 }}>
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

            {/* Stats */}
            {!loading && devices.length > 0 && (
              <Box sx={{ 
                background: "#f5f7fa", 
                p: 2, 
                borderRadius: 1,
                display: "flex",
                justifyContent: "space-around"
              }}>
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="body2" color="textSecondary">Tổng thiết bị</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "#667eea" }}>
                    {devices.length}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="body2" color="textSecondary">Hoạt động</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "#10b981" }}>
                    {devices.filter(d => d.is_active).length}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="body2" color="textSecondary">Ngừng hoạt động</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "#ef4444" }}>
                    {devices.filter(d => !d.is_active).length}
                  </Typography>
                </Box>
              </Box>
            )}
          </Stack>
        </Grid>
      </Grid>
    </Box>

    <Snackbar
      open={toast.open}
      autoHideDuration={3000}
      onClose={() => setToast({ ...toast, open: false })}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })} sx={{ width: "100%" }}>
        {toast.message}
      </Alert>
    </Snackbar>
    </>
  );
};

export default DeviceManagementPage;
