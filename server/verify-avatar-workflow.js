#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

async function verifyAvatarWorkflow() {
    try {
        console.log('连接到数据库...\n');
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        const User = require('./src/models/User');
        
        // 获取所有用户
        const users = await User.find({}).select('userId username avatar').lean();
        
        console.log('=== 头像工作流验证 ===\n');
        console.log(`总用户数: ${users.length}\n`);
        
        let issuesFound = 0;
        
        users.forEach(user => {
            console.log(`用户: ${user.username}`);
            console.log(`  avatar字段: "${user.avatar}"`);
            
            // 检查 1: 头像不能为空
            if (!user.avatar || user.avatar === '') {
                console.log(`  ❌ 问题: 头像为空`);
                issuesFound++;
            } else {
                console.log(`  ✅ 头像非空`);
            }
            
            // 检查 2: 头像必须是相对路径
            if (user.avatar && !user.avatar.startsWith('/')) {
                console.log(`  ❌ 问题: 不是相对路径`);
                issuesFound++;
            } else if (user.avatar) {
                console.log(`  ✅ 是相对路径`);
            }
            
            // 检查 3: 如果不是默认头像，应该有合理的路径
            if (user.avatar && !user.avatar.includes('default-avatar') && !user.avatar.includes('/uploads/')) {
                console.log(`  ⚠️  警告: 自定义头像路径不标准`);
            }
            
            console.log();
        });
        
        if (issuesFound > 0) {
            console.log(`\n⚠️  发现 ${issuesFound} 个问题需要修复`);
        } else {
            console.log(`\n✅ 所有用户的头像都已正确配置`);
        }
        
    } catch (error) {
        console.error('错误:', error);
    } finally {
        await mongoose.disconnect();
    }
}

verifyAvatarWorkflow();
