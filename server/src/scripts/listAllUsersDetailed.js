/**
 * 列出数据库中所有用户的详细信息
 */

require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const UserGameStats = require('../models/UserGameStats');

const listAllUsersDetailed = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.\n');

        // 查询所有用户
        const users = await User.find({}).lean();
        
        console.log(`========== ALL USERS (Total: ${users.length}) ==========\n`);
        
        if (users.length === 0) {
            console.log('No users found in database.');
        } else {
            for (let i = 0; i < users.length; i++) {
                const user = users[i];
                console.log(`${i + 1}. ==============================`);
                console.log(`   username: "${user.username}"`);
                console.log(`   email: "${user.email}"`);
                console.log(`   nickname: "${user.nickname}"`);
                console.log(`   piUsername: "${user.piUsername}"`);
                console.log(`   _id: ${user._id}`);
                
                // 查询该用户的游戏统计
                const stats = await UserGameStats.find({ userId: user._id }).lean();
                console.log(`   game stats: ${stats.length} records`);
                
                for (const stat of stats) {
                    console.log(`     - ${stat.gameType}: games=${stat.gamesPlayed}, disconnects=${stat.disconnects}, rate=${stat.disconnectRate}%`);
                }
                
                console.log('');
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

listAllUsersDetailed();
