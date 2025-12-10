/**
 * 列出所有用户的脚本
 */

require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const User = require('../models/User');

const listAllUsers = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/happygames');
        console.log('Connected to MongoDB.\n');

        const users = await User.find({}, 'username email _id');
        
        if (users.length === 0) {
            console.log('No users found in database.');
        } else {
            console.log(`Found ${users.length} user(s):\n`);
            users.forEach((user, index) => {
                console.log(`${index + 1}. Username: ${user.username}`);
                console.log(`   Email: ${user.email}`);
                console.log(`   ID: ${user._id}\n`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

listAllUsers();
