#!/usr/bin/env node
const mongoose = require('mongoose');
require('dotenv').config();

async function deleteTestDb() {
    try {
        console.log('🔍 连接到 MongoDB...');
        
        await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://HappyGames_db_user:HappyGames888!@happygames.ao5zdwu.mongodb.net/happygames?appName=HappyGames');
        
        console.log('✅ 已连接\n');
        
        const admin = mongoose.connection.db.admin();
        
        // 列出数据库
        const result = await admin.listDatabases();
        console.log('📋 当前数据库:');
        result.databases.forEach(db => {
            console.log(`  - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
        });
        
        // 删除 test 数据库
        const testExists = result.databases.some(db => db.name === 'test');
        if (testExists) {
            console.log('\n🗑️  删除 test 数据库...');
            await admin.dropDatabase('test');
            console.log('✅ test 数据库已删除\n');
            
            // 验证
            const newResult = await admin.listDatabases();
            console.log('📋 删除后的数据库:');
            newResult.databases.forEach(db => {
                console.log(`  - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
            });
        } else {
            console.log('\n✅ test 数据库不存在');
        }
        
        await mongoose.connection.close();
        console.log('\n✅ 完成!');
        
    } catch (error) {
        console.error('❌ 失败:', error.message);
        process.exit(1);
    }
}

deleteTestDb();
