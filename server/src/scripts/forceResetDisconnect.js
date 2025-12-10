/**
 * 强制重置用户掉线率 - 绕过查询问题
 * 使用方法: node forceResetDisconnect.js dgqnu heroskin
 */

require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const UserGameStats = require('../models/UserGameStats');

const forceResetDisconnect = async (usernames) => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.\n');

        for (const username of usernames) {
            console.log(`\n========== Resetting: ${username} ==========`);
            
            try {
                // 使用原生 MongoDB 查询
                const user = await User.collection.findOne({ username: username });
                
                if (!user) {
                    console.log(`❌ User "${username}" not found`);
                    continue;
                }

                console.log(`✅ Found user: ${user.username} (ID: ${user._id})`);

                // 使用原生更新重置所有该用户的游戏统计中的掉线率
                const updateResult = await UserGameStats.collection.updateMany(
                    { userId: user._id },
                    {
                        $set: {
                            disconnects: 0,
                            disconnectRate: 0
                        }
                    }
                );

                console.log(`✅ Updated ${updateResult.modifiedCount} game stat record(s)`);
                console.log(`   disconnects: 0`);
                console.log(`   disconnectRate: 0%`);

            } catch (error) {
                console.log(`❌ Error processing ${username}: ${error.message}`);
            }
        }

        console.log(`\n========== Done ==========`);
        process.exit(0);
    } catch (error) {
        console.error('Fatal Error:', error.message);
        process.exit(1);
    }
};

const usernames = process.argv.slice(2);
if (usernames.length === 0) {
    console.log('Usage: node forceResetDisconnect.js <username1> <username2> ...');
    console.log('Example: node forceResetDisconnect.js dgqnu heroskin');
    process.exit(1);
}

forceResetDisconnect(usernames);
