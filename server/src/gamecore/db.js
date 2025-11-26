const mongoose = require('mongoose');
const User = require('../models/User');
const Batch = require('../models/Batch');
const Wallet = require('../models/Wallet'); // Assuming Wallet model exists or we use User.beans

// Wrapper to match the user's requested API: db.users, db.batches, db.startSession
module.exports = {
    users: User,
    batches: Batch,
    // If Wallet model is separate, export it too, otherwise we might need to adjust wallet.js
    // The user's wallet.js example used db.users.updateOne for beans, so User model is likely sufficient for balance.
    // However, if there is a separate Wallet model, we should include it.
    // Let's check if Wallet.js exists in models. Yes it does.
    wallets: Wallet,

    // Helper to start a session
    startSession: () => mongoose.startSession(),

    // Helper for platform profit (mocked for now as we don't have a Platform model yet)
    platform: {
        updateOne: async (filter, update, options) => {
            // TODO: Implement actual Platform model
            // console.log('Platform profit update:', update);
            return { nModified: 1 };
        }
    }
};
