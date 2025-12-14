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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import useSocket from "../hooks/useSocket";
import alertService from "../services/alert.service";
import deviceService from "../services/device.service";
import { trackEvent } from "../observability/faro";

const MAX_ALERTS = 50;
const DEFAULT_NOTIFICATION_CONFIG = {
  emailEnabled: false,
  emailRecipients: "",
  webhookEnabled: false,
  webhookUrl: "",
  webhookSecret: "",
};

const AlertManagementPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [rules, setRules] = useState([]);
  const [devices, setDevices] = useState([]);
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
  const [notificationConfig, setNotificationConfig] = useState(DEFAULT_NOTIFICATION_CONFIG);
  const [loadingNotification, setLoadingNotification] = useState(true);
  const [savingNotification, setSavingNotification] = useState(false);
  const [testingNotification, setTestingNotification] = useState(false);

  const toStateNotification = (config) => {
    const recipients = Array.isArray(config?.emailRecipients)
      ? config.emailRecipients.join(", ")
      : config?.emailRecipients || "";
    return {
      ...DEFAULT_NOTIFICATION_CONFIG,
      ...config,
      emailRecipients: recipients,
      webhookUrl: config?.webhookUrl || "",
      webhookSecret: config?.webhookSecret || "",
    };
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingNotification(true);
        const [alertList, history, ruleList, deviceList, notifConfig] = await Promise.all([
          alertService.getAlerts(),
          alertService.getAlertHistory(),
          alertService.getRules(),
          deviceService.getDevices(),
          alertService.getNotificationConfig(),
        ]);
        // Merge latest + history, unique by id
        const merged = [...history, ...alertList];
        const uniq = merged.reduce((acc, item) => {
          if (!acc.find((x) => x.id === item.id)) acc.push(item);
          return acc;
        }, []);
        setAlerts(uniq.slice(0, MAX_ALERTS));
        setRules(ruleList || []);
        setDevices(deviceList || []);
        setNotificationConfig(toStateNotification(notifConfig));
      } catch (err) {
        console.error("Load alerts page error", err);
        setToast({ open: true, message: "Không thể tải dữ liệu cảnh báo", severity: "error" });
      } finally {
        setLoadingNotification(false);
      }
    };
    load();
  }, []);

  useSocket((msg) => {
    if (!msg || !msg.type) return;
    if (msg.type === "alert") {
      setAlerts((prev) => {
        const next = [msg.data, ...prev.filter((a) => a.id !== msg.data.id)].slice(0, MAX_ALERTS);
        return next;
      });
      setToast({ open: true, message: msg.data?.message || "Có cảnh báo mới", severity: "warning" });
    }
    if (msg.type === "notification_test") {
      setToast({ open: true, message: msg.data?.message || "Notification test", severity: "info" });
    }
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleNotificationChange = (field, value) =>
    setNotificationConfig((prev) => ({ ...prev, [field]: value }));
  const normalizeEmails = (value) =>
    value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

  const handleCreateRule = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        deviceId: form.deviceId ? Number(form.deviceId) : null,
        threshold: Number(form.threshold),
      };
      const created = await alertService.createRule(payload);
      setRules((prev) => [...prev, created]);
      setForm({ ...form, name: "" });
      trackEvent("alert_rule_created", {
        id: created?.id,
        deviceId: payload.deviceId || "all",
        type: payload.type,
        condition: payload.condition,
      });
      setToast({ open: true, message: "Đã tạo rule cảnh báo", severity: "success" });
    } catch (err) {
      console.error("Create rule error", err);
      setToast({ open: true, message: "Tạo rule thất bại", severity: "error" });
    }
  };

  const saveNotification = async () => {
    try {
      setSavingNotification(true);
      const payload = {
        emailEnabled: !!notificationConfig.emailEnabled,
        emailRecipients: normalizeEmails(notificationConfig.emailRecipients || ""),
        webhookEnabled: !!notificationConfig.webhookEnabled,
        webhookUrl: notificationConfig.webhookUrl || "",
        webhookSecret: notificationConfig.webhookSecret || "",
      };
      const saved = await alertService.updateNotificationConfig(payload);
      setNotificationConfig(toStateNotification(saved));
      trackEvent("alert_notification_saved", {
        emailEnabled: payload.emailEnabled,
        webhookEnabled: payload.webhookEnabled,
      });
      setToast({ open: true, message: "Đã lưu cấu hình thông báo", severity: "success" });
    } catch (err) {
      console.error("Save notification config error", err);
      setToast({ open: true, message: "Lưu cấu hình thất bại", severity: "error" });
    } finally {
      setSavingNotification(false);
    }
  };

  const triggerTestNotification = async () => {
    try {
      setTestingNotification(true);
      const resp = await alertService.sendTestNotification();
      setToast({ open: true, message: resp?.message || "Đã gửi thử thông báo", severity: "info" });
      trackEvent("alert_notification_test", { success: true });
    } catch (err) {
      console.error("Test notification error", err);
      trackEvent("alert_notification_test", { success: false });
      setToast({ open: true, message: "Gửi thử thất bại", severity: "error" });
    } finally {
      setTestingNotification(false);
    }
  };

  const startEdit = (rule) => {
    setEditRuleId(rule.id);
    setEditForm({
      name: rule.name,
      deviceId: rule.deviceId || "",
      type: rule.type,
      condition: rule.condition,
      threshold: rule.threshold,
      severity: rule.severity,
      active: rule.active,
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
    try {
      const payload = {
        ...editForm,
        deviceId: editForm.deviceId ? Number(editForm.deviceId) : null,
        threshold: Number(editForm.threshold),
      };
      const updated = await alertService.updateRule(id, payload);
      setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
      trackEvent("alert_rule_updated", {
        id,
        active: payload.active,
        severity: payload.severity,
      });
      setToast({ open: true, message: "Đã cập nhật rule", severity: "success" });
      cancelEdit();
    } catch (err) {
      console.error("Update rule error", err);
      setToast({ open: true, message: "Cập nhật rule thất bại", severity: "error" });
    }
  };

  const deleteRule = async (id) => {
    if (!window.confirm("Xóa rule này?")) return;
    try {
      await alertService.deleteRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
      trackEvent("alert_rule_deleted", { id });
      setToast({ open: true, message: "Đã xóa rule", severity: "success" });
    } catch (err) {
      console.error("Delete rule error", err);
      setToast({ open: true, message: "Xóa rule thất bại", severity: "error" });
    }
  };

  const latestAlerts = useMemo(() => alerts.slice(0, 10), [alerts]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h5">Alert Management</Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Tạo rule cảnh báo
              </Typography>
              <Stack component="form" spacing={2} onSubmit={handleCreateRule}>
                <TextField
                  label="Tên rule"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  size="small"
                  required
                />
                <Select
                  name="deviceId"
                  value={form.deviceId}
                  onChange={handleChange}
                  size="small"
                  displayEmpty
                  fullWidth
                >
                  <MenuItem value="">
                    <em>Tất cả thiết bị</em>
                  </MenuItem>
                  {devices.map((d) => (
                    <MenuItem key={d.id} value={d.id}>{`${d.name} (#${d.id})`}</MenuItem>
                  ))}
                </Select>
                <Select name="type" value={form.type} onChange={handleChange} size="small" fullWidth>
                  <MenuItem value="temperature">Temperature</MenuItem>
                  <MenuItem value="humidity">Humidity</MenuItem>
                </Select>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Select name="condition" value={form.condition} onChange={handleChange} size="small">
                    <MenuItem value=">">&gt;</MenuItem>
                    <MenuItem value=">=">&gt;=</MenuItem>
                    <MenuItem value="<">&lt;</MenuItem>
                    <MenuItem value="<=">&lt;=</MenuItem>
                  </Select>
                  <TextField
                    label="Threshold"
                    name="threshold"
                    type="number"
                    value={form.threshold}
                    onChange={handleChange}
                    size="small"
                  />
                </Stack>
                <Select name="severity" value={form.severity} onChange={handleChange} size="small" fullWidth>
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
                <Button type="submit" variant="contained">
                  Tạo rule
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Rule hiện có
              </Typography>
              {rules.length === 0 ? (
                <Typography color="text.secondary">Chưa có rule.</Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {rules.map((r) => {
                    const isEditing = editRuleId === r.id;
                    return (
                      <Box key={r.id} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1, border: "1px solid #e5e7eb", borderRadius: 1 }}>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, flex: 1, mr: 1 }}>
                          {isEditing ? (
                            <TextField
                              size="small"
                              label="Tên rule"
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            />
                          ) : (
                            <Typography variant="body1" fontWeight={600}>{r.name}</Typography>
                          )}
                          {isEditing ? (
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center">
                              <Select
                                size="small"
                                value={editForm.deviceId}
                                onChange={(e) => setEditForm({ ...editForm, deviceId: e.target.value })}
                                displayEmpty
                              >
                                <MenuItem value="">
                                  <em>Tất cả</em>
                                </MenuItem>
                                {devices.map((d) => (
                                  <MenuItem key={d.id} value={d.id}>{`${d.name} (#${d.id})`}</MenuItem>
                                ))}
                              </Select>
                              <Select
                                size="small"
                                value={editForm.type}
                                onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                              >
                                <MenuItem value="temperature">Temperature</MenuItem>
                                <MenuItem value="humidity">Humidity</MenuItem>
                              </Select>
                              <Select
                                size="small"
                                value={editForm.condition}
                                onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })}
                              >
                                <MenuItem value=">">&gt;</MenuItem>
                                <MenuItem value=">=">&gt;=</MenuItem>
                                <MenuItem value="<">&lt;</MenuItem>
                                <MenuItem value="<=">&lt;=</MenuItem>
                              </Select>
                              <TextField
                                size="small"
                                label="Threshold"
                                type="number"
                                value={editForm.threshold}
                                onChange={(e) => setEditForm({ ...editForm, threshold: e.target.value })}
                                sx={{ width: 120 }}
                              />
                            </Stack>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              {r.deviceId ? `Thiết bị #${r.deviceId}` : "Tất cả"} • {r.type} {r.condition} {r.threshold}
                            </Typography>
                          )}
                          <Stack direction="row" spacing={1} alignItems="center">
                            {isEditing ? (
                              <Select
                                size="small"
                                value={editForm.severity}
                                onChange={(e) => setEditForm({ ...editForm, severity: e.target.value })}
                                sx={{ width: 120 }}
                              >
                                <MenuItem value="low">Low</MenuItem>
                                <MenuItem value="medium">Medium</MenuItem>
                                <MenuItem value="high">High</MenuItem>
                              </Select>
                            ) : (
                              <Chip
                                label={r.severity}
                                color={r.severity === "high" ? "error" : r.severity === "medium" ? "warning" : "default"}
                                size="small"
                              />
                            )}
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="caption">Active</Typography>
                              {isEditing ? (
                                <Switch
                                  size="small"
                                  checked={!!editForm.active}
                                  onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                                />
                              ) : (
                                <Switch size="small" checked={!!r.active} disabled />
                              )}
                            </Stack>
                          </Stack>
                        </Box>
                        {isEditing ? (
                          <Stack direction="row" spacing={1}>
                            <IconButton size="small" color="success" onClick={() => saveEdit(r.id)}>
                              <CheckIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={cancelEdit}>
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        ) : (
                          <Stack direction="row" spacing={1}>
                            <Tooltip title="Sửa">
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
                        )}
                      </Box>
                    );
                  })}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Alert realtime
              </Typography>
              {latestAlerts.length === 0 ? (
                <Typography color="text.secondary">Chưa có alert.</Typography>
              ) : (
                <Stack spacing={1}>
                  {latestAlerts.map((a) => (
                    <Box key={a.id} sx={{ border: "1px solid #e5e7eb", borderRadius: 1, p: 1 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography fontWeight={600}>{a.message || `${a.type} alert`}</Typography>
                        <Chip
                          label={a.severity}
                          color={a.severity === "high" ? "error" : a.severity === "medium" ? "warning" : "default"}
                          size="small"
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Device #{a.deviceId} • {a.type} = {a.value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : ""}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Lịch sử alert
              </Typography>
              {alerts.length === 0 ? (
                <Typography color="text.secondary">Chưa có lịch sử.</Typography>
              ) : (
                <Stack spacing={1} sx={{ maxHeight: 360, overflow: "auto" }}>
                  {alerts.map((a) => (
                    <Box key={a.id} sx={{ borderBottom: "1px solid #e5e7eb", pb: 1 }}>
                      <Typography variant="body2" fontWeight={600}>{a.message || `${a.type} alert`}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Device #{a.deviceId} • {a.type} {a.condition || ''} {a.value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {a.timestamp ? new Date(a.timestamp).toLocaleString() : ""}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Cấu hình notification
              </Typography>
              {loadingNotification ? (
                <Typography color="text.secondary">Đang tải cấu hình...</Typography>
              ) : (
                <Stack spacing={2}>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography sx={{ minWidth: 160 }}>Gửi email</Typography>
                      <Switch
                        size="small"
                        checked={!!notificationConfig.emailEnabled}
                        onChange={(e) => handleNotificationChange("emailEnabled", e.target.checked)}
                      />
                    </Stack>
                    <TextField
                      label="Email nhận thông báo"
                      placeholder="alert@example.com, ops@example.com"
                      value={notificationConfig.emailRecipients}
                      onChange={(e) => handleNotificationChange("emailRecipients", e.target.value)}
                      size="small"
                      fullWidth
                      disabled={!notificationConfig.emailEnabled}
                      helperText="Phân tách nhiều email bằng dấu phẩy"
                    />
                  </Stack>

                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography sx={{ minWidth: 160 }}>Webhook</Typography>
                      <Switch
                        size="small"
                        checked={!!notificationConfig.webhookEnabled}
                        onChange={(e) => handleNotificationChange("webhookEnabled", e.target.checked)}
                      />
                    </Stack>
                    <TextField
                      label="Webhook URL"
                      placeholder="https://example.com/webhook"
                      value={notificationConfig.webhookUrl}
                      onChange={(e) => handleNotificationChange("webhookUrl", e.target.value)}
                      size="small"
                      fullWidth
                      disabled={!notificationConfig.webhookEnabled}
                    />
                    <TextField
                      label="Webhook secret"
                      type="password"
                      value={notificationConfig.webhookSecret}
                      onChange={(e) => handleNotificationChange("webhookSecret", e.target.value)}
                      size="small"
                      fullWidth
                      disabled={!notificationConfig.webhookEnabled}
                      helperText="Tùy chọn - dùng để ký payload"
                    />
                  </Stack>

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    justifyContent="flex-end"
                    alignItems={{ xs: "stretch", sm: "center" }}
                  >
                    <Button
                      variant="outlined"
                      onClick={triggerTestNotification}
                      disabled={savingNotification || testingNotification}
                    >
                      {testingNotification ? "Đang gửi..." : "Gửi thử"}
                    </Button>
                    <Button variant="contained" onClick={saveNotification} disabled={savingNotification}>
                      {savingNotification ? "Đang lưu..." : "Lưu cấu hình"}
                    </Button>
                  </Stack>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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
    </Box>
  );
};

export default AlertManagementPage;
