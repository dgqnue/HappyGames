const mongoose = require('mongoose');

const GameRecordSchema = new mongoose.Schema({
    gameType: {
        type: String,
        required: true // e.g., 'poker', 'mahjong'
    },
    roomId: {
        type: String,
        required: true
    },
    baseBeans: {
        type: Number,
        required: true
    },
    platformFee: {
        type: Number,
        required: true
    },
    players: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String }, // 'winner', 'loser'
        change: { type: Number }, // + or - beans
        commissionContribution: { type: Number, default: 0 }
    }],
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: {
        type: Date
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'aborted'],
        default: 'active'
    }
});

module.exports = mongoose.model('GameRecord', GameRecordSchema);
