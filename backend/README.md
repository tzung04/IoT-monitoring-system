# 🌐 IoT Monitoring Backend

Hệ thống backend để giám sát thiết bị IoT real-time với MQTT, lưu trữ time-series data và hiển thị dashboard trên Grafana.

## 🛠 Tech Stack

- **Runtime:** Node.js
- **Database:** PostgreSQL (metadata), InfluxDB (time-series data)
- **Message Broker:** Mosquitto MQTT
- **Visualization:** Grafana
- **Authentication:** JWT

---

## 📋 Prerequisites

- Node.js >= 16.x
- Docker & Docker Compose
- PostgreSQL >= 13.x
- MQTT Client (mosquitto-clients) - để test

---

## 🚀 Quick Start

### 1. Clone và cài đặt dependencies

```bash
git clone <repository-url>
cd backend
npm install
```

### 2. Khởi động các services

```bash
# Tại thư mục gốc của project
docker-compose up -d
```

Services sẽ chạy trên:
- **InfluxDB:** http://localhost:8086
- **Mosquitto MQTT:** mqtt://localhost:1884
- **Grafana:** http://localhost:3001

### 3. Cấu hình môi trường

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
INFLUX_TOKEN=your_influx_token_here
INFLUX_ORG=my-org
INFLUX_BUCKET=iot_sensors

# MQTT Broker
MQTT_BROKER=mqtt://localhost:1884
MQTT_USERNAME=
MQTT_PASSWORD=

# JWT
JWT_SECRET=your_super_secret_key_change_this_in_production
JWT_EXPIRE=7d

# Email (Password Reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
EMAIL_FROM=IoT Monitor <noreply@iotmonitor.com>
```

### 4. Setup PostgreSQL Database

```bash
# Tạo database
psql -U postgres -c "CREATE DATABASE iot_monitoring;"

### 5. Khởi động server

```bash
node src/server.js
hoặc
npm start
```

Nếu thành công, bạn sẽ thấy:

```
✓ PostgreSQL pool created
✓ InfluxDB connected
✓ Email service ready
✓ MQTT Broker connected
Server running on port 5000
```

---

## 🔧 Cấu hình InfluxDB

### Bước 1: Truy cập InfluxDB UI

Mở trình duyệt: **http://localhost:8086**

### Bước 2: Setup Organization & Bucket

1. **Đăng nhập lần đầu:**
   - Username: `admin`
   - Password: `password123` (hoặc theo docker-compose.yml)
   - Organization: `my-org`
   - Bucket: `iot_sensors`

2. **Tạo API Token:**
   - Vào sidebar → Click **API Tokens**
   - Click **Generate API Token** → **All Access Token**
   - Copy token và paste vào file `.env` → `INFLUX_TOKEN`

### Bước 3: Verify kết nối

Restart server và kiểm tra log:
```
✓ InfluxDB connected
```

---

## 📊 Cấu hình Grafana Dashboard

### Bước 1: Truy cập Grafana

- URL: **http://localhost:3001**
- Username: `admin`
- Password: `admin` (đổi password khi được yêu cầu)

### Bước 2: Thêm InfluxDB Data Source

1. Vào **Connections** → **Data sources** → **Add data source**
2. Chọn **InfluxDB**
3. Cấu hình như sau:

   ```
   Name: InfluxDB-IoT
   
   Query Language: Flux
   
   HTTP:
     URL: http://influxdb:8086
   
   Auth:
     Basic auth: OFF
   
   InfluxDB Details:
     Organization: my-org
     Token: <paste-token-từ-influxdb>
     Default Bucket: iot_sensors
   ```

4. Click **Save & Test** → Phải hiện **"Data source is working"**

### Bước 3: Tạo Dashboard mới

1. Click **+** (sidebar) → **Create** → **Dashboard**
2. Click **Add visualization**
3. Chọn data source: **InfluxDB-IoT**

### Bước 4: Tạo Variables (QUAN TRỌNG!)

Click **Dashboard settings** (⚙️ icon) → **Variables** → **Add variable**

#### Variable 1: `user_id`

