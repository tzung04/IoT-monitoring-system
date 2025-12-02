const db = require('../config/database');

//Thêm cảnh báo mới
exports.createRule = async (req, res) => {
    const { device_id, parameter, operator, threshold, message, is_active } = req.body;
    const userId = req.user.id; 

    //Kiểm tra xem thiết bị có thuộc về người dùng không
    try {
        const checkQuery = 'SELECT user_id FROM devices WHERE id = $1';
        const { rows: deviceRows } = await db.query(checkQuery, [device_id]);

        if (deviceRows.length === 0 || deviceRows[0].user_id !== userId) {
            return res.status(403).json({ message: 'Bạn không có quyền tạo quy tắc cho thiết bị này.' });
        }
        
        //Thêm canh báo mới
        const insertQuery = `
            INSERT INTO alert_rules (device_id, parameter, operator, threshold, message, is_active)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        const values = [device_id, parameter, operator, threshold, message, is_active !== undefined ? is_active : true];
        const { rows } = await db.query(insertQuery, values);
        
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error creating alert rule:', err);
        res.status(500).json({ error: 'Lỗi máy chủ khi tạo quy tắc cảnh báo.' });
    }
};

//Lấy tất cả  cảnh báo theo Device ID
exports.getRulesByDevice = async (req, res) => {
    const { deviceId } = req.params;
    const userId = req.user.id;

    try {
        // Lấy các quy tắc và JOIN với bảng devices để xác thực quyền
        const query = `
            SELECT 
                r.id, r.parameter, r.operator, r.threshold, r.message, r.is_active, r.created_at
            FROM alert_rules r
            JOIN devices d ON r.device_id = d.id
            WHERE d.id = $1 AND d.user_id = $2
            ORDER BY r.id;
        `;
        const { rows } = await db.query(query, [deviceId, userId]);
        
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi máy chủ khi lấy quy tắc cảnh báo.' });
    }
};

//Cập nhật cảnh báo
exports.updateRule = async (req, res) => {
    const { ruleId } = req.params;
    const { parameter, operator, threshold, message, is_active } = req.body;
    const userId = req.user.id;
    
    try {
        // Cập nhật quy tắc và JOIN với devices để đảm bảo người dùng có quyền
        const query = `
            UPDATE alert_rules r
            SET 
                parameter = COALESCE($1, r.parameter), 
                operator = COALESCE($2, r.operator), 
                threshold = COALESCE($3, r.threshold), 
                message = COALESCE($4, r.message), 
                is_active = COALESCE($5, r.is_active)
            FROM devices d
            WHERE r.id = $6 AND r.device_id = d.id AND d.user_id = $7
            RETURNING r.*;
        `;
        const values = [parameter, operator, threshold, message, is_active, ruleId, userId];
        const { rows } = await db.query(query, values);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Quy tắc không tồn tại hoặc bạn không có quyền sửa.' });
        }
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi máy chủ khi cập nhật quy tắc.' });
    }
};

//Xóa cảnh báo
exports.deleteRule = async (req, res) => {
    const { ruleId } = req.params;
    const userId = req.user.id;

    try {
        // Xóa quy tắc và JOIN với devices để đảm bảo người dùng có quyền
        const query = `
            DELETE FROM alert_rules r
            USING devices d
            WHERE r.id = $1 AND r.device_id = d.id AND d.user_id = $2
            RETURNING r.id;
        `;
        const { rows } = await db.query(query, [ruleId, userId]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Quy tắc không tồn tại hoặc bạn không có quyền xóa.' });
        }
        
        // LƯU Ý: Alerts liên quan sẽ tự động bị xóa nhờ ON DELETE CASCADE
        res.status(200).json({ message: 'Quy tắc cảnh báo đã được xóa thành công.' });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi máy chủ khi xóa quy tắc cảnh báo.' });
    }
};