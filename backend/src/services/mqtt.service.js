import { getMQTTClient } from '../config/mqtt.js';
import Device from '../models/device.model.js';
import { writeSensorData } from '../config/influxdb.js';
import AlertRule from '../models/alertRule.model.js'; // Model AlertRule
import AlertLog from '../models/alertLog.model.js';   // Model AlertLog
import emailService from '../services/email.service.js'

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
    // Lấy tất cả quy tắc đang kích hoạt cho thiết bị này
    const rules = await AlertRule.findEnabledByDeviceId(device.id);

    for (const rule of rules) {
      let sensorValue;
      let metricName = rule.metric_type.toLowerCase();

      // Lấy giá trị tương ứng từ payload
      if (metricName === 'temperature') {
        sensorValue = payload.temperature;
      } else if (metricName === 'humidity') {
        sensorValue = payload.humidity;
      }
      // Có thể mở rộng thêm các metric khác nếu cần

      // Bỏ qua nếu giá trị không tồn tại trong payload
      if (sensorValue === undefined || sensorValue === null) {
        continue;
      }

      // 1. Kiểm tra điều kiện cảnh báo
      const isViolated = this.checkCondition(sensorValue, rule.condition, rule.threshold);

      if (isViolated) {
        // 2. Kiểm tra chống spam (Debounce): Chỉ tạo alert nếu alert gần nhất đã xảy ra 5 phút trước
        const recentAlert = await AlertLog.findRecentByDeviceAndRule(device.id, rule.id, 5);

        if (recentAlert) {
          console.log(`[DEBOUNCE] Alert for ${device.name} skipped (Recent alert found).`);
          continue; // Bỏ qua nếu đã có cảnh báo gần đây
        }

        // 3. Kích hoạt và ghi log
        const message = `[CẢNH BÁO ${rule.metric_type.toUpperCase()}] ${device.name} vượt ngưỡng: ${sensorValue} ${rule.condition} ${rule.threshold}`;

        const alert = await AlertLog.create({
          device_id: device.id,
          rule_id: rule.id,
          value_at_time: sensorValue,
          message: message,
        });

        console.log(`\nALERT TRIGGERED: ${message}`);

        // TODO: Gửi thông báo qua email
        // Gửi email cảnh báo
        const emailSent = await emailService.sendAlertEmail(rule.email_to, device.name, rule);

        if (!emailSent) {
          return res.status(500).json({ 
            message: 'Failed to send email. Please try again later.' 
          });
        }
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