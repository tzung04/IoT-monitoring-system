const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

//Lấy lịch sử dữ liệu cảm biến (InfluxDB)
router.get('/sensor', historyController.getSensorDataHistory);

//Lấy lịch sử cảnh báo (PostgreSQL)
router.get('/alerts', historyController.getAlertsHistory);

module.exports = router;