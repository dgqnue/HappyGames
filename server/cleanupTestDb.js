#!/usr/bin/env node
/**
 * 清理 test 数据库
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function cleanupTestDb() {
    try {
        console.log('🔍 连接到 MongoDB...');
        
        // 连接到 MongoDB
        await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://HappyGames_db_user:HappyGames888!@happygames.ao5zdwu.mongodb.net/happygames?appName=HappyGames');
        
        console.log('✅ 已连接到 MongoDB\n');
        
        // 获取管理员连接
        const admin = mongoose.connection.db.admin();
        
        // 列出所有数据库
        console.log('📋 当前数据库列表:');
        const databases = await admin.listDatabases();
        databases.databases.forEach(db => {
            console.log(`  - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
        });
        
        // 检查 test 数据库是否存在
        const testDbExists = databases.databases.some(db => db.name === 'test');
        
        if (testDbExists) {
            console.log('\n🗑️  删除 test 数据库...');
            const testDb = mongoose.connection.db.db('test');
            await testDb.dropDatabase();
            console.log('✅ test 数据库已删除\n');
            
            // 验证删除
            const newDatabases = await admin.listDatabases();
            console.log('📋 删除后的数据库列表:');
            newDatabases.databases.forEach(db => {
                console.log(`  - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
            });
        } else {
            console.log('\n✅ test 数据库不存在，无需删除');
        }
        
        await mongoose.connection.close();
        console.log('\n✅ 清理完成!');
        
    } catch (error) {
        console.error('❌ 清理失败:', error.message);
        process.exit(1);
    }
}

cleanupTestDb();
