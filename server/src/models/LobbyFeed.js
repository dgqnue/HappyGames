const mongoose = require('mongoose');

const LobbyFeedSchema = new mongoose.Schema({
    type: { type: String, required: true }, // 'join', 'game_win', 'deposit', etc.
    user: { type: String, required: true }, // Nickname
    game: { type: String },
    title: { type: String },
    titleColor: { type: String },
    amount: { type: Number },
    timestamp: { type: Date, default: Date.now }
});

// Index for sorting and limiting
LobbyFeedSchema.index({ timestamp: -1 });

module.exports = mongoose.model('LobbyFeed', LobbyFeedSchema);
