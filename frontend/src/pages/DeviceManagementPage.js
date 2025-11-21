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
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import deviceService from "../services/device.service";
import useSocket from "../hooks/useSocket";

const DeviceManagementPage = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", type: "", location: "" });
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ search: "", type: "", status: "" });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", type: "", location: "", status: "" });
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

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleFilterChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name) {
      setError("Tên thiết bị là bắt buộc");
      return;
    }
    try {
      const created = await deviceService.createDevice(form);
      if (created && created.id) {
        setDevices((d) => upsertDevice(d, created));
      } else {
        await load();
      }
      setForm({ name: "", type: "", location: "" });
      setToast({ open: true, message: "Đã thêm thiết bị", severity: "success" });
    } catch (err) {
      console.error("Add device error:", err);
      setError(err.response?.data?.error || "Không thể thêm thiết bị");
      setToast({ open: true, message: "Thêm thiết bị thất bại", severity: "error" });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa thiết bị này?")) return;
    try {
      await deviceService.deleteDevice(id);
      setDevices((d) => d.filter((x) => x.id !== id));
      setToast({ open: true, message: "Đã xóa thiết bị", severity: "success" });
    } catch (err) {
      setError("Xóa không thành công");
      setToast({ open: true, message: "Xóa thiết bị thất bại", severity: "error" });
    }
  };

  const startEdit = (device) => {
    setEditingId(device.id);
    setEditForm({
      name: device.name,
      type: device.type,
      location: device.location,
      status: device.status || "offline",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: "", type: "", location: "", status: "" });
  };

  const saveEdit = async (id) => {
    try {
      const updated = await deviceService.updateDevice(id, editForm);
      setDevices((prev) => prev.map((d) => (d.id === id ? updated : d)));
      cancelEdit();
      setToast({ open: true, message: "Đã cập nhật thiết bị", severity: "success" });
    } catch (err) {
      console.error("Update device error", err);
      setError("Cập nhật không thành công");
      setToast({ open: true, message: "Cập nhật thiết bị thất bại", severity: "error" });
    }
  };

  const filteredDevices = useMemo(() => {
    return devices
      .filter((d) =>
        filters.type ? (d.type || "").toLowerCase() === filters.type.toLowerCase() : true
      )
      .filter((d) =>
        filters.status ? (d.status || "offline").toLowerCase() === filters.status.toLowerCase() : true
      )
      .filter((d) => {
        const query = filters.search.trim().toLowerCase();
        if (!query) return true;
        return (
          d.name?.toLowerCase().includes(query) ||
          d.location?.toLowerCase().includes(query) ||
          String(d.id).includes(query)
        );
      });
  }, [devices, filters]);

  return (
    <>
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h5" gutterBottom>
        Device Management
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Thêm thiết bị
              </Typography>
              <Stack component="form" spacing={2} onSubmit={handleAdd}>
                <TextField
                  label="Tên thiết bị"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  size="small"
                />
                <TextField
                  label="Vị trí"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  size="small"
                />
                <Select
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  size="small"
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>Chọn loại thiết bị</em>
                  </MenuItem>
                  <MenuItem value="temperature">Cảm biến nhiệt độ</MenuItem>
                  <MenuItem value="gateway">Gateway</MenuItem>
                </Select>
                <Button type="submit" variant="contained">
                  Thêm
                </Button>
                {error && (
                  <Typography color="error" variant="body2">
                    {error}
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems="center">
                <TextField
                  name="search"
                  placeholder="Tìm kiếm theo tên, vị trí, ID"
                  value={filters.search}
                  onChange={handleFilterChange}
                  size="small"
                  fullWidth
                />
                <Select
                  name="type"
                  value={filters.type}
                  onChange={handleFilterChange}
                  size="small"
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>Tất cả loại</em>
                  </MenuItem>
                  <MenuItem value="temperature">Cảm biến nhiệt độ</MenuItem>
                  <MenuItem value="gateway">Gateway</MenuItem>
                </Select>
                <Select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  size="small"
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>Tất cả trạng thái</em>
                  </MenuItem>
                  <MenuItem value="online">Online</MenuItem>
                  <MenuItem value="offline">Offline</MenuItem>
                </Select>
              </Stack>

              {loading ? (
                <Typography>Đang tải...</Typography>
              ) : filteredDevices.length === 0 ? (
                <Typography>Không có thiết bị.</Typography>
              ) : (
                <Box sx={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #e5e7eb" }}>ID</th>
                        <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #e5e7eb" }}>Name</th>
                        <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #e5e7eb" }}>Type</th>
                        <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #e5e7eb" }}>Location</th>
                        <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #e5e7eb" }}>Status</th>
                        <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #e5e7eb" }}>Last seen</th>
                        <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #e5e7eb" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDevices.map((d) => {
                        const isEditing = editingId === d.id;
                        return (
                          <tr key={d.id}>
                            <td style={{ padding: "8px" }}>{d.id}</td>
                            <td style={{ padding: "8px" }}>
                              {isEditing ? (
                                <TextField
                                  size="small"
                                  value={editForm.name}
                                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                />
                              ) : (
                                d.name
                              )}
                            </td>
                            <td style={{ padding: "8px" }}>
                              {isEditing ? (
                                <Select
                                  size="small"
                                  value={editForm.type}
                                  onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                                  displayEmpty
                                >
                                  <MenuItem value="">
                                    <em>Chọn loại</em>
                                  </MenuItem>
                                  <MenuItem value="temperature">Cảm biến nhiệt độ</MenuItem>
                                  <MenuItem value="gateway">Gateway</MenuItem>
                                </Select>
                              ) : (
                                d.type || "-"
                              )}
                            </td>
                            <td style={{ padding: "8px" }}>
                              {isEditing ? (
                                <TextField
                                  size="small"
                                  value={editForm.location}
                                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                />
                              ) : (
                                d.location || "-"
                              )}
                            </td>
                            <td style={{ padding: "8px" }}>
                              {isEditing ? (
                                <Select
                                  size="small"
                                  value={editForm.status}
                                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                >
                                  <MenuItem value="online">Online</MenuItem>
                                  <MenuItem value="offline">Offline</MenuItem>
                                </Select>
                              ) : (
                                <Chip
                                  label={d.status || "offline"}
                                  color={(d.status || "").toLowerCase() === "online" ? "success" : "default"}
                                  size="small"
                                />
                              )}
                            </td>
                            <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                              {d.lastSeen ? new Date(d.lastSeen).toLocaleTimeString() : "-"}
                            </td>
                            <td style={{ padding: "8px" }}>
                              {isEditing ? (
                                <Stack direction="row" spacing={1}>
                                  <IconButton color="success" size="small" onClick={() => saveEdit(d.id)}>
                                    <CheckIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton color="inherit" size="small" onClick={cancelEdit}>
                                    <CloseIcon fontSize="small" />
                                  </IconButton>
                                </Stack>
                              ) : (
                                <Stack direction="row" spacing={1}>
                                  <Tooltip title="Chi tiết">
                                    <IconButton size="small" onClick={() => navigate(`/devices/${d.id}`)}>
                                      <VisibilityIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Sửa">
                                    <IconButton size="small" onClick={() => startEdit(d)}>
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Xóa">
                                    <IconButton size="small" color="error" onClick={() => handleDelete(d.id)}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Box>
              )}
            </CardContent>
          </Card>
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
