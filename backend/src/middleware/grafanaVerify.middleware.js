import { verifyDashboardHash } from '../utils/hash.utils.js';

/**
 * Middleware để verify hash trước khi cho phép truy cập Grafana
 */
const grafanaVerifyMiddleware = (req, res, next) => {
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
    
    // Lấy deviceSerials (có thể là devices hoặc device)
    const deviceSerials = devices || device;
    if (!deviceSerials) {
      return res.status(403).json({ 
        message: 'Access denied: Missing device information' 
      });
    }
    
    // Verify hash
    const verification = verifyDashboardHash(
      hash,
      userId,
      deviceSerials,
      parseInt(exp)
    );
    
    if (!verification.valid) {
      console.warn(`Grafana access denied: ${verification.reason}`, {
        userId,
        devices: deviceSerials,
        hash: hash.substring(0, 8) + '...', // Log partial hash
        ip: req.ip
      });
      
      return res.status(403).json({ 
        message: `Access denied: ${verification.reason}` 
      });
    }
    
    // Hash hợp lệ → cho phép tiếp tục
    console.log(`Grafana access granted for user ${userId}`);
    next();
    
  } catch (err) {
    console.error('Grafana verify error:', err);
    return res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
};

export default grafanaVerifyMiddleware;