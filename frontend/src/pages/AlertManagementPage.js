import React, { useEffect, useState } from "react";
import {
  Box, Card, CardContent, Typography, Stack, TextField, Select, MenuItem,
  Button, Chip, Grid, Snackbar, Alert, IconButton, Switch, CircularProgress,
  InputAdornment, Container, Paper, Divider, Fade
} from "@mui/material";

import {
  DriveFileRenameOutline as EditIcon,
  DeleteOutline as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Thermostat,
  WaterDrop,
  NotificationsActive,
  Tune,
  History,
  CheckCircleOutline,
  ErrorOutline
} from "@mui/icons-material";

import useAuth from "../hooks/useAuth";
import alertService from "../services/alert.service";
import deviceService from "../services/device.service";
import sensorService from "../services/sensor.service";

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

const METRIC_ICONS = {
  temperature: <Thermostat sx={{ color: "#ef4444" }} />,
  humidity: <WaterDrop sx={{ color: "#3b82f6" }} />,
};

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
  const [alerts, setAlerts] = useState([]);
  const [rules, setRules] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", severity: "info" });

  const [form, setForm] = useState({
    name: "", deviceId: "", type: "temperature", condition: ">", threshold: 28, severity: "medium",
  });
  
  const [editRuleId, setEditRuleId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "", deviceId: "", type: "temperature", condition: ">", threshold: 28, severity: "medium", active: true,
  });

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
        setAlerts((alertHistory || []).sort((a, b) => new Date(b.triggered_at || b.timestamp) - new Date(a.triggered_at || a.timestamp)).slice(0, MAX_ALERTS));
      } catch (err) {
        setToast({ open: true, message: "Lỗi kết nối hệ thống", severity: "error" });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleCreateRule = async (e) => {
    e.preventDefault();
    if (!form.deviceId) return setToast({ open: true, message: "Vui lòng chọn thiết bị", severity: "warning" });
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
      setRules((prev) => [transformRuleData(created), ...prev]);
      setToast({ open: true, message: "Đã thêm quy tắc mới", severity: "success" });
    } catch (err) {
      setToast({ open: true, message: "Không thể tạo quy tắc", severity: "error" });
    } finally { setSubmitting(false); }
  };

  const saveEdit = async (id) => {
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
      setRules((prev) => prev.map((r) => (r.id === id ? transformRuleData(updated) : r)));
      setEditRuleId(null);
      setToast({ open: true, message: "Cập nhật thành công", severity: "success" });
    } catch (err) {
      setToast({ open: true, message: "Cập nhật thất bại", severity: "error" });
    }
  };

  const deleteRule = async (id) => {
    if (!window.confirm("Bạn muốn xóa quy tắc này?")) return;
    try {
      await alertService.deleteRule(id);
      setRules(prev => prev.filter(r => r.id !== id));
      setToast({ open: true, message: "Đã xóa quy tắc", severity: "success" });
    } catch (err) { setToast({ open: true, message: "Xóa thất bại", severity: "error" }); }
  };

  return (
    <Box sx={{ bgcolor: "#f8fafc", minHeight: "100vh", py: 4 }}>
      <Container maxWidth="lg">
        {/* Header Section */}
        <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ p: 1.5, bgcolor: "primary.main", borderRadius: 3, display: "flex", color: "white" }}>
              <NotificationsActive fontSize="large" />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: "#1e293b", letterSpacing: "-1px" }}>
                Hệ thống Cảnh báo
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Thiết lập ngưỡng an toàn và theo dõi lịch sử sự cố thiết bị
              </Typography>
            </Box>
          </Stack>
        </Box>

        {loading ? (
          <Stack alignItems="center" sx={{ py: 10 }}><CircularProgress thickness={5} /></Stack>
        ) : (
          <Grid container spacing={4}>
            
            {/* Left: Create Form */}
            <Grid item xs={12} lg={4}>
              <Card sx={{ borderRadius: 5, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0" }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, display: "flex", alignItems: "center", gap: 1 }}>
                    <Tune color="primary" /> Quy tắc mới
                  </Typography>
                  
                  <Stack component="form" spacing={2.5} onSubmit={handleCreateRule}>
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: "block", color: "#64748b" }}>THIẾT BỊ MỤC TIÊU</Typography>
                      <Select
                        name="deviceId"
                        value={form.deviceId}
                        onChange={(e) => setForm({...form, deviceId: e.target.value})}
                        fullWidth size="small" displayEmpty
                        sx={{ borderRadius: 2.5, bgcolor: "#f1f5f9" }}
                      >
                        <MenuItem value="" disabled>Chọn thiết bị...</MenuItem>
                        {devices.map((d) => <MenuItem key={d.id} value={d.id}>{d.name} (#{d.id})</MenuItem>)}
                      </Select>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: "block", color: "#64748b" }}>LOẠI DỮ LIỆU</Typography>
                        <Select
                          name="type"
                          value={form.type}
                          onChange={(e) => setForm({...form, type: e.target.value})}
                          fullWidth size="small" sx={{ borderRadius: 2.5 }}
                        >
                          <MenuItem value="temperature">Nhiệt độ</MenuItem>
                          <MenuItem value="humidity">Độ ẩm</MenuItem>
                        </Select>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: "block", color: "#64748b" }}>MỨC ĐỘ</Typography>
                        <Select
                          name="severity"
                          value={form.severity}
                          onChange={(e) => setForm({...form, severity: e.target.value})}
                          fullWidth size="small" sx={{ borderRadius: 2.5 }}
                        >
                          <MenuItem value="low">Thấp</MenuItem>
                          <MenuItem value="medium">Trung bình</MenuItem>
                          <MenuItem value="high">Nghiêm trọng</MenuItem>
                        </Select>
                      </Grid>
                    </Grid>

                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: "block", color: "#64748b" }}>ĐIỀU KIỆN KÍCH HOẠT</Typography>
                      <Stack direction="row" spacing={1}>
                        <Select 
                          name="condition" value={form.condition} 
                          onChange={(e) => setForm({...form, condition: e.target.value})} 
                          size="small" sx={{ minWidth: 80, borderRadius: 2.5 }}
                        >
                          {Object.keys(CONDITION_MAP).map(k => <MenuItem key={k} value={k}>{k}</MenuItem>)}
                        </Select>
                        <TextField
                          name="threshold" type="number" value={form.threshold}
                          onChange={(e) => setForm({...form, threshold: e.target.value})}
                          size="small" fullWidth
                          InputProps={{
                            endAdornment: <InputAdornment position="end">{form.type === 'temperature' ? '°C' : '%'}</InputAdornment>,
                            sx: { borderRadius: 2.5 }
                          }}
                        />
                      </Stack>
                    </Box>
                    
                    <Button 
                      type="submit" variant="contained" fullWidth size="large"
                      disabled={submitting}
                      sx={{ borderRadius: 3, py: 1.5, fontWeight: 800, textTransform: "none", boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.4)" }}
                    >
                      {submitting ? <CircularProgress size={24} color="inherit" /> : "Kích hoạt Quy tắc"}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Right: Active Rules List */}
            <Grid item xs={12} lg={8}>
              <Paper sx={{ p: 3, borderRadius: 5, border: "1px solid #e2e8f0", boxShadow: "none", bgcolor: "white" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>Quy tắc đang hoạt động</Typography>
                  <Chip label={`${rules.length} Quy tắc`} color="primary" size="small" sx={{ fontWeight: 700 }} />
                </Stack>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 550, overflowY: "auto", pr: 1 }}>
                  {rules.length === 0 ? (
                    <Stack alignItems="center" sx={{ py: 6, color: "#94a3b8" }}>
                      <CheckCircleOutline sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                      <Typography>Chưa có quy tắc nào được thiết lập</Typography>
                    </Stack>
                  ) : (
                    rules.map((r, idx) => {
                      const isEditing = editRuleId === r.id;
                      const device = devices.find(d => d.id === r.deviceId);
                      return (
                        <Fade in key={r.id} timeout={300 + idx * 50}>
                          <Card variant="outlined" sx={{ 
                            borderRadius: 3, border: isEditing ? "2px solid #3b82f6" : "1px solid #f1f5f9",
                            bgcolor: isEditing ? "#eff6ff" : "white", transition: "0.2s"
                          }}>
                            <CardContent sx={{ p: 2 }}>
                              {isEditing ? (
                                <Stack spacing={2}>
                                  <Grid container spacing={1}>
                                    <Grid item xs={6}><Select fullWidth size="small" value={editForm.deviceId} onChange={(e) => setEditForm({...editForm, deviceId: e.target.value})}>{devices.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}</Select></Grid>
                                    <Grid item xs={6}><Select fullWidth size="small" value={editForm.type} onChange={(e) => setEditForm({...editForm, type: e.target.value})}><MenuItem value="temperature">Nhiệt độ</MenuItem><MenuItem value="humidity">Độ ẩm</MenuItem></Select></Grid>
                                    <Grid item xs={4}><Select fullWidth size="small" value={editForm.condition} onChange={(e) => setEditForm({...editForm, condition: e.target.value})}>{Object.keys(CONDITION_MAP).map(k => <MenuItem key={k} value={k}>{k}</MenuItem>)}</Select></Grid>
                                    <Grid item xs={4}><TextField fullWidth size="small" type="number" value={editForm.threshold} onChange={(e) => setEditForm({...editForm, threshold: e.target.value})} /></Grid>
                                    <Grid item xs={4}><Select fullWidth size="small" value={editForm.severity} onChange={(e) => setEditForm({...editForm, severity: e.target.value})}><MenuItem value="low">Thấp</MenuItem><MenuItem value="medium">Trung bình</MenuItem><MenuItem value="high">Nghiêm trọng</MenuItem></Select></Grid>
                                  </Grid>
                                  <Stack direction="row" justifyContent="space-between">
                                    <Stack direction="row" alignItems="center" spacing={1}><Switch checked={editForm.active} onChange={(e) => setEditForm({...editForm, active: e.target.checked})} /><Typography variant="caption">Trạng thái hoạt động</Typography></Stack>
                                    <Stack direction="row" spacing={1}><IconButton color="primary" onClick={() => saveEdit(r.id)}><SaveIcon /></IconButton><IconButton onClick={() => setEditRuleId(null)}><CancelIcon /></IconButton></Stack>
                                  </Stack>
                                </Stack>
                              ) : (
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Stack direction="row" spacing={2} alignItems="center">
                                    <Box sx={{ p: 1, borderRadius: 2, bgcolor: r.type === 'temperature' ? "#fef2f2" : "#eff6ff" }}>
                                      {METRIC_ICONS[r.type]}
                                    </Box>
                                    <Box>
                                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{device?.name || "Thiết bị lạ"}</Typography>
                                      <Typography variant="body2" sx={{ color: "#64748b" }}>
                                        Cảnh báo khi {r.type === 'temperature' ? 'nhiệt độ' : 'độ ẩm'} {r.condition} {r.threshold}{r.type === 'temperature' ? '°C' : '%'}
                                      </Typography>
                                    </Box>
                                  </Stack>
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Chip label={r.severity} size="small" color={r.severity === 'high' ? 'error' : 'warning'} sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }} />
                                    <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                                    <IconButton size="small" onClick={() => { setEditRuleId(r.id); setEditForm({...r, active: r.active}); }}><EditIcon fontSize="small" /></IconButton>
                                    <IconButton size="small" color="error" onClick={() => deleteRule(r.id)}><DeleteIcon fontSize="small" /></IconButton>
                                  </Stack>
                                </Stack>
                              )}
                            </CardContent>
                          </Card>
                        </Fade>
                      );
                    })
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* Bottom: History Timeline */}
            <Grid item xs={12}>
              <Card sx={{ borderRadius: 5, border: "1px solid #e2e8f0" }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
                    <History color="action" />
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>Lịch sử cảnh báo gần đây</Typography>
                  </Stack>
                  
                  {alerts.length === 0 ? (
                    <Box sx={{ py: 4, textAlign: "center", color: "#94a3b8" }}>Hệ thống chưa ghi nhận cảnh báo nào.</Box>
                  ) : (
                    <Grid container spacing={2}>
                      {alerts.slice(0, 6).map((a, i) => (
                        <Grid item xs={12} md={6} lg={4} key={i}>
                          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: "#f8fafc", position: "relative" }}>
                            <Box sx={{ position: "absolute", top: 12, right: 12 }}>
                              <Chip label={a.severity || "info"} size="small" variant="filled" color={a.severity === 'high' ? 'error' : 'default'} sx={{ fontSize: 9, height: 18 }} />
                            </Box>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <ErrorOutline sx={{ color: a.severity === 'high' ? "#ef4444" : "#f59e0b" }} />
                              <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1 }}>{a.message || "Phát hiện ngưỡng vượt mức"}</Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {new Date(a.triggered_at || a.timestamp).toLocaleString('vi-VN')}
                                </Typography>
                              </Box>
                            </Stack>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Container>

      <Snackbar
        open={toast.open} autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={toast.severity} sx={{ borderRadius: 3, fontWeight: 600 }}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AlertManagementPage;