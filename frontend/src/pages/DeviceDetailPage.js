import React, { useEffect, useMemo, useState } from "react";
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
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import deviceService from "../services/device.service";
import RealtimeChart from "../components/Charts/RealtimeChart";

const MAX_POINTS = 50;

const DeviceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sensorData, setSensorData] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [isEditingPlace, setIsEditingPlace] = useState(false);
  const [editPlaceId, setEditPlaceId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
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
        console.error("Load device error", err);
        setToast({ open: true, message: "Không thể tải thông tin thiết bị", severity: "error" });
      } finally {
        setLoading(false);
      }
    };
    fetchDevice();
  }, [id]);

  const handleSaveName = async () => {
    if (!editName.trim()) {
      setToast({ open: true, message: "Tên thiết bị không được trống", severity: "error" });
      return;
    }

    if (editName === device.name) {
      setIsEditing(false);
      return;
    }

    try {
      setIsSaving(true);
      const updated = await deviceService.updateDevice(id, { name: editName });
      setDevice(updated);
      setToast({ open: true, message: "Đã cập nhật tên thiết bị", severity: "success" });
      setIsEditing(false);
    } catch (err) {
      console.error("Update device error", err);
      setToast({ open: true, message: "Cập nhật thất bại", severity: "error" });
      setEditName(device.name);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePlace = async () => {
    if (editPlaceId === device.place_id) {
      setIsEditingPlace(false);
      return;
    }

    try {
      setIsSaving(true);
      const payload = editPlaceId === "" ? { place_id: null } : { place_id: Number(editPlaceId) };
      const updated = await deviceService.updateDevice(id, payload);
      setDevice(updated);
      setEditPlaceId(updated.place_id || "");
      setToast({ open: true, message: "Đã cập nhật vị trí", severity: "success" });
      setIsEditingPlace(false);
    } catch (err) {
      console.error("Update place error", err);
      setToast({ open: true, message: "Cập nhật vị trí thất bại", severity: "error" });
      setEditPlaceId(device.place_id || "");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async () => {
    try {
      setIsSaving(true);
      const updated = await deviceService.updateDevice(id, { is_active: !device.is_active });
      setDevice(updated);
      setToast({ 
        open: true, 
        message: updated.is_active ? "Thiết bị đã được kích hoạt" : "Thiết bị đã bị vô hiệu hóa", 
        severity: "success" 
      });
    } catch (err) {
      console.error("Toggle device error", err);
      setToast({ open: true, message: "Thay đổi trạng thái thất bại", severity: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <Box sx={{ p: 2 }}><CircularProgress /></Box>;
  if (!device) return <Box sx={{ p: 2 }}>Không tìm thấy thiết bị.</Box>;

  const activeColor = device.is_active ? "success" : "default";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 2 }}>
      <Button variant="text" onClick={() => navigate(-1)} sx={{ alignSelf: "flex-start" }}>
        ← Quay lại
      </Button>

      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  {isEditing ? (
                    <Stack direction="row" spacing={1} flex={1}>
                      <TextField
                        size="small"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        disabled={isSaving}
                        fullWidth
                      />
                      <Button 
                        size="small" 
                        variant="contained"
                        onClick={handleSaveName}
                        disabled={isSaving}
                      >
                        Lưu
                      </Button>
                      <Button 
                        size="small"
                        onClick={() => {
                          setIsEditing(false);
                          setEditName(device.name);
                        }}
                        disabled={isSaving}
                      >
                        Hủy
                      </Button>
                    </Stack>
                  ) : (
                    <>
                      <Typography variant="h6">{device.name}</Typography>
                      <Button size="small" onClick={() => setIsEditing(true)}>
                        Sửa tên
                      </Button>
                    </>
                  )}
                </Stack>

                <Chip 
                  label={device.is_active ? "✓ Hoạt động" : "✗ Vô hiệu hóa"}
                  color={activeColor}
                  size="small"
                  onClick={handleToggleActive}
                  disabled={isSaving}
                />

                <Divider />

                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Thông tin thiết bị
                </Typography>

                <Stack spacing={1}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Địa chỉ MAC</Typography>
                    <Typography variant="body2">{device.mac_address}</Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">Serial</Typography>
                    <Typography variant="body2">{device.device_serial}</Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">Topic MQTT</Typography>
                    <Typography variant="body2" sx={{ wordBreak: "break-all", fontSize: "0.85rem" }}>
                      {device.topic}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">Vị trí (ID)</Typography>
                    {isEditingPlace ? (
                      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                        <TextField
                          type="number"
                          size="small"
                          value={editPlaceId}
                          onChange={(e) => setEditPlaceId(e.target.value)}
                          disabled={isSaving}
                          placeholder="ID vị trí"
                          sx={{ maxWidth: 120 }}
                        />
                        <Button
                          size="small"
                          variant="contained"
                          onClick={handleSavePlace}
                          disabled={isSaving}
                          sx={{ height: 40 }}
                        >
                          Lưu
                        </Button>
                        <Button
                          size="small"
                          onClick={() => {
                            setIsEditingPlace(false);
                            setEditPlaceId(device.place_id || "");
                          }}
                          disabled={isSaving}
                          sx={{ height: 40 }}
                        >
                          Hủy
                        </Button>
                      </Stack>
                    ) : (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2">
                          {device.place_id || "Chưa xác định"}
                        </Typography>
                        <Button
                          size="small"
                          onClick={() => setIsEditingPlace(true)}
                        >
                          Sửa
                        </Button>
                      </Stack>
                    )}
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">Tạo lúc</Typography>
                    <Typography variant="body2">
                      {device.created_at ? new Date(device.created_at).toLocaleString("vi-VN") : "N/A"}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">Cập nhật lúc</Typography>
                    <Typography variant="body2">
                      {device.updated_at ? new Date(device.updated_at).toLocaleString("vi-VN") : "N/A"}
                    </Typography>
                  </Box>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 Dữ liệu cảm biến realtime
              </Typography>
              {sensorData.length > 0 ? (
                <RealtimeChart data={sensorData} unit={sensorData[0]?.unit || ""} />
              ) : (
                <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
                  Chưa có dữ liệu cảm biến
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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

export default DeviceDetailPage;
