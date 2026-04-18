const Message = require('../models/Message');
const User = require('../models/User');

// @desc    Get chat history for a specific user
// @route   GET /api/chat/:userId
// @access  Private
const getChatHistory = async (req, res) => {
    try {
        const { userId } = req.params;

        // Check if user is admin or the user themselves
        if (req.user.role !== 'admin' && req.user._id.toString() !== userId) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const messages = await Message.find({ room: userId })
            .sort({ createdAt: 1 })
            .populate('sender', 'fullName role')
            .populate('receiver', 'fullName role');

        res.json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get list of students who have chatted with unread count
// @route   GET /api/chat/students
// @access  Private/Admin
const getChatStudents = async (req, res) => {
    try {
        const rooms = await Message.distinct('room');
        const students = await User.find({ _id: { $in: rooms } }, 'fullName email role');
        
        // Add unread count for each student
        const studentsWithUnread = await Promise.all(students.map(async (student) => {
            const unreadCount = await Message.countDocuments({
                room: student._id.toString(),
                receiver: req.user._id,
                isRead: false
            });
            return {
                ...student.toObject(),
                unreadCount
            };
        }));
        
        res.json(studentsWithUnread);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Mark messages as read
// @route   PUT /api/chat/read/:room
// @access  Private
const markAsRead = async (req, res) => {
    try {
        const { room } = req.params;
        await Message.updateMany(
            { room, receiver: req.user._id, isRead: false },
            { $set: { isRead: true } }
        );
        res.json({ message: 'Messages marked as read' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get total unread count for a user
// @route   GET /api/chat/unread/total
// @access  Private
const getTotalUnreadCount = async (req, res) => {
    try {
        const count = await Message.countDocuments({
            receiver: req.user._id,
            isRead: false
        });
        res.json({ count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getChatHistory,
    getChatStudents,
    markAsRead,
    getTotalUnreadCount
};

