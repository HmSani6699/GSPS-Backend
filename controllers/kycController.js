const KYC = require('../models/KYC');
const User = require('../models/User');

// @desc    Submit KYC
// @route   POST /api/kyc/submit
exports.submitKYC = async (req, res) => {
    try {
        const { studentName, whatsappNumber } = req.body;
        
        const existingKYC = await KYC.findOne({ user: req.user.id });
        if (existingKYC && existingKYC.status !== 'rejected') {
            return res.status(400).json({ message: 'KYC already submitted or approved' });
        }

        const kycData = {
            user: req.user.id,
            studentName,
            whatsappNumber,
            documents: {
                studentPhoto: req.files['studentPhoto'] ? req.files['studentPhoto'][0].path : null,
                passportFile: req.files['passportFile'] ? req.files['passportFile'][0].path : null,
                visaFile: req.files['visaFile'] ? req.files['visaFile'][0].path : null,
                universityDocument: req.files['universityDocument'] ? req.files['universityDocument'][0].path : null,
                gobDocument: req.files['gobDocument'] ? req.files['gobDocument'][0].path : null
            }
        };

        let kyc;
        if (existingKYC) {
            // Update rejected KYC
            kyc = await KYC.findByIdAndUpdate(existingKYC._id, kycData, { new: true });
        } else {
            kyc = await KYC.create(kycData);
        }

        // Update user KYC status
        await User.findByIdAndUpdate(req.user.id, { 
            kycStatus: 'pending',
            kycData: kyc._id 
        });

        res.status(201).json({
            message: 'KYC submitted successfully',
            kyc
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get User KYC Status
// @route   GET /api/kyc/status
exports.getKYCStatus = async (req, res) => {
    try {
        const kyc = await KYC.findOne({ user: req.user.id });
        if (!kyc) {
            return res.json({ status: 'none' });
        }
        res.json(kyc);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