```
Name: user_id
Type: Query
Data source: InfluxDB-IoT

Query:
from(bucket: "iot_sensors")
  |> range(start: -7d)
  |> filter(fn: (r) => r._measurement == "sensor_data")
  |> keep(columns: ["user_id"])
  |> distinct(column: "user_id")

Options:
  ☐ Multi-value
  ☐ Include All option
```

Click **Apply**

#### Variable 2: `devices`

```
Name: devices
Type: Query
Data source: InfluxDB-IoT

Query:
from(bucket: "iot_sensors")
  |> range(start: -7d)
  |> filter(fn: (r) => r._measurement == "sensor_data")
  |> filter(fn: (r) => r.user_id == "${user_id}")
  |> keep(columns: ["device_name"])
  |> distinct(column: "device_name")

Options:
  ☑ Multi-value
  ☑ Include All option
```

Click **Apply** → **Save dashboard**

### Bước 5: Tạo Visualization Panels

#### Panel 1: Temperature Time Series

```flux
from(bucket: "iot_sensors")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r._measurement == "sensor_data")
  |> filter(fn: (r) => r.user_id == "${user_id}")
  |> filter(fn: (r) => r.device_name =~ /^${devices:regex}$/)
  |> filter(fn: (r) => r._field == "temperature")
  |> aggregateWindow(every: v.windowPeriod, fn: mean, createEmpty: false)
```

**Panel Settings:**
- Visualization: **Time series**
- Title: `Temperature Over Time`
- Unit: `Celsius (°C)`
- Legend: Show

#### Panel 2: Humidity Time Series

```flux
from(bucket: "iot_sensors")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r._measurement == "sensor_data")
  |> filter(fn: (r) => r.user_id == "${user_id}")
  |> filter(fn: (r) => r.device_name =~ /^${devices:regex}$/)
  |> filter(fn: (r) => r._field == "humidity")
  |> aggregateWindow(every: v.windowPeriod, fn: mean, createEmpty: false)
```

**Panel Settings:**
- Visualization: **Time series**
- Title: `Humidity Over Time`
- Unit: `Percent (0-100)`

#### Panel 3: Current Temperature (Stat)

```flux
from(bucket: "iot_sensors")
  |> range(start: -5m)
  |> filter(fn: (r) => r._measurement == "sensor_data")
  |> filter(fn: (r) => r.user_id == "${user_id}")
  |> filter(fn: (r) => r.device_name =~ /^${devices:regex}$/)
  |> filter(fn: (r) => r._field == "temperature")
  |> last()
```

**Panel Settings:**
- Visualization: **Stat**
- Title: `Current Temperature`
- Unit: `Celsius (°C)`
- Graph mode: None

#### Panel 4: Current Humidity (Gauge)

```flux
from(bucket: "iot_sensors")
  |> range(start: -5m)
  |> filter(fn: (r) => r._measurement == "sensor_data")
  |> filter(fn: (r) => r.user_id == "${user_id}")
  |> filter(fn: (r) => r.device_name =~ /^${devices:regex}$/)
  |> filter(fn: (r) => r._field == "humidity")
  |> last()
```

**Panel Settings:**
- Visualization: **Gauge**
- Title: `Current Humidity`
- Unit: `Percent (0-100)`
- Min: `0`, Max: `100`

### Bước 6: Lưu Dashboard

1. Click **Save dashboard** (💾 icon phía trên)
2. Dashboard name: `IoT Monitoring`
3. Click **Save**

### Bước 7: Lấy Dashboard UID

1. Xem URL của dashboard:
   ```
   http://localhost:3001/d/abc123xyz/iot-monitoring
                           ^^^^^^^^^
                           Đây là UID
   ```

2. Copy UID và paste vào file `.env`:
   ```env
   GRAFANA_DASHBOARD_UID=abc123xyz
   ```

### Bước 8: Test Dashboard

URL để test (thay `abc123xyz` bằng UID của bạn):

```
http://localhost:3001/d/abc123xyz/iot-monitoring?orgId=1&var-user_id=1&theme=light&from=now-15m&to=now&refresh=5s
```

