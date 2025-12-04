# Socket 架构文档

## 📋 概述

本文档说明 HappyGames 平台中所有与 Socket.IO 相关的文件和它们的用途。

---

## 🔧 后端 Socket 架构

### 核心网络层

#### 1. `server/src/core/network/SocketServer.js`
**用途**: Socket.IO 服务器核心
- 初始化 Socket.IO 服务器
- 配置 CORS 跨域策略
- 处理用户连接鉴权
- 管理游戏中心注册
- 分发 `start_game` 事件到对应的游戏中心

**关键功能**:
```javascript
- setupMiddleware()      // 配置鉴权中间件
- registerGameCenter()   // 注册游戏中心
- handleStartGame()      // 处理开始游戏请求
- handleDisconnect()     // 处理断线
```

---

### 大厅系统

#### 2. `server/src/socket/lobbyHandler.js`
**用途**: 大厅事件处理器
- 处理玩家加入大厅
- 广播大厅动态 Feed（加入、充值、提现）
- 提供生态池统计信息

**监听事件**:
- `join_lobby` - 玩家加入大厅
- `deposit` - 充值通知
- `withdraw` - 提现通知

**发送事件**:
- `lobby_update` - 大厅数据更新
- `lobby_feed` - 大厅动态消息

---

### 游戏架构层（四层架构）

#### 3. `server/src/gamecore/hierarchy/GameCenter.js`
**用途**: 游戏中心基类
- 管理游戏房间集合
- 提供用户统计数据获取
- 定义子类需要实现的接口

**核心方法**:
```javascript
- initGameRooms()        // 初始化游戏房间（子类实现）
- getUserStats()         // 获取用户统计
- broadcastRoomList()    // 广播房间列表
```

#### 4. `server/src/gamecore/hierarchy/GameRoom.js`
**用途**: 游戏房间基类
- 管理游戏桌列表
- 设置准入规则（等级分限制）
- 提供房间信息

**核心方法**:
```javascript
- setAccessRule()        // 设置准入规则
- canAccess()            // 检查玩家是否有权进入
- getRoomInfo()          // 获取房间信息
```

#### 5. `server/src/gamecore/hierarchy/GameTable.js`
**用途**: 游戏桌基类
- 管理玩家列表（玩家、旁观者）
- 处理准备/取消准备
- 触发游戏开始
- 管理游戏对局

**监听事件**:
- `player_ready` - 玩家准备
- `player_unready` - 取消准备
- `leave_table` - 离开游戏桌

**发送事件**:
- `state` - 游戏桌状态更新
- `player_joined` - 玩家加入
- `player_left` - 玩家离开
- `player_ready_changed` - 准备状态变化
- `game_start` - 游戏开始

---

### 匹配系统

#### 6. `server/src/gamecore/matching/MatchPlayers.js`
**用途**: 玩家匹配系统
- 自动匹配玩家
- 管理匹配队列
- 处理掉线追踪

**核心类**:
- `MatchMaker` - 匹配管理器
- `MatchingRules` - 匹配规则

---

### 辅助服务

#### 7. `server/src/gamecore/DisconnectTracker.js`
**用途**: 掉线统计服务
- 记录玩家掉线次数
- 计算掉线率
- 提供玩家统计信息

**核心方法**:
```javascript
- recordDisconnect()     // 记录掉线
- getDisconnectRate()    // 获取掉线率
- getPlayerStats()       // 获取玩家统计
```

---

### 具体游戏实现

#### 8. `server/src/games/chinesechess/gamepagehierarchy/ChineseChessCenter.js`
**用途**: 中国象棋游戏中心
- 继承自 `GameCenter`
- 初始化象棋房间（免豆室、初级室、中级室、高级室）
- 处理象棋特定事件

**监听事件**:
- `chinesechess_get_rooms` - 获取房间列表
- `chinesechess_get_stats` - 获取用户统计
- `chinesechess_join` - 加入游戏桌
- `auto_match` - 自动匹配
- `cancel_match` - 取消匹配

#### 9. `server/src/games/chinesechess/gamepagehierarchy/ChineseChessRoom.js`
**用途**: 中国象棋游戏房间
- 继承自 `GameRoom`
- 管理象棋游戏桌
- 设置象棋特有规则（时间限制、悔棋、求和）

#### 10. `server/src/games/chinesechess/gamepagehierarchy/ChineseChessTable.js`
**用途**: 中国象棋游戏桌
- 继承自 `GameTable`
- 处理象棋特定逻辑（悔棋、求和、认输）

---

## 🎨 前端 Socket 架构

### 游戏架构层（四层架构）

#### 1. `client/src/gamecore/hierarchy/GameCenterClient.ts`
**用途**: 游戏中心客户端基类
- 连接到游戏中心
- 获取房间列表
- 管理用户统计数据
- 管理 GameRoomClient 实例

**核心方法**:
```typescript
- init()                 // 初始化
- joinGameCenter()       // 加入游戏中心
- getRoomList()          // 获取房间列表
- selectRoom()           // 选择房间
```

**监听事件**:
- `room_list` - 房间列表更新
- `user_stats` - 用户统计更新

**发送事件**:
- `start_game` - 开始游戏（加入游戏中心）
- `${gameType}_get_rooms` - 获取房间列表
- `${gameType}_get_stats` - 获取用户统计

