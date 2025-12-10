# 头像同步功能测试指南

## 测试场景

### 场景 1: 玩家设置头像后加入游戏
**步骤：**
1. 登录应用
2. 进入个人资料页面
3. 上传一个新的头像图片
4. 返回到游戏大厅
5. 进入游戏匹配
6. 观察玩家列表中的头像

**预期结果：**
- 自己的头像应该是最新上传的头像
- 其他玩家（如果有）应该能看到你的新头像

### 场景 2: 多玩家同时加入
**步骤：**
1. 两个浏览器同时登录账号 A 和账号 B
2. 账号 A 上传新头像
3. 账号 A 加入游戏
4. 账号 B 加入同一个游戏
5. 观察两个客户端的玩家列表

**预期结果：**
- 在账号 A 的客户端上，账号 A 显示新头像
- 在账号 B 的客户端上，账号 A 显示新头像
- 两个客户端看到的都是相同的、最新的头像

### 场景 3: 玩家重新加入游戏
**步骤：**
1. 玩家 A 加入游戏
2. 玩家 A 离开游戏
3. 玩家 A 进行个人资料的其他操作
4. 玩家 A 再次加入游戏

**预期结果：**
- 玩家 A 的头像应该始终显示最新的头像
- 不会显示过期的或默认的头像

### 场景 4: 新用户注册
**步骤：**
1. 新用户注册账号
2. 新用户不上传头像，直接加入游戏
3. 观察玩家列表

**预期结果：**
- 应该显示系统默认头像，不是空白或损坏的图像

### 场景 5: 网络延迟模拟
**步骤：**
1. 使用浏览器开发者工具的 Network 标签
2. 设置 Slow 3G 或自定义的高延迟
3. 玩家上传新头像后加入游戏
4. 观察头像加载过程

**预期结果：**
- 头像应该正确加载（可能有加载延迟，但不应该显示默认头像）

## 调试检查清单

### 后端检查
- [ ] 数据库中的用户 avatar 字段都有值（不能为空）
- [ ] 运行 `node verify-avatar-workflow.js` 验证所有用户的头像字段
- [ ] 检查服务器日志中的 avatar 相关输出：
  - `[MatchPlayers] Failed to fetch user from DB` - 表示数据库查询失败
  - `[ChineseChessTable] Player xxx: db-avatar=...` - 显示每个玩家的头像来源

### 前端检查
- [ ] 在浏览器开发者工具中检查 Network 标签，确认头像 URL 正确
- [ ] 检查 Console 中是否有图片加载失败的错误
- [ ] 验证 Image 组件是否正确处理头像 URL
  - 完整 URL 应该像：`http://localhost:5000/images/default-avatar.png`
  - 或：`https://happygames-tfdz.onrender.com/uploads/avatars/xxx.png`

### 数据库检查
```javascript
// 在 MongoDB 中运行
db.users.find({}, { username: 1, avatar: 1 })

// 检查是否有空的 avatar
db.users.countDocuments({ $or: [{ avatar: '' }, { avatar: null }] })
```

## 常见问题

### 问题 1: 显示默认头像而不是用户上传的头像
**可能原因：**
- 用户上传的头像没有保存到数据库
- `broadcastRoomState()` 没有从数据库查询最新的头像
- 网络请求失败

**检查方法：**
1. 查看后端日志中的 "Player xxx: db-avatar=" 输出
2. 检查数据库中用户的 avatar 字段
3. 检查浏览器控制台的 Network 标签

### 问题 2: 不同玩家看到不同的头像
**可能原因：**
- 玩家加入时没有调用 `await broadcastRoomState()`
- 头像 URL 转换不一致

**检查方法：**
1. 确认 `_playerJoin()` 中 `await this.table.broadcastRoomState()`
2. 检查 `getFullAvatarUrl()` 的逻辑

### 问题 3: 头像无法加载（404 或其他错误）
**可能原因：**
- 服务器没有正确配置静态文件服务
- 头像 URL 格式错误
- 上传的文件不存在

**检查方法：**
1. 验证 `express.static` 配置（/images 和 /uploads）
2. 检查上传目录是否存在
3. 查看浏览器控制台的 Network 标签中的 404 错误

## 验证脚本

### 1. 检查用户头像
```bash
node check-user-avatars.js
```

### 2. 修复空头像
```bash
node fix-empty-avatars.js
```

### 3. 验证工作流
```bash
node verify-avatar-workflow.js
```

## 修复记录

### 修复的问题
1. ✅ 玩家加入时使用数据库中的最新头像，而不是缓存的 JWT 数据
2. ✅ 广播房间状态时每次都从数据库查询最新头像
3. ✅ 头像 URL 在服务器端转换为完整路径
4. ✅ 前端 next.config.js 配置允许的图片来源
5. ✅ 修复数据库中空的头像字段

### 相关文件修改
- `server/src/gamecore/matching/MatchPlayers.js` - _playerJoin 方法
- `server/src/games/chinesechess/gamepagehierarchy/ChineseChessTable.js` - broadcastRoomState 方法
- `client/src/gamecore/hierarchy/GameTableView.tsx` - 头像显示注释
- `client/next.config.js` - 新增配置文件

### 工具脚本
- `server/fix-empty-avatars.js` - 修复空头像
- `server/check-user-avatars.js` - 检查头像
- `server/verify-avatar-workflow.js` - 验证工作流
