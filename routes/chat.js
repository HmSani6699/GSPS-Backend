const express = require('express');
const router = express.Router();
const { getChatHistory, getChatStudents, markAsRead, getTotalUnreadCount } = require('../controllers/chatController');

const { protect, admin } = require('../middleware/authMiddleware');

router.get('/students', protect, admin, getChatStudents);
router.get('/unread/total', protect, getTotalUnreadCount);
router.put('/read/:room', protect, markAsRead);
router.get('/:userId', protect, getChatHistory);


module.exports = router;
