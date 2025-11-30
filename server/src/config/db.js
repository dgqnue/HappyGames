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
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
