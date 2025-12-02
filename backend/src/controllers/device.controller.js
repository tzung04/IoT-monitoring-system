const db = require('../config/database');
const crypto = require('crypto'); // Dùng để tạo device_key ngẫu nhiên

// Tạo thiết bị mới
exports.createDevice = async (req, res) => {
    const { name, topic } = req.body;
    const userId = req.user.id; // ID người dùng lấy từ token JWT

    if (!name || !topic) {
        return res.status(400).json({ message: "Tên và Topic là bắt buộc." });
    }

    // Tự động tạo device_key duy nhất
    const deviceKey = crypto.randomBytes(16).toString('hex'); 
    
    try {
        const query = `
            INSERT INTO devices (user_id, name, device_key, topic)
            VALUES ($1, $2, $3, $4)
            RETURNING id, name, device_key, topic, status, created_at;
        `;
        const values = [userId, name, deviceKey, topic];
        const { rows } = await db.query(query, values);

        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error creating device:', err);
        res.status(500).json({ error: 'Lỗi máy chủ khi tạo thiết bị.' });
    }
};

// Lấy tất cả thiết bị của người dùng hiện tại
exports.getAllUserDevices = async (req, res) => {
    const userId = req.user.id;

    try {
        const query = `
            SELECT id, name, device_key, topic, status, last_seen, created_at 
            FROM devices 
            WHERE user_id = $1 
            ORDER BY created_at DESC;
        `;
        const { rows } = await db.query(query, [userId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi máy chủ khi lấy danh sách thiết bị.' });
    }
};

// Lấy chi tiết thiết bị theo ID
exports.getDeviceById = async (req, res) => {
    const { deviceId } = req.params;
    const userId = req.user.id;
    try {
        const query = `
            SELECT id, name, device_key, topic, status, last_seen, created_at
            FROM devices
            WHERE id = $1 AND user_id = $2;
        `;
        const { rows } = await db.query(query, [deviceId, userId]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Thiết bị không tồn tại hoặc bạn không có quyền truy cập.' });
        }
        res.json(rows[0]);
    }
    catch (err) {
        res.status(500).json({ error: 'Lỗi máy chủ khi lấy chi tiết thiết bị.' });
    }
};


//Cập nhật thông tin thiết bị
exports.updateDevice = async (req, res) => {
    const { deviceId } = req.params;
    const { name, topic } = req.body;
    const userId = req.user.id;
    
    try {
        const query = `
            UPDATE devices 
            SET name = $1, topic = $2
            WHERE id = $3 AND user_id = $4
            RETURNING id, name, topic, status;
        `;
        const values = [name, topic, deviceId, userId];
        const { rows } = await db.query(query, values);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Thiết bị không tồn tại hoặc bạn không có quyền.' });
        }
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi máy chủ khi cập nhật thiết bị.' });
    }
};

//Xóa thiết bị
exports.deleteDevice = async (req, res) => {
    const { deviceId } = req.params;
    const userId = req.user.id; // Lấy ID người dùng từ JWT token

    try {
        const query = `
            DELETE FROM devices
            WHERE id = $1 AND user_id = $2
            RETURNING id;
        `;
        const { rows } = await db.query(query, [deviceId, userId]);

        if (rows.length === 0) {
            // Thiết bị không tồn tại HOẶC người dùng không phải là chủ sở hữu
            return res.status(404).json({ message: 'Thiết bị không tồn tại hoặc bạn không có quyền xóa.' });
        }
        
        res.status(200).json({ message: 'Thiết bị và các quy tắc liên quan đã được xóa thành công.' });
        
    } catch (err) {
        console.error('Error deleting device:', err);
        res.status(500).json({ error: 'Lỗi máy chủ khi xóa thiết bị.' });
    }
};
