#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

async function fixEmptyAvatars() {
    try {
        console.log('连接到数据库...');
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        const User = require('./src/models/User');
        
        // 找到所有avatar为空或undefined的用户
        const result = await User.updateMany(
            { 
                $or: [
                    { avatar: '' },
                    { avatar: null },
                    { avatar: undefined },
                    { avatar: { $exists: false } }
                ]
            },
            { avatar: '/images/default-avatar.png' }
        );

        console.log('修复结果:');
        console.log(`  匹配用户数: ${result.matchedCount}`);
        console.log(`  修改用户数: ${result.modifiedCount}`);

        // 验证修复
        const emptyAvatars = await User.countDocuments({ 
            $or: [
                { avatar: '' },
                { avatar: null },
                { avatar: undefined },
                { avatar: { $exists: false } }
            ]
        });

        console.log(`\n验证: 仍有 ${emptyAvatars} 个用户的avatar为空`);

        // 显示所有用户的avatar
        const users = await User.find({}).select('userId username avatar').lean();
        console.log('\n=== 修复后的所有用户头像 ===\n');
        users.forEach(user => {
            console.log(`${user.username}: ${user.avatar || '(空)'}`);
        });
        
    } catch (error) {
        console.error('错误:', error);
    } finally {
        await mongoose.disconnect();
    }
}

fixEmptyAvatars();
