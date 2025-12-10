/**
 * 删除 test 数据库中的所有 Dev_User_* 测试账户
 * 保留：Pi_Dev_User、dgqnu、heroskin
 */

require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const deleteDevUsers = async () => {
    try {
        console.log('Connecting to MongoDB...');
        const mongoUri = process.env.MONGO_URI;
        
        if (!mongoUri) {
            console.error('MONGO_URI not set in .env');
            process.exit(1);
        }

        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB.\n');

        const conn = mongoose.connection;
        const testDb = conn.client.db('test');

        console.log('========== DELETING DEV_USER ACCOUNTS ==========\n');

        // 获取要删除的用户列表
        const usersToDelete = await testDb.collection('users')
            .find({ username: { $regex: '^Dev_User_' } })
            .project({ _id: 1, username: 1 })
            .toArray();

        console.log(`Found ${usersToDelete.length} Dev_User_* accounts to delete.\n`);

        // 删除用户及其相关数据
        let deletedCount = 0;
        for (const user of usersToDelete) {
            const userId = user._id;
            const username = user.username;

            // 删除 usergamestats
            const statsDeleted = await testDb.collection('usergamestats').deleteMany({ userId });
            
            // 删除 wallets
            const walletDeleted = await testDb.collection('wallets').deleteMany({ user: userId });
            
            // 删除 users
            const userDeleted = await testDb.collection('users').deleteOne({ _id: userId });

            if (userDeleted.deletedCount > 0) {
                console.log(`✅ Deleted: ${username}`);
                console.log(`   - Game stats: ${statsDeleted.deletedCount} record(s)`);
                console.log(`   - Wallets: ${walletDeleted.deletedCount} record(s)`);
                deletedCount++;
            }
        }

        console.log(`\n========== DELETION COMPLETE ==========`);
        console.log(`Total deleted: ${deletedCount} accounts`);
        console.log(`\nRemaining accounts in test database:`);
        
        // 列出剩余的账户
        const remainingUsers = await testDb.collection('users')
            .find({})
            .project({ username: 1 })
            .toArray();

        console.log(`  Total: ${remainingUsers.length}`);
        for (const user of remainingUsers) {
            console.log(`  - ${user.username}`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

deleteDevUsers();
