#!/usr/bin/env node
/**
 * 验证改进的数据库检测逻辑已应用到所有三个位置
 */

const fs = require('fs');
const path = require('path');

function checkFile(filePath, label) {
    console.log(`\n📄 检查 ${label}...`);
    
    if (!fs.existsSync(filePath)) {
        console.log(`❌ 文件不存在: ${filePath}`);
        return false;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 检查是否使用了 connection.name
    const hasConnectionName = content.includes('mongoose.connection.name');
    const hasOldMethod = content.includes('mongoose.connection.db.databaseName');
    const hasDBCheck = content.includes('DB检查');
    
    console.log(`  ✓ 使用 mongoose.connection.name? ${hasConnectionName ? '✅' : '❌'}`);
    console.log(`  ✓ 仍使用旧方法 .db.databaseName? ${hasOldMethod ? '⚠️  (作为备选)' : '✅ (已移除)'}`);
    console.log(`  ✓ 日志中有 DB检查 标记? ${hasDBCheck ? '✅' : '❌'}`);
    
    if (hasConnectionName) {
        console.log(`  ✅ ${label} 已更新`);
        return true;
    } else {
        console.log(`  ❌ ${label} 未更新`);
        return false;
    }
}

function main() {
    console.log('🔍 验证数据库检测逻辑更新...\n');
    console.log('='.repeat(60));
    
    const files = [
        {
            path: path.join(__dirname, 'src/routes/user.js'),
            label: 'user.js (注册端点 + 登录端点)'
        },
        {
            path: path.join(__dirname, 'src/controllers/userController.js'),
            label: 'userController.js (Pi登录)'
        },
        {
            path: path.join(__dirname, 'src/gamecore/auth.js'),
            label: 'auth.js (piAuth 中间件)'
        }
    ];
    
    let allPassed = true;
    
    files.forEach(file => {
        const passed = checkFile(file.path, file.label);
        allPassed = allPassed && passed;
    });
    
    console.log('\n' + '='.repeat(60));
    
    if (allPassed) {
        console.log('\n✅ 所有文件已成功更新到改进的数据库检测方法!\n');
        console.log('📝 改进总结:');
        console.log('  • 优先使用 mongoose.connection.name (最稳定)');
        console.log('  • 备选: mongoose.connection.db?.databaseName');
        console.log('  • 最后备选: 从 MONGO_URI 解析期望值');
        console.log('  • 检查逻辑更智能，只在 connection.name 存在时验证');
        console.log('  • 不会被"unknown"等占位符所迷惑');
        return 0;
    } else {
        console.log('\n❌ 某些文件未成功更新!\n');
        return 1;
    }
}

process.exit(main());
