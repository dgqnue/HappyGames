/**
 * 在指定数据库中重置用户的掉线率
 */

require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const resetDisconnectInDb = async (dbName, usernames) => {
    try {
        console.log(`Connecting to MongoDB (database: ${dbName})...`);
        const mongoUri = process.env.MONGO_URI;
        
        if (!mongoUri) {
            console.error('MONGO_URI not set in .env');
            process.exit(1);
        }

        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB.\n');

        const conn = mongoose.connection;
        const targetDb = conn.client.db(dbName);

        console.log(`========== Resetting disconnect rates in "${dbName}" database ==========\n`);

        for (const username of usernames) {
            console.log(`Processing user: ${username}`);
            
            // 在目标数据库中查找用户
            const user = await targetDb.collection('users').findOne({ username });
            
            if (!user) {
                console.log(`  ❌ User not found`);
                continue;
            }

            console.log(`  ✅ Found user (ID: ${user._id})`);

            // 在目标数据库的 usergamestats 中更新
            const updateResult = await targetDb.collection('usergamestats').updateMany(
                { userId: user._id },
                {
                    $set: {
                        disconnects: 0,
                        disconnectRate: 0
                    }
                }
            );

            console.log(`  ✅ Updated ${updateResult.modifiedCount} game stat record(s)`);
            console.log(`     disconnects: 0`);
            console.log(`     disconnectRate: 0%\n`);
        }

        console.log('========== Done ==========');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

const dbName = process.argv[2] || 'test';
const usernames = process.argv.slice(3);

if (usernames.length === 0) {
    console.log('Usage: node resetDisconnectInDb.js <database_name> <username1> <username2> ...');
    console.log('Example: node resetDisconnectInDb.js test dgqnu heroskin');
    process.exit(1);
}

resetDisconnectInDb(dbName, usernames);
