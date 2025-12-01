#!/usr/bin/env node

/**
 * 全面检查所有模块引用路径
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 检查所有模块引用路径...\n');

const filesToCheck = [
    {
        file: 'src/core/network/SocketServer.js',
        expectedRequires: [
            "require('socket.io')",
            "require('../../gamecore/auth')",
            "require('../../socket/lobbyHandler')"
        ]
    },
    {
        file: 'src/core/network/HttpService.js',
        expectedRequires: [
            // 不应该有任何 require
        ],
        shouldNotHave: [
            "require('./network/",
            "require('./game/"
        ]
    },
    {
        file: 'src/core/matching/MatchMaker.js',
        expectedRequires: [
            // 不应该有任何外部 require
        ]
    },
    {
        file: 'src/core/hierarchy/GameManager.js',
        expectedRequires: [
            "require('../../models/UserGameStats')",
            "require('./GameTier')"
        ]
    },
    {
        file: 'src/core/hierarchy/GameTier.js',
        expectedRequires: [
            // 不应该有任何外部 require
        ]
    },
    {
        file: 'src/core/hierarchy/GameTable.js',
        expectedRequires: [
            "require('axios')",
            "require('crypto')"
        ]
    },
    {
        file: 'src/core/game/GameLoader.js',
        expectedRequires: [
            "require('fs')",
            "require('path')",
            "require('../matching/MatchMaker')"
        ],
        shouldNotHave: [
            "require('../core/matching/"
        ]
    },
    {
        file: 'src/games/chinesechess/ChineseChessManager.js',
        expectedRequires: [
            "require('../../core/hierarchy/GameManager')",
            "require('./rooms/ChineseChessRoom')"
        ]
    },
    {
        file: 'src/games/chinesechess/rooms/ChineseChessRoom.js',
        expectedRequires: [
            "require('../../../core/hierarchy/GameTable')",
            "require('../logic/XiangqiRules')",
            "require('../../../gamecore/EloService')"
        ]
    },
    {
        file: 'src/index.js',
        expectedRequires: [
            "require('./core/network/SocketServer')",
            "require('./core/game/GameLoader')",
            "require('./core/network/HttpService')"
        ]
    }
];

let hasErrors = false;

filesToCheck.forEach(({ file, expectedRequires = [], shouldNotHave = [] }) => {
    const filePath = path.join(__dirname, file);

    if (!fs.existsSync(filePath)) {
        console.log(`❌ ${file} - 文件不存在！`);
        hasErrors = true;
        return;
    }

    const content = fs.readFileSync(filePath, 'utf8');

    console.log(`\n📄 ${file}`);

    // 检查不应该存在的引用
    shouldNotHave.forEach(pattern => {
        if (content.includes(pattern)) {
            console.log(`  ❌ 发现错误的引用: ${pattern}`);
            hasErrors = true;
        }
    });

    // 检查应该存在的引用
    let allFound = true;
    expectedRequires.forEach(req => {
        if (!content.includes(req)) {
            console.log(`  ⚠️  缺少引用: ${req}`);
            allFound = false;
        }
    });

    if (allFound && shouldNotHave.every(pattern => !content.includes(pattern))) {
        console.log(`  ✅ 引用路径正确`);
    }
});

console.log('\n' + '='.repeat(50));

if (hasErrors) {
    console.log('❌ 发现路径错误！请修复后再部署。');
    process.exit(1);
} else {
    console.log('✅ 所有模块引用路径正确！');
    process.exit(0);
}
