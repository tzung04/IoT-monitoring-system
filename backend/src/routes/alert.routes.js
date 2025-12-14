import express from 'express';
import * as alertRuleController from '../controllers/alert.controller.js';
import authMiddleware from '../middleware/auth.middleware.js'; 

const router = express.Router();

// Áp dụng middleware xác thực
router.use(authMiddleware); 

// Thêm cảnh báo mới
router.post('/', alertRuleController.createRule);

// Lấy tất cả cảnh báo theo Device ID 
router.get('/:deviceId', alertRuleController.getRulesByDevice);

// Cập nhật cảnh báo
router.put('/:ruleId', alertRuleController.updateRule);

// Xóa cảnh báo
router.delete('/:ruleId', alertRuleController.deleteRule);

export default router;