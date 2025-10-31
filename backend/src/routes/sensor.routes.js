import express from 'express';
import { querySensorData } from '../config/influxdb.js';

const router = express.Router();

// Get sensor data for a device
router.get('/:deviceId/:sensorType', async (req, res) => {
  try {
    const { deviceId, sensorType } = req.params;
    const { timeRange = '-1h' } = req.query;
    
    const data = await querySensorData(deviceId, sensorType, timeRange);
    
    res.json({ 
      success: true, 
      deviceId,
      sensorType,
      timeRange,
      data 
    });
  } catch (error) {
    console.error('Error fetching sensor data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get latest sensor reading
router.get('/:deviceId/:sensorType/latest', async (req, res) => {
  try {
    const { deviceId, sensorType } = req.params;
    
    const data = await querySensorData(deviceId, sensorType, '-5m');
    const latest = data.length > 0 ? data[data.length - 1] : null;
    
    res.json({ 
      success: true, 
      deviceId,
      sensorType,
      latest 
    });
  } catch (error) {
    console.error('Error fetching latest sensor data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;