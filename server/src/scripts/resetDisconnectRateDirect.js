/**
 * 直接重置掉线率 - 基于完整用户名列表
 * 使用方法: node resetDisconnectRateDirect.js dgqnu heroskin
 */

require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const UserGameStats = require('../models/UserGameStats');

const resetDisconnectRate = async (usernames) => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.\n');

        for (const username of usernames) {
            console.log(`\n========== User: ${username} ==========`);
            
            // 1. 精确查找用户（区分大小写）
            let user = await User.findOne({ username: username });
            
            // 2. 如果找不到，尝试不区分大小写的搜索
            if (!user) {
                console.log(`Exact match not found. Trying case-insensitive search...`);
                user = await User.findOne({ username: new RegExp(`^${username}$`, 'i') });
            }
            
            if (!user) {
                console.log(`❌ User "${username}" not found in database`);
                console.log(`   Tried: exact match and case-insensitive search`);
                continue;
            }

            console.log(`✅ Found user: ${user.username} (ID: ${user._id})`);

            // 3. 查询并重置所有游戏统计
            const stats = await UserGameStats.find({ userId: user._id });
            
            if (stats.length === 0) {
                console.log(`   No game stats found`);
            } else {
                console.log(`   Found ${stats.length} game stat(s):`);
                
                for (const stat of stats) {
                    console.log(`\n   Game: ${stat.gameType}`);
                    console.log(`   Before: gamesPlayed=${stat.gamesPlayed}, disconnects=${stat.disconnects}, rate=${stat.disconnectRate}%`);
                    
                    // 重置
                    stat.disconnects = 0;
                    stat.disconnectRate = 0;
                    await stat.save();
                    
                    console.log(`   After:  gamesPlayed=${stat.gamesPlayed}, disconnects=${stat.disconnects}, rate=${stat.disconnectRate}%`);
                    console.log(`   ✅ Reset complete!`);
                }
            }
        }

        console.log(`\n\n========== Done ==========`);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
};

const usernames = process.argv.slice(2);
if (usernames.length === 0) {
    console.log('Usage: node resetDisconnectRateDirect.js <username1> <username2> ...');
    console.log('Example: node resetDisconnectRateDirect.js dgqnu heroskin');
    process.exit(1);
}

resetDisconnectRate(usernames);
