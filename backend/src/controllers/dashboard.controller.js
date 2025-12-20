import Device from '../models/device.model.js';
import { generateDashboardHash } from '../utils/hash.utils.js';

export const handlerGetDashboardUrl = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Lấy tất cả devices của user
    const devices = await Device.findByUserId(userId);
    
    if (devices.length === 0) {
      return res.json({
        message: 'No devices found',
        embedUrl: null,
        devices: []
      });
    }
    
    // Lấy device serials
    const deviceSerials = devices.map(d => d.device_serial).join(',');
    
    // Generate signed hash
    const { hash, exp } = generateDashboardHash(userId, deviceSerials);
    
    // Build URL params
    const dashboardUid = process.env.GRAFANA_DASHBOARD_UID;
    const backendUrl = process.env.BACKEND_URL;
    
    const params = new URLSearchParams({
      orgId: '1',
      'var-user_id': userId,
      'var-devices': deviceSerials,
      theme: 'light',
      kiosk: 'tv',
      from: 'now-24h',
      to: 'now',
      refresh: '5s',
      hash: hash,
      exp: exp
    });
    
    // Trả về relative path để đi qua backend proxy
    const embedUrl = `${backendUrl}/grafana/d/${dashboardUid}/iot-monitoring?${params.toString()}`;
    
    return res.json({
      embedUrl: embedUrl,
      devices: devices.map(d => ({
        id: d.id,
        name: d.name,
        serial: d.device_serial,
        is_active: d.is_active
      }))
    });
    
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const handlerGetPanelUrl = async (req, res) => {
  try {
    const userId = req.user.id;
    const { deviceId, panelId, timeRange } = req.query;
    
    // Verify device belongs to user
    const device = await Device.findById(deviceId);
    if (!device || device.user_id !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Generate hash cho single device
    const { hash, exp } = generateDashboardHash(userId, device.device_serial);
    
    const dashboardUid = process.env.GRAFANA_DASHBOARD_UID;
    const backendUrl = process.env.BACKEND_URL;

    const params = new URLSearchParams({
      orgId: '1',
      'var-user_id': userId,
      'var-device': device.device_serial,
      theme: 'light',
      panelId: panelId || '2',
      from: `now-${timeRange || '24h'}`,
      to: 'now',
      hash: hash,
      exp: exp
    });
    
    // Relative path cho single panel
    const embedUrl = `${backendUrl}/grafana/d-solo/${dashboardUid}/iot-monitoring?${params.toString()}`;
    
    return res.json({
      embedUrl: embedUrl,
      device: {
        id: device.id,
        name: device.name,
        serial: device.device_serial
      }
    });
    
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};