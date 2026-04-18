const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/kyc', require('./routes/kyc'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/chat', require('./routes/chat'));

app.get('/', (req, res) => {
    res.send('GSPS API is running...');
});

const jwt = require('jsonwebtoken');

// Socket.IO Logic
const Message = require('./models/Message');
const User = require('./models/User');

// Socket.IO Authentication Middleware
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error("Authentication error: No token provided"));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        next();
    } catch (err) {
        return next(new Error("Authentication error: Invalid token"));
    }
});

const onlineUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id, 'User ID:', socket.userId);
    
    // Add to online users
    onlineUsers.set(socket.userId, socket.id);
    io.emit('online_status', { userId: socket.userId, status: 'online' });

    socket.on('join_room', (room) => {
        socket.join(room);
        console.log(`User ${socket.userId} joined room: ${room}`);
    });

    socket.on('send_message', async (data) => {
        let { senderId, receiverId, message, room } = data;
        
        try {
            if (senderId !== socket.userId) senderId = socket.userId;

            if (receiverId === 'admin') {
                const adminUser = await User.findOne({ role: 'admin' });
                if (adminUser) receiverId = adminUser._id;
            }

            const newMessage = new Message({
                sender: senderId,
                receiver: receiverId,
                message,
                room
            });
            await newMessage.save();

            const messagePayload = {
                _id: newMessage._id,
                sender: senderId,
                receiver: receiverId,
                message,
                room,
                isRead: false,
                createdAt: newMessage.createdAt
            };

            // Emit to the specific chat room
            io.to(room).emit('receive_message', messagePayload);

            // Notify the receiver personally (for unread counts/badges) if they are online
            const receiverSocketId = onlineUsers.get(receiverId.toString());
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('new_message_notification', messagePayload);
            }
            
            console.log(`Message from ${senderId} sent to room ${room}`);
        } catch (error) {
            console.error('Error in send_message:', error);
            socket.emit('error', { message: 'Failed to send message' });
        }
    });

    socket.on('mark_as_read', async ({ room, userId }) => {
        try {
            await Message.updateMany(
                { room, receiver: userId, isRead: false },
                { $set: { isRead: true } }
            );
            // Notify the sender that their messages were read (read receipt)
            io.to(room).emit('messages_read', { room, readerId: userId });
        } catch (error) {
            console.error('Error in mark_as_read:', error);
        }
    });

    socket.on('leave_room', (room) => {

        socket.leave(room);
        console.log(`User ${socket.userId} left room: ${room}`);
    });


    socket.on('disconnect', () => {
        onlineUsers.delete(socket.userId);
        io.emit('online_status', { userId: socket.userId, status: 'offline' });
        console.log('User disconnected:', socket.id);
    });
});



const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


