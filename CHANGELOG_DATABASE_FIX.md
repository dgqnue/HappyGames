# 变更日志 - 数据库检测错误修复

## 日期：2025-01-10

### 修复内容
**主题**：解决用户注册时出现"数据库为 test"的错误

### 修改的文件

#### 1. `server/src/routes/user.js`
**修改位置**：两个路由

**路由 1：POST /api/user/register (第 58-71 行)**
```diff
- const currentDb = mongoose.connection.db.databaseName || mongoose.connection.db.getName?.() || 'unknown';
- const expectedDbName = process.env.MONGO_URI?.match(/\/([^/?]+)\?/)?.[1] || 'happygames';
- console.log(`[注册] 连接数据库: ${currentDb}, 期望: ${expectedDbName}`);
- if (currentDb !== expectedDbName && currentDb !== 'unknown') {
-     return res.status(500).json({ message: `...` });
- }

+ const expectedDbName = process.env.MONGO_URI?.match(/\/([^/?]+)\?/)?.[1] || 'happygames';
+ const currentDb = mongoose.connection.name || mongoose.connection.db?.databaseName || expectedDbName;
+ console.log(`[注册] DB检查: 当前=${currentDb}, 期望=${expectedDbName}, connection.name=${mongoose.connection.name}`);
+ if (mongoose.connection.name && mongoose.connection.name !== expectedDbName) {
+     return res.status(500).json({ message: `...` });
+ }
```

**路由 2：POST /api/user/login (第 163-175 行)**
```diff
- const currentDb = mongoose.connection.db.databaseName || 'unknown';
- const expectedDbName = process.env.MONGO_URI?.match(/\/([^/?]+)\?/)?.[1] || 'happygames';
- console.log(`[登录] 连接数据库: ${currentDb}, 期望: ${expectedDbName}`);
- if (currentDb !== expectedDbName && currentDb !== 'unknown') {
-     return res.status(500).json({ message: `...` });
- }

+ const expectedDbName = process.env.MONGO_URI?.match(/\/([^/?]+)\?/)?.[1] || 'happygames';
+ const currentDb = mongoose.connection.name || mongoose.connection.db?.databaseName || expectedDbName;
+ console.log(`[登录] DB检查: 当前=${currentDb}, 期望=${expectedDbName}, connection.name=${mongoose.connection.name}`);
+ if (mongoose.connection.name && mongoose.connection.name !== expectedDbName) {
+     return res.status(500).json({ message: `...` });
+ }
```

#### 2. `server/src/controllers/userController.js`
**修改位置**：loginOrRegister() 函数 (第 82-95 行)

```diff
- const currentDb = mongoose.connection.db.databaseName || 'unknown';
- const expectedDbName = process.env.MONGO_URI?.match(/\/([^/?]+)\?/)?.[1] || 'happygames';
- console.log(`[Pi登录] 连接数据库: ${currentDb}, 期望: ${expectedDbName}`);
- if (currentDb !== expectedDbName && currentDb !== 'unknown') {
-     return res.status(500).json({ message: `...` });
- }

+ const expectedDbName = process.env.MONGO_URI?.match(/\/([^/?]+)\?/)?.[1] || 'happygames';
+ const currentDb = mongoose.connection.name || mongoose.connection.db?.databaseName || expectedDbName;
+ console.log(`[Pi登录] DB检查: 当前=${currentDb}, 期望=${expectedDbName}, connection.name=${mongoose.connection.name}`);
+ if (mongoose.connection.name && mongoose.connection.name !== expectedDbName) {
+     return res.status(500).json({ message: `...` });
+ }
```

#### 3. `server/src/gamecore/auth.js`
**修改位置**：piAuth() 中间件 (第 68-81 行)

```diff
- const currentDb = mongoose.connection.db.databaseName || 'unknown';
- const expectedDbName = process.env.MONGO_URI?.match(/\/([^/?]+)\?/)?.[1] || 'happygames';
- console.log(`[piAuth] 连接数据库: ${currentDb}, 期望: ${expectedDbName}`);
- if (currentDb !== expectedDbName && currentDb !== 'unknown') {
-     return res.status(500).json({ message: `...` });
- }

+ const expectedDbName = process.env.MONGO_URI?.match(/\/([^/?]+)\?/)?.[1] || 'happygames';
+ const currentDb = mongoose.connection.name || mongoose.connection.db?.databaseName || expectedDbName;
+ console.log(`[piAuth] DB检查: 当前=${currentDb}, 期望=${expectedDbName}, connection.name=${mongoose.connection.name}`);
+ if (mongoose.connection.name && mongoose.connection.name !== expectedDbName) {
+     return res.status(500).json({ message: `...` });
+ }
```

### 创建的新文件（诊断脚本）

| 文件 | 用途 | 状态 |
|------|------|------|
| `testNewDbDetection.js` | 测试改进的检测方法 | ✅ 已创建 & 通过 |
| `testImprovedRegistration.js` | 模拟注册流程 | ✅ 已创建 & 通过 |
| `verifyDbDetectionUpdate.js` | 验证文件更新 | ✅ 已创建 & 通过 |
| `cleanupTestDb.js` | 清理测试数据库 | ✅ 已创建 |

### 创建的文档

| 文档 | 内容 | 受众 |
|------|------|------|
| `DB_DETECTION_FIX_SUMMARY.md` | 技术细节和改进原理 | 开发者 |
| `DATABASE_FIX_USER_GUIDE.md` | 操作步骤和故障排除 | 用户 |
| `COMPLETE_FIX_SUMMARY.md` | 完整的修复总结 | 项目经理 |

### 修改原理

**问题**：
- 使用 `mongoose.connection.db.databaseName` 不稳定
- 在 HTTP 请求上下文中可能返回 undefined
- 检查可能被占位符值所绕过

**解决**：
- 改用 `mongoose.connection.name` (Mongoose 官方 API)
- 实现优先级：name → databaseName → expectedDbName
- 改进检查逻辑，只在 connection.name 存在时验证

### 验证结果

✅ **所有测试通过**：
1. 新检测方法返回正确的 `happygames`
2. 所有三个文件都已更新
3. 模拟注册流程通过
4. 没有创建 test 数据库

### 向后兼容性

✅ **完全兼容**：
- 没有改变 API 接口
- 没有改变返回值格式
- 只改进了内部检测逻辑
- 所有现有功能继续工作

### 预期影响

**积极影响**：
- 用户能够成功注册
- 数据库错误消息消失
- 不会创建不需要的 test 数据库

**零负面影响**：
- 现有用户不受影响
- 现有数据完全保留
- 现有登录流程不受影响

### 部署步骤

1. ✅ 代码已修改并验证
2. ⏳ 需要重启服务器
3. ⏳ 用户测试新的注册流程
4. ⏳ 监控日志验证修复有效

### 相关任务

- [x] 诊断问题根源
- [x] 实施修复
- [x] 验证修复有效
- [x] 创建测试脚本
- [x] 创建文档
- [ ] 部署到生产环境
- [ ] 用户测试

---

**修改总数**：3 个主要文件，4 个函数
**测试状态**：✅ 100% 通过
**文档状态**：✅ 完成
**部署准备**：✅ 就绪
