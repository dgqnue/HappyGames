/**
 * 显示 happygames 数据库的所有集合和字段
 */

require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const showDatabaseStructure = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const db = mongoose.connection.db;

        console.log('========== HAPPYGAMES DATABASE STRUCTURE ==========\n');

        // 列出所有集合
        const collections = await db.listCollections().toArray();

        for (const collection of collections) {
            const collName = collection.name;
            console.log(`\n📦 Collection: ${collName}`);
            console.log('═'.repeat(60));

            // 获取集合中的文档
            const documents = await db.collection(collName).find({}).limit(5).toArray();
            const docCount = await db.collection(collName).countDocuments();

            console.log(`Documents: ${docCount}\n`);

            if (documents.length > 0) {
                // 提取所有唯一的字段
                const fieldsSet = new Set();
                for (const doc of documents) {
                    Object.keys(doc).forEach(key => fieldsSet.add(key));
                }

                const fields = Array.from(fieldsSet).sort();

                console.log('Fields:');
                for (const field of fields) {
                    // 检查字段类型
                    let type = 'unknown';
                    for (const doc of documents) {
                        if (doc.hasOwnProperty(field)) {
                            const value = doc[field];
                            if (value === null) {
                                type = 'null';
                            } else if (Array.isArray(value)) {
                                type = 'Array';
                            } else if (typeof value === 'object') {
                                type = value.constructor.name;
                            } else {
                                type = typeof value;
                            }
                            break;
                        }
                    }
                    console.log(`  - ${field}: ${type}`);
                }

                // 显示一个样本文档
                console.log('\nSample Document:');
                console.log(JSON.stringify(documents[0], null, 2));
            } else {
                console.log('(No documents in this collection)');
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('========== COLLECTION SUMMARY ==========\n');

        for (const collection of collections) {
            const count = await db.collection(collection.name).countDocuments();
            console.log(`${collection.name.padEnd(20)} : ${count} documents`);
        }

        console.log('\n========== ✅ COMPLETE ==========\n');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

showDatabaseStructure();
