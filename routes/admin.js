const express = require('express');
const router = express.Router();
const { 
    getAllKYC, 
    updateKYCStatus, 
    getAllPayments, 
    updatePaymentStatus,
    getAllUsers,
    getAnalytics
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

// All routes here are protected and require admin role
router.use(protect, admin);

router.get('/kyc', getAllKYC);
router.put('/kyc/:id', updateKYCStatus);

router.get('/payments', getAllPayments);
router.put('/payments/:id', updatePaymentStatus);

router.get('/users', getAllUsers);
router.get('/analytics', getAnalytics);

module.exports = router;
