const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendEmail } = require('../config/email');

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register User
// @route   POST /api/auth/signup
exports.signup = async (req, res) => {
    try {
        const { fullName, email, phone, password, referredBy } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedOtp = await bcrypt.hash(otp, 10);
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        const user = await User.create({
            fullName,
            email,
            phone,
            password: hashedPassword,
            isVerified: false,
            otp: hashedOtp,
            otpExpires,
            lastOtpResendTime: new Date()
        });

        // Handle Referral
        if (referredBy) {
            const referrer = await User.findOne({ referralCode: referredBy });
            if (referrer) {
                user.referredBy = referrer._id;
                await user.save();
            }
        }

        // Send OTP via Email
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
            // We still created the user, they can try resending OTP later
        }

        res.status(201).json({
            message: 'OTP sent to your email. Please verify.',
            email: user.email
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ message: 'User is already verified' });
        }

        // Check expiry
        if (new Date() > user.otpExpires) {
            return res.status(400).json({ message: 'OTP has expired' });
        }

        // Check match
        const isMatch = await bcrypt.compare(otp, user.otp);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        // Mark as verified
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.json({
            message: 'Email verified successfully',
            token: generateToken(user._id),
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                kycStatus: user.kycStatus
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
exports.resendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ message: 'User is already verified' });
        }

        // Cooldown check (60 seconds)
        const cooldown = 60 * 1000;
        const timeSinceLastResend = new Date() - user.lastOtpResendTime;
        if (timeSinceLastResend < cooldown) {
            const waitTime = Math.ceil((cooldown - timeSinceLastResend) / 1000);
            return res.status(400).json({ message: `Please wait ${waitTime} seconds before requesting another OTP` });
        }

        // Generate new OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedOtp = await bcrypt.hash(otp, 10);
        
        user.otp = hashedOtp;
        user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
        user.lastOtpResendTime = new Date();
        await user.save();

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
