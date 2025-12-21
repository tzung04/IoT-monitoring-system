import pool from '../config/database.js';

class AlertLog {
  static async create({ device_id, rule_id, value_at_time, message }) {
    const result = await pool.query(
      `INSERT INTO alert_logs (device_id, rule_id, value_at_time, message) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [device_id, rule_id, value_at_time, message]
    );
    return result.rows[0];
  }

  static async findByDeviceId(device_id, limit = 50) {
    const result = await pool.query(
      'SELECT * FROM alert_logs WHERE device_id = $1 ORDER BY triggered_at DESC LIMIT $2',
      [device_id, limit]
    );
    return result.rows;
  }

  static async findByUserId(user_id, limit = 50) {
    const result = await pool.query(
      `SELECT al.*, d.name as device_name 
       FROM alert_logs al
       JOIN devices d ON al.device_id = d.id
       WHERE d.user_id = $1
       ORDER BY al.triggered_at DESC
       LIMIT $2`,
      [user_id, limit]
    );
    return result.rows;
  }

  static async findRecentByDeviceAndRule(device_id, rule_id, minutes = 5) {
    const result = await pool.query(
      `SELECT * FROM alert_logs 
       WHERE device_id = $1 AND rule_id = $2 
       AND triggered_at > NOW() - INTERVAL '${minutes} minutes'
       ORDER BY triggered_at DESC LIMIT 1`,
      [device_id, rule_id]
    );
    return result.rows[0];
  }

  /**
   * Tìm lịch sử alert của user có hỗ trợ lọc theo device và thời gian
   * @param {number} user_id 
   * @param {Object} options - { deviceId, fromDate, toDate, limit }
   */
  static async findByFilter(user_id, { deviceId, fromDate, toDate, limit = 50 } = {}) {
    // 1. Khởi tạo câu truy vấn cơ bản
    let query = `
       SELECT al.*, d.name as device_name 
       FROM alert_logs al
       JOIN devices d ON al.device_id = d.id
       WHERE d.user_id = $1
    `;
    
    // Mảng chứa giá trị tham số, bắt đầu với user_id ($1)
    const params = [user_id];
    
    // Biến đếm index cho placeholder ($2, $3...)
    let paramIndex = 2; 

    // 2. Thêm điều kiện lọc DEVICE nếu có
    if (deviceId) {
        query += ` AND al.device_id = $${paramIndex}`;
        params.push(deviceId);
        paramIndex++;
    }

    // 3. Thêm điều kiện lọc FROM DATE (lớn hơn hoặc bằng)
    if (fromDate) {
        query += ` AND al.triggered_at >= $${paramIndex}`;
        params.push(fromDate);
        paramIndex++;
    }

    // 4. Thêm điều kiện lọc TO DATE (nhỏ hơn hoặc bằng)
    if (toDate) {
        query += ` AND al.triggered_at <= $${paramIndex}`;
        params.push(toDate);
        paramIndex++;
    }

    // 5. Thêm sắp xếp và giới hạn (LIMIT luôn ở cuối)
    query += ` ORDER BY al.triggered_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  }
}

export default AlertLog;