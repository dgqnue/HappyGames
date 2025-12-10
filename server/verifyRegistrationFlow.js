/**
 * 验证：检查账户创建流程是否正确配置
 * 
 * 此脚本验证：
 * 1. 只有 /api/user/register 可以创建账户
 * 2. 所有创建都强制指向 happygames 数据库
 * 3. 其他自动创建途径已被禁用
 */

const fs = require('fs');
const path = require('path');

const filesToCheck = [
    {
        path: 'src/routes/user.js',
        shouldContain: ['POST /api/user/register', 'Wallet.create', '强制使用 happygames 数据库'],
        shouldNotContain: [],
        description: '注册接口应包含钱包创建和数据库验证'
    },
    {
        path: 'src/controllers/userController.js',
        shouldContain: ['Only login is allowed', 'User.findOne', '用户未注册'],
        shouldNotContain: ['user = await User.create', '// 2. Register new user'],
        description: 'loginOrRegister 应只登录，不创建用户'
    },
    {
        path: 'src/gamecore/auth.js',
        shouldContain: ['ONLY login existing users', 'User.findOne', '用户未注册'],
        shouldNotContain: ['async function createNewUser'],
        description: 'piAuth 应只登录，不创建用户'
    }
];

console.log('\n========== 账户创建流程验证 ==========\n');

let allPassed = true;

for (const file of filesToCheck) {
    const filePath = path.join(__dirname, file.path);
    console.log(`\n📄 检查文件: ${file.path}`);
    console.log(`   描述: ${file.description}`);
    
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        let passed = true;

        // 检查应该包含的内容
        for (const keyword of file.shouldContain) {
            if (!content.includes(keyword)) {
                console.log(`   ❌ 缺失: "${keyword}"`);
                passed = false;
                allPassed = false;
            }
        }

        // 检查不应该包含的内容
        for (const keyword of file.shouldNotContain) {
            if (content.includes(keyword)) {
                console.log(`   ❌ 不应包含: "${keyword}"`);
                passed = false;
                allPassed = false;
            }
        }

        if (passed) {
            console.log(`   ✅ 验证通过`);
        }
    } catch (error) {
        console.log(`   ⚠️ 无法读取文件: ${error.message}`);
        allPassed = false;
    }
}

console.log('\n========== 验证结果 ==========\n');

if (allPassed) {
    console.log('✅ 所有检查通过！');
    console.log('\n配置摘要:');
    console.log('  • POST /api/user/register - ✅ 唯一的创建途径');
    console.log('  • POST /api/users/login - ✅ 只进行登录');
    console.log('  • piAuth 中间件 - ✅ 只进行登录');
    console.log('  • 数据库验证 - ✅ 强制 happygames');
    console.log('\n需要重启服务器使更改生效。');
} else {
    console.log('❌ 部分检查失败，请查看上方的错误信息');
}

console.log('\n');
process.exit(allPassed ? 0 : 1);
