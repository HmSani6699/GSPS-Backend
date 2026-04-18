const express = require('express');
const router = express.Router();
const { submitKYC, getKYCStatus } = require('../controllers/kycController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/submit', protect, upload.fields([
    { name: 'studentPhoto', maxCount: 1 },
    { name: 'passportFile', maxCount: 1 },
    { name: 'visaFile', maxCount: 1 },
    { name: 'universityDocument', maxCount: 1 },
    { name: 'gobDocument', maxCount: 1 }
]), submitKYC);

router.get('/status', protect, getKYCStatus);

module.exports = router;
