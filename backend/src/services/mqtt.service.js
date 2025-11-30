import { getMQTTClient } from '../config/mqtt.js'; 
import Device from '../models/device.model.js'; 
import { writeSensorData } from '../config/influxdb.js';


class MQTTService {
  constructor() {
    this.subscribedTopics = new Set();
  }

  // Subscribe tất cả devices đang active
  async subscribeAllDevices() {
    try {
  
      const devices = await Device.findActiveDevices();
      
      if (!devices) return;

      devices.forEach(device => {
        if (device.topic) {
            this.subscribeTopic(device.topic);
        }
      });

      console.log(`Subscribed to ${devices.length} device topics`);
    } catch (err) {
      console.error('Error subscribing to devices:', err);
    }
  }

  // Subscribe 1 topic
  subscribeTopic(topic) {
    try {
        const client = getMQTTClient();

        if (this.subscribedTopics.has(topic)) {
        console.log(`Already subscribed to: ${topic}`);
        return;
        }

        client.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
            console.error(`Failed to subscribe to ${topic}:`, err);
        } else {
            this.subscribedTopics.add(topic);
            console.log(`✓ Subscribed to: ${topic}`);
        }
        });
    } catch (error) {
        console.error("MQTT Client not ready yet");
    }
  }

  // Unsubscribe 1 topic
  unsubscribeTopic(topic) {
    try {
        const client = getMQTTClient();

        if (!this.subscribedTopics.has(topic)) {
        return;
        }

        client.unsubscribe(topic, (err) => {
        if (err) {
            console.error(`Failed to unsubscribe from ${topic}:`, err);
        } else {
            this.subscribedTopics.delete(topic);
            console.log(`Unsubscribed from: ${topic}`);
        }
        });
    } catch (error) {
        console.error("MQTT Client not ready yet");
    }
  }

  // Xử lý message nhận được
  async handleMessage(topic, message) {
    try {
      const payload = JSON.parse(message.toString());

      const parts = topic.split('/');
      if (parts.length >= 3) {
          const fromDevice = `${parts[1]}/${parts[2]}`;
          console.log(`Message from ${fromDevice}`); 
      } else {
        // In ra cả topic nếu sai định dạng
          console.log(`Message from ${topic}`);
      }

      // Tìm device theo topic
      const device = await Device.findByTopic(topic);
      
      if (!device) {
        console.warn(`Device not found for topic: ${topic}`);
        return;
      }

      if (!device.is_active) {
        console.warn(`Device ${device.name} is not active`);
        return;
      }

      // Validate payload
      if (!this.isValidPayload(payload)) {
        console.warn('Invalid payload format:', payload);
        return;
      }

      // Lưu vào InfluxDB
      const saved = await writeSensorData(device.device_serial, payload);
      
      if (saved) {
        console.log(`✓ Data saved to InfluxDB for device: ${device.name}`);
      } else {
        console.error(`Failed to save data for device: ${device.name}`);
      }

      // TODO: Kiểm tra alert rules
      
    } catch (err) {
      console.error(`Error handling message from ${topic}:`, err);
    }
  }

  // Validate payload
  isValidPayload(payload) {
    return payload && (
      typeof payload.temperature === 'number' ||
      typeof payload.humidity === 'number'
    );
  }

  // Bắt đầu lắng nghe messages
  startListening() {
    try {
        const client = getMQTTClient();

        client.on('message', (topic, message) => {
        this.handleMessage(topic, message);
        });

        console.log('MQTT listening for messages');
    } catch (error) {
        console.error("Cannot start listening: MQTT Client not initialized");
    }
  }

  // Publish message
  publish(topic, message) {
    try {
        const client = getMQTTClient();
        
        const payload = typeof message === 'string' ? message : JSON.stringify(message);
        
        client.publish(topic, payload, { qos: 1 }, (err) => {
        if (err) {
            console.error(`Failed to publish to ${topic}:`, err);
        } else {
            console.log(`✓ Published to ${topic}`);
        }
        });
    } catch (error) {
        console.error("Cannot publish: MQTT Client not initialized");
    }
  }
}


const mqttService = new MQTTService();
export default mqttService;