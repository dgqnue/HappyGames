# HappyGames 服务端架构重构说明

## 概述

本次重构将游戏服务端代码按照职责进行了彻底解耦，分为以下几个核心模块：

1. **网络通信模块** (Network)
2. **匹配系统模块** (Matching)
3. **游戏层级模块** (Hierarchy)
4. **游戏逻辑模块** (Game)

## 目录结构

```
server/src/
├── core/                          # 核心模块目录
│   ├── network/                   # 网络通信模块
│   │   ├── SocketServer.js       # Socket.IO 服务器（连接管理、鉴权、事件分发）
│   │   └── HttpService.js        # HTTP API 服务（提供 REST 接口）
│   │
│   ├── matching/                  # 匹配系统模块
│   │   └── MatchMaker.js         # 匹配器（管理匹配队列、执行匹配算法）
│   │
│   ├── hierarchy/                 # 游戏层级模块
│   │   ├── GameManager.js        # 游戏管理器基类（管理游戏室和游戏桌）
│   │   ├── GameTier.js           # 游戏室类（按等级分类的游戏区域）
│   │   └── GameTable.js          # 游戏桌基类（具体的游戏对局实例）
│   │
│   └── game/                      # 游戏加载模块
│       └── GameLoader.js         # 游戏加载器（动态加载所有游戏）
│
├── games/                         # 具体游戏实现目录
│   └── chinesechess/             # 中国象棋游戏
│       ├── ChineseChessManager.js # 象棋管理器（继承 GameManager）
│       ├── rooms/
│       │   └── ChineseChessRoom.js # 象棋游戏桌（继承 GameTable）
│       └── logic/
│           └── XiangqiRules.js   # 象棋规则引擎
│
├── gamecore/                      # 旧核心模块（待逐步迁移）
│   ├── EloService.js             # ELO 等级分服务
│   ├── TitleService.js           # 称号服务
│   └── auth.js                   # 鉴权工具
│
└── index.js                       # 主入口文件

```

## 模块详解

### 1. 网络通信模块 (core/network/)

#### SocketServer.js
**职责：**
- 初始化 Socket.IO 服务器
- 处理客户端连接和鉴权
- 分发游戏相关事件到对应的游戏管理器
- 管理玩家断线重连

**核心方法：**
- `constructor(server)` - 初始化 Socket 服务
- `setupMiddleware()` - 配置鉴权中间件
- `registerGameManager(gameType, manager)` - 注册游戏管理器
- `handleStartGame(socket, gameType)` - 处理玩家开始游戏请求
- `handleDisconnect(socket)` - 处理玩家断线

#### HttpService.js
**职责：**
- 提供 HTTP API 接口作为 Socket.IO 的备用方案
- 处理游戏房间列表查询
- 提供游戏状态查询接口

**核心方法：**
- `handleGetRooms(req, res)` - 获取游戏房间列表
- `handleGetGameList(req, res)` - 获取所有游戏列表

---

### 2. 匹配系统模块 (core/matching/)

#### MatchMaker.js
**职责：**
- 管理所有游戏的匹配队列
- 执行匹配算法，为玩家寻找合适的对手
- 触发匹配成功事件

**核心方法：**
- `start()` - 启动匹配服务（定时检查队列）
- `joinQueue(gameType, player)` - 玩家加入匹配队列
- `leaveQueue(gameType, userId)` - 玩家离开匹配队列
- `matchGame(gameType)` - 执行特定游戏的匹配逻辑
- `isMatchCompatible(p1, p2)` - 检查两个玩家是否兼容

**匹配流程：**
1. 玩家调用 `joinQueue()` 加入队列
2. 定时器每 3 秒调用 `processQueues()` 检查所有队列
3. 对每个游戏调用 `matchGame()` 执行匹配
4. 找到匹配后调用注册的回调函数（由 GameManager 提供）
5. GameManager 负责创建游戏桌并将玩家加入

