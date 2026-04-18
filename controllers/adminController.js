const User = require('../models/User');
const KYC = require('../models/KYC');
const Payment = require('../models/Payment');

// @desc    Get all KYC submissions
// @route   GET /api/admin/kyc
exports.getAllKYC = async (req, res) => {
    try {
        const { search, status } = req.query;
        let query = {};

        if (status) {
            query.status = status;
        }

        let kycs = await KYC.find(query)
            .populate('user', 'fullName email')
            .sort('-createdAt');

        if (search) {
            const searchLower = search.toLowerCase();
            kycs = kycs.filter(kyc => 
                kyc.user?.fullName?.toLowerCase().includes(searchLower) || 
                kyc.user?.email?.toLowerCase().includes(searchLower)
            );
        }

        res.json(kycs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// @desc    Update KYC Status
// @route   PUT /api/admin/kyc/:id
exports.updateKYCStatus = async (req, res) => {
    try {
        const { status, rejectionReason } = req.body;
        const kyc = await KYC.findById(req.params.id);

        if (!kyc) return res.status(404).json({ message: 'KYC not found' });

        kyc.status = status;
        if (rejectionReason) kyc.rejectionReason = rejectionReason;
        await kyc.save();

        // Sync with User model
        await User.findByIdAndUpdate(kyc.user, { kycStatus: status });

        res.json({ message: `KYC status updated to ${status}`, kyc });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all payment requests
// @route   GET /api/admin/payments
exports.getAllPayments = async (req, res) => {
    try {
        const { search, status } = req.query;
        let query = {};

        if (status) {
            query.status = status;
        }

        let payments = await Payment.find(query)
            .populate('user', 'fullName email')
            .sort('-createdAt');

        if (search) {
            const searchLower = search.toLowerCase();
            payments = payments.filter(p => 
                p.user?.fullName?.toLowerCase().includes(searchLower) || 
                p.user?.email?.toLowerCase().includes(searchLower) ||
                p.transactionId?.toLowerCase().includes(searchLower)
            );
        }

        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// @desc    Update Payment Status & Referral Commission
// @route   PUT /api/admin/payments/:id
exports.updatePaymentStatus = async (req, res) => {
    try {
        const { status, savingsAmount, adminNote } = req.body;
        const payment = await Payment.findById(req.params.id);

        if (!payment) return res.status(404).json({ message: 'Payment not found' });

        const previousStatus = payment.status;
        payment.status = status;
        if (savingsAmount) payment.savingsAmount = savingsAmount;
        if (adminNote) payment.adminNote = adminNote;
        
        await payment.save();

        // Logic: If status changed to Completed, check for referral commission
        if (status === 'Completed' && previousStatus !== 'Completed') {
            const user = await User.findById(payment.user);
            
            // Check if this is the user's first completed payment
            const completedCount = await Payment.countDocuments({ user: user._id, status: 'Completed' });
            
            if (completedCount === 1 && user.referredBy) {
                // Credit the referrer
                const referrer = await User.findById(user.referredBy);
                if (referrer) {
                    const commission = 20; // Example fixed $20 commission
                    referrer.walletBalance += commission;
                    referrer.referralCount += 1;

                    // Tier Upgrade Logic
                    if (referrer.referralCount >= 10) {
                        referrer.tier = 'Diamond';
                    } else if (referrer.referralCount >= 3) {
                        referrer.tier = 'Gold';
                    }

                    await referrer.save();
                }
            }
        }

        res.json({ message: `Payment updated to ${status}`, payment });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get All Users
// @route   GET /api/admin/users
exports.getAllUsers = async (req, res) => {
    try {
        const { search, role, tier } = req.query;
        let query = {};

        if (role) query.role = role;
        if (tier) query.tier = tier;

        let users = await User.find(query).select('-password').sort('-createdAt');

        if (search) {
            const searchLower = search.toLowerCase();
            users = users.filter(u => 
                u.fullName?.toLowerCase().includes(searchLower) || 
                u.email?.toLowerCase().includes(searchLower)
            );
        }

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// @desc    Get Analytics
// @route   GET /api/admin/analytics
exports.getAnalytics = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'student' });
        const totalPayments = await Payment.countDocuments({ status: 'Completed' });
        
        const payments = await Payment.find({ status: 'Completed' });
        const totalVolume = payments.reduce((acc, curr) => acc + curr.amount, 0);
        const totalRevenue = totalVolume * 0.05; // Example 5% revenue

        res.json({
            totalUsers,
            totalPayments,
            totalVolume,
            totalRevenue
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
