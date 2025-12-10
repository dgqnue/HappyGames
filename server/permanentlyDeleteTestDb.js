#!/usr/bin/env node
/**
 * 永久删除 test 数据库
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function deleteTestDatabase() {
    const client = new MongoClient(process.env.MONGO_URI);
    
    try {
        console.log('🔍 连接到 MongoDB...');
        await client.connect();
        console.log('✅ 已连接\n');
        
        const admin = client.db().admin();
        
        // 列出现有数据库
        const before = await admin.listDatabases();
        console.log('📋 删除前的数据库:');
        before.databases.forEach(db => {
            console.log(`  - ${db.name}`);
        });
        
        // 删除 test 数据库
        console.log('\n🗑️  正在删除 test 数据库...');
        const testDb = client.db('test');
        await testDb.dropDatabase();
        console.log('✅ test 数据库已删除\n');
        
        // 验证删除
        const after = await admin.listDatabases();
        console.log('📋 删除后的数据库:');
        after.databases.forEach(db => {
            console.log(`  - ${db.name}`);
        });
        
        const testStillExists = after.databases.some(db => db.name === 'test');
        if (!testStillExists) {
            console.log('\n✅ 确认: test 数据库已完全删除');
        }
        
        await client.close();
        console.log('\n✅ 完成!');
        
    } catch (error) {
        console.error('❌ 失败:', error.message);
        process.exit(1);
    }
}

deleteTestDatabase();