**Lưu ý:** Dashboard chỉ hiển thị data khi đã có thiết bị gửi dữ liệu vào InfluxDB.

---

## 🔌 Device Provisioning Flow

### Tổng quan

```
┌─────────┐         ┌─────────┐         ┌──────────┐
│ ESP32   │────────▶│ Backend │────────▶│ InfluxDB │
│ Device  │  MQTT   │ Server  │   Data  │          │
└─────────┘         └─────────┘         └──────────┘
     │                    │
     │                    │
     │  1. Register       │
     │  2. Provision      │
     │  3. Send Data      │
```

### Bước 1: Đăng ký thiết bị (Backend)

```bash
POST /api/devices
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "name": "Cảm biến kho 1",
  "mac_address": "AA:BB:CC:DD:EE:FF"
}
```

**Response:**

```json
{
  "id": 1,
  "user_id": 1,
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "device_serial": "E248D27E014AAAC6",
  "name": "Cảm biến kho 1",
  "topic": "/devices/AA:BB:CC:DD:EE:FF/E248D27E014AAAC6/data",
  "is_active": false,
  "created_at": "2025-12-16T01:23:10.933Z"
}
```

**Lưu ý:** Lúc này thiết bị đã được tạo trong database nhưng chưa active (`is_active: false`).

### Bước 2: Kích hoạt thiết bị (ESP32)

#### 2.1. ESP32 gửi yêu cầu kích hoạt

ESP32 publish message đến topic:

```bash
Topic: system/provisioning/req
Payload: {"mac": "AA:BB:CC:DD:EE:FF"}
```

**Ví dụ với mosquitto client:**

```bash
mosquitto_pub -h localhost -p 1884 \
  -t "system/provisioning/req" \
  -m '{"mac": "AA:BB:CC:DD:EE:FF"}'
```

#### 2.2. Backend xử lý & phản hồi

Backend nhận request, kiểm tra MAC address trong database:
- Nếu tìm thấy → Set `is_active = true`
- Gửi phản hồi về cho ESP32 qua topic: `system/provisioning/{MAC}/res`

#### 2.3. ESP32 nhận phản hồi

ESP32 subscribe topic `system/provisioning/AA:BB:CC:DD:EE:FF/res`:

```bash
mosquitto_sub -h localhost -p 1884 \
  -t "system/provisioning/AA:BB:CC:DD:EE:FF/res"
```

**Response từ backend:**

```json
{
  "status": "success",
  "topic": "/devices/AA:BB:CC:DD:EE:FF/E248D27E014AAAC6/data"
}
```

### Bước 3: ESP32 gửi dữ liệu

ESP32 bắt đầu publish dữ liệu sensor vào topic nhận được:

```bash
Topic: /devices/AA:BB:CC:DD:EE:FF/E248D27E014AAAC6/data
Payload: {"temperature": 25.5, "humidity": 60.3}
```

**Ví dụ test:**

```bash
mosquitto_pub -h localhost -p 1884 \
  -t "/devices/AA:BB:CC:DD:EE:FF/E248D27E014AAAC6/data" \
  -m '{"temperature": 25.5, "humidity": 60.3}'
```

### Workflow Diagram

```
ESP32                    Backend                    Database
  |                         |                           |
  |--1. POST /api/devices-->|                           |
  |                         |---Create device---------->|
  |<----Response (topic)----|                           |
  |                         |                           |
  |--2. Provision Request-->|                           |
  | (MQTT: provisioning/req)|                           |
  |                         |---Set is_active=true----->|
  |<--3. Provision Response-|                           |
  | (MQTT: provisioning/res)|                           |
  |                         |                           |
  |--4. Send sensor data--->|                           |
  | (MQTT: device topic)    |---Save to InfluxDB------->|
  |                         |                           |
```

---

## 📡 API Documentation

### Authentication

#### 1. Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "john",
  "email": "john@example.com",
  "password": "password123"
}
```

#### 2. Login

```http
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
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "john",
    "email": "john@example.com"
  }
}
```

#### 3. Get Current User

```http
GET /api/auth/me
Authorization: Bearer <token>
```

#### 4. Change Password

```http
PUT /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "password123",
  "newPassword": "newpassword456"
}
```

#### 5. Forgot Password

```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

