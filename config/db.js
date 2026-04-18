const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            family: 4,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });


        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        if (error.message.includes('ECONNREFUSED')) {
            console.error('Tip: This is usually a DNS or Network issue. Try changing your DNS to 8.8.8.8 or check if your IP is whitelisted in Atlas.');
        }
        process.exit(1);
    }
};

module.exports = connectDB;