#### 2. `client/src/gamecore/hierarchy/GameRoomClient.ts`
**用途**: 游戏房间客户端基类
- 管理房间信息
- 获取游戏桌列表
- 选择游戏桌
- 管理 GameTableClient 实例

**核心方法**:
```typescript
- enterRoom()            // 进入房间
- leaveRoom()            // 离开房间
- getTableList()         // 获取游戏桌列表
- selectTable()          // 选择游戏桌
```

**监听事件**:
- `table_list` - 游戏桌列表更新

#### 3. `client/src/gamecore/hierarchy/GameTableClient.ts`
**用途**: 游戏桌客户端基类
- 管理游戏桌状态
- 处理玩家加入/离开
- 处理准备/取消准备
- 管理 GameMatchClient 实例

**核心方法**:
```typescript
- joinTable()            // 加入游戏桌
- leaveTable()           // 离开游戏桌
- setReady()             // 设置准备状态
```

**监听事件**:
- `state` - 游戏桌状态更新
- `player_joined` - 玩家加入
- `player_left` - 玩家离开
- `player_ready_changed` - 准备状态变化
- `game_start` - 游戏开始

#### 4. `client/src/gamecore/hierarchy/GameMatchClient.ts`
**用途**: 游戏对局客户端基类
- 管理游戏对局状态
- 处理游戏逻辑
- 处理游戏结束

**核心方法**:
```typescript
- init()                 // 初始化
- dispose()              // 清理资源
```

---

### 辅助工具

#### 5. `client/src/gamecore/useGameRoomList.ts`
**用途**: 游戏房间列表 Hook
- Socket.IO + HTTP 双通道获取房间列表
- 自动故障切换
- 定时刷新

**使用方法**:
```typescript
const rooms = useGameRoomList(roomClient, 'beginner');
```

---

### 具体游戏实现

#### 6. `client/src/games/chinesechess/gamepagehierarchy/ChineseChessCenterClient.ts`
**用途**: 中国象棋游戏中心客户端
- 继承自 `GameCenterClient`
- 管理象棋游戏中心状态

#### 7. `client/src/games/chinesechess/gamepagehierarchy/ChineseChessRoomClient.ts`
**用途**: 中国象棋游戏房间客户端
- 继承自 `GameRoomClient`
- 管理象棋游戏房间状态

#### 8. `client/src/games/chinesechess/gamepagehierarchy/ChineseChessTableClient.ts`
**用途**: 中国象棋游戏桌客户端
- 继承自 `GameTableClient`
- 管理象棋游戏桌状态

#### 9. `client/src/games/chinesechess/gamepagehierarchy/ChineseChessMatchClient.ts`
**用途**: 中国象棋对局客户端
- 继承自 `GameMatchClient`
- 管理象棋对局逻辑

---

### 页面组件

#### 10. `client/src/app/lobby/LobbyDashboard.tsx`
**用途**: 游戏大厅组件
- 连接 Socket.IO
- 显示大厅数据
- 显示大厅动态 Feed

#### 11. `client/src/app/game/chinesechess/page.tsx`
**用途**: 中国象棋游戏中心页面
- 初始化 ChineseChessCenterClient
- 显示房间列表
- 显示用户统计

---

## 🗑️ 已删除的文件

以下文件已被删除，因为它们未被使用：

1. ~~`server/src/gamecore/queue.js`~~ - 持久化队列（未使用）
2. ~~`server/src/gamecore/StateManager.js`~~ - 状态管理器（未使用）

---

## 📊 架构图

```
前端                                后端
────────────────────────────────────────────────────────
LobbyDashboard ──────────────────→ lobbyHandler
                                   (大厅事件)

ChineseChessPage
    ↓
ChineseChessCenterClient ────────→ ChineseChessCenter
    ↓                              (游戏中心)
ChineseChessRoomClient ──────────→ ChineseChessRoom
    ↓                              (游戏房间)
ChineseChessTableClient ─────────→ ChineseChessTable
    ↓                              (游戏桌)
ChineseChessMatchClient ─────────→ ChineseChessMatch
                                   (游戏对局)
```

---

## 🔄 事件流程

### 1. 加入游戏中心
```
前端: emit('start_game', 'chinesechess')
  ↓
后端: SocketServer.handleStartGame()
  ↓
后端: ChineseChessCenter.playerJoinGameCenter()
```

### 2. 获取房间列表
```
前端: emit('chinesechess_get_rooms')
  ↓
后端: ChineseChessCenter.handleGetRooms()
  ↓
后端: emit('room_list', rooms)
  ↓
前端: GameCenterClient 接收并更新状态
```

### 3. 加入游戏桌
```
前端: emit('chinesechess_join', { tier, roomId })
  ↓
后端: ChineseChessCenter 处理
  ↓
后端: ChineseChessRoom.assignPlayerToTable()
  ↓
后端: ChineseChessTable.joinTable()
  ↓
后端: emit('state', tableState)
  ↓
前端: GameTableClient 接收并更新状态
```

---

## ✅ 总结

当前的 Socket 架构已经过清理，所有文件都是必需的：

- **后端**: 13 个文件（核心 + 游戏实现）
- **前端**: 12 个文件（核心 + 游戏实现 + UI）

所有文件都遵循四层架构模式：
1. **GameCenter** - 游戏中心层
2. **GameRoom** - 游戏房间层
3. **GameTable** - 游戏桌层
4. **GameMatch** - 游戏对局层

这个架构清晰、模块化，易于扩展新游戏。
