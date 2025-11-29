# 玩家数据库系统文档

## 概述

HappyGames 平台的玩家数据库系统提供完整的用户资料管理、游戏数据统计和账户管理功能。

## 数据结构

### 用户模型 (User)

#### 基础身份信息
| 字段 | 类型 | 说明 | 可修改 |
|------|------|------|--------|
| `userId` | String | 平台唯一编号 (如: HG00000001) | ❌ 永不可改 |
| `username` | String | Pi 用户名 (登录凭证) | ❌ 永不可改 |
| `piId` | String | Pi Network ID | ❌ 永不可改 |

#### 个人资料
| 字段 | 类型 | 说明 | 默认值 | 可修改 |
|------|------|------|--------|--------|
| `nickname` | String | 昵称 (唯一) | Pi 用户名 | ✅ 可修改 |
| `avatar` | String | 头像 URL | 默认卡通头像 | ✅ 可修改 |
| `gender` | String | 性别 (male/female) | 随机生成 | ✅ 可修改 |

#### 游戏货币
| 字段 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `happyBeans` | Number | 欢乐豆数量 | 10000 |

#### 游戏统计数据 (gameStats 数组)
每个游戏一个对象，包含以下字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `gameType` | String | 游戏类型标识 (如: chinesechess) |
| `gameName` | String | 游戏名称 (如: 中国象棋) |
| `rating` | Number | 等级分 (默认: 1200) |
| `title` | String | 称号 (如: 初出茅庐) |
| `titleColor` | String | 称号颜色 (十六进制) |
| `gamesPlayed` | Number | 总场次 |
| `wins` | Number | 胜场 |
| `losses` | Number | 负场 |
| `draws` | Number | 平局 |
| `disconnects` | Number | 掉线次数 |
| `winRate` | Number | 胜率 (百分比) |
| `disconnectRate` | Number | 掉线率 (百分比) |
| `maxWinStreak` | Number | 最高连胜 |
| `currentWinStreak` | Number | 当前连胜 |
| `gameSpecificData` | Object | 游戏特定数据 (JSON) |
| `lastPlayedAt` | Date | 最后游戏时间 |
| `firstPlayedAt` | Date | 首次游戏时间 |

#### 账户状态
| 字段 | 类型 | 说明 |
|------|------|------|
| `accountStatus` | String | 账户状态 (active/banned/suspended) |
| `lastLoginAt` | Date | 最后登录时间 |
| `loginCount` | Number | 登录次数 |
| `createdAt` | Date | 账户创建时间 |

## API 接口

### 用户资料管理

#### 1. 获取用户信息
```
GET /api/user/profile
Authorization: Bearer <token>
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "userId": "HG00000001",
    "username": "pi_user_123",
    "nickname": "玩家昵称",
    "avatar": "/uploads/avatars/avatar-123456.png",
    "gender": "male",
    "happyBeans": 10000,
    "gameStats": [...],
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

#### 2. 更新昵称
```
PUT /api/user/nickname
Authorization: Bearer <token>
Content-Type: application/json

{
  "nickname": "新昵称"
}
```

**规则：**
- 不能为空
- 长度不超过 20 个字符
- 不能与其他用户重复

#### 3. 更新性别
```
PUT /api/user/gender
Authorization: Bearer <token>
Content-Type: application/json

{
  "gender": "male" // 或 "female"
}
```

#### 4. 上传头像
```
POST /api/user/avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data

