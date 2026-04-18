const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env' });

const User = require('../models/User');

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'admin@gsps.com' });
        if (existingAdmin) {
            console.log('✅ Admin already exists:');
            console.log('   Email:    admin@gsps.com');
            console.log('   Password: Admin@1234');
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash('Admin@1234', 10);

        await User.create({
            fullName: 'GSPS Admin',
            email: 'admin@gsps.com',
            phone: '+8801000000000',
            password: hashedPassword,
            role: 'admin',
            isVerified: true,
        });

        console.log('✅ Default admin created successfully!');
        console.log('   Email:    admin@gsps.com');
        console.log('   Password: Admin@1234');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding admin:', error.message);
        process.exit(1);
    }
};

seedAdmin();
