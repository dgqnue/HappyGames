/**
 * 检查应用启动时连接的数据库
 */

require('dotenv').config({ path: './.env' });

console.log('\n========== ENVIRONMENT VARIABLES CHECK ==========\n');
console.log(`MONGO_URI: ${process.env.MONGO_URI ? '✓ 已设置' : '✗ 未设置'}`);
if (process.env.MONGO_URI) {
    const uri = process.env.MONGO_URI;
    const match = uri.match(/\/([^/?]+)\?/);
    const dbName = match ? match[1] : 'unknown';
    console.log(`Database in URI: ${dbName}`);
    console.log(`Full URI: ${uri.substring(0, 80)}...`);
}

console.log(`\nMONGODB_URI: ${process.env.MONGODB_URI ? '✓ 已设置' : '✗ 未设置'}`);

console.log('\n========== TESTING CONNECTION ==========\n');

const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        const conn = mongoose.connection;
        console.log(`✅ Connected to MongoDB`);
        const admin = conn.db.admin();
        const serverStatus = await admin.serverStatus();
        console.log(`   Database: ${serverStatus.host.split(':')[0]}`);
        console.log(`   Host: ${conn.host}`);
        
        // 测试模型
        const User = require('./src/models/User');
        console.log(`\n✓ User model loaded`);
        console.log(`  Collection: ${User.collection.name}`);
        
        // 列出这个连接的所有数据库
        const dbs = await admin.listDatabases();
        const currentDb = process.env.MONGO_URI.match(/\/([^/?]+)\?/)[1];
        console.log(`  Using database: ${currentDb}`);
        
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Connection failed:', err.message);
        process.exit(1);
    });
