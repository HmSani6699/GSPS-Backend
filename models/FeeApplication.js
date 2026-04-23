const mongoose = require('mongoose');

const feeApplicationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    feeType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FeeType',
        required: true
    },
    feeTypeName: {
        type: String,
        required: true
    },
    country: {
        type: String,
        required: true
    },
    paymentLink: {
        type: String,
        required: true
    },
    portalAccess: {
        type: String,
        required: true
    },
    initialAmount: {
        type: Number
    },
    finalAmount: {
        type: Number
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Completed', 'Rejected'],
        default: 'Pending'
    },
    rejectionReason: {
        type: String
    },
    invoiceUrl: {
        type: String
    },
    payment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment'
    }
}, { timestamps: true });

module.exports = mongoose.model('FeeApplication', feeApplicationSchema);
