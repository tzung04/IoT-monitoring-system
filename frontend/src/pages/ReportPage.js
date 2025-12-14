import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Stack,
  Button,
  Select,
  MenuItem,
  TextField,
  Switch,
  Chip,
  Snackbar,
  Alert,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import ScheduleIcon from "@mui/icons-material/Schedule";
import AssessmentIcon from "@mui/icons-material/Assessment";
import HistoricalChart from "../components/Charts/HistoricalChart";
import reportService from "../services/report.service";

const ReportPage = () => {
  const [summary, setSummary] = useState(null);
  const [schedule, setSchedule] = useState({ enabled: false, frequency: "daily", recipients: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", severity: "info" });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [sum, sched] = await Promise.all([reportService.getSummary(), reportService.getSchedule()]);
      setSummary(sum);
      setSchedule({
        enabled: sched?.enabled || false,
        frequency: sched?.frequency || "daily",
        recipients: Array.isArray(sched?.recipients) ? sched.recipients.join(", ") : sched?.recipients || "",
      });
      setLoading(false);
    };
    load();
  }, []);

  const alertTrendSeries = useMemo(() => {
    if (!summary?.trend) return [];
    return summary.trend.map((t) => ({ label: t.label, count: t.count }));
  }, [summary]);

  const saveSchedule = async () => {
    try {
      setSaving(true);
      const payload = {
        enabled: schedule.enabled,
        frequency: schedule.frequency,
        recipients: schedule.recipients
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      };
      const saved = await reportService.saveSchedule(payload);
      setSchedule({
        enabled: saved?.enabled || false,
        frequency: saved?.frequency || "daily",
        recipients: Array.isArray(saved?.recipients) ? saved.recipients.join(", ") : saved?.recipients || "",
      });
      setToast({ open: true, message: "Đã lưu lịch báo cáo", severity: "success" });
    } catch (err) {
      console.error("save schedule error", err);
      setToast({ open: true, message: "Lưu lịch báo cáo thất bại", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const downloadFile = (fileName, mimeType, base64Content) => {
    try {
      const link = document.createElement("a");
      link.href = `data:${mimeType};base64,${base64Content}`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("download file error", err);
    }
  };

  const exportReport = async (format) => {
    try {
      const resp = await reportService.exportReport(format);
      if (resp?.content && resp?.fileName) {
        downloadFile(resp.fileName, resp.mimeType || "application/octet-stream", resp.content);
        setToast({ open: true, message: `Đã export ${format.toUpperCase()}`, severity: "success" });
      } else {
        setToast({ open: true, message: "Không có dữ liệu export", severity: "warning" });
      }
    } catch (err) {
      console.error("export report error", err);
      setToast({ open: true, message: "Export thất bại", severity: "error" });
    }
  };

  if (loading) return <div style={{ padding: 20 }}>Đang tải báo cáo...</div>;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h5" gutterBottom>
        Báo cáo & Export
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <AssessmentIcon color="primary" />
                <Typography variant="subtitle1">Tóm tắt</Typography>
              </Stack>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Tổng thiết bị</Typography>
                  <Typography fontWeight={600}>{summary?.devices?.total ?? "-"}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Online</Typography>
                  <Typography fontWeight={600}>{summary?.devices?.online ?? "-"}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Offline</Typography>
                  <Typography fontWeight={600}>{summary?.devices?.offline ?? "-"}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Alerts</Typography>
                  <Typography fontWeight={600}>{summary?.alerts?.total ?? "-"}</Typography>
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Chip size="small" label={`High: ${summary?.alerts?.high ?? 0}`} color="error" />
                  <Chip size="small" label={`Medium: ${summary?.alerts?.medium ?? 0}`} color="warning" />
                  <Chip size="small" label={`Low: ${summary?.alerts?.low ?? 0}`} />
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle1">Biểu đồ alert theo thời gian</Typography>
                <ScheduleIcon fontSize="small" />
              </Stack>
              <HistoricalChart
                data={alertTrendSeries}
                xKey="label"
                series={[{ dataKey: "count", name: "Alerts", color: "#ef5350" }]}
                stacked={false}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center" mb={2}>
            <Typography variant="subtitle1" sx={{ flex: 1 }}>
              Lịch gửi báo cáo tự động
            </Typography>
            <Switch
              checked={schedule.enabled}
              onChange={(e) => setSchedule((prev) => ({ ...prev, enabled: e.target.checked }))}
            />
            <Select
              size="small"
              value={schedule.frequency}
              onChange={(e) => setSchedule((prev) => ({ ...prev, frequency: e.target.value }))}
            >
              <MenuItem value="daily">Hàng ngày</MenuItem>
              <MenuItem value="weekly">Hàng tuần</MenuItem>
            </Select>
            <TextField
              size="small"
              label="Recipients"
              placeholder="email1@example.com, email2@example.com"
              value={schedule.recipients}
              onChange={(e) => setSchedule((prev) => ({ ...prev, recipients: e.target.value }))}
              sx={{ minWidth: 260 }}
            />
            <Button variant="contained" onClick={saveSchedule} disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Lịch gửi chỉ mock trên client; backend thực tế cần cron/email service.
          </Typography>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center" mb={1}>
            <Typography variant="subtitle1" sx={{ flex: 1 }}>
              Export thủ công
            </Typography>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => exportReport("csv")}
            >
              CSV
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => exportReport("pdf")}
            >
              PDF
            </Button>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Export dùng dữ liệu tóm tắt hiện tại, trả về file CSV hoặc PDF mock.
          </Typography>
        </CardContent>
      </Card>

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

export default ReportPage;
