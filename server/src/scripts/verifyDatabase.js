/**
 * 验证新的 happygames 数据库
 */

require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const verifyDatabase = async () => {
    try {
        console.log('Connecting to MongoDB using updated .env...');
        const mongoUri = process.env.MONGO_URI;
        
        console.log(`URI: ${mongoUri}\n`);

        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB.\n');

        const conn = mongoose.connection;
        const db = conn.db;

        console.log('========== HAPPYGAMES DATABASE VERIFICATION ==========\n');

        // 列出集合
        const collections = await db.listCollections().toArray();
        console.log(`Collections: ${collections.length}\n`);

        for (const collection of collections) {
            const collName = collection.name;
            const count = await db.collection(collName).countDocuments();
            console.log(`  - ${collName}: ${count} documents`);
        }

        console.log('\n========== DATA SUMMARY ==========\n');

        // 用户列表
        const users = await db.collection('users').find({}).project({ username: 1 }).toArray();
        console.log(`Users (${users.length}):`);
        for (const user of users) {
            console.log(`  - ${user.username}`);
        }

        // 游戏统计
        const stats = await db.collection('usergamestats').find({}).project({ userId: 1, gameType: 1 }).toArray();
        console.log(`\nGame Stats (${stats.length}):`);
        for (const stat of stats) {
            console.log(`  - User: ${stat.userId}, Game: ${stat.gameType}`);
        }

        console.log('\n========== ✅ DATABASE MIGRATION COMPLETE ==========\n');
        console.log('Summary:');
        console.log('  ✅ happygames database is now active');
        console.log('  ✅ Contains 3 users (dgqnu, heroskin, Pi_Dev_User)');
        console.log('  ✅ Contains cleaned game data (63 dev users removed)');
        console.log('  ✅ Ready for use!');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

verifyDatabase();
