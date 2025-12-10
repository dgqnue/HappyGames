/**
 * 检查 test 数据库中的用户
 */

require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const checkTestDb = async () => {
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
        
        // 切换到 test 数据库
        const testDb = conn.client.db('test');

        console.log('========== TEST DATABASE ==========\n');

        // 列出 test 数据库的所有集合
        const collections = await testDb.listCollections().toArray();
        console.log(`Collections in "test" database: ${collections.length}\n`);
        
        for (const collection of collections) {
            console.log(`Collection: ${collection.name}`);
            
            const count = await testDb.collection(collection.name).countDocuments();
            console.log(`  Document count: ${count}`);
            
            // 如果是 users 集合，显示所有用户名
            if (collection.name === 'users') {
                const users = await testDb.collection('users').find({}, { projection: { username: 1, _id: 1 } }).toArray();
                console.log(`  Users:`);
                for (const user of users) {
                    console.log(`    - ${user.username} (ID: ${user._id})`);
                }
            }
            
            console.log('');
        }

        console.log('Done.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

checkTestDb();
