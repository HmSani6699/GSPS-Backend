const express = require('express');
const router = express.Router();
const { signup, login, getMe, verifyOTP, resendOTP } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const rateLimit = require('express-rate-limit');

// Rate limiter for OTP routes (prevents spam)
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per window
    message: { message: 'Too many requests, please try again after 15 minutes' }
});

router.post('/signup', signup);
router.post('/login', login);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', otpLimiter, resendOTP);
router.get('/me', protect, getMe);

module.exports = router;
