/**
 * 深度诊断：在HTTP请求中测试数据库检测
 */

require('dotenv').config({ path: './.env' });
const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());

// 初始化 MongoDB 连接（模拟应用启动）
console.log('正在连接 MongoDB...');
mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log('✅ MongoDB 连接成功\n');
}).catch(err => {
    console.error('❌ MongoDB 连接失败:', err.message);
    process.exit(1);
});

// 测试路由 - 模拟注册接口
app.post('/test-register', async (req, res) => {
    console.log('\n[POST /test-register] 收到请求');
    
    const mongoose2 = require('mongoose');
    
    // 方法1：直接获取 databaseName
    const currentDb1 = mongoose2.connection.db.databaseName;
    console.log(`  方法1 (databaseName): ${currentDb1}`);
    
    // 方法2：备选方案
    const currentDb2 = mongoose2.connection.db.getName?.();
    console.log(`  方法2 (getName()): ${currentDb2}`);
    
    // 方法3：从 connection.name
    const currentDb3 = mongoose2.connection.name;
    console.log(`  方法3 (connection.name): ${currentDb3}`);
    
    // 从 URI 提取
    const expectedDbName = process.env.MONGO_URI?.match(/\/([^/?]+)\?/)?.[1];
    console.log(`  期望数据库: ${expectedDbName}`);
    
    const currentDb = currentDb1 || currentDb3 || 'unknown';
    console.log(`\n  最终使用: currentDb=${currentDb}, expectedDbName=${expectedDbName}`);
    console.log(`  检查结果: ${currentDb === expectedDbName ? '✅ 通过' : '❌ 不通过'}`);
    
    if (currentDb !== expectedDbName && currentDb !== 'unknown') {
        console.log(`  返回错误`);
        return res.status(500).json({
            success: false,
            message: `数据库连接错误: 当前数据库为 ${currentDb}, 应该连接到 ${expectedDbName}`
        });
    }
    
    res.json({
        success: true,
        message: '注册成功',
        db: currentDb
    });
});

app.listen(5555, () => {
    console.log('\n测试服务器启动在 http://localhost:5555');
    console.log('发送 POST /test-register 来测试\n');
});
