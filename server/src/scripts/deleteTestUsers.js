/**
 * 删除指定的测试用户
 * 使用方法: node deleteTestUsers.js
 */

require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const UserGameStats = require('../models/UserGameStats');
const Wallet = require('../models/Wallet');

const deleteTestUsers = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.\n');

        const testUsernames = [
            'Pi_Dev_User',
            'testtesttest2',
            'test2test2',
            'testusertestusertestuser'
        ];

        console.log(`========== Deleting ${testUsernames.length} test users ==========\n`);

        for (const username of testUsernames) {
            console.log(`Deleting user: ${username}`);
            
            // 查找用户
            const user = await User.findOne({ username });
            
            if (!user) {
                console.log(`  ✓ User not found (already deleted or doesn't exist)\n`);
                continue;
            }

            const userId = user._id;

            // 删除相关的游戏统计
            const statsDeleted = await UserGameStats.deleteMany({ userId });
            console.log(`  ✓ Deleted ${statsDeleted.deletedCount} game stat record(s)`);

            // 删除相关的钱包
            const walletDeleted = await Wallet.deleteMany({ userId });
            console.log(`  ✓ Deleted ${walletDeleted.deletedCount} wallet record(s)`);

            // 删除用户
            const userDeleted = await User.deleteOne({ _id: userId });
            console.log(`  ✓ Deleted user "${username}"`);
            console.log('');
        }

        console.log('========== Done ==========');
        console.log('\nAll test users have been deleted.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

deleteTestUsers();
