const Payment = require('../models/Payment');
const User = require('../models/User');

// @desc    Create Payment Request
// @route   POST /api/payments/request
exports.createPaymentRequest = async (req, res) => {
    try {
        const { paymentType, amount, currency, purpose } = req.body;
        const user = await User.findById(req.user.id);

        let discountRate = 0.03; // Default Silver
        if (user.tier === 'Gold') discountRate = 0.05;
        if (user.tier === 'Diamond') discountRate = 0.08;

        const savingsAmount = (amount * discountRate).toFixed(2);

        const payment = await Payment.create({
            user: req.user.id,
            paymentType,
            amount,
            currency,
            purpose,
            savingsAmount,
            invoiceDocument: req.file ? req.file.path : null
        });

        res.status(201).json({
            message: 'Payment request submitted successfully',
            payment
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get User Payment History
// @route   GET /api/payments/my
exports.getMyPayments = async (req, res) => {
    try {
        const payments = await Payment.find({ user: req.user.id }).sort('-createdAt');
        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