avatar: <图片文件>
```

**限制：**
- 文件大小：最大 1MB
- 文件类型：jpeg, jpg, png, gif
- 旧头像会自动删除（默认头像除外）

#### 5. 检查昵称可用性
```
GET /api/user/check-nickname/:nickname
```

**响应示例：**
```json
{
  "success": true,
  "available": true
}
```

#### 6. 获取欢乐豆余额
```
GET /api/user/happy-beans
Authorization: Bearer <token>
```

### 游戏统计数据

#### 7. 获取指定游戏统计
```
GET /api/user/game-stats/:gameType
Authorization: Bearer <token>
```

**示例：** `GET /api/user/game-stats/chinesechess`

#### 8. 获取所有游戏统计
```
GET /api/user/game-stats
Authorization: Bearer <token>
```

## 用户模型方法

### 实例方法

#### getOrCreateGameStats(gameType, gameName)
获取或创建游戏统计数据。如果用户首次玩某个游戏，会自动创建该游戏的统计记录。

```javascript
const stats = user.getOrCreateGameStats('chinesechess', '中国象棋');
```

#### updateGameStats(gameType, updates)
更新游戏统计数据，自动重新计算胜率和掉线率。

```javascript
user.updateGameStats('chinesechess', {
    gamesPlayed: stats.gamesPlayed + 1,
    wins: stats.wins + 1,
    currentWinStreak: stats.currentWinStreak + 1
});
await user.save();
```

#### addHappyBeans(amount)
增加欢乐豆。

```javascript
user.addHappyBeans(1000);
await user.save();
```

#### deductHappyBeans(amount)
扣除欢乐豆，余额不足时返回 false。

```javascript
const success = user.deductHappyBeans(500);
if (success) {
    await user.save();
} else {
    // 余额不足
}
```

### 静态方法

#### generateUserId()
生成唯一的用户 ID。

```javascript
const userId = await User.generateUserId();
// 返回: "HG00000001"
```

#### isNicknameAvailable(nickname, excludeUserId)
检查昵称是否可用。

```javascript
const available = await User.isNicknameAvailable('新昵称', 'HG00000001');
```

## 认证流程

### 1. 用户首次登录
1. 用户使用 Pi Network 账号登录
2. 系统验证 JWT token
3. 检查用户是否存在
4. **如果不存在，自动创建新用户：**
   - 生成唯一 userId (HG00000001, HG00000002, ...)
   - 记录 Pi 用户名（永不可改）
   - 设置默认昵称（与 Pi 用户名相同）
   - 设置默认头像
   - 随机生成性别
   - 赠送 10000 欢乐豆
   - 生成推荐码
5. 更新最后登录时间和登录次数
6. 返回用户信息

### 2. 用户再次登录
1. 验证 JWT token
2. 查找现有用户
3. 更新最后登录时间和登录次数
4. 返回用户信息

## 默认头像

所有新用户的默认头像为可爱的卡通小熊图片：
- 路径：`/images/default-avatar.png`
- 用户可在个人主页上传自定义头像
- 上传限制：最大 1MB

## 游戏数据管理

### 首次玩游戏
当用户首次玩某个游戏时，系统会自动创建该游戏的统计记录：

```javascript
// 在游戏开始时
const stats = user.getOrCreateGameStats('chinesechess', '中国象棋');
await user.save();
```

### 游戏结束更新数据
游戏结束后，更新统计数据：

```javascript
// 获取游戏统计
const stats = user.gameStats.find(s => s.gameType === 'chinesechess');

// 更新数据
user.updateGameStats('chinesechess', {
    gamesPlayed: stats.gamesPlayed + 1,
    wins: stats.wins + (isWin ? 1 : 0),
    losses: stats.losses + (isLoss ? 1 : 0),
    draws: stats.draws + (isDraw ? 1 : 0),
    currentWinStreak: isWin ? stats.currentWinStreak + 1 : 0,
    maxWinStreak: Math.max(stats.maxWinStreak, newStreak),
    rating: newRating
});

await user.save();
```

### 详细数据显示
- **游戏大厅**：只显示基础信息（昵称、头像、欢乐豆）
- **游戏中心**：显示该游戏的详细统计（等级分、称号、胜率、掉线率等）
- **个人主页**：显示所有游戏的统计数据

## 数据安全

### 不可修改字段
以下字段永远不可修改，确保用户身份的唯一性：
- `userId` - 平台唯一编号
- `username` - Pi 用户名
- `piId` - Pi Network ID
- `createdAt` - 账户创建时间

### 唯一性约束
以下字段必须唯一：
- `userId`
- `username`
- `piId`
- `nickname` - 昵称（可修改，但不能与其他用户重复）
- `referralCode` - 推荐码

## 使用示例

### 完整的用户注册和游戏流程

```javascript
// 1. 用户首次登录（自动创建）
// 通过认证中间件自动处理

// 2. 用户修改昵称
await fetch('/api/user/nickname', {
    method: 'PUT',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ nickname: '象棋大师' })
});

// 3. 用户上传头像
const formData = new FormData();
formData.append('avatar', file);

await fetch('/api/user/avatar', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`
    },
    body: formData
});

// 4. 用户开始游戏（服务端）
const user = await User.findById(userId);
const stats = user.getOrCreateGameStats('chinesechess', '中国象棋');
await user.save();

// 5. 游戏结束，更新数据（服务端）
user.updateGameStats('chinesechess', {
    gamesPlayed: stats.gamesPlayed + 1,
    wins: stats.wins + 1,
    rating: newRating
});

// 扣除/增加欢乐豆
user.deductHappyBeans(100); // 下注
user.addHappyBeans(200); // 获胜奖励

await user.save();
```

## 相关文件

- `server/src/models/User.js` - 用户数据模型
- `server/src/routes/user.js` - 用户 API 路由
- `server/src/middleware/auth.js` - 认证中间件
- `server/public/images/default-avatar.png` - 默认头像

## 注意事项

1. **昵称唯一性**：修改昵称前必须检查是否已被使用
2. **头像大小**：限制 1MB，超过会被拒绝
3. **性别设置**：首次登录随机生成，之后可自由修改
4. **游戏数据**：首次玩游戏时自动创建，不需要手动初始化
5. **欢乐豆**：扣除前检查余额，避免出现负数
6. **数据持久化**：所有修改后记得调用 `user.save()`
