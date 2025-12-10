#!/usr/bin/env node
/**
 * 测试改进的数据库检测方法
 * 使用 mongoose.connection.name 而不是 databaseName
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function testNewDbDetection() {
    try {
        console.log('🔍 连接到 MongoDB...');
        
        // 连接到 MongoDB
        await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://HappyGames_db_user:HappyGames888!@happygames.ao5zdwu.mongodb.net/happygames?appName=HappyGames');
        
        console.log('✅ 已连接到 MongoDB\n');
        
        // 测试各种方法
        const expectedDbName = process.env.MONGO_URI?.match(/\/([^/?]+)\?/)?.[1] || 'happygames';
        const connectionName = mongoose.connection.name;
        const databaseName = mongoose.connection.db?.databaseName;
        const currentDbImproved = mongoose.connection.name || mongoose.connection.db?.databaseName || expectedDbName;
        
        console.log('📊 数据库检测结果:');
        console.log(`  期望的数据库名: ${expectedDbName}`);
        console.log(`  connection.name: ${connectionName}`);
        console.log(`  db.databaseName: ${databaseName}`);
        console.log(`  使用改进方法(connection.name || db.databaseName || expected): ${currentDbImproved}`);
        
        // 测试检查逻辑
        console.log('\n🔐 检查逻辑:');
        const checkPassed = !mongoose.connection.name || mongoose.connection.name === expectedDbName;
        console.log(`  mongoose.connection.name 存在? ${!!mongoose.connection.name}`);
        console.log(`  connection.name === expectedDbName? ${mongoose.connection.name === expectedDbName}`);
        console.log(`  检查通过? ${checkPassed}`);
        
        if (checkPassed) {
            console.log('\n✅ 数据库检测通过!');
        } else {
            console.log('\n❌ 数据库检测失败!');
            console.log(`  当前数据库: ${currentDbImproved}`);
            console.log(`  期望数据库: ${expectedDbName}`);
        }
        
        // 测试原来的方法会怎样
        console.log('\n⚠️  原来的方法 (databaseName):');
        const oldMethod = mongoose.connection.db?.databaseName || 'unknown';
        console.log(`  获取到的值: ${oldMethod}`);
        if (oldMethod === 'unknown') {
            console.log(`  ❌ 原方法返回 unknown, 这可能导致错误检查被跳过!`);
        }
        
        // 获取所有数据库列表
        console.log('\n📋 MongoDB 服务器上的所有数据库:');
        const admin = mongoose.connection.db.admin();
        const databases = await admin.listDatabases();
        databases.databases.forEach(db => {
            console.log(`  - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
        });
        
        await mongoose.connection.close();
        console.log('\n✅ 测试完成!');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        process.exit(1);
    }
}

testNewDbDetection();
