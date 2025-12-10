/**
 * 列出 test 数据库中所有用户
 */

require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const listAllUsersInTestDb = async () => {
    try {
        console.log('Connecting to MongoDB...');
        const mongoUri = process.env.MONGO_URI;
        
        if (!mongoUri) {
            console.error('MONGO_URI not set in .env');
            process.exit(1);
        }

        await mongoose.connect(mongoUri);
        
        const conn = mongoose.connection;
        const testDb = conn.client.db('test');

        console.log('========== ALL USERS IN TEST DATABASE ==========\n');

        const users = await testDb.collection('users').find({}, { projection: { username: 1 } }).sort({ _id: 1 }).toArray();
        
        console.log(`Total users: ${users.length}\n`);
        
        for (let i = 0; i < users.length; i++) {
            console.log(`${i + 1}. ${users[i].username}`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

listAllUsersInTestDb();