Hệ thống gửi mã 6 ký tự qua email, có hiệu lực trong 5 phút.

#### 6. Reset Password

```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "email": "john@example.com",
  "code": "ABC123",
  "newPassword": "newpassword456"
}
```

### Devices

#### 1. Get All Devices

```http
GET /api/devices
Authorization: Bearer <token>
```

#### 2. Create Device

```http
POST /api/devices
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Cảm biến kho 1",
  "mac_address": "AABBCCDDEEFF",
  "place_id": 1  // Optional
}
```

#### 3. Update Device

```http
PUT /api/devices/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Cảm biến kho 2",
  "place_id": 2
}
```

#### 4. Delete Device

```http
DELETE /api/devices/:id
Authorization: Bearer <token>
```

### Places

#### 1. Get All Places

```http
GET /api/places
Authorization: Bearer <token>
```

#### 2. Create Place

```http
POST /api/places
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Kho A",
  "description": "Kho chứa hàng tầng 1"
}
```

---

## 🗄 Database Schema

### PostgreSQL Tables

#### `users`
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| username | VARCHAR(50) | Unique username |
| email | VARCHAR(100) | Unique email |
| password_hash | VARCHAR(255) | Hashed password |
| reset_code | VARCHAR(6) | Password reset code |
| reset_expires | TIMESTAMP | Code expiration time |
| created_at | TIMESTAMP | Account creation time |

#### `places`
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INTEGER | Foreign key → users |
| name | VARCHAR(100) | Place name |
| description | TEXT | Optional description |
| created_at | TIMESTAMP | Creation time |

#### `devices`
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INTEGER | Foreign key → users |
| place_id | INTEGER | Foreign key → places (nullable) |
| mac_address | VARCHAR(17) | Device MAC address |
| device_serial | VARCHAR(50) | Generated serial |
| name | VARCHAR(100) | Device name |
| topic | VARCHAR(255) | MQTT topic |
| is_active | BOOLEAN | Provisioning status |
| created_at | TIMESTAMP | Creation time |

### InfluxDB Schema

**Measurement:** `sensor_data`

| Type | Field | Description |
|------|-------|-------------|
| Tag | `user_id` | User ID (for filtering) |
| Tag | `device_name` | Device name |
| Field | `temperature` | Temperature (°C) |
| Field | `humidity` | Humidity (%) |
| Timestamp | Auto | Time of measurement |

---

## 🔍 Troubleshooting

### ❌ PostgreSQL connection failed

```bash
# Kiểm tra PostgreSQL đang chạy
sudo systemctl status postgresql

# Kiểm tra credentials trong .env
cat .env | grep PG_
```

### ❌ MQTT broker not connected

```bash
# Kiểm tra container
docker ps | grep mosquitto

# Test MQTT connection
mosquitto_sub -h localhost -p 1884 -t "#"
```

### ❌ InfluxDB authentication failed

- Kiểm tra `INFLUX_TOKEN` trong `.env`
- Tạo lại token trong InfluxDB UI
- Verify organization name và bucket name

### ❌ Grafana không hiển thị data

1. Kiểm tra device đã active chưa (`is_active = true`)
2. Verify device đang gửi data (xem server logs)
3. Kiểm tra data trong InfluxDB Data Explorer
4. Verify Grafana variables (user_id, devices)

---

## 📝 Notes

- JWT token hết hạn sau **7 ngày**
- Password reset code hết hạn sau **5 phút**
- MQTT QoS: **1** (at least once delivery)
- InfluxDB retention policy: **mặc định unlimited**

---

## 📧 Email Configuration (Gmail)

1. Vào **Google Account** → **Security**
2. Bật **2-Step Verification**
3. Tạo **App Password**:
   - Chọn app: Mail
   - Chọn device: Other (Custom name)
4. Copy App Password → Paste vào `.env` → `EMAIL_PASSWORD`

---

## 📄 License

MIT License