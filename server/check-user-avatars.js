#!/usr/bin/env node

/**
 * 用户头像检查脚本
 * 该脚本用于连接到数据库并检查用户的头像信息。
 *
 * 使用方法：
 * 1. 确保已设置环境变量 MONGO_URI。
 * 2. 运行脚本以检查用户头像的状态。
 */

require('dotenv').config(); // 加载环境变量配置
const mongoose = require('mongoose'); // 导入 Mongoose 库

const MONGO_URI = process.env.MONGO_URI; // 从环境变量中获取 MongoDB 的连接 URI

/**
 * 检查用户头像
 * 连接到数据库，获取用户信息并检查头像的状态。
 */
async function checkUserAvatars() {
    try {
        console.log('连接到数据库...');
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true, // 使用新的 URL 解析器
            useUnifiedTopology: true // 使用统一的拓扑结构
        });

        const User = require('./src/models/User'); // 导入用户模型
        
        // 获取所有用户及其头像信息
        const users = await User.find({})
            .select('userId username avatar') // 仅选择 userId、username 和 avatar 字段
            .limit(20) // 限制返回的用户数量为 20
            .lean(); // 返回 JavaScript 对象而不是 Mongoose 文档
        
        console.log('\n=== 用户头像检查 ===\n');
        users.forEach(user => {
            console.log(`用户: ${user.username}`); // 输出用户名
            console.log(`  avatar: ${user.avatar}`); // 输出用户头像
            console.log(`  是默认: ${user.avatar?.includes('default-avatar') ? '是' : '否'}`); // 检查是否为默认头像
            console.log(`  是相对路径: ${user.avatar?.startsWith('/') ? '是' : '否'}`); // 检查头像是否为相对路径
            console.log();
        });

        console.log(`\n总共检查了 ${users.length} 个用户`); // 输出检查的用户总数
        
    } catch (error) {
        console.error('错误:', error); // 捕获并输出错误信息
    } finally {
        await mongoose.disconnect(); // 断开数据库连接
    }
}

checkUserAvatars(); // 调用函数执行检查
