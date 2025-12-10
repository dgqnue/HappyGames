/**
 * 原始列出数据库中所有用户名
 */

require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const User = require('../models/User');

const listAllUsernames = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.\n');

        // 获取所有用户，只取 username 字段
        const users = await User.find({}, 'username _id').lean();
        
        console.log(`Found ${users.length} users:\n`);
        
        for (let i = 0; i < users.length; i++) {
            console.log(`${i + 1}. username="${users[i].username}" (ID: ${users[i]._id})`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

listAllUsernames();
