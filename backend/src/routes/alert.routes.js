const express = require('express');
const router = express.Router();
const alertRuleController = require('../controllers/alertRuleController');
const authMiddleware = require('../middleware/authMiddleware'); 

router.use(authMiddleware); 

//Thêm cảnh báo mới
router.post('/', alertRuleController.createRule);

//Lấy tất cả  cảnh báo theo Device ID 
router.get('/:deviceId', alertRuleController.getRulesByDevice);

//Cập nhật cảnh báo
router.put('/:ruleId', alertRuleController.updateRule);

//Xóa cảnh báo
router.delete('/:ruleId', alertRuleController.deleteRule);

module.exports = router;