const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    happyBeans: {
        type: Number,
        default: 0,
        min: 0
    },
    // Platform does not hold Pi for users. 
    // Pi is only held in the Eco Pool (System Wallet).
    // Users only have Happy Beans.
    totalCommissionEarned: { type: Number, default: 0 }, // In Beans
    withdrawalAddress: { type: String, default: '' }, // User's external Pi Wallet Address
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Wallet', WalletSchema);
