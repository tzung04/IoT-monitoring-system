import mqtt from 'mqtt';
import { writeSensorData } from '../config/influxdb.js';
import { broadcast } from '../../server.js';

let mqttClient;

export const connectMQTT = async () => {
  const brokerUrl = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
  
  mqttClient = mqtt.connect(brokerUrl, {
    clientId: `iot_backend_${Math.random().toString(16).slice(3)}`,
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
  });

  mqttClient.on('connect', () => {
    console.log('✅ Connected to MQTT Broker');
    
    // Subscribe to all sensor topics
    mqttClient.subscribe('sensors/#', (err) => {
      if (err) {
        console.error('❌ MQTT subscription error:', err);
      } else {
        console.log('📡 Subscribed to sensors/#');
      }
    });
    
    // Subscribe to device status
    mqttClient.subscribe('devices/+/status', (err) => {
      if (err) {
        console.error('❌ MQTT subscription error:', err);
      } else {
        console.log('📡 Subscribed to devices/+/status');
      }
    });
  });

  mqttClient.on('message', async (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      console.log('📨 MQTT Message:', topic, payload);
      
      // Handle sensor data
      if (topic.startsWith('sensors/')) {
        const parts = topic.split('/');
        const deviceId = parts[1];
        const sensorType = parts[2];
        
        // Save to InfluxDB
        await writeSensorData(deviceId, sensorType, payload.value, {
          unit: payload.unit || '',
          location: payload.location || ''
        });
        
        // Broadcast to WebSocket clients
        broadcast({
          type: 'sensor_data',
          deviceId,
          sensorType,
          data: payload,
          timestamp: new Date().toISOString()
        });
      }
      
      // Handle device status
      if (topic.includes('/status')) {
        broadcast({
          type: 'device_status',
          topic,
          data: payload,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('❌ Error processing MQTT message:', error);
    }
  });

  mqttClient.on('error', (error) => {
    console.error('❌ MQTT Error:', error);
  });

  mqttClient.on('close', () => {
    console.log('🔌 MQTT connection closed');
  });

  return mqttClient;
};

export const publishMessage = (topic, message) => {
  if (mqttClient && mqttClient.connected) {
    mqttClient.publish(topic, JSON.stringify(message));
    return true;
  }
  return false;
};

export const getMQTTClient = () => mqttClient;

export default { connectMQTT, publishMessage, getMQTTClient };