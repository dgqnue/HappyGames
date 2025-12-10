/**
 * 测试获取数据库名的各种方法
 */

require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('========== 测试获取数据库名 ==========\n');

        const methods = {
            'db.databaseName': mongoose.connection.db.databaseName,
            'db.getName()': mongoose.connection.db.getName?.(),
            'db.name': mongoose.connection.db.name,
            'connection.name': mongoose.connection.name,
            'client.options.dbName': mongoose.connection.client.options.dbName,
        };

        console.log('各种获取方法的结果：');
        for (const [method, value] of Object.entries(methods)) {
            console.log(`  ${method.padEnd(30)}: ${value || '(undefined)'}`);
        }

        // 从 URI 中解析
        const uriMatch = process.env.MONGO_URI?.match(/\/([^/?]+)\?/);
        const uriDb = uriMatch ? uriMatch[1] : 'unknown';
        console.log(`\n  URI 中的数据库名      : ${uriDb}`);

        // 从连接URL中获取
        const connUrl = mongoose.connection.client.topology?.description?.topologyDescription?.servers?.[0]?.address;
        console.log(`  连接地址              : ${connUrl}`);

        process.exit(0);
    })
    .catch(err => {
        console.error('连接失败:', err.message);
        process.exit(1);
    });
