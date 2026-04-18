const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['student', 'admin'],
        default: 'student'
    },
    isVerified: {
        type: Boolean,
        default: true
    },
    kycStatus: {
        type: String,
        enum: ['none', 'pending', 'approved', 'rejected'],
        default: 'none'
    },
    kycData: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'KYC'
    },
    referralCode: {
        type: String,
        unique: true
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    walletBalance: {
        type: Number,
        default: 0
    },
    referralCount: {
        type: Number,
        default: 0
    },
    tier: {
        type: String,
        enum: ['Silver', 'Gold', 'Diamond'],
        default: 'Silver'
    }
}, { timestamps: true });

// Pre-save hook to generate referral code
userSchema.pre('save', async function() {
    if (!this.referralCode) {
        this.referralCode = 'GSPS' + Math.random().toString(36).substring(2, 8).toUpperCase();
    }
});

module.exports = mongoose.model('User', userSchema);
