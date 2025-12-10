/**
 * 使用正则表达式搜索用户
 * 可以搜索 username、nickname、email 等字段
 */

require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const UserGameStats = require('../models/UserGameStats');

const searchUsers = async (searchTerm) => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB.\n');

        // 创建不区分大小写的正则表达式
        const regex = new RegExp(searchTerm, 'i');

        // 在多个字段中搜索
        const users = await User.find({
            $or: [
                { username: regex },
                { nickname: regex },
                { piUsername: regex },
                { email: regex }
            ]
        });

        if (users.length === 0) {
            console.log(`No users found matching "${searchTerm}"`);
        } else {
            console.log(`Found ${users.length} user(s) matching "${searchTerm}":\n`);
            
            for (const user of users) {
                console.log(`========== User ==========`);
                console.log(`Username: ${user.username}`);
                console.log(`Nickname: ${user.nickname}`);
                console.log(`piUsername: ${user.piUsername}`);
                console.log(`Email: ${user.email}`);
                console.log(`ID: ${user._id}`);
                
                // 查询游戏统计
                const stats = await UserGameStats.find({ userId: user._id });
                console.log(`\nGame Stats:`);
                
                if (stats.length === 0) {
                    console.log(`  (None)`);
                } else {
                    for (const stat of stats) {
                        console.log(`  ${stat.gameType}:`);
                        console.log(`    Games: ${stat.gamesPlayed}`);
                        console.log(`    Disconnects: ${stat.disconnects}`);
                        console.log(`    Disconnect Rate: ${stat.disconnectRate}%`);
                    }
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

const searchTerm = process.argv[2];
if (!searchTerm) {
    console.log('Usage: node searchUsers.js <search_term>');
    console.log('Example: node searchUsers.js dgqnu');
    process.exit(1);
}

searchUsers(searchTerm);
