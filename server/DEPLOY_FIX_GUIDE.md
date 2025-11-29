# 部署错误修复指南

## 🐛 问题描述

部署到 Render 时出现模块找不到的错误：
```
Error: Cannot find module '../core/matching/MatchMaker'
```

## 🔍 问题原因

### 1. 相对路径错误
`GameLoader.js` 中的相对路径不正确：
```javascript
// ❌ 错误
const MatchMaker = require('../core/matching/MatchMaker');

// ✅ 正确
const MatchMaker = require('../matching/MatchMaker');
```

**原因**：`GameLoader.js` 已经在 `core/game/` 目录下，所以应该是 `../matching/` 而不是 `../core/matching/`

### 2. Git 提交问题
新创建的文件可能没有正确提交到 Git 仓库。

---

## ✅ 解决方案

### 步骤 1：修复路径错误

已修复以下文件：

**server/src/core/game/GameLoader.js**
```javascript
// 第 3 行：修复 MatchMaker 引用
const MatchMaker = require('../matching/MatchMaker');

// 第 29 行：修复 games 目录路径
const gamesDir = path.join(__dirname, '../../games');
```

### 步骤 2：验证所有文件存在

运行检查脚本：
```bash
cd server
node check-deploy.js
```

应该看到：
```
✅ 所有必需文件都存在，可以部署！
```

### 步骤 3：提交所有新文件到 Git

```bash
# 查看未跟踪的文件
git status

# 添加所有新文件
git add server/src/core/
git add server/src/games/chinesechess/ChineseChessManager.js
git add server/src/games/chinesechess/rooms/ChineseChessRoom.js
git add server/src/index.js

# 提交
git commit -m "fix: 修复模块路径错误，完成服务端重构"

# 推送到远程仓库
git push
```

### 步骤 4：重新部署

推送后，Render 会自动重新部署。

---

## 📋 必需文件清单

确保以下文件都已提交：

### 核心模块
- ✅ `src/core/network/SocketServer.js`
- ✅ `src/core/network/HttpService.js`
- ✅ `src/core/matching/MatchMaker.js`
- ✅ `src/core/hierarchy/GameManager.js`
- ✅ `src/core/hierarchy/GameTier.js`
- ✅ `src/core/hierarchy/GameTable.js`
- ✅ `src/core/game/GameLoader.js`

### 游戏实现
- ✅ `src/games/chinesechess/ChineseChessManager.js`
- ✅ `src/games/chinesechess/rooms/ChineseChessRoom.js`

### 主入口
- ✅ `src/index.js`

---

## 🔧 快速检查命令

### 检查文件是否存在
```bash
cd server
node check-deploy.js
```

### 检查 Git 状态
```bash
git status
```

### 查看未提交的文件
```bash
git ls-files --others --exclude-standard
```

### 查看已修改的文件
```bash
git diff --name-only
```

---

## 🚀 部署流程

### 完整部署流程

1. **本地测试**
   ```bash
   cd server
   npm install
   node src/index.js
   ```

2. **运行检查脚本**
   ```bash
   node check-deploy.js
   ```

3. **提交代码**
   ```bash
   git add .
   git commit -m "描述"
   git push
   ```

4. **监控部署**
   - 登录 Render 控制台
   - 查看部署日志
   - 确认服务启动成功

---

## 📊 目录结构验证

确保目录结构如下：

```
server/src/
├── core/                          ✅ 新增
│   ├── network/
│   │   ├── SocketServer.js       ✅
│   │   └── HttpService.js        ✅
│   ├── matching/
│   │   └── MatchMaker.js         ✅
│   ├── hierarchy/
│   │   ├── GameManager.js        ✅
│   │   ├── GameTier.js           ✅
│   │   └── GameTable.js          ✅
│   └── game/
│       └── GameLoader.js         ✅
├── games/
│   └── chinesechess/
│       ├── ChineseChessManager.js ✅
│       └── rooms/
│           └── ChineseChessRoom.js ✅
└── index.js                       ✅ 已重构
```

---

## ⚠️ 常见问题

### Q1: 文件存在但仍然报错找不到模块

**A:** 检查以下几点：
1. 文件是否已提交到 Git
2. 相对路径是否正确
3. 文件名大小写是否正确（Linux 区分大小写）

### Q2: 如何确认文件已提交到 Git？

**A:** 运行以下命令：
```bash
git ls-tree -r HEAD --name-only | grep "core/"
```

应该看到所有 core/ 目录下的文件。

### Q3: 部署后仍然报错怎么办？

**A:** 
1. 查看 Render 部署日志
2. 确认所有依赖都已安装
3. 检查 Node.js 版本是否兼容
4. 尝试清除 Render 的构建缓存

---

## 🎯 验证部署成功

部署成功后，应该看到以下日志：

```
[Server] 启动 HappyGames 服务器...
[SocketServer] Socket服务已启动
[GameLoader] 开始加载游戏模块...
[GameLoader] ✓ 已加载游戏: chinesechess
[GameLoader] 游戏加载完成，共加载 1 个游戏
[GameLoader] 所有游戏已注册到 Socket 服务器
[HttpService] HTTP 路由已配置
[Server] ✓ 服务器运行在端口 5000
[Server] ✓ 准备接受连接
```

---

## 📝 Git 提交建议

### 提交信息模板

```bash
# 修复路径错误
git commit -m "fix: 修复 GameLoader 中的模块引用路径"

# 添加新文件
git commit -m "feat: 添加核心模块和重构后的游戏管理器"

# 完整重构
git commit -m "refactor: 完成服务端代码解耦重构

- 创建 core/ 模块（network, matching, hierarchy, game）
- 重构 ChineseChessManager 和 ChineseChessRoom
- 更新主入口文件
- 添加详细中文注释和文档"
```

---

## 🔄 回滚方案

如果部署失败需要回滚：

### 方案 1：Git 回滚
```bash
# 回滚到上一个版本
git revert HEAD
git push
```

### 方案 2：使用旧的 index.js
```bash
# 临时使用旧的入口文件
git checkout HEAD~1 server/src/index.js
git commit -m "temp: 临时回滚到旧架构"
git push
```

### 方案 3：在 Render 控制台手动回滚
- 进入 Render 控制台
- 选择之前的成功部署版本
- 点击 "Redeploy"

---

**最后更新**: 2025-11-30  
**状态**: ✅ 路径错误已修复  
**下一步**: 提交代码并重新部署
