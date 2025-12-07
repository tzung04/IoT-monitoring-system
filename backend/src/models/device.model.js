import express from 'express';
import * as deviceController from '../controllers/device.controller.js'; // Nhớ thêm đuôi .js
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();

// Áp dụng middleware xác thực
router.use(authMiddleware); 

// Lấy tất cả thiết bị của người dùng hiện tại
router.get('/', deviceController.getAllUserDevices);

// Thêm thiết bị mới
router.post('/', deviceController.createDevice);

// Lấy chi tiết thiết bị theo ID
router.get('/:deviceId', deviceController.getDeviceById);

// Cập nhật thông tin thiết bị
router.put('/:deviceId', deviceController.updateDevice);

// Xóa thiết bị
router.delete('/:deviceId', deviceController.deleteDevice);

export default router;