const mongoose = require('mongoose');

const UserGameStatsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    gameType: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        default: 1200
    },
    gamesPlayed: {
        type: Number,
        default: 0
    },
    wins: {
        type: Number,
        default: 0
    },
    losses: {
        type: Number,
        default: 0
    },
    draws: {
        type: Number,
        default: 0
    },
    disconnects: {
        type: Number,
        default: 0
    },
    lastPlayedAt: {
        type: Date,
        default: Date.now
    },
    title: {
        type: String,
        default: '初出茅庐'
    },
    titleRank: {
        type: Number,
        default: 1 // 1-10
    },
    titleColor: {
        type: String,
        default: '#000000'
    }
});

// Compound index for quick lookup
UserGameStatsSchema.index({ userId: 1, gameType: 1 }, { unique: true });

module.exports = mongoose.model('UserGameStats', UserGameStatsSchema);
