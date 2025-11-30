# IoT Monitoring Backend

Backend cho hệ thống giám sát IoT.

## Hướng dẫn chạy Backend

### Bước 1: Khởi động các services (InfluxDB, MQTT Broker)

Tại thư mục cha, chạy lệnh:

```bash
docker-compose up -d
```

Lệnh này sẽ khởi động:
- **InfluxDB** (port 8086) - Lưu trữ time series data
- **Mosquitto MQTT Broker** (port 1884) - Nhận dữ liệu từ sensors
Lưu ý: có thể xem/sửa port trong file docker-compose.yml 

### Bước 2: Cài đặt dependencies

```bash
cd backend
npm install
```

### Bước 3: Cấu hình môi trường

Tạo file `.env` trong thư mục `backend/`:

```env
# Server
PORT=5000

# PostgreSQL (Metadata)
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=iot_monitoring
PG_USER=postgres
PG_PASSWORD=your_password

# InfluxDB (Time Series Data)
INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=your_influx_token
INFLUX_ORG=your_org
INFLUX_BUCKET=iot_sensors

# MQTT Broker
MQTT_BROKER=mqtt://localhost:1884
MQTT_USERNAME=
MQTT_PASSWORD=

# JWT
JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRE=7d

# Email (for password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=IoT Monitor <noreply@iotmonitor.com>
```

### Bước 4: Setup Database

**Tạo PostgreSQL database:**
```bash
psql -U postgres
CREATE DATABASE iot_monitoring;
\q
```

**Chạy migration để tạo tables:**
```bash
node src/config/database.js
```

### Bước 5: Setup InfluxDB

1. Truy cập: `http://localhost:8086`
2. Tạo tài khoản admin
3. Tạo Organization (ví dụ: `my-org`)
4. Tạo Bucket tên: `iot_sensors`
5. Vào **API Tokens** → Copy token và paste vào `.env`

### Bước 6: Khởi động Server

```bash
node src/server.js
```

Server sẽ chạy tại: `http://localhost:5000`

Bạn sẽ thấy log:
```
✓ PostgreSQL pool created
✓ InfluxDB connected
✓ Email service ready
✓ MQTT Broker connected
MQTT listening for messages
Subscribed to X device topics
Server running on port 5000
```

---

## Hướng dẫn sử dụng API

### 1. Authentication

#### Register (Đăng ký)
```bash
POST /api/auth/register
Content-Type: application/json

{
  "username": "john",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "username": "john",
    "email": "john@example.com"
  }
}
```

#### Login (Đăng nhập)
```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "john",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "john",
    "email": "john@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Get Current User
```bash
GET /api/auth/me
Authorization: Bearer YOUR_TOKEN
```

#### Change Password
```bash
PUT /api/auth/change-password
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "currentPassword": "password123",
  "newPassword": "newpassword456"
}
```

#### Forgot Password
```bash
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```
Hệ thống sẽ gửi mã 6 ký tự qua email.

#### Reset Password
```bash
POST /api/auth/reset-password
Content-Type: application/json

{
  "email": "john@example.com",
  "code": "ABC123",
  "newPassword": "newpassword456"
}
```

---

## Test MQTT và InfluxDB

### 1. Thêm device vào database

```sql
-- Chạy trong PostgreSQL
INSERT INTO devices (user_id, device_serial, name, topic, is_active)
VALUES (1, 'ABCDABCDABCD', 'Cảm biến kho 1', '/devices/ABCDABCDABCD/data', true);
```

### 2. Publish test data qua MQTT

**Cài mosquitto client:**
```bash
# Ubuntu/Debian
sudo apt-get install mosquitto-clients

# Mac
brew install mosquitto
```

**Gửi dữ liệu sensor:**
```bash
mosquitto_pub -h localhost -t "/devices/ABCDABCDABCD/data" \
  -m '{"temperature": 25.5, "humidity": 60.3}'
```

### 3. Kiểm tra kết quả

**Trong terminal server:**
```
Message from /devices/ABCDABCDABCD: { temperature: 25.5, humidity: 60.3 }
✓ Data saved to InfluxDB for device: Cảm biến kho 1
```

**Trong InfluxDB UI** (`http://localhost:8086`):
1. Vào **Data Explorer**
2. Chọn bucket: `iot_sensors`
3. Filter: `_measurement = sensor_data`
4. Xem dữ liệu temperature và humidity

---

## Cấu trúc Database

### PostgreSQL (Metadata)

**users**
- id, username, email, password_hash
- reset_code, reset_expires
- created_at

**places**
- id, user_id, name, description
- created_at

**devices**
- id, user_id, place_id
- device_serial, name, topic
- is_active, created_at

**alert_rules**
- id, device_id
- metric_type, condition, threshold
- email_to, is_enabled, created_at

**alert_logs**
- id, device_id, rule_id
- value_at_time, message, triggered_at

### InfluxDB (Time Series)

**Measurement:** `sensor_data`
- **Tags:** `device` (device_serial)
- **Fields:** `temperature`, `humidity`
- **Timestamp:** auto

---

## Cấu hình Email (Gmail)

1. Vào **Google Account** → **Security**
2. Bật **2-Factor Authentication**
3. Tạo **App Password** cho Mail
4. Copy App Password vào `.env` → `EMAIL_PASSWORD`

---

## Workflow Hệ Thống

1. **Device** gửi dữ liệu qua MQTT → Topic đã đăng ký
2. **Backend** nhận message → Parse JSON
3. Tìm **device** trong PostgreSQL theo topic
4. Lưu data vào **InfluxDB** (time series)
5. *(TODO)* Kiểm tra **Alert Rules** → Gửi email nếu vượt ngưỡng

---

## Troubleshooting

### PostgreSQL không kết nối
```bash
# Kiểm tra PostgreSQL đang chạy
sudo systemctl status postgresql

# Kiểm tra credentials trong .env
```

### MQTT không kết nối
```bash
# Kiểm tra Mosquitto đang chạy
docker ps | grep mosquitto

# Test connection
mosquitto_sub -h localhost -t "#"
```

### InfluxDB không hoạt động
```bash
# Kiểm tra container đang chạy
docker ps | grep influxdb

# Xem logs
docker logs influxdb
```

### Email không gửi được
- Kiểm tra đã tạo App Password chưa
- Kiểm tra EMAIL_USER và EMAIL_PASSWORD trong .env
- Test connection: server sẽ log `✓ Email service ready`

---

## Notes

- JWT token hết hạn sau **7 ngày**
- Reset code hết hạn sau **5 phút**
- MQTT QoS: **1** (at least once delivery)
- PostgreSQL pool: max **20 connections**

---