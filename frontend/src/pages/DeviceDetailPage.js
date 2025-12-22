import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Grid,
  Divider,
  Button,
  TextField,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  CircularProgress,
  IconButton,
  Paper,
} from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import EditIcon from "@mui/icons-material/Edit";
import SettingsInputAntennaIcon from "@mui/icons-material/SettingsInputAntenna";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import PlaceIcon from "@mui/icons-material/Place";
import EventNoteIcon from "@mui/icons-material/EventNote";
import deviceService from "../services/device.service";
import placeService from "../services/place.service";

const DeviceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [isEditingPlace, setIsEditingPlace] = useState(false);
  const [editPlaceId, setEditPlaceId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [places, setPlaces] = useState([]);
  const [toast, setToast] = useState({ open: false, message: "", severity: "info" });

  useEffect(() => {
    const fetchDevice = async () => {
      try {
        setLoading(true);
        const resp = await deviceService.getDevice(id);
        setDevice(resp);
        setEditName(resp.name);
        setEditPlaceId(resp.place_id || "");
      } catch (err) {
        setToast({ open: true, message: "Không thể tải thông tin thiết bị", severity: "error" });
      } finally {
        setLoading(false);
      }
    };
    fetchDevice();
  }, [id]);

  useEffect(() => {
    const loadPlaces = async () => {
      try {
        const data = await placeService.getPlaces();
        setPlaces(Array.isArray(data) ? data : []);
      } catch (err) { console.error(err); }
    };
    loadPlaces();
  }, []);

  const handleSaveName = async () => {
    if (!editName.trim()) {
      setToast({ open: true, message: "Tên thiết bị không được trống", severity: "error" });
      return;
    }
    try {
      setIsSaving(true);
      const updated = await deviceService.updateDevice(id, { name: editName });
      setDevice(updated);
      setToast({ open: true, message: "Cập nhật tên thành công", severity: "success" });
      setIsEditing(false);
    } catch (err) {
      setToast({ open: true, message: "Cập nhật thất bại", severity: "error" });
    } finally { setIsSaving(false); }
  };

  const handleSavePlace = async () => {
    try {
      setIsSaving(true);
      const payload = editPlaceId === "" ? { place_id: null } : { place_id: Number(editPlaceId) };
      const updated = await deviceService.updateDevice(id, payload);
      setDevice(updated);
      setToast({ open: true, message: "Đã cập nhật vị trí mới", severity: "success" });
      setIsEditingPlace(false);
    } catch (err) {
      setToast({ open: true, message: "Cập nhật vị trí thất bại", severity: "error" });
    } finally { setIsSaving(false); }
  };

  const handleToggleActive = async () => {
    try {
      setIsSaving(true);
      const updated = await deviceService.updateDevice(id, { is_active: !device.is_active });
      setDevice(updated);
      setToast({ open: true, message: updated.is_active ? "Đã kích hoạt thiết bị" : "Đã vô hiệu hóa thiết bị", severity: "success" });
    } catch (err) {
      setToast({ open: true, message: "Thao tác thất bại", severity: "error" });
    } finally { setIsSaving(false); }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <CircularProgress size={60} thickness={2} />
    </Box>
  );

  if (!device) return <Alert severity="warning">Không tìm thấy thông tin thiết bị.</Alert>;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: "900px", margin: "0 auto" }}>
      <Button 
        startIcon={<ArrowBackIosNewIcon sx={{ fontSize: 14 }} />} 
        onClick={() => navigate(-1)}
        sx={{ mb: 3, textTransform: 'none', fontWeight: 600, color: 'text.secondary' }}
      >
        Quay lại danh sách
      </Button>

      <Card sx={{ borderRadius: 4, boxShadow: "0 10px 30px rgba(0,0,0,0.08)", border: "1px solid #f0f0f0" }}>
        <CardContent sx={{ p: { xs: 3, md: 5 } }}>
          <Stack spacing={4}>
            
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box sx={{ flex: 1 }}>
                {isEditing ? (
                  <Stack direction="row" spacing={1} sx={{ maxWidth: 400 }}>
                    <TextField
                      size="small"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      disabled={isSaving}
                      fullWidth
                      autoFocus
                    />
                    <Button variant="contained" onClick={handleSaveName} disabled={isSaving}>Lưu</Button>
                    <Button color="inherit" onClick={() => setIsEditing(false)}>Hủy</Button>
                  </Stack>
                ) : (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h4" sx={{ fontWeight: 800, color: "#1a202c" }}>{device.name}</Typography>
                    <IconButton size="small" onClick={() => setIsEditing(true)} sx={{ ml: 1, bgcolor: '#f5f5f5' }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Quản lý chi tiết và cấu hình thông số thiết bị
                </Typography>
              </Box>
              
              <Chip 
                label={device.is_active ? "Đang hoạt động" : "Vô hiệu hóa"}
                color={device.is_active ? "success" : "default"}
                onClick={handleToggleActive}
                disabled={isSaving}
                sx={{ fontWeight: 700, borderRadius: 2, px: 1, py: 2, height: 'auto', cursor: 'pointer' }}
              />
            </Stack>

            <Divider />

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <SettingsInputAntennaIcon color="primary" fontSize="small" /> Thông tin kỹ thuật
              </Typography>
              
              <Grid container spacing={3}>
                {/* Đã xóa phần Mã Serial, chỉnh MAC thành xs={12} để chiếm trọn hàng hoặc giữ 6 để cân đối */}
                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: '#fafafa' }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <FingerprintIcon color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Địa chỉ MAC</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{device.mac_address}</Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, borderStyle: isEditingPlace ? 'solid' : 'dashed' }}>
                    <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={2} alignItems="center">
                        <PlaceIcon color="primary" />
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Vị trí lắp đặt</Typography>
                          {isEditingPlace ? (
                            <Stack direction="row" spacing={1} sx={{ mt: 1, minWidth: { md: 300 } }}>
                              <Select
                                value={editPlaceId}
                                onChange={(e) => setEditPlaceId(e.target.value)}
                                size="small"
                                fullWidth
                                sx={{ borderRadius: 2 }}
                              >
                                <MenuItem value="">-- Trống --</MenuItem>
                                {places.map((place) => (
                                  <MenuItem key={place.id} value={place.id}>{place.name}</MenuItem>
                                ))}
                              </Select>
                              <Button variant="contained" size="small" onClick={handleSavePlace}>Lưu</Button>
                              <IconButton size="small" onClick={() => setIsEditingPlace(false)}><EditIcon sx={{ transform: 'rotate(45deg)' }} /></IconButton>
                            </Stack>
                          ) : (
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {device.place_id ? places.find(p => p.id === device.place_id)?.name || `Khu vực #${device.place_id}` : "Chưa xác định"}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                      {!isEditingPlace && (
                        <Button startIcon={<EditIcon />} size="small" onClick={() => setIsEditingPlace(true)}>Đổi vị trí</Button>
                      )}
                    </Stack>
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1 }}>
                    <EventNoteIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                    <Typography variant="caption" color="text.secondary">
                      Ngày khởi tạo: {device.created_at ? new Date(device.created_at).toLocaleString("vi-VN") : "N/A"}
                    </Typography>
                  </Stack>
                </Grid>
              </Grid>
            </Box>

          </Stack>
        </CardContent>
      </Card>

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast({ ...toast, open: false })}>
        <Alert severity={toast.severity} variant="filled" sx={{ borderRadius: 2 }}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default DeviceDetailPage;