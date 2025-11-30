const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/happygames';

        // 调试日志（隐藏密码）
        const safeUri = mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
        console.log(`[DB] 尝试连接数据库: ${safeUri}`);
        console.log(`[DB] MONGODB_URI 环境变量${process.env.MONGODB_URI ? '已设置' : '未设置'}`);

        const conn = await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
