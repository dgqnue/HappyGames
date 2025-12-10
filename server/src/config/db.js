const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // 支持 MONGODB_URI 和 MONGO_URI 两个环境变量名
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/happygames';

        // 调试日志（隐藏密码）
        const safeUri = mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
        console.log(`[DB] 尝试连接数据库: ${safeUri}`);
        console.log(`[DB] MONGODB_URI: ${process.env.MONGODB_URI ? '已设置' : '未设置'}`);
        console.log(`[DB] MONGO_URI: ${process.env.MONGO_URI ? '已设置' : '未设置'}`);

        const conn = await mongoose.connect(mongoUri, {
            // 优化连接配置
            maxPoolSize: 10, // 限制连接池大小，防止耗尽资源
            serverSelectionTimeoutMS: 5000, // 5秒连接超时，避免长时间等待
            socketTimeoutMS: 45000, // Socket 超时
            family: 4 // 强制使用 IPv4，避免某些环境下的 IPv6 问题
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
        
        // 验证连接到的数据库名称
        const connectedDbName = conn.connection.name || 'unknown';
        const expectedDbName = 'happygames';
        
        console.log(`[DB] 连接验证:`);
        console.log(`  - 连接的数据库: ${connectedDbName}`);
        console.log(`  - 期望的数据库: ${expectedDbName}`);
        
        if (connectedDbName !== expectedDbName && connectedDbName !== 'unknown') {
            console.error(`[DB] ❌ 严重错误: 连接到了错误的数据库 ${connectedDbName}!`);
            throw new Error(`数据库连接错误: 连接到了 ${connectedDbName}，应该是 ${expectedDbName}`);
        }
        
        if (connectedDbName === expectedDbName) {
            console.log(`[DB] ✅ 正确: 已连接到 ${expectedDbName} 数据库`);
        }

        // 自动修复索引：尝试删除旧的 referralCode 索引，以便 Mongoose 重新创建正确的 sparse 索引
        try {
            const collection = conn.connection.collection('users');
            const indexes = await collection.indexes();
            const referralIndex = indexes.find(idx => idx.name === 'referralCode_1');

            if (referralIndex && !referralIndex.sparse) {
                console.log('[DB] 检测到旧的 referralCode 索引缺少 sparse 属性，正在删除...');
                await collection.dropIndex('referralCode_1');
                console.log('[DB] 旧索引已删除，Mongoose 将在启动时自动重建正确的索引。');
            }
        } catch (err) {
            // 忽略索引不存在的错误
            console.log('[DB] 索引检查/修复跳过:', err.message);
        }

    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
