#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

async function checkUserAvatars() {
    try {
        console.log('连接到数据库...');
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        const User = require('./src/models/User');
        
        // 获取所有用户及其头像
        const users = await User.find({}).select('userId username avatar').limit(20).lean();
        
        console.log('\n=== 用户头像检查 ===\n');
        users.forEach(user => {
            console.log(`用户: ${user.username}`);
            console.log(`  avatar: ${user.avatar}`);
            console.log(`  是默认: ${user.avatar?.includes('default-avatar') ? '是' : '否'}`);
            console.log(`  是相对路径: ${user.avatar?.startsWith('/') ? '是' : '否'}`);
            console.log();
        });

        console.log(`\n总共检查了 ${users.length} 个用户`);
        
    } catch (error) {
        console.error('错误:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkUserAvatars();
