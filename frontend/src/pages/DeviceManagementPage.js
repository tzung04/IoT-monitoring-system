import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Card, CardContent, Typography, Stack, TextField, Button,
  Chip, Grid, IconButton, Tooltip, Snackbar, Alert, Select, MenuItem,
  CircularProgress, Paper, InputAdornment, Container, Fade, Divider
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AddToPhotosIcon from "@mui/icons-material/AddToPhotos";
import SearchIcon from "@mui/icons-material/Search";
import RouterIcon from "@mui/icons-material/Router";
import DeviceThermostatIcon from "@mui/icons-material/DeviceThermostat";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import deviceService from "../services/device.service";
import placeService from "../services/place.service";
import sensorService from "../services/sensor.service";

const DeviceManagementPage = () => {
  const [devices, setDevices] = useState([]);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [latestData, setLatestData] = useState({});
  const [loadingLatest, setLoadingLatest] = useState({});
  const [form, setForm] = useState({ name: "", mac_address: "", place_id: "" });
  const [formErrors, setFormErrors] = useState({});
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ search: "" });
  const [toast, setToast] = useState({ open: false, message: "", severity: "info" });
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const data = await deviceService.getDevices();
      setDevices(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const loadPlaces = async () => {
      try {
        const data = await placeService.getPlaces();
        setPlaces(Array.isArray(data) ? data : []);
      } catch (err) { console.error(err); }
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
          if (data && data.latest) {
            newLatestData[device.id] = data.latest;
          }
        } catch (err) {
          newLatestData[device.id] = null;
        } finally {
          setLoadingLatest((prev) => ({ ...prev, [device.id]: false }));
        }
      }
      setLatestData(newLatestData);
    };
    loadLatestData();
  }, [devices]);

  const validateForm = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = "Tên thiết bị là bắt buộc";
    if (!form.mac_address.trim()) errors.mac_address = "Địa chỉ MAC là bắt buộc";
    else if (!/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(form.mac_address)) {
      errors.mac_address = "Định dạng MAC không hợp lệ";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const created = await deviceService.createDevice({
        ...form, mac_address: form.mac_address.toUpperCase()
      });
      if (created) {
        setDevices([created, ...devices]);
        setForm({ name: "", mac_address: "", place_id: "" });
        setToast({ open: true, message: "Thêm thiết bị thành công!", severity: "success" });
      }
    } catch (err) {
      setError(err.message || "Lỗi khi thêm thiết bị");
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xác nhận xóa thiết bị này?")) return;
    try {
      await deviceService.deleteDevice(id);
      setDevices(devices.filter(d => d.id !== id));
      setToast({ open: true, message: "Đã xóa thiết bị", severity: "success" });
    } catch (err) {
      setToast({ open: true, message: "Xóa thất bại", severity: "error" });
    }
  };

  const filteredDevices = useMemo(() => {
    const query = filters.search.toLowerCase();
    return devices.filter(d => 
      d.name?.toLowerCase().includes(query) || 
      d.mac_address?.toLowerCase().includes(query)
    );
  }, [devices, filters]);

  return (
    <Box sx={{ bgcolor: "#f1f5f9", minHeight: "100vh", py: 4 }}>
      <Container maxWidth="xl">
        
        {/* TOP METRICS */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[
            { label: "Tổng thiết bị", value: devices.length, color: "#2563eb" },
            { label: "Đang hoạt động", value: devices.filter(d => d.is_active).length, color: "#10b981" },
            { label: "Ngừng hoạt động", value: devices.filter(d => !d.is_active).length, color: "#ef4444" }
          ].map((stat, i) => (
            <Grid item xs={12} sm={4} key={i}>
              <Paper sx={{ p: 2, borderRadius: 4, textAlign: 'center', borderBottom: `4px solid ${stat.color}` }}>
                <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 600 }}>{stat.label}</Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: stat.color }}>{stat.value}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={4}>
          {/* LEFT: FORM ADD */}
          <Grid item xs={12} lg={4}>
            <Card sx={{ borderRadius: 5, boxShadow: "0 10px 25px rgba(0,0,0,0.05)", position: 'sticky', top: 24 }}>
              <CardContent sx={{ p: 4 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
                  <AddToPhotosIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Đăng ký thiết bị</Typography>
                </Stack>

                <Stack component="form" spacing={2.5} onSubmit={handleAdd}>
                  <TextField
                    label="Tên thiết bị *"
                    name="name"
                    value={form.name}
                    onChange={(e) => setForm({...form, name: e.target.value})}
                    fullWidth size="small"
                    error={!!formErrors.name} helperText={formErrors.name}
                  />
                  <TextField
                    label="Địa chỉ MAC *"
                    name="mac_address"
                    value={form.mac_address}
                    onChange={(e) => setForm({...form, mac_address: e.target.value})}
                    fullWidth size="small" placeholder="AA:BB:CC..."
                    error={!!formErrors.mac_address} helperText={formErrors.mac_address}
                  />
                  <Select
                    value={form.place_id}
                    onChange={(e) => setForm({...form, place_id: e.target.value})}
                    displayEmpty size="small" fullWidth
                  >
                    <MenuItem value="">-- Chọn vị trí --</MenuItem>
                    {places.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                  </Select>
                  <Button type="submit" variant="contained" disabled={loading} sx={{ py: 1.5, borderRadius: 3, fontWeight: 700 }}>
                    {loading ? <CircularProgress size={24} color="inherit" /> : "Thêm mới ngay"}
                  </Button>
                  {error && <Alert severity="error">{error}</Alert>}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* RIGHT: DEVICE LIST */}
          <Grid item xs={12} lg={8}>
            <Stack spacing={3}>
              <TextField
                placeholder="Tìm nhanh thiết bị..."
                fullWidth
                onChange={(e) => setFilters({ search: e.target.value })}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
                  sx: { borderRadius: 4, bgcolor: "white" }
                }}
              />

              <Box sx={{ minHeight: 400 }}>
                {loading && devices.length === 0 ? (
                  <Stack alignItems="center" sx={{ py: 10 }}><CircularProgress /></Stack>
                ) : filteredDevices.length === 0 ? (
                  <Paper sx={{ p: 10, textAlign: 'center', borderRadius: 5, bgcolor: 'transparent', border: '2px dashed #cbd5e1' }}>
                    <Typography color="textSecondary">Chưa có thiết bị nào được tìm thấy</Typography>
                  </Paper>
                ) : (
                  <Grid container spacing={2}>
                    {filteredDevices.map((device, idx) => (
                      <Grid item xs={12} key={device.id}>
                        <Fade in timeout={300 + idx * 100}>
                          <Card sx={{ 
                            borderRadius: 4, border: "1px solid #e2e8f0", transition: "0.3s",
                            "&:hover": { boxShadow: "0 10px 20px rgba(0,0,0,0.05)", borderColor: "primary.main" }
                          }}>
                            <CardContent sx={{ p: 3 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Stack direction="row" spacing={2} alignItems="center">
                                  <Box sx={{ bgcolor: device.is_active ? "#dcfce7" : "#f1f5f9", p: 1.5, borderRadius: 3 }}>
                                    <RouterIcon sx={{ color: device.is_active ? "#16a34a" : "#64748b" }} />
                                  </Box>
                                  <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{device.name}</Typography>
                                    <Typography variant="caption" color="textSecondary" sx={{ fontFamily: 'monospace' }}>
                                      MAC: {device.mac_address}
                                    </Typography>
                                  </Box>
                                </Stack>

                                <Stack direction="row" spacing={3} alignItems="center">
                                  {/* Sensor Data Display */}
                                  <Stack direction="row" spacing={2}>
                                    {loadingLatest[device.id] ? <CircularProgress size={20} /> : (
                                      <>
                                        <Box sx={{ textAlign: 'center' }}>
                                          <Stack direction="row" alignItems="center" spacing={0.5}>
                                            <DeviceThermostatIcon sx={{ fontSize: 18, color: "#f97316" }} />
                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                              {latestData[device.id]?.temperature ? `${latestData[device.id].temperature}°C` : "--"}
                                            </Typography>
                                          </Stack>
                                          <Typography variant="caption" color="textSecondary">Nhiệt độ</Typography>
                                        </Box>
                                        <Box sx={{ textAlign: 'center' }}>
                                          <Stack direction="row" alignItems="center" spacing={0.5}>
                                            <WaterDropIcon sx={{ fontSize: 18, color: "#0ea5e9" }} />
                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                              {latestData[device.id]?.humidity ? `${latestData[device.id].humidity}%` : "--"}
                                            </Typography>
                                          </Stack>
                                          <Typography variant="caption" color="textSecondary">Độ ẩm</Typography>
                                        </Box>
                                      </>
                                    )}
                                  </Stack>

                                  <Divider orientation="vertical" flexItem />

                                  <Stack direction="row" spacing={1}>
                                    <Tooltip title="Chi tiết">
                                      <IconButton size="small" onClick={() => navigate(`/devices/${device.id}`)} sx={{ bgcolor: "#eff6ff", color: "#2563eb" }}>
                                        <VisibilityIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Xóa">
                                      <IconButton size="small" onClick={() => handleDelete(device.id)} sx={{ bgcolor: "#fef2f2", color: "#ef4444" }}>
                                        <DeleteOutlineIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Stack>
                                </Stack>
                              </Box>
                              
                              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Chip 
                                  icon={<LocationOnIcon sx={{ fontSize: '14px !important' }} />}
                                  label={places.find(p => p.id === device.place_id)?.name || "Chưa gán vị trí"} 
                                  size="small" variant="outlined" sx={{ borderRadius: 1 }}
                                />
                                <Typography variant="caption" color="textSecondary">
                                  Cập nhật: {latestData[device.id]?.time ? new Date(latestData[device.id].time).toLocaleTimeString() : "Offline hơn 1 ngày trước!"}
                                </Typography>
                              </Box>
                            </CardContent>
                          </Card>
                        </Fade>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </Container>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({ ...toast, open: false })}>
        <Alert severity={toast.severity} variant="filled" sx={{ borderRadius: 3 }}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default DeviceManagementPage;