---

### 3. 游戏层级模块 (core/hierarchy/)

这个模块定义了游戏的三层结构：**游戏管理器 → 游戏室 → 游戏桌**

#### GameManager.js (游戏管理器基类)
**职责：**
- 管理一个游戏类型的所有资源
- 初始化游戏室（按等级分类）
- 处理玩家进入游戏的请求
- 协调匹配系统和游戏桌

**核心方法：**
- `initTiers()` - 初始化游戏室（可被子类重写）
- `createTier(id, name, minRating, maxRating)` - 创建游戏室
- `onPlayerJoin(socket)` - 处理玩家进入游戏
- `handleGetRooms(socket, tierId)` - 处理获取房间列表
- `handleJoinTable(socket, data)` - 处理加入游戏桌
- `handleAutoMatch(socket, settings)` - 处理自动匹配
- `handleMatchFound(players)` - 处理匹配成功
- `setupTableListeners(socket, table)` - 设置游戏桌相关的 Socket 监听

#### GameTier.js (游戏室类)
**职责：**
- 管理特定等级的游戏桌集合
- 维护准入规则（等级分限制）
- 提供游戏桌查询和创建功能

**核心方法：**
- `setAccessRule(minRating, maxRating)` - 设置准入规则
- `canAccess(playerRating)` - 检查玩家是否有权进入
- `initTables(count)` - 初始化游戏桌
- `addTable()` - 添加新游戏桌
- `getTableList()` - 获取游戏桌列表信息
- `findAvailableTable()` - 查找可用游戏桌
- `findTable(tableId)` - 根据 ID 查找游戏桌

#### GameTable.js (游戏桌基类)
**职责：**
- 管理单个游戏对局
- 处理玩家入座、准备、离开
- 管理游戏状态（idle, playing, finished）
- 处理游戏内通信（广播、单发）
- 执行结算逻辑

**核心方法：**
- `join(socket, options)` - 玩家入座
- `leave(socket)` - 玩家离开
- `playerReady(socket)` - 玩家准备
- `checkStart()` - 检查是否可以开始游戏
- `startGame()` - 开始游戏
- `endGame(result)` - 结束游戏
- `broadcast(event, data)` - 广播消息到桌内所有人
- `sendToPlayer(socketId, event, data)` - 发送消息给特定玩家
- `settle(result)` - 执行结算

**钩子方法（子类实现）：**
- `onGameStart()` - 游戏开始时的逻辑
- `onGameEnd(result)` - 游戏结束时的逻辑
- `onPlayerDisconnectDuringGame(userId)` - 游戏中玩家断线的处理

---

### 4. 游戏加载模块 (core/game/)

#### GameLoader.js
**职责：**
- 动态扫描并加载所有游戏模块
- 实例化游戏管理器
- 统一管理匹配系统

**核心方法：**
- `loadAll(io)` - 加载所有游戏
- `loadGame(io, gameType, gamePath)` - 加载单个游戏
- `registerToSocketServer(socketServer)` - 注册到 Socket 服务器
- `getManager(gameType)` - 获取游戏管理器
- `getGameList()` - 获取所有游戏列表

---

## 具体游戏实现示例：中国象棋

### ChineseChessManager.js
继承自 `GameManager`，负责：
- 初始化象棋的游戏室
- 处理象棋特有的事件（悔棋、求和等）

### ChineseChessRoom.js
继承自 `GameTable`，负责：
- 实现象棋的游戏逻辑
- 处理棋子移动
- 判断胜负
- 处理断线判负

---

## 数据流示例

### 玩家手动加入游戏桌的流程

```
1. 客户端发送 'start_game' 事件 → SocketServer
2. SocketServer 调用 GameManager.onPlayerJoin(socket)
3. 客户端发送 'get_rooms' 事件 → GameManager
4. GameManager 返回游戏桌列表
5. 客户端选择游戏桌，发送 'chinesechess_join' 事件
6. GameManager.handleJoinTable() 处理：
   - 检查权限（等级分）
   - 查找或创建游戏桌
   - 调用 GameTable.join(socket)
   - 设置 Socket 监听器
7. 游戏桌广播 'player_joined' 事件给桌内所有人
```

### 玩家自动匹配的流程

```
1. 客户端发送 'auto_match' 事件 → GameManager
2. GameManager.handleAutoMatch() 调用 MatchMaker.joinQueue()
3. MatchMaker 定时检查队列，找到匹配
4. MatchMaker 调用 GameManager.handleMatchFound(players)
5. GameManager：
   - 查找或创建空闲游戏桌
   - 将匹配的玩家加入游戏桌
   - 自动设置玩家为准备状态
6. 游戏桌检测到所有人准备，自动开始游戏
```

---

## 旧模块迁移计划

以下模块暂时保留在 `gamecore/` 目录，后续可逐步迁移：

1. **EloService.js** → 可迁移到 `core/services/EloService.js`
2. **TitleService.js** → 可迁移到 `core/services/TitleService.js`
3. **auth.js** → 可迁移到 `core/network/AuthService.js`
4. **DisconnectTracker.js** → 功能已整合到 GameTable 中
5. **MatchRoomState.js** → 功能已整合到 GameTable 中
6. **MatchableGameRoom.js** → 已被 GameTable 替代
7. **BaseGameManager.js** → 已被 GameManager 替代
8. **AutoMatchManager.js** → 已被 MatchMaker 替代

---

## 优势

### 1. 清晰的职责分离
- 每个模块只负责一个明确的功能
- 易于理解和维护

### 2. 高度可扩展
- 添加新游戏只需继承 GameManager 和 GameTable
- 无需修改核心代码

### 3. 易于测试
- 每个模块可以独立测试
- 依赖注入使得 mock 更容易

### 4. 代码复用
- 通用逻辑在基类中实现
- 游戏特定逻辑在子类中实现

### 5. 统一的匹配系统
- 所有游戏共享一个匹配器
- 匹配算法可以统一优化

---

## 使用指南

### 如何添加新游戏

1. 在 `server/src/games/` 下创建游戏目录，如 `mygame/`
2. 创建游戏管理器 `MyGameManager.js`：
   ```javascript
   const GameManager = require('../../core/hierarchy/GameManager');
   const MyGameTable = require('./rooms/MyGameTable');

   class MyGameManager extends GameManager {
       constructor(io, matchMaker) {
           super(io, 'mygame', MyGameTable, matchMaker);
       }
   }

   module.exports = MyGameManager;
   ```

3. 创建游戏桌 `rooms/MyGameTable.js`：
   ```javascript
   const GameTable = require('../../../core/hierarchy/GameTable');

   class MyGameTable extends GameTable {
       constructor(io, tableId, tier) {
           super(io, tableId, 'mygame', 2, tier);
       }

       onGameStart() {
           // 实现游戏开始逻辑
       }

       handleMove(socket, move) {
           // 实现移动逻辑
       }
   }

   module.exports = MyGameTable;
   ```

4. 重启服务器，GameLoader 会自动加载新游戏

---

## 注意事项

1. **向后兼容**：旧的 `gamecore/` 模块暂时保留，确保现有功能不受影响
2. **逐步迁移**：建议先测试新架构，确认稳定后再移除旧代码
3. **数据库兼容**：新架构使用相同的数据模型，无需修改数据库
4. **客户端兼容**：Socket 事件名称保持不变，客户端无需修改

---

## 后续优化建议

1. 将 EloService、TitleService 迁移到 `core/services/`
2. 实现更复杂的匹配算法（基于 ELO、胜率等）
3. 添加游戏桌观战功能
4. 实现游戏录像和回放功能
5. 添加游戏统计和分析功能
