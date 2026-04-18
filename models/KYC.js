const mongoose = require('mongoose');

const kycSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    studentName: {
        type: String,
        required: true
    },
    whatsappNumber: {
        type: String,
        required: true
    },
    documents: {
        studentPhoto: String,
        passportFile: String,
        visaFile: String,
        universityDocument: String,
        gobDocument: String
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    rejectionReason: String
}, { timestamps: true });

module.exports = mongoose.model('KYC', kycSchema);
