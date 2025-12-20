import React, { useEffect, useMemo, useState } from "react";
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
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
  Switch,
  CircularProgress,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import useSocket from "../hooks/useSocket";
import useAuth from "../hooks/useAuth";
import alertService from "../services/alert.service";
import deviceService from "../services/device.service";
import { trackEvent } from "../observability/faro";

const MAX_ALERTS = 50;

// Map between display symbols and backend condition values
const CONDITION_MAP = {
  ">": "greater_than",
  "<": "less_than",
  "=": "equal",
  "!=": "not_equal",
};

// Reverse map: backend condition to display symbol
const CONDITION_REVERSE_MAP = {
  "greater_than": ">",
  "less_than": "<",
  "equal": "=",
  "not_equal": "!=",
};

const AlertManagementPage = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [rules, setRules] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    deviceId: "",
    type: "temperature",
    condition: ">",
    threshold: 28,
    severity: "medium",
  });
  const [editRuleId, setEditRuleId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    deviceId: "",
    type: "temperature",
    condition: ">",
    threshold: 28,
    severity: "medium",
    active: true,
  });
  const [toast, setToast] = useState({ open: false, message: "", severity: "info" });

  // Load devices and rules
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        
        // First, load all devices
        const deviceList = await deviceService.getDevices();
        setDevices(deviceList || []);
        
        // Then, load rules for all devices
        const ruleList = await alertService.getRules(deviceList || []);
        
        // Transform backend data to frontend format
        const transformedRules = (ruleList || []).map(rule => ({
          ...rule,
          // Map backend field names to frontend names
          deviceId: rule.device_id,
          type: rule.metric_type,
          active: rule.is_enabled,
          condition: CONDITION_REVERSE_MAP[rule.condition] || rule.condition,
          severity: rule.severity || "medium",
          emailTo: rule.email_to || "",
        }));
        
        setRules(transformedRules);
        
      } catch (err) {
        console.error("Load alerts page error", err);
        setToast({ open: true, message: "Không thể tải dữ liệu cảnh báo", severity: "error" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Listen to socket messages for real-time alerts
  useSocket((msg) => {
    if (!msg || !msg.type) return;
    
    // Handle real-time alert notifications
    if (msg.type === "alert") {
      setAlerts((prev) => {
        const next = [msg.data, ...prev.filter((a) => a.id !== msg.data.id)].slice(0, MAX_ALERTS);
        return next;
      });
      setToast({ 
        open: true, 
        message: msg.data?.message || "Có cảnh báo mới", 
        severity: "warning" 
      });
    }
    
    // Handle rule updates via socket
    if (msg.type === "alert_rule_created") {
      setRules((prev) => [...prev, msg.data]);
    }
    
    if (msg.type === "alert_rule_updated") {
      setRules((prev) => prev.map((r) => (r.id === msg.data.id ? msg.data : r)));
    }
    
    if (msg.type === "alert_rule_deleted") {
      setRules((prev) => prev.filter((r) => r.id !== msg.data.id));
    }
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleCreateRule = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!form.deviceId) {
      setToast({ open: true, message: "Vui lòng chọn thiết bị", severity: "error" });
      return;
    }
    
    try {
      console.log("Creating rule with form data:", form);
      
      // Map frontend field names to backend field names
      const payload = {
        device_id: form.deviceId ? Number(form.deviceId) : null,
        metric_type: form.type,
        condition: CONDITION_MAP[form.condition],
        threshold: Number(form.threshold),
        severity: form.severity,
        is_enabled: true, // New rules are enabled by default
        email_to: user?.email || "", // Auto-fill with user's email
      };
      
      console.log("Sending payload to backend:", payload);
      
      const created = await alertService.createRule(payload);
      
      // Transform response to frontend format
      const transformedRule = {
        ...created,
        deviceId: created.device_id,
        type: created.metric_type,
        active: created.is_enabled,
        condition: CONDITION_REVERSE_MAP[created.condition] || created.condition,
        severity: created.severity || "medium",
        emailTo: created.email_to || "",
      };
      
      setRules((prev) => [...prev, transformedRule]);
      
      // Reset form
      setForm({
        name: "",
        deviceId: "",
        type: "temperature",
        condition: ">",
        threshold: 28,
        severity: "medium",
      });
      
      trackEvent("alert_rule_created", {
        id: created?.id,
        deviceId: payload.device_id || "all",
        type: payload.metric_type,
        condition: payload.condition,
      });
      
      setToast({ open: true, message: "Đã tạo quy tắc cảnh báo", severity: "success" });
    } catch (err) {
      console.error("Create rule error", err);
      setToast({ open: true, message: err.message || "Tạo quy tắc thất bại", severity: "error" });
    }
  };

  const startEdit = (rule) => {
    setEditRuleId(rule.id);
    setEditForm({
      name: rule.name || "",
      deviceId: rule.deviceId || rule.device_id || "",
      type: rule.type || rule.metric_type || "temperature",
      condition: rule.condition || ">",
      threshold: rule.threshold,
      severity: rule.severity || "medium",
      active: rule.active !== false,
    });
  };

  const cancelEdit = () => {
    setEditRuleId(null);
    setEditForm({
      name: "",
      deviceId: "",
      type: "temperature",
      condition: ">",
      threshold: 28,
      severity: "medium",
      active: true,
    });
  };

  const saveEdit = async (id) => {
    // Validate required fields
    if (!editForm.deviceId) {
      setToast({ open: true, message: "Vui lòng chọn thiết bị", severity: "error" });
      return;
    }

    try {
      console.log("Updating rule with form data:", editForm);
      
      // Map frontend field names to backend field names
      const payload = {
        device_id: editForm.deviceId ? Number(editForm.deviceId) : null,
        metric_type: editForm.type,
        condition: CONDITION_MAP[editForm.condition],
        threshold: Number(editForm.threshold),
        severity: editForm.severity,
        is_enabled: editForm.active,
        email_to: user?.email || "", // Auto-fill with user's email
      };
      
      console.log("Sending payload to backend:", payload);
      
      const updated = await alertService.updateRule(id, payload);
      
      // Transform response to frontend format
      const transformedRule = {
        ...updated,
        deviceId: updated.device_id,
        type: updated.metric_type,
        active: updated.is_enabled,
        condition: CONDITION_REVERSE_MAP[updated.condition] || updated.condition,
        severity: updated.severity || "medium",
        emailTo: updated.email_to || "",
      };
      
      setRules((prev) => prev.map((r) => (r.id === id ? transformedRule : r)));
      
      trackEvent("alert_rule_updated", {
        id,
        active: payload.is_enabled,
        severity: payload.severity,
      });
      
      setToast({ open: true, message: "Đã cập nhật quy tắc", severity: "success" });
      cancelEdit();
    } catch (err) {
      console.error("Update rule error", err);
      setToast({ open: true, message: err.message || "Cập nhật quy tắc thất bại", severity: "error" });
    }
  };

  const deleteRule = async (id) => {
    if (!window.confirm("Xóa quy tắc này?")) return;
    
    try {
      await alertService.deleteRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
      
      trackEvent("alert_rule_deleted", { id });
      setToast({ open: true, message: "Đã xóa quy tắc", severity: "success" });
    } catch (err) {
      console.error("Delete rule error", err);
      setToast({ open: true, message: err.message || "Xóa quy tắc thất bại", severity: "error" });
    }
  };

  const latestAlerts = useMemo(() => alerts.slice(0, 10), [alerts]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 2 }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          🚨 Quản lý Cảnh báo
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Tạo và quản lý các quy tắc cảnh báo cho thiết bị IoT
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={2}>
            <Grid item xs={12} md={5}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Tạo quy tắc mới
                  </Typography>
                  <Stack component="form" spacing={2} onSubmit={handleCreateRule}>
                    
                    <Select
                      name="deviceId"
                      value={form.deviceId || ""}
                      onChange={handleChange}
                      size="small"
                      displayEmpty
                      fullWidth
                      renderValue={(selected) => {
                        if (!selected) {
                          return (
                            <span style={{ color: "#9e9e9e" }}>
                              Chọn thiết bị
                            </span>
                          );
                        }

                        const device = devices.find(d => d.id === selected);
                        return device ? `${device.name} (#${device.id})` : "";
                      }}
                    >
                      {devices.map((d) => (
                        <MenuItem key={d.id} value={d.id}>
                          {d.name} (#{d.id})
                        </MenuItem>
                      ))}
                    </Select>
                    
                    <Select
                      name="type"
                      value={form.type || ""}
                      onChange={handleChange}
                      size="small"
                      displayEmpty
                      fullWidth
                    >
                      <MenuItem value="temperature">🌡️ Temperature</MenuItem>
                      <MenuItem value="humidity">💧 Humidity</MenuItem>
                    </Select>
                    
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Select 
                        name="condition" 
                        value={form.condition} 
                        onChange={handleChange} 
                        size="small"
                        sx={{ minWidth: 80 }}
                      >
                        <MenuItem value=">">&gt;</MenuItem>
                        <MenuItem value="<">&lt;</MenuItem>
                        <MenuItem value="=">=</MenuItem>
                        <MenuItem value="!=">≠</MenuItem>
                      </Select>
                      <TextField
                        label="Ngưỡng"
                        name="threshold"
                        type="number"
                        value={form.threshold}
                        onChange={handleChange}
                        size="small"
                        fullWidth
                      />
                    </Stack>
                    
                    <Select 
                      name="severity" 
                      value={form.severity} 
                      onChange={handleChange} 
                      size="small" 
                      fullWidth
                    >
                      <MenuItem value="low">🟢 Low</MenuItem>
                      <MenuItem value="medium">🟡 Medium</MenuItem>
                      <MenuItem value="high">🔴 High</MenuItem>
                    </Select>
                    
                    <Button type="submit" variant="contained" fullWidth>
                      Tạo quy tắc
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={7}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    📋 Danh sách quy tắc ({rules.length})
                  </Typography>
                  {rules.length === 0 ? (
                    <Box sx={{ textAlign: "center", py: 4 }}>
                      <Typography color="text.secondary">
                        Chưa có quy tắc nào. Hãy tạo quy tắc đầu tiên!
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, maxHeight: 500, overflowY: "auto" }}>
                      {rules.map((r) => {
                        const isEditing = editRuleId === r.id;
                        const device = devices.find(d => d.id === (r.deviceId || r.device_id));
                        const displayCondition = CONDITION_REVERSE_MAP[r.condition] || r.condition;
                        
                        return (
                          <Card key={r.id} variant="outlined" sx={{ 
                            p: 2,
                            transition: "all 0.2s",
                            "&:hover": { borderColor: "primary.main", boxShadow: 1 }
                          }}>
                            {isEditing ? (
                              <Stack spacing={2}>                                
                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                  <Select
                                    size="small"
                                    value={editForm.deviceId || ""}
                                    onChange={(e) => setEditForm({ ...editForm, deviceId: e.target.value })}
                                    displayEmpty
                                    sx={{ minWidth: 150 }}
                                  >
                                    {devices.map((d) => (
                                      <MenuItem key={d.id} value={d.id}>
                                        {d.name} (#{d.id})
                                      </MenuItem>
                                    ))}
                                  </Select>
                                  
                                  <Select
                                    size="small"
                                    value={editForm.type || ""}
                                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                                    sx={{ minWidth: 120 }}
                                  >
                                    <MenuItem value="temperature">Temperature</MenuItem>
                                    <MenuItem value="humidity">Humidity</MenuItem>
                                  </Select>
                                  
                                  <Select
                                    size="small"
                                    value={editForm.condition || ""}
                                    onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })}
                                    sx={{ minWidth: 70 }}
                                  >
                                    <MenuItem value=">">&gt;</MenuItem>
                                    <MenuItem value="<">&lt;</MenuItem>
                                    <MenuItem value="=">=</MenuItem>
                                    <MenuItem value="!=">≠</MenuItem>
                                  </Select>
                                  
                                  <TextField
                                    size="small"
                                    label="Ngưỡng"
                                    type="number"
                                    value={editForm.threshold}
                                    onChange={(e) => setEditForm({ ...editForm, threshold: e.target.value })}
                                    sx={{ width: 100 }}
                                  />
                                </Stack>
                                
                                <Stack direction="row" spacing={2} alignItems="center">
                                  <Select
                                    size="small"
                                    value={editForm.severity}
                                    onChange={(e) => setEditForm({ ...editForm, severity: e.target.value })}
                                    sx={{ minWidth: 120 }}
                                  >
                                    <MenuItem value="low">Low</MenuItem>
                                    <MenuItem value="medium">Medium</MenuItem>
                                    <MenuItem value="high">High</MenuItem>
                                  </Select>
                                  
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography variant="caption">Kích hoạt</Typography>
                                    <Switch
                                      size="small"
                                      checked={!!editForm.active}
                                      onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                                    />
                                  </Stack>
                                </Stack>
                                
                                <Stack direction="row" spacing={1}>
                                  <Button 
                                    size="small" 
                                    variant="contained" 
                                    startIcon={<CheckIcon />}
                                    onClick={() => saveEdit(r.id)}
                                  >
                                    Lưu
                                  </Button>
                                  <Button 
                                    size="small" 
                                    variant="outlined"
                                    startIcon={<CloseIcon />}
                                    onClick={cancelEdit}
                                  >
                                    Hủy
                                  </Button>
                                </Stack>
                              </Stack>
                            ) : (
                              <Box>
                                <Stack direction="row" justifyContent="space-between" alignItems="start" mb={1}>
                                  <Box flex={1}>
                                    <Typography variant="body1" fontWeight={600}>
                                      {r.name || `${r.type || r.metric_type} Alert Rule`}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {device ? `${device.name} (#${device.id})` : "Tất cả thiết bị"} • 
                                      {r.type || r.metric_type} {displayCondition} {r.threshold}
                                    </Typography>
                                    {r.emailTo && (
                                      <Typography variant="caption" color="text.secondary">
                                        📧 {r.emailTo}
                                      </Typography>
                                    )}
                                  </Box>
                                  
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Chip
                                      label={r.severity || "medium"}
                                      color={r.severity === "high" ? "error" : r.severity === "medium" ? "warning" : "default"}
                                      size="small"
                                    />
                                    <Chip
                                      label={r.active !== false ? "Bật" : "Tắt"}
                                      color={r.active !== false ? "success" : "default"}
                                      size="small"
                                      variant="outlined"
                                    />
                                  </Stack>
                                </Stack>
                                
                                <Stack direction="row" spacing={1}>
                                  <Tooltip title="Chỉnh sửa">
                                    <IconButton size="small" onClick={() => startEdit(r)}>
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Xóa">
                                    <IconButton size="small" color="error" onClick={() => deleteRule(r.id)}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              </Box>
                            )}
                          </Card>
                        );
                      })}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    🔔 Cảnh báo gần đây
                  </Typography>
                  {latestAlerts.length === 0 ? (
                    <Box sx={{ textAlign: "center", py: 4 }}>
                      <Typography color="text.secondary">
                        Chưa có cảnh báo nào.
                      </Typography>
                    </Box>
                  ) : (
                    <Stack spacing={1}>
                      {latestAlerts.map((a) => (
                        <Card key={a.id} variant="outlined">
                          <CardContent sx={{ py: 1.5 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Box flex={1}>
                                <Typography fontWeight={600}>
                                  {a.message || `${a.type} alert`}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Device #{a.deviceId} • {a.type} = {a.value}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {a.timestamp ? new Date(a.timestamp).toLocaleString() : ""}
                                </Typography>
                              </Box>
                              <Chip
                                label={a.severity}
                                color={a.severity === "high" ? "error" : a.severity === "medium" ? "warning" : "default"}
                                size="small"
                              />
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
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

export default AlertManagementPage;