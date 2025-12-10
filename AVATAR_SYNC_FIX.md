# 头像显示同步修复总结

## 问题描述
用户在个人资料页面更新头像后，加入游戏时：
- 玩家自己看到的是系统默认头像
- 对手看到的是更新后的头像

## 根本原因
1. **数据库问题**：某些用户的 avatar 字段为空
2. **缓存问题**：玩家加入时使用 `socket.user.avatar`（来自 JWT，在玩家第一次登录时缓存）
3. **数据流问题**：头像数据在多个地方转换，导致不一致

## 修复方案

### 1. 数据库修复
- 脚本：`fix-empty-avatars.js`
- 操作：将所有空的 avatar 字段设置为 `/images/default-avatar.png`
- 结果：所有用户的 avatar 都有有效的相对路径

### 2. 后端修改

#### MatchPlayers.js (_playerJoin 方法)
```javascript
// 从数据库获取最新的用户信息（包括最新的头像）
const userFromDb = await User.findById(socket.user._id).select('avatar nickname').lean();

// 优先使用数据库中的最新信息，存储相对路径
const userAvatar = userFromDb?.avatar || socket.user.avatar || '/images/default-avatar.png';

// 在 playerData 中设置头像（顶级属性）
const playerData = {
    // ...
    avatar: userAvatar,  // 存储相对路径
    // ...
};
```

#### ChineseChessTable.js (broadcastRoomState 方法)
```javascript
// 每次广播时都从数据库查询最新的用户信息
const userInfo = await User.findById(player.userId).select('avatar nickname').lean();

// 使用辅助函数将相对路径转换为完整 URL
const getFullAvatarUrl = (avatarPath) => {
    if (!avatarPath) return '/images/default-avatar.png';
    if (avatarPath.startsWith('http')) return avatarPath;
    if (process.env.RENDER || process.env.NODE_ENV === 'production') {
        const baseUrl = process.env.API_BASE_URL || 'https://happygames-tfdz.onrender.com';
        return `${baseUrl}${avatarPath}`;
    }
    return `http://localhost:5000${avatarPath}`;
};

// 在广播的数据中包含转换后的完整 URL
const state = {
    players: currentPlayers.map(p => ({
        // ...
        avatar: latestData.avatar || getFullAvatarUrl(p.avatar),
        // ...
    }))
};
```

### 3. 前端修改

#### GameTableView.tsx
```javascript
// 直接使用 player.avatar（已经是完整 URL）
const avatarUrl = player.avatar || userObj.avatar || '/images/default-avatar.png';
```

#### next.config.js (新文件)
```javascript
// 配置允许的图片来源，支持相对路径和远程 URL
module.exports = {
  images: {
    domains: ['localhost:5000', 'happygames-tfdz.onrender.com'],
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '5000', pathname: '/**' },
      { protocol: 'https', hostname: 'happygames-tfdz.onrender.com', pathname: '/**' },
    ],
  },
};
```

## 数据流说明

### 玩家加入游戏
1. 用户加入游戏 → `_playerJoin()` 调用
2. 从数据库查询最新的 avatar（可能是用户在个人资料页面刚更新的）
3. 将相对路径保存到 `playerData.avatar`
4. 调用 `addPlayer()` 保存玩家数据
5. 立即调用 `broadcastRoomState()` 并 await 结果

### 广播房间状态
1. `broadcastRoomState()` 被调用（可能来自玩家加入、玩家就绪、游戏开始等）
2. 再次从数据库查询最新的 avatar 数据
3. 使用 `getFullAvatarUrl()` 转换为完整 URL（根据环境）
4. 在 Socket.IO 消息中发送完整 URL
5. 客户端接收到完整 URL 并显示

## 数据存储约定
- **数据库（User model）**：存储相对路径，如 `/images/default-avatar.png` 或 `/uploads/avatars/xxx.png`
- **服务器发送**：相对路径 → 转换为完整 URL（带 http://localhost:5000 或 https://happygames-tfdz.onrender.com）
- **客户端接收**：完整 URL，直接用于 Image 组件

## 调试命令

### 检查所有用户的头像
```bash
node check-user-avatars.js
```

### 修复空的头像字段
```bash
node fix-empty-avatars.js
```

### 验证头像工作流
```bash
node verify-avatar-workflow.js
```

## 测试清单
- [ ] 用户注册后，avatar 默认为 `/images/default-avatar.png`
- [ ] 用户更新头像后，avatar 保存到数据库
- [ ] 用户加入游戏，自己看到更新后的头像
- [ ] 其他玩家看到该用户更新后的头像
- [ ] 重新加入游戏后，头像仍然是最新的
- [ ] 本地环境（http://localhost:5000）可以正确加载头像
- [ ] Render 生产环境（https://happygames-tfdz.onrender.com）可以正确加载头像
