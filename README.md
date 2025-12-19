TÀI LIỆU DỰ ÁN IOT MONITORING SYSTEM
1. THÔNG TIN DỰ ÁN
Tên dự án: IoT Monitoring System
Mô tả: Website thu thập dữ liệu cảm biến (nhiệt độ, độ ẩm), hiển thị realtime và cảnh báo ngưỡng 
Công nghệ: Node.js, React, InfluxDB, MQTT, Docker
2. SƠ ĐỒ USECASE
Actors:
- Người dùng (User)
- Hệ thống (System)
- Broker MQTT
- Cảm biến (Sensor)

Use Cases:

1. Quản lý người dùng
   - Đăng nhập
   - Đăng xuất

2. Hiển thị dữ liệu
   - Xem dashboard tổng quan
   - Xem dữ liệu realtime
   - Xem dữ liệu lịch sử
   - Export dữ liệu

3. Quản lý cảnh báo
   - Thiết lập ngưỡng cảnh báo
   - Xem danh sách cảnh báo
   - Xử lý cảnh báo
   - Gửi thông báo

4. Quản lý thiết bị
   - Thêm/xóa/sửa thiết bị
   - Theo dõi trạng thái thiết bị

5. Thu thập dữ liệu
   - Nhận dữ liệu từ cảm biến
   - Lưu trữ vào database
   - Xử lý dữ liệu realtime

3. CÔNG NGHỆ SỬ DỤNG
3.1. Backend
•	Node.js với Express.js
•	InfluxDB Client để lưu trữ time series data
•	JWT cho authentication
3.2. Frontend
•	React.js với hooks
•	Grafana để vẽ biểu đồ
•	Material-UI hoặc Ant Design cho UI components
3.3. Database
•	InfluxDB cho dữ liệu time series
•	PostgreSQL cho dữ liệu như users, devices, alertRules, …
3.4. DevOps
•	Docker & Docker Compose
•	Git & GitHub cho version control
4. HƯỚNG DẪN CÀI ĐẶT
 Yêu cầu hệ thống
•	Node.js 16+
•	Docker & Docker Compose
•	Git

5. QUY TRÌNH PHÁT TRIỂN
Quy tắc Git
•	Main branch: main (protected)
•	Develop branch: develop
6. KIẾN TRÚC HỆ THỐNG
monitoring-iot-web/
├── backend/
├── frontend/
├── docker-compose.yml
└── README.md
7. API ENDPOINTS CHÍNH
7.1. Authentication
•	POST /api/auth/login
•	POST /api/auth/register
7.2. Device Management
•	GET /api/devices
•	POST /api/devices
•	PUT /api/devices/:id
7.3. Data
•	GET /api/data/realtime
•	GET /api/data/history
•	GET /api/data/export
7.4. Alerts
•	GET /api/alerts
•	POST /api/alerts/threshold
8. PHÂN CÔNG CÔNG VIỆC 
Phan Trí Dũng: Backend & MQTT
•	Thiết lập MQTT broker
•	Xử lý data ingestion
•	Kết nối InfluxDB
•	Authentication system
Lê Văn Được: Backend & API
•	Alert notifications
•	ThresholdSettings
•	REST API development
•	Data export features
Vũ Viết Dũng: Frontend & UI
•	React components
•	Grafana
Vũ Mạnh Dũng: 

