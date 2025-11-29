#!/usr/bin/env node

/**
 * 部署前检查脚本
 * 验证所有必需的文件是否存在
 */

const fs = require('fs');
const path = require('path');

const requiredFiles = [
    // 核心模块
    'src/core/network/SocketServer.js',
    'src/core/network/HttpService.js',
    'src/core/matching/MatchMaker.js',
    'src/core/hierarchy/GameManager.js',
    'src/core/hierarchy/GameTier.js',
    'src/core/hierarchy/GameTable.js',
    'src/core/game/GameLoader.js',

    // 游戏实现
    'src/games/chinesechess/ChineseChessManager.js',
    'src/games/chinesechess/rooms/ChineseChessRoom.js',

    // 主入口
    'src/index.js'
];

console.log('🔍 检查部署文件...\n');

let allFilesExist = true;
const missingFiles = [];

requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    const exists = fs.existsSync(filePath);

    if (exists) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - 文件不存在！`);
        allFilesExist = false;
        missingFiles.push(file);
    }
});

console.log('\n' + '='.repeat(50));

if (allFilesExist) {
    console.log('✅ 所有必需文件都存在，可以部署！');
    process.exit(0);
} else {
    console.log('❌ 缺少以下文件：');
    missingFiles.forEach(file => console.log(`   - ${file}`));
    console.log('\n请确保所有文件都已提交到 Git！');
    process.exit(1);
}
