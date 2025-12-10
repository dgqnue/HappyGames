/**
 * 重置用户的掉线率数据脚本
 * 
 * 使用方法：
 * node resetDisconnectRate.js <username1> <username2> ...
 * 
 * 示例：
 * node resetDisconnectRate.js user1 user2
 */

require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const UserGameStats = require('../models/UserGameStats');

const resetDisconnectRateByUsername = async (usernames) => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/happygames');
        console.log('Connected to MongoDB.\n');

        for (const username of usernames) {
            console.log(`\n========== Processing user: ${username} ==========`);
            
            // 查找用户
            const user = await User.findOne({ username });
            if (!user) {
                console.log(`❌ User "${username}" not found.`);
                continue;
            }

            console.log(`✅ Found user: ${username} (ID: ${user._id})`);

            // 查找该用户的所有游戏统计
            const stats = await UserGameStats.find({ userId: user._id });
            if (stats.length === 0) {
                console.log(`   No game stats found for this user.`);
                continue;
            }

            // 重置每个游戏的掉线数据
            for (const stat of stats) {
                console.log(`\n   Game Type: ${stat.gameType}`);
                console.log(`   Before: gamesPlayed=${stat.gamesPlayed}, disconnects=${stat.disconnects}, disconnectRate=${stat.disconnectRate}%`);

                // 重置掉线数据
                stat.disconnects = 0;
                stat.disconnectRate = 0;
                await stat.save();

                console.log(`   After:  gamesPlayed=${stat.gamesPlayed}, disconnects=${stat.disconnects}, disconnectRate=${stat.disconnectRate}%`);
                console.log(`   ✅ Reset successful!`);
            }
        }

        console.log(`\n\n========== All users processed ==========`);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

// 从命令行参数获取用户名
const usernames = process.argv.slice(2);
if (usernames.length === 0) {
    console.log('Usage: node resetDisconnectRate.js <username1> <username2> ...');
    console.log('Example: node resetDisconnectRate.js player1 player2');
    process.exit(1);
}

resetDisconnectRateByUsername(usernames);
