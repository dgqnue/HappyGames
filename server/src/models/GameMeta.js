const mongoose = require('mongoose');

const GameMetaSchema = new mongoose.Schema({
    gameType: {
        type: String,
        required: true,
        unique: true
    },
    muDynamic: {
        type: Number,
        default: 1200 // Default to starting rating if no data
    },
    pendingMuDynamic: { // For the 11:00 calc, 12:00 effective logic
        type: Number
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('GameMeta', GameMetaSchema);
