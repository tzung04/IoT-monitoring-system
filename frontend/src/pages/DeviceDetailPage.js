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
} from "@mui/material";
import deviceService from "../services/device.service";
import useSocket from "../hooks/useSocket";
import RealtimeChart from "../components/Charts/RealtimeChart";
import { trackEvent } from "../observability/faro";

const MAX_POINTS = 50;

const DeviceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sensorData, setSensorData] = useState([]);
  const [streamTracked, setStreamTracked] = useState(false);

  useEffect(() => {
    const fetchDevice = async () => {
      setLoading(true);
      const resp = await deviceService.getDevice(id);
      setDevice(resp);
      if (resp?.id) {
        trackEvent("device_detail_loaded", { id: resp.id, status: resp.status || "unknown" });
      }
      setLoading(false);
    };
    fetchDevice();
  }, [id]);

  const handleSocket = (message) => {
    if (!message || !message.type) return;
    if (message.type === "device_status" && message.data?.id === Number(id)) {
      setDevice((prev) => (prev ? { ...prev, status: message.data.status, lastSeen: message.data.lastSeen } : prev));
    }
    if (message.type === "device_updated" && message.data?.id === Number(id)) {
      setDevice(message.data);
    }
    if (message.type === "sensor_data" && message.data?.deviceId === Number(id)) {
      setSensorData((prev) => {
        const next = [...prev, message.data];
        if (next.length > MAX_POINTS) next.shift();
        if (!streamTracked) {
          trackEvent("sensor_stream_started", { deviceId: message.data.deviceId, type: message.data.type });
          setStreamTracked(true);
        }
        return next;
      });
    }
  };

  useSocket(handleSocket);

  const statusColor = useMemo(() => (device?.status === "online" ? "success" : "default"), [device?.status]);

  if (loading) return <div>Đang tải...</div>;
  if (!device) return <div>Không tìm thấy thiết bị.</div>;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Button variant="text" onClick={() => navigate(-1)} sx={{ alignSelf: "flex-start" }}>
        ← Quay lại
      </Button>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6">{device.name}</Typography>
                <Chip label={device.status || "offline"} color={statusColor} size="small" />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Loại: {device.type || "N/A"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Vị trí: {device.location || "N/A"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Last seen: {device.lastSeen ? new Date(device.lastSeen).toLocaleString() : "N/A"}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Cấu hình
              </Typography>
              {device.config && Object.keys(device.config).length > 0 ? (
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  {Object.entries(device.config).map(([key, value]) => (
                    <li key={key}>
                      <Typography variant="body2">
                        {key}: {String(value)}
                      </Typography>
                    </li>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Chưa có cấu hình
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Dữ liệu cảm biến realtime
              </Typography>
              <RealtimeChart data={sensorData} unit={sensorData[0]?.unit || ""} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DeviceDetailPage;
