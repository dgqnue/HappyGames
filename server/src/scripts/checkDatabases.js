/**
 * 连接到 MongoDB 并列出所有数据库及其用户
 */

require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const checkAllDatabases = async () => {
    try {
        console.log('Connecting to MongoDB...');
        const mongoUri = process.env.MONGO_URI;
        
        if (!mongoUri) {
            console.error('MONGO_URI not set in .env');
            process.exit(1);
        }

        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB.\n');

        // 获取当前连接
        const conn = mongoose.connection;
        const db = conn.db;

        // 列出所有数据库
        console.log('========== DATABASES ==========');
        const adminDb = db.admin();
        const result = await adminDb.listDatabases();
        
        console.log(`Total databases: ${result.databases.length}\n`);
        
        for (const database of result.databases) {
            console.log(`Database: ${database.name}`);
            console.log(`Size: ${(database.sizeOnDisk / 1024 / 1024).toFixed(2)} MB\n`);
        }

        // 列出当前数据库的所有集合
        console.log('\n========== COLLECTIONS IN CURRENT DB ==========');
        const collections = await db.listCollections().toArray();
        console.log(`Total collections: ${collections.length}\n`);
        
        for (const collection of collections) {
            console.log(`Collection: ${collection.name}`);
            
            // 如果是 users 或 usergamestats 集合，显示文档数
            if (collection.name === 'users' || collection.name === 'usergamestats') {
                const count = await db.collection(collection.name).countDocuments();
                console.log(`  Document count: ${count}`);
                
                // 列出所有用户名或统计
                if (collection.name === 'users') {
                    const users = await db.collection('users').find({}, { projection: { username: 1 } }).toArray();
                    console.log(`  Usernames:`);
                    for (const user of users) {
                        console.log(`    - ${user.username}`);
                    }
                }
            }
            console.log('');
        }

        console.log('Done.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        console.error(error);
        process.exit(1);
    }
};

checkAllDatabases();
