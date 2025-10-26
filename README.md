
# Website Giám sát Hệ thống IoT

Một hệ thống website thời gian thực cho phép người dùng theo dõi và giám sát dữ liệu từ các thiết bị IoT một cách trực quan và hiệu quả.



## Giới thiệu

Dự án này được xây dựng để giải quyết nhu cầu giám sát các cảm biến (như nhiệt độ, độ ẩm, ánh sáng...) và điều khiển các thiết bị (như đèn, máy bơm...) từ xa qua giao diện web. Dữ liệu được truyền tải tức thì bằng MQTT và lưu trữ hiệu quả trong cơ sở dữ liệu chuỗi thời gian (InfluxDB) để dễ dàng truy vấn và vẽ biểu đồ.

## Tính năng chính

* ** Dashboard thời gian thực:** Hiển thị dữ liệu cảm biến mới nhất dưới dạng đồng hồ đo (gauges) và biểu đồ. 
* ** Biểu đồ lịch sử:** Phân tích dữ liệu lịch sử của cảm biến theo các khoảng thời gian tùy chọn (giờ, ngày, tuần).
* ** Cảnh báo (Tùy chọn):** Thiết lập ngưỡng để nhận cảnh báo khi dữ liệu vượt quá mức cho phép.

## Công nghệ sử dụng

Dự án được chia thành 4 phần chính:

* **Frontend:** [React](https://reactjs.org/) 
* **Backend:** [Node.js](https://nodejs.org/) 
* **Database:** [InfluxDB](https://www.influxdata.com/)
* **MQTT Broker:** [Mosquitto](https://mosquitto.org/) 

## Cài đặt

Để chạy dự án này local, bạn cần cài đặt **Node.js**, **InfluxDB**, và **Mosquitto**.

Bạn có thể cài đặt các công cụ từ trang web nhà cung cấp