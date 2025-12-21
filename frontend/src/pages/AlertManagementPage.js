import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Card, CardContent, Typography, Stack, TextField, Select, MenuItem,
  Button, Chip, Grid, Snackbar, Alert, IconButton, Switch, CircularProgress,
  InputAdornment,
} from "@mui/material";

import {
  DriveFileRenameOutline as EditIcon,
  DeleteOutline as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Thermostat,
  WaterDrop,
  NotificationsActive,
  AddAlert,
  Sensors,
  Tune
} from "@mui/icons-material";

import useAuth from "../hooks/useAuth";
import alertService from "../services/alert.service";
import deviceService from "../services/device.service";
import sensorService from "../services/sensor.service";
import { trackEvent } from "../observability/faro";

const MAX_ALERTS = 50;

const CONDITION_MAP = {
  ">": "greater_than",
  "<": "less_than",
  "=": "equal",
  "!=": "not_equal",
  "≤": "less_than_or_equal",
  "≥": "greater_than_or_equal"
};

const CONDITION_REVERSE_MAP = {
  "greater_than": ">",
  "less_than": "<",
  "equal": "=",
  "not_equal": "!=",
  "greater_than_or_equal": "≥",
  "less_than_or_equal": "≤"
};

// --- HELPER: MAP ICON THEO LOẠI DỮ LIỆU ---
const METRIC_ICONS = {
  temperature: <Thermostat color="error" fontSize="small" />,
  humidity: <WaterDrop color="primary" fontSize="small" />,
};

// --- HELPER: CHUYỂN ĐỔI DATA BACKEND -> FRONTEND ---
const transformRuleData = (rule) => ({
  ...rule,
  id: rule.id,
  deviceId: rule.device_id,
  deviceName: rule.device_name,
  type: rule.metric_type,
  active: rule.is_enabled,
  condition: CONDITION_REVERSE_MAP[rule.condition] || rule.condition,
  severity: rule.severity || "medium",
  emailTo: rule.email_to || "",
});

