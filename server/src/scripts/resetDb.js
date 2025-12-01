require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const Wallet = require('../models/Wallet');

const resetDb = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/happygames');
        console.log('Connected.');

        console.log('Clearing Users...');
        await User.deleteMany({});

        console.log('Clearing Wallets...');
        await Wallet.deleteMany({});

        console.log('Database cleared successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error clearing database:', error);
        process.exit(1);
    }
};

resetDb();
