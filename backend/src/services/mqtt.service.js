import { getMQTTClient } from '../config/mqtt.js';
import Device from '../models/device.model.js';
import { writeSensorData } from '../config/influxdb.js';
import AlertRule from '../models/alertRule.model.js'; // Model AlertRule
import AlertLog from '../models/alertLog.model.js';   // Model AlertLog
import emailService from './email.service.js';

class MQTTService {
  constructor() {
    this.subscribedTopics = new Set();
  }


  checkCondition(value, operator, threshold) {
    switch (operator) {
      case '>': return value > threshold;
      case '<': return value < threshold;
      case '=': return value === threshold;
      case '>=': return value >= threshold;
      case '<=': return value <= threshold;
      default: return false;
    }
  }

  async checkAlertRules(device, payload) {
    // Lấy tất cả rule đang kích hoạt cho thiết bị
    const rules = await AlertRule.findEnabledByDeviceId(device.id);

    for (const rule of rules) {
      let sensorValue;
      const metricName = rule.metric_type.toLowerCase();

      // 1. Lấy giá trị sensor từ payload
      if (metricName === 'temperature') {
        sensorValue = payload.temperature;
      } else if (metricName === 'humidity') {
        sensorValue = payload.humidity;
      }

      // Nếu payload không có metric này → bỏ qua
      if (sensorValue === undefined || sensorValue === null) {
        continue;
      }

      // 2. Kiểm tra điều kiện cảnh báo
      const isViolated = this.checkCondition(
        sensorValue,
        rule.condition,
        rule.threshold
      );

      if (!isViolated) continue;

      // 3. Chống spam (debounce 5 phút)
      const recentAlert = await AlertLog.findRecentByDeviceAndRule(
        device.id,
        rule.id,
        5
      );

      if (recentAlert) {
        console.log(`[DEBOUNCE] Alert for ${device.name} skipped.`);
        continue;
      }

      // 4. Tạo log cảnh báo
      const message = `[CẢNH BÁO ${rule.metric_type.toUpperCase()}] ${device.name
        }: ${sensorValue} ${rule.condition} ${rule.threshold}`;

      await AlertLog.create({
        device_id: device.id,
        rule_id: rule.id,
        value_at_time: sensorValue,
        message: message,
      });

      console.log(`\n ALERT TRIGGERED: ${message}`);

      // 5. GỬI EMAIL CẢNH BÁO
      if (device.user?.email) {
        await emailService.sendAlertEmail(
          device.user.email,
          device.name,
          `${rule.metric_type} ${rule.condition} ${rule.threshold} (Giá trị hiện tại: ${sensorValue})`
        );
      }
    }
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
      const saved = await writeSensorData(device.device_serial, device.user_id, payload);

      if (saved) {
        console.log(`✓ Data saved to InfluxDB for device: ${device.name}`);
      } else {
        console.error(`Failed to save data for device: ${device.name}`);
      }

      //Kiểm tra cảnh báo
      await this.checkAlertRules(device, payload);

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