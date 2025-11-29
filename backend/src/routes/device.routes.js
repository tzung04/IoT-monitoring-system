const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const authMiddleware = require('../middleware/auth.middleware');

// Áp dụng middleware xác thực cho tất cả các route thiết bị
router.use(authMiddleware); 

//Lấy tất cả thiết bị của người dùng hiện tại
router.get('/', deviceController.getAllUserDevices);

//Thêm thiết bị mới
router.post('/', deviceController.createDevice);

//Lấy chi tiết thiết bị theo ID
router.get('/:deviceId', deviceController.getDeviceById);

//Cập nhật thông tin thiết bị
router.put('/:deviceId', deviceController.updateDevice);

//Xóa thiết bị
router.delete('/:deviceId', deviceController.deleteDevice);

module.exports = router;