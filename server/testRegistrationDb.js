/**
 * 模拟注册请求，测试数据库检测
 */

require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

async function testRegistration() {
    try {
        // 连接数据库
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ 已连接到 MongoDB\n');

        // 模拟注册接口的数据库检测逻辑
        console.log('========== 模拟注册接口 ==========\n');

        const mongoose2 = require('mongoose');
        const currentDb = mongoose2.connection.db.databaseName || mongoose2.connection.db.getName?.() || 'unknown';
        const expectedDbName = process.env.MONGO_URI?.match(/\/([^/?]+)\?/)?.[1] || 'happygames';

        console.log(`当前数据库: ${currentDb}`);
        console.log(`期望数据库: ${expectedDbName}`);
        console.log(`相等? ${currentDb === expectedDbName}`);

        if (currentDb !== expectedDbName && currentDb !== 'unknown') {
            console.log('\n❌ 数据库检测失败 - 会返回错误');
            console.log(`错误消息: 数据库连接错误: 当前数据库为 ${currentDb}, 应该连接到 ${expectedDbName}`);
        } else {
            console.log('\n✅ 数据库检测通过 - 会继续注册流程');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

testRegistration();
