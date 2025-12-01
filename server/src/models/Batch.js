const mongoose = require('mongoose');

const BatchSchema = new mongoose.Schema({
    batchId: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['processing', 'success', 'failed'],
        default: 'processing'
    },
    error: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 86400 // Auto-delete after 24 hours
    }
});

module.exports = mongoose.model('Batch', BatchSchema);
