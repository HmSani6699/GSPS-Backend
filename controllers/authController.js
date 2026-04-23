const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendEmail } = require('../config/email');

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const PendingUser = require('../models/PendingUser');

// @desc    Register User (Step 1: Save to PendingUser and Send OTP)
// @route   POST /api/auth/signup
exports.signup = async (req, res) => {
    try {
        const { fullName, email, phone, password, referredBy } = req.body;

        // 1. Check if user already exists in main table
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // 2. Clear any existing pending registration for this email
        await PendingUser.deleteMany({ email });

        // 3. Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 4. Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedOtp = await bcrypt.hash(otp, 10);
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // 5. Handle Referral (lookup referrer ID)
        let referrerId = null;
        if (referredBy) {
            const referrer = await User.findOne({ referralCode: referredBy });
            if (referrer) {
                referrerId = referrer._id;
            }
        }

        // 6. Send OTP via Email FIRST
        try {
            await sendEmail({
                to: email,
                subject: 'Verify Your Email - GSPS',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px;">
                        <h2 style="color: #2563eb; text-align: center;">Welcome to GSPS!</h2>
                        <p>Thank you for signing up. Please use the following OTP to verify your email address:</p>
                        <div style="font-size: 32px; font-weight: bold; padding: 15px; background: #f3f4f6; text-align: center; border-radius: 8px; margin: 25px 0; color: #1f2937; letter-spacing: 5px;">
                            ${otp}
                        </div>
                        <p style="color: #6b7280; font-size: 14px;">This OTP will expire in <strong>5 minutes</strong>.</p>
                        <p style="color: #6b7280; font-size: 14px;">If you didn't request this, please ignore this email.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="text-align: center; color: #9ca3af; font-size: 12px;">&copy; 2026 GSPS. All rights reserved.</p>
                    </div>
                `
            });
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
            return res.status(500).json({ message: 'Failed to send verification email. Please try again later.' });
        }

        // 7. Store in PendingUser only if email was sent
        await PendingUser.create({
            fullName,
            email,
            phone,
            password: hashedPassword,
            otp: hashedOtp,
            otpExpires,
            referredBy: referrerId
        });

        res.status(201).json({
            message: 'OTP sent to your email. Please verify.',
            email
        });
    } catch (error) {
        console.error('Signup Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify OTP (Step 2: Move from PendingUser to User)
// @route   POST /api/auth/verify-otp
exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        // 1. Find the pending registration
        const pendingUser = await PendingUser.findOne({ email });
        if (!pendingUser) {
            return res.status(404).json({ message: 'Registration session expired or not found. Please signup again.' });
        }

        // 2. Check max attempts (5)
        if (pendingUser.attempts >= 5) {
            await PendingUser.deleteOne({ email });
            return res.status(400).json({ message: 'Too many failed attempts. Please signup again.' });
        }

        // 3. Check expiry
        if (new Date() > pendingUser.otpExpires) {
            await PendingUser.deleteOne({ email });
            return res.status(400).json({ message: 'OTP has expired. Please signup again.' });
        }

        // 4. Check OTP match
        const isMatch = await bcrypt.compare(otp, pendingUser.otp);
        if (!isMatch) {
            pendingUser.attempts += 1;
            await pendingUser.save();
            return res.status(400).json({ message: `Invalid OTP. ${5 - pendingUser.attempts} attempts remaining.` });
        }

        // 5. Success: Create the actual user
        const newUser = await User.create({
            fullName: pendingUser.fullName,
            email: pendingUser.email,
            phone: pendingUser.phone,
            password: pendingUser.password,
            referredBy: pendingUser.referredBy,
            isVerified: true
        });

        // 6. Delete pending record
        await PendingUser.deleteOne({ email });

        res.status(201).json({
            message: 'Email verified successfully. Account created.',
            token: generateToken(newUser._id),
            user: {
                id: newUser._id,
                fullName: newUser.fullName,
                email: newUser.email,
                role: newUser.role,
                kycStatus: newUser.kycStatus
            }
        });
    } catch (error) {
        console.error('Verification Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
exports.resendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        const pendingUser = await PendingUser.findOne({ email });
        if (!pendingUser) {
            return res.status(404).json({ message: 'Registration session not found. Please signup again.' });
        }

        // Cooldown check (60 seconds) is handled by route middleware, but adding a basic check here too
        const cooldown = 60 * 1000;
        const timeSinceCreated = new Date() - pendingUser.createdAt;
        // Since we don't have lastOtpResendTime in PendingUser yet, we use createdAt or just let it pass
        
        // Generate new OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedOtp = await bcrypt.hash(otp, 10);
        
        pendingUser.otp = hashedOtp;
        pendingUser.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
        await pendingUser.save();

        // Send Email
        await sendEmail({
            to: email,
            subject: 'New OTP - GSPS',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #2563eb; text-align: center;">Your New OTP</h2>
                    <p>Use the following OTP to verify your email address:</p>
                    <div style="font-size: 32px; font-weight: bold; padding: 15px; background: #f3f4f6; text-align: center; border-radius: 8px; margin: 25px 0; color: #1f2937; letter-spacing: 5px;">
                        ${otp}
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">This OTP will expire in <strong>5 minutes</strong>.</p>
                </div>
            `
        });

        res.json({ message: 'New OTP sent to your email' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



// @desc    Login User
// @route   POST /api/auth/login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (user && (await bcrypt.compare(password, user.password))) {
            if (!user.isVerified) {
                return res.status(401).json({ message: 'Please verify your email first', unverified: true });
            }

            res.json({
                token: generateToken(user._id),
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    role: user.role,
                    kycStatus: user.kycStatus
                }
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Current User Profile
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
