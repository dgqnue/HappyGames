const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    piId: { type: String, unique: true, sparse: true }, // Pi Network UID
    nickname: { type: String, default: '' },
    avatar: { type: String, default: '' }, // URL from Pi Profile
    referralCode: {
        type: String,
        unique: true
    },
    referrer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    referralLevel: {
        type: Number,
        default: 1, // Lv1 - Lv5
        min: 1,
        max: 5
    },
    referralStats: {
        inviteCount: { type: Number, default: 0 },
        totalFlow: { type: Number, default: 0 } // Total betting volume of direct referrals
    },
    isInvited: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', UserSchema);