const AlertManagementPage = () => {
  const { user } = useAuth();
  
  // States
  const [alerts, setAlerts] = useState([]);
  const [rules, setRules] = useState([]);
  const [devices, setDevices] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false); 
  const [toast, setToast] = useState({ open: false, message: "", severity: "info" });

  // Form States
  const [form, setForm] = useState({
    name: "", deviceId: "", type: "temperature", condition: ">", threshold: 28, severity: "medium",
  });
  
  const [editRuleId, setEditRuleId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "", deviceId: "", type: "temperature", condition: ">", threshold: 28, severity: "medium", active: true,
  });

  // Load Initial Data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [deviceList, ruleList, alertHistory] = await Promise.all([
          deviceService.getDevices(),
          alertService.getRules(),
          sensorService.getAlertHistory().catch(() => [])
        ]);

        setDevices(deviceList || []);

        setRules((ruleList || []).map(transformRuleData));

        const transformedAlerts = (alertHistory || [])
          .sort((a, b) => new Date(b.triggered_at || b.timestamp) - new Date(a.triggered_at || a.timestamp))
          .slice(0, MAX_ALERTS)
          .map(alert => ({
            ...alert,
            id: alert.id || alert.alert_rule_id,
            deviceId: alert.device_id,
            timestamp: alert.triggered_at || alert.timestamp,
          }));
        setAlerts(transformedAlerts);

      } catch (err) {
        console.error("Load alerts page error", err);
        setToast({ open: true, message: "Không thể tải dữ liệu hệ thống", severity: "error" });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleCreateRule = async (e) => {
    e.preventDefault();
    if (!form.deviceId) {
      setToast({ open: true, message: "Vui lòng chọn thiết bị", severity: "error" });
      return;
    }

    setSubmitting(true); 

    try {
      const payload = {
        device_id: Number(form.deviceId),
        metric_type: form.type,
        condition: CONDITION_MAP[form.condition],
        threshold: Number(form.threshold),
        severity: form.severity,
        is_enabled: true,
        email_to: user?.email || "",
      };

      const created = await alertService.createRule(payload);
      const transformedRule = transformRuleData(created); 

      setRules((prev) => [transformedRule, ...prev]);
      
      setForm({ ...form, threshold: 28 });
      
      trackEvent("alert_rule_created", { id: created?.id, type: payload.metric_type });
      setToast({ open: true, message: "Đã tạo quy tắc cảnh báo", severity: "success" });
    } catch (err) {
      setToast({ open: true, message: err.message || "Tạo quy tắc thất bại", severity: "error" });
    } finally {
      setSubmitting(false); 
    }
  };

  const startEdit = (rule) => {
    setEditRuleId(rule.id);
    setEditForm({
      name: rule.name || "",
      deviceId: rule.deviceId || rule.device_id || "",
      type: rule.type || "temperature",
      condition: rule.condition || ">",
      threshold: rule.threshold,
      severity: rule.severity || "medium",
      active: rule.active !== false,
    });
  };

  const saveEdit = async (id) => {
    if (!editForm.deviceId) return;

    try {
      const payload = {
        device_id: Number(editForm.deviceId),
        metric_type: editForm.type,
        condition: CONDITION_MAP[editForm.condition],
        threshold: Number(editForm.threshold),
        severity: editForm.severity,
        is_enabled: editForm.active,
        email_to: user?.email || "",
      };

      const updated = await alertService.updateRule(id, payload);
      const transformedRule = transformRuleData(updated); 

      setRules((prev) => prev.map((r) => (r.id === id ? transformedRule : r)));
      
      trackEvent("alert_rule_updated", { id, active: payload.is_enabled });
      setToast({ open: true, message: "Đã cập nhật quy tắc", severity: "success" });
      setEditRuleId(null);
    } catch (err) {
      setToast({ open: true, message: err.message || "Cập nhật thất bại", severity: "error" });
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
      setToast({ open: true, message: err.message || "Xóa thất bại", severity: "error" });
    }
  };

  const latestAlerts = useMemo(() => alerts.slice(0, 10), [alerts]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 2 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <AddAlert color="primary" sx={{ fontSize: 40 }} />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Quản lý Cảnh báo
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Tạo và quản lý các quy tắc cảnh báo cho thiết bị IoT
          </Typography>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={2}>
            {/* Create Rule Form */}
            <Grid item xs={12} md={5}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Tune fontSize="small" /> Tạo quy tắc mới
                  </Typography>
                  <Stack component="form" spacing={2} onSubmit={handleCreateRule}>
                    <Select
                      name="deviceId"
                      value={form.deviceId || ""}
                      onChange={handleChange}
                      size="small"
                      displayEmpty
                      fullWidth
                    >
                      <MenuItem value="" disabled>
                         <Stack direction="row" spacing={1} alignItems="center">
                           <Sensors fontSize="small" color="disabled"/> <span>Chọn thiết bị</span>
                         </Stack>
                      </MenuItem>
                      {devices.map((d) => (
                        <MenuItem key={d.id} value={d.id}>{d.name} (#{d.id})</MenuItem>
                      ))}
                    </Select>
                    
                    <Select
                      name="type"
                      value={form.type || ""}
                      onChange={handleChange}
                      size="small"
                      fullWidth
                    >
                      <MenuItem value="temperature">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Thermostat fontSize="small" color="error"/> <Typography>Temperature</Typography>
                        </Stack>
                      </MenuItem>
                      <MenuItem value="humidity">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <WaterDrop fontSize="small" color="primary"/> <Typography>Humidity</Typography>
                        </Stack>
                      </MenuItem>
                    </Select>
                    
                    <Stack direction="row" spacing={1}>
                      <Select 
                        name="condition" 
                        value={form.condition} 
                        onChange={handleChange} 
                        size="small"
                        sx={{ minWidth: 80 }}
                      >
                        {Object.keys(CONDITION_MAP).map(k => <MenuItem key={k} value={k}>{k}</MenuItem>)}
                      </Select>
                      <TextField
                        label="Ngưỡng"
                        name="threshold"
                        type="number"
                        value={form.threshold}
                        onChange={handleChange}
                        size="small"
                        fullWidth
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              {form.type === 'temperature' ? '°C' : '%'}
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Stack>
                    
                    <Select name="severity" value={form.severity} onChange={handleChange} size="small" fullWidth>
                      <MenuItem value="low">🟢 Low</MenuItem>
                      <MenuItem value="medium">🟡 Medium</MenuItem>
                      <MenuItem value="high">🔴 High</MenuItem>
                    </Select>
                    
                    <Button 
                      type="submit" 
                      variant="contained" 
                      fullWidth 
                      disabled={submitting} // [MỚI] Chặn click
                      startIcon={submitting ? <CircularProgress size={20} color="inherit"/> : <AddAlert />}
                    >
                      {submitting ? "Đang tạo..." : "Tạo quy tắc"}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Rules List */}
            <Grid item xs={12} md={7}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    📋 Danh sách quy tắc ({rules.length})
                  </Typography>
                  {rules.length === 0 ? (
                    <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
                      Chưa có quy tắc nào.
                    </Box>
                  ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, maxHeight: 500, overflowY: "auto" }}>
                      {rules.map((r) => {
                        const isEditing = editRuleId === r.id;
                        const device = devices.find(d => d.id === (r.deviceId || r.device_id));
                        
                        return (
                          <Card key={r.id} variant="outlined" sx={{ p: 2 }}>
                            {isEditing ? (
                              <Stack spacing={2}>                                
                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                  <Select
                                    size="small"
                                    value={editForm.deviceId || ""}
                                    onChange={(e) => setEditForm({ ...editForm, deviceId: e.target.value })}
                                    sx={{ minWidth: 150 }}
                                  >
                                    {devices.map((d) => (
                                      <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                                    ))}
                                  </Select>
                                  <Select
                                    size="small"
                                    value={editForm.type}
                                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                                    sx={{ minWidth: 120 }}
                                  >
                                    <MenuItem value="temperature">Temp</MenuItem>
                                    <MenuItem value="humidity">Humid</MenuItem>
                                  </Select>
                                  <Select
                                    size="small"
                                    value={editForm.condition}
                                    onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })}
                                    sx={{ minWidth: 70 }}
                                  >
                                    {Object.keys(CONDITION_MAP).map(k => <MenuItem key={k} value={k}>{k}</MenuItem>)}
                                  </Select>
                                  <TextField
                                    size="small"
                                    type="number"
                                    value={editForm.threshold}
                                    onChange={(e) => setEditForm({ ...editForm, threshold: e.target.value })}
                                    sx={{ width: 100 }}
                                    InputProps={{
                                      endAdornment: (
                                        <InputAdornment position="end">
                                          {editForm.type === 'temperature' ? '°C' : '%'}
                                        </InputAdornment>
                                      ),
                                    }}
                                  />
                                </Stack>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Select
                                      size="small"
                                      value={editForm.severity}
                                      onChange={(e) => setEditForm({ ...editForm, severity: e.target.value })}
                                    >
                                      <MenuItem value="low">Low</MenuItem>
                                      <MenuItem value="medium">Medium</MenuItem>
                                      <MenuItem value="high">High</MenuItem>
                                    </Select>
                                    <Switch
                                      size="small"
                                      checked={!!editForm.active}
                                      onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                                    />
                                  </Stack>
                                  
                                  <Stack direction="row" spacing={1}>
                                    <Button size="small" variant="contained" onClick={() => saveEdit(r.id)}>
                                        <SaveIcon fontSize="small"/>
                                    </Button>
                                    <Button size="small" variant="outlined" color="inherit" onClick={() => setEditRuleId(null)}>
                                        <CancelIcon fontSize="small"/>
                                    </Button>
                                  </Stack>
                                </Stack>
                              </Stack>
                            ) : (
                              <Stack direction="row" justifyContent="space-between" alignItems="start">
                                <Box>
                                  <Stack direction="row" alignItems="center" spacing={1}>
                                    {METRIC_ICONS[r.type] || <Sensors fontSize="small" />}
                                    <Typography fontWeight={600}>
                                        {r.type.charAt(0).toUpperCase() + r.type.slice(1)} Rule
                                    </Typography>
                                  </Stack>
                                  <Typography variant="body2" color="text.secondary" sx={{ ml: 3.5 }}>
                                    {device ? device.name : `ID: ${r.deviceId}`} • {r.condition} {r.threshold} {r.type === 'temperature' ? '°C' : '%'}
                                  </Typography>
                                </Box>
                                <Stack alignItems="end">
                                  <Stack direction="row" spacing={1} mb={0.5}>
                                    <Chip label={r.severity} size="small" color={r.severity === "high" ? "error" : "warning"} />
                                    <Chip label={r.active ? "ON" : "OFF"} size="small" variant="outlined" color={r.active ? "success" : "default"} />
                                  </Stack>
                                  <Stack direction="row">
                                    <IconButton size="small" onClick={() => startEdit(r)}><EditIcon fontSize="small" /></IconButton>
                                    <IconButton size="small" color="error" onClick={() => deleteRule(r.id)}><DeleteIcon fontSize="small" /></IconButton>
                                  </Stack>
                                </Stack>
                              </Stack>
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

          {/* Recent Alerts History */}
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <NotificationsActive color="warning" /> Cảnh báo gần đây
                  </Typography>
                  {latestAlerts.length === 0 ? (
                    <Typography align="center" color="text.secondary" py={2}>Không có dữ liệu.</Typography>
                  ) : (
                    <Stack spacing={1}>
                      {latestAlerts.map((a) => {
                         const device = devices.find(d => d.id === a.deviceId);
                         return (
                           <Card key={a.id} variant="outlined" sx={{ px: 2, py: 1 }}>
                             <Stack direction="row" justifyContent="space-between" alignItems="center">
                               <Stack direction="row" spacing={2} alignItems="center">
                                 {METRIC_ICONS[a.type] || <NotificationsActive color="disabled" fontSize="small"/>}
                                 <Box>
                                    <Typography variant="subtitle2">{a.message || `${a.type} Alert`}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {device?.name || a.deviceId} • {new Date(a.timestamp).toLocaleString('vi-VN')}
                                    </Typography>
                                 </Box>
                               </Stack>
                               {a.severity && <Chip label={a.severity} size="small" color={a.severity === "high" ? "error" : "default"} />}
                             </Stack>
                           </Card>
                         )
                      })}
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
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })} sx={{ width: "100%" }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AlertManagementPage;