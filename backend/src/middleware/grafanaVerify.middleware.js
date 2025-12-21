import { verifyDashboardHash } from '../utils/hash.utils.js';
import Device from '../models/device.model.js';

// CACHE LAYER - Giảm DB queries
const deviceCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 phút

/**
 * Lấy devices của user (có cache)
 */
async function getCachedUserDevices(userId) {
  const now = Date.now();
  const cached = deviceCache.get(userId);
  
  // Kiểm tra cache hợp lệ
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.devices;
  }
  
  // Cache miss hoặc expire → query DB
  const devices = await Device.findByUserId(userId);
  deviceCache.set(userId, { devices, timestamp: now });
  
  return devices;
}

/**
 * Middleware để verify hash trước khi cho phép truy cập Grafana
 */
const grafanaVerifyMiddleware = async (req, res, next) => {
  try {
    // Lấy params từ URL query
    const { hash, exp, 'var-user_id': userId, 'var-devices': devices, 'var-device': device } = req.query;
    
    // Nếu không có hash hoặc exp → reject
    if (!hash || !exp) {
      return res.status(403).json({ 
        message: 'Access denied: Missing security parameters' 
      });
    }
    
    // Nếu không có userId → reject
    if (!userId) {
      return res.status(403).json({ 
        message: 'Access denied: Missing user_id' 
      });
    }
    
    // Lấy deviceNames từ URL
    // QUAN TRỌNG: var-devices có thể xuất hiện nhiều lần
    // req.query['var-devices'] có thể là string hoặc array
    let deviceNamesInput = devices || device;
    
    if (!deviceNamesInput) {
      return res.status(403).json({ 
        message: 'Access denied: Missing device information' 
      });
    }
    
    // Parse device names (có thể là array hoặc string)
    let deviceNameArray;
    if (Array.isArray(deviceNamesInput)) {
      // Trường hợp: var-devices=A&var-devices=B → ['A', 'B']
      deviceNameArray = deviceNamesInput;
    } //else if (typeof deviceNamesInput === 'string') {
      // Trường hợp: var-devices=A,B hoặc var-devices=A
      //deviceNameArray = deviceNamesInput.split(',').map(name => name.trim());
    //} 
    else {
      return res.status(403).json({ 
        message: 'Access denied: Invalid device format' 
      });
    }
    // Query DB để convert names → serials (CÓ CACHE)
    const userDevices = await getCachedUserDevices(userId);
    
    if (!userDevices || userDevices.length === 0) {
      return res.status(403).json({ 
        message: 'Access denied: No devices found' 
      });
    }
    
    // Tìm matching devices
    const matchedDevices = userDevices.filter(d => deviceNameArray.includes(d.name));
    
    if (matchedDevices.length === 0) {
      return res.status(403).json({ 
        message: 'Access denied: No matching devices found' 
      });
    }
    
    // Lấy serials để verify hash
    const deviceSerials = matchedDevices.map(d => d.device_serial).join(',');
    
    // Verify hash với serials
    const verification = verifyDashboardHash(
      hash,
      userId,
      deviceSerials,
      parseInt(exp)
    );
    
    if (!verification.valid) {
      console.warn(`Grafana access denied: ${verification.reason}`, {
        userId,
        deviceNamesInput,
        deviceSerials,
        hash: hash.substring(0, 8) + '...',
        ip: req.ip
      });
      
      return res.status(403).json({ 
        message: `Access denied: ${verification.reason}` 
      });
    }
    
    // Hash hợp lệ → cho phép tiếp tục
    console.log(`Grafana access granted for user ${userId} - devices: ${deviceNamesInput}`);
    next();
    
  } catch (err) {
    console.error('Grafana verify error:', err);
    return res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
};

/**
 * Clear cache cho user (gọi khi device thay đổi)
 */
export function clearDeviceCache(userId) {
  deviceCache.delete(userId);
}

export default grafanaVerifyMiddleware;