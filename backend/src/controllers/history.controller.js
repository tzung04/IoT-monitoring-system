const { querySensorData, getQueryApi } = require('../config/influxdb');
const db = require('../config/database'); 

// Lấy lịch sử dữ liệu cảm biến từ InfluxDB
exports.getSensorDataHistory = async (req, res) => {
    const { deviceKey, timeRange = '-6h', sensorType } = req.query; 
    
    if (!deviceKey || !sensorType) {
        return res.status(400).json({ message: 'Thiếu deviceKey hoặc sensorType.' });
    }

    try {
        // --- BƯỚC THAY ĐỔI: Truy vấn InfluxDB ---
        // Sử dụng hàm querySensorData đã định nghĩa
        const results = await querySensorData(deviceKey, sensorType, timeRange);

        // Lưu ý: Kết quả trả về đã được format sẵn trong hàm querySensorData
        res.json(results);
    } catch (error) {
        console.error('API Error querying InfluxDB:', error);
        res.status(500).json({ error: 'Lỗi truy vấn dữ liệu cảm biến.' });
    }
};

exports.getAlertsHistory = async (req, res) => {
    const { deviceId, status = 'pending' } = req.query;
    
    try {
        let query = `
            SELECT 
                a.id, a.value, a.triggered_at, a.status,
                r.message AS rule_message,
                d.name AS device_name,
                r.parameter, r.operator, r.threshold
            FROM alerts a
            JOIN alert_rules r ON a.rule_id = r.id
            JOIN devices d ON a.device_id = d.id
            WHERE d.user_id = $1                           -- Đảm bảo chỉ lấy alerts của user hiện tại
        `;
        
        const userId = req.user.id;
        const params = [userId];

        // Lọc theo Device ID nếu có
        if (deviceId) {
            query += ` AND a.device_id = $${params.length + 1}`;
            params.push(deviceId);
        }

        // Lọc theo trạng thái (pending, resolved, v.v.)
        query += ` AND a.status = $${params.length + 1}`;
        params.push(status);
        
        query += ` ORDER BY a.triggered_at DESC LIMIT 100;`; // Lấy 100 cảnh báo gần nhất

        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('PostgreSQL Alerts Query Error:', err);
        res.status(500).json({ error: 'Lỗi truy vấn lịch sử cảnh báo.' });
    }
};