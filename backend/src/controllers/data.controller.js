import { querySensorData } from '../config/influxdb.js';
import Device from '../models/device.model.js';

/**
 * Xác định status của device dựa vào is_active và data gần nhất
 * Logic:
 * 1. is_active = false → "inactive"
 * 2. is_active = true + no data → "offline"
 * 3. is_active = true + data > 2 phút → "offline"
 * 4. is_active = true + data < 2 phút → "online"
 */
const determineDeviceStatus = (device, latestData) => {
  // 1. Chưa kích hoạt
  if (!device.is_active) {
    return 'inactive';
  }

  // 2. Không có data
  if (!latestData || !latestData.time) {
    return 'offline';
  }

  // 3. Kiểm tra thời gian data gần nhất
  const lastDataTime = new Date(latestData.time);
  const now = new Date();
  const diffMinutes = (now - lastDataTime) / 1000 / 60; // Phút

  // 4. > 2 phút = offline, < 2 phút = online
  return diffMinutes > 2 ? 'offline' : 'online';
};

// Lấy dữ liệu lịch sử của 1 thiết bị
export const handlerGetDeviceData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { deviceId } = req.params;
    const { hours = 24 } = req.query;

    // Verify device belongs to user
    const device = await Device.findById(deviceId);
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }
    if (device.user_id !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Query InfluxDB BY DEVICE NAME 
    const data = await querySensorData(device.name, userId, parseInt(hours));

    return res.json({
      device: {
        id: device.id,
        name: device.name,
        serial: device.device_serial
      },
      timeRange: `${hours} hours`,
      dataPoints: data.length,
      data: data
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy dữ liệu mới nhất của 1 thiết bị
export const handlerGetLatestData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { deviceId } = req.params;

    // Verify device belongs to user
    const device = await Device.findById(deviceId);
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }
    if (device.user_id !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Query last 1 hour BY DEVICE NAME
    const data = await querySensorData(device.name, userId, 1);

    // Get latest data point (phần tử cuối cùng)
    const latest = data.length > 0 ? data[data.length - 1] : null;

    // Xác định status
    const status = determineDeviceStatus(device, latest);

    return res.json({
      device: {
        id: device.id,
        name: device.name,
        serial: device.device_serial,
        is_active: device.is_active
      },
      latest: latest,
      status: status // "online", "offline", or "inactive"
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy dữ liệu mới nhất cho TẤT CẢ thiết bị (Dashboard overview)
export const handlerGetAllDevicesLatest = async (req, res) => {
  try {
    const userId = req.user.id;
    const devices = await Device.findByUserId(userId);

    // Query data cho từng device
    const devicePromises = devices.map(async (device) => {
      try {
        // Query BY DEVICE NAME 
        const data = await querySensorData(device.name, userId, 1);
        
        // Get latest data point
        const latest = data.length > 0 ? data[data.length - 1] : null;

        // Xác định status với logic mới
        const status = determineDeviceStatus(device, latest);

        return {
          id: device.id,
          name: device.name,
          serial: device.device_serial,
          place_name: device.place_name,
          is_active: device.is_active,
          latest: latest,
          status: status, // "online", "offline", or "inactive"
          lastSeen: latest ? latest.time : null // Thời gian data gần nhất
        };
      } catch (err) {
        console.error(`Error getting data for device ${device.id}:`, err);
        return {
          id: device.id,
          name: device.name,
          serial: device.device_serial,
          latest: null,
          status: 'error'
        };
      }
    });

    const summary = await Promise.all(devicePromises);

    // Tính toán statistics
    const stats = {
      total: devices.length,
      online: summary.filter(d => d.status === 'online').length,
      offline: summary.filter(d => d.status === 'offline').length,
      inactive: summary.filter(d => d.status === 'inactive').length
    };

    return res.json({
      stats: stats,
      devices: summary
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};