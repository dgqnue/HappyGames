#!/usr/bin/env node
/**
 * 完整的诊断脚本 - 检查数据库连接和模型状态
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function diagnoseDbIssue() {
    try {
        console.log('🔍 === 完整诊断开始 ===\n');
        
        // 1. 检查环境变量
        console.log('📋 1. 环境变量检查:');
        console.log(`  MONGO_URI: ${process.env.MONGO_URI ? '已设置' : '未设置'}`);
        if (process.env.MONGO_URI) {
            const match = process.env.MONGO_URI.match(/\/([^/?]+)\?/);
            console.log(`  MONGO_URI中的DB名: ${match ? match[1] : '无法解析'}`);
        }
        console.log('');
        
        // 2. 连接前的状态
        console.log('📋 2. 连接前的mongoose状态:');
        console.log(`  mongoose.connection.readyState: ${mongoose.connection.readyState}`);
        console.log(`  mongoose.connection.name: ${mongoose.connection.name}`);
        console.log(`  mongoose.connection.host: ${mongoose.connection.host}`);
        console.log('');
        
        // 3. 连接到数据库
        console.log('📋 3. 正在连接...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/happygames');
        console.log('✅ 已连接\n');
        
        // 4. 连接后的状态
        console.log('📋 4. 连接后的mongoose状态:');
        console.log(`  mongoose.connection.readyState: ${mongoose.connection.readyState}`);
        console.log(`  mongoose.connection.name: ${mongoose.connection.name}`);
        console.log(`  mongoose.connection.host: ${mongoose.connection.host}`);
        try {
            const dbName = mongoose.connection.db.databaseName || 'N/A';
            console.log(`  mongoose.connection.db.databaseName: ${dbName}`);
        } catch (e) {
            console.log(`  mongoose.connection.db.databaseName: [错误] ${e.message}`);
        }
        console.log('');
        
        // 5. 检查实际数据库中的内容
        console.log('📋 5. MongoDB中的所有数据库:');
        const admin = mongoose.connection.db.admin();
        const result = await admin.listDatabases();
        result.databases.forEach(db => {
            const size = (db.sizeOnDisk / 1024 / 1024).toFixed(2);
            const isTarget = db.name === 'happygames' ? '✅' : db.name === 'test' ? '⚠️' : '  ';
            console.log(`  ${isTarget} ${db.name} (${size} MB)`);
        });
        console.log('');
        
        // 6. 检查happygames数据库中的集合
        console.log('📋 6. happygames数据库中的集合:');
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`  总共 ${collections.length} 个集合:`);
        collections.forEach(col => {
            console.log(`    - ${col.name}`);
        });
        console.log('');
        
        // 7. 检查Users集合
        console.log('📋 7. users集合信息:');
        const usersCollection = mongoose.connection.collection('users');
        const userCount = await usersCollection.countDocuments();
        console.log(`  文档数: ${userCount}`);
        const sampleUser = await usersCollection.findOne();
        if (sampleUser) {
            console.log(`  样本用户: ${sampleUser.username || sampleUser._id}`);
        }
        console.log('');
        
        // 8. 检查test数据库中的内容（如果存在）
        console.log('📋 8. test数据库检查:');
        const testDbExists = result.databases.some(db => db.name === 'test');
        if (testDbExists) {
            console.log('  ⚠️ test数据库存在!');
            const testDb = mongoose.connection.client.db('test');
            const testCollections = await testDb.listCollections().toArray();
            console.log(`  test数据库中有 ${testCollections.length} 个集合:`);
            testCollections.forEach(col => {
                console.log(`    - ${col.name}`);
            });
        } else {
            console.log('  ✅ test数据库不存在');
        }
        console.log('');
        
        // 9. 测试模型加载
        console.log('📋 9. 模型加载测试:');
        const User = require('./src/models/User');
        console.log(`  User模型: ${User ? '✅ 已加载' : '❌ 未加载'}`);
        
        // 尝试查询用户
        try {
            const users = await User.find().limit(1);
            console.log(`  能否查询users: ✅ (找到 ${users.length} 个)`);
        } catch (e) {
            console.log(`  能否查询users: ❌ ${e.message}`);
        }
        console.log('');
        
        // 10. 总结
        console.log('📋 10. 诊断总结:');
        const currentDb = mongoose.connection.name || mongoose.connection.db?.databaseName || 'unknown';
        const expectedDb = process.env.MONGO_URI?.match(/\/([^/?]+)\?/)?.[1] || 'happygames';
        
        if (currentDb === expectedDb) {
            console.log(`  ✅ 正确: 连接到了 ${currentDb} 数据库`);
        } else {
            console.log(`  ❌ 错误: 连接到了 ${currentDb}，期望是 ${expectedDb}`);
        }
        
        if (!testDbExists) {
            console.log(`  ✅ 好: test数据库不存在`);
        } else {
            console.log(`  ⚠️ 警告: test数据库存在，应该删除`);
        }
        
        console.log('');
        console.log('✅ === 诊断完成 ===\n');
        
        await mongoose.connection.close();
        
    } catch (error) {
        console.error('❌ 诊断失败:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

diagnoseDbIssue();
