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
