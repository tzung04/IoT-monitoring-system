import pool from '../config/database.js';

class Device{
  static async create({user_id, place_id, device_serial, name, topic, is_active}){
    const result = await pool.query(
      `INSERT INTO devices (user_id, place_id, device_serial, name, topic, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, place_id, device_serial, name, topic, is_active`,
       [user_id, place_id, device_serial, name, topic, is_active]
    );
    return result.rows[0];
  }

  static async findByUserId(user_id){
    const result = await pool.query(
      `SELECT * FROM devices WHERE user_id = $1 ORDER BY created_at DESC`,
      [user_id]
    );
    return result.rows;
  }

  static async findById(device_id){
    const result = await pool.query(
      `SELECT * FROM devices WHERE id = $1`,
      [device_id]
    );
    return result.rows[0];
  }

  static async findBySerial(device_serial){
    const result = await pool.query(
      `SELECT * FROM devices WHERE device_serial = $1`,
      [device_serial]
    );
    return result.rows[0];
  }

  static async findActiveDevices(){
    const result = await pool.query(
      `SELECT * FROM devices WHERE is_active = $1`,
      [true]
    );
    return result.rows;
  }

  static async update(deviceId, {place_id,name,topic,is_active} ){
    const result = await pool.query(
      `UPDATE devices
      SET place_id = $1, 
          name = $2, 
          topic = $3, 
          is_active = $4
      WHERE id = $5
      RETURNING *`,
      [place_id,name,topic,is_active, deviceId]
    );
    return result.rows[0];
  }   

  static async delete(deviceId) {
    const result = await pool.query(
      `DELETE FROM devices WHERE id = $1 RETURNING id`,
      [deviceId]
    );
    return result.rows[0];
  }
}

export default Device;