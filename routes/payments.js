const express = require('express');
const router = express.Router();
const { createPaymentRequest, getMyPayments } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/request', protect, upload.single('invoice'), createPaymentRequest);
router.get('/my', protect, getMyPayments);

module.exports = router;
