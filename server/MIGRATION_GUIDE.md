# 代码迁移指南

本文档说明如何从旧架构迁移到新架构，以及新旧模块的对应关系。

## 新旧模块对照表

| 旧模块 | 新模块 | 状态 | 说明 |
|-------|-------|------|------|
| `gamecore/socket.js` | `core/network/SocketServer.js` | ✅ 已替换 | Socket 连接管理 |
| - | `core/network/HttpService.js` | ✅ 新增 | HTTP API 服务 |
| `gamecore/AutoMatchManager.js` | `core/matching/MatchMaker.js` | ✅ 已替换 | 匹配系统 |
| `gamecore/BaseGameManager.js` | `core/hierarchy/GameManager.js` | ✅ 已替换 | 游戏管理器基类 |
| `gamecore/BaseGameRoom.js` | `core/hierarchy/GameTable.js` | ✅ 已替换 | 游戏桌基类 |
| `gamecore/MatchableGameRoom.js` | `core/hierarchy/GameTable.js` | ✅ 已合并 | 功能已整合 |
| `gamecore/MatchRoomState.js` | `core/hierarchy/GameTable.js` | ✅ 已合并 | 状态管理已整合 |
| - | `core/hierarchy/GameTier.js` | ✅ 新增 | 游戏室管理 |
| - | `core/game/GameLoader.js` | ✅ 新增 | 游戏动态加载 |
| `gamecore/EloService.js` | `gamecore/EloService.js` | ⏳ 保留 | 待迁移到 core/services/ |
| `gamecore/TitleService.js` | `gamecore/TitleService.js` | ⏳ 保留 | 待迁移到 core/services/ |
| `gamecore/auth.js` | `gamecore/auth.js` | ⏳ 保留 | 待迁移到 core/network/ |
| `gamecore/DisconnectTracker.js` | - | ❌ 已废弃 | 功能已整合到 GameTable |
| `gamecore/StateManager.js` | - | ❌ 已废弃 | 功能已整合到 GameTable |

---

## 主要变化说明

### 1. Socket 通信层

#### 旧架构
```javascript
// gamecore/socket.js
class SocketDispatcher {
    constructor(server) {
        this.io = socketIo(server);
        this.games = {}; // 直接存储游戏管理器
        this.loadGames(); // 在构造函数中加载
    }
    
    loadGames() {
        // 手动扫描和加载游戏
    }
}
```

#### 新架构
```javascript
// core/network/SocketServer.js
class SocketServer {
    constructor(server) {
        this.io = socketIo(server);
        this.gameManagers = new Map(); // 使用 Map 存储
        // 不再负责加载游戏
    }
    
    registerGameManager(gameType, manager) {
        // 由外部注册游戏管理器
    }
}

// core/game/GameLoader.js
class GameLoader {
    loadAll(io) {
        // 专门负责加载游戏
    }
}
```

**优势：**
- 职责分离：SocketServer 只负责连接，GameLoader 负责加载
- 更易测试：可以单独测试 SocketServer 而不需要加载游戏

---

### 2. 匹配系统

#### 旧架构
```javascript
// gamecore/AutoMatchManager.js
class AutoMatchManager {
    constructor() {
        this.matchQueues = {}; // 普通对象
        this.onMatchFound = null; // 回调函数
    }
    
    setMatchFoundHandler(handler) {
        this.onMatchFound = handler;
    }
}

// 使用方式
const matcher = new AutoMatchManager();
matcher.setMatchFoundHandler((gameType, players) => {
    // 处理匹配成功
});
```

#### 新架构
```javascript
// core/matching/MatchMaker.js
class MatchMaker {
    constructor() {
        this.queues = new Map(); // 使用 Map
        this.handlers = new Map(); // 支持多个游戏
    }
    
    registerHandler(gameType, handler) {
        // 每个游戏注册自己的处理器
    }
}

// 使用方式
const matchMaker = new MatchMaker();
matchMaker.registerHandler('chinesechess', (players) => {
    // 处理象棋匹配成功
});
```

**优势：**
- 支持多游戏：每个游戏有独立的处理器
- 更清晰的 API：使用 Map 而不是普通对象

---

### 3. 游戏管理器

#### 旧架构
```javascript
// gamecore/BaseGameManager.js
class BaseGameManager {
    constructor(io, gameType, RoomClass) {
        this.rooms = {
            free: [],
            beginner: [],
            intermediate: [],
            advanced: []
        };
        this.initRooms(); // 直接创建游戏桌
    }
    
    initRooms() {
        // 为每个 tier 创建游戏桌数组
    }
    
    handleJoin(socket, data) {
        // 直接处理加入逻辑
    }
}
```

#### 新架构
```javascript
// core/hierarchy/GameManager.js
class GameManager {
    constructor(io, gameType, TableClass, matchMaker) {
        this.tiers = new Map(); // 使用 GameTier 对象
        this.matchMaker = matchMaker; // 注入匹配器
        this.initTiers();
    }
    
    initTiers() {
        // 创建 GameTier 对象，而不是数组
        this.createTier('free', '免豆室', 0, Infinity);
    }
    
    createTier(id, name, minRating, maxRating) {
        const tier = new GameTier(id, name, ...);
        this.tiers.set(id, tier);
    }
    
    handleJoinTable(socket, data) {
        // 通过 GameTier 查找游戏桌
        const tier = this.tiers.get(data.tier);
        const table = tier.findTable(data.tableId);
    }
}
```

**优势：**
- 引入 GameTier 层：游戏室成为独立的对象
- 依赖注入：matchMaker 通过构造函数注入
- 更好的封装：每个 tier 管理自己的游戏桌

---

### 4. 游戏桌

#### 旧架构
```javascript
// gamecore/BaseGameRoom.js
class BaseGameRoom {
    constructor(io, roomId) {
        this.players = [];
    }
}

// gamecore/MatchableGameRoom.js
class MatchableGameRoom extends BaseGameRoom {
    constructor(io, roomId, gameType, maxPlayers, tier) {
        super(io, roomId);
        this.matchState = new MatchRoomState(...);
    }
}

// 游戏需要继承 MatchableGameRoom
class ChineseChessRoom extends MatchableGameRoom {
    // ...
}
```

#### 新架构
```javascript
// core/hierarchy/GameTable.js
class GameTable {
    constructor(io, tableId, gameType, maxPlayers, tier) {
        this.players = []; // 直接管理玩家数组
        this.status = 'idle'; // 直接管理状态
        // 不再需要 MatchRoomState
    }
    
    join(socket, options) {
        // 统一的加入逻辑
    }
    
    playerReady(socket) {
        // 统一的准备逻辑
    }
    
    checkStart() {
        // 统一的开始检查
    }
}

// 游戏直接继承 GameTable
class ChineseChessRoom extends GameTable {
    constructor(io, tableId, tier) {
        super(io, tableId, 'chinesechess', 2, tier);
    }
}
```

**优势：**
- 简化继承链：只需继承一个类
- 状态管理内置：不需要额外的 MatchRoomState
- 更清晰的 API：所有方法都在一个类中

---

## 迁移步骤

### 步骤 1：理解新架构

阅读以下文档：
1. `ARCHITECTURE.md` - 架构总览
2. `MODULE_INDEX.md` - 模块索引

### 步骤 2：测试新架构

1. 确保服务器可以正常启动
2. 测试中国象棋游戏（已迁移）
3. 检查匹配系统是否正常工作

### 步骤 3：迁移其他游戏（如果有）

对于每个游戏：

1. 创建新的 GameManager：
```javascript
// games/mygame/MyGameManager.js
const GameManager = require('../../core/hierarchy/GameManager');
const MyGameTable = require('./rooms/MyGameTable');

class MyGameManager extends GameManager {
    constructor(io, matchMaker) {
        super(io, 'mygame', MyGameTable, matchMaker);
    }
}

module.exports = MyGameManager;
```

2. 更新 GameTable：
```javascript
// games/mygame/rooms/MyGameTable.js
const GameTable = require('../../../core/hierarchy/GameTable');

class MyGameTable extends GameTable {
    constructor(io, tableId, tier) {
        super(io, tableId, 'mygame', maxPlayers, tier);
    }
    
    onGameStart() {
        // 从旧的 MatchableGameRoom 迁移逻辑
    }
    
    // 迁移其他方法...
}

module.exports = MyGameTable;
```

### 步骤 4：清理旧代码

确认新架构稳定后：

1. 删除 `gamecore/BaseGameManager.js`
2. 删除 `gamecore/MatchableGameRoom.js`
3. 删除 `gamecore/MatchRoomState.js`
4. 删除 `gamecore/AutoMatchManager.js`
5. 删除 `gamecore/socket.js`

### 步骤 5：迁移服务模块

将以下模块迁移到 `core/services/`：

```bash
# 创建 services 目录
mkdir server/src/core/services

# 移动文件
mv server/src/gamecore/EloService.js server/src/core/services/
mv server/src/gamecore/TitleService.js server/src/core/services/
```

更新引用：
```javascript
// 旧引用
const EloService = require('../../../gamecore/EloService');

// 新引用
const EloService = require('../../../core/services/EloService');
```

---

## 常见问题

### Q1: 旧代码还能用吗？

**A:** 可以。新架构与旧架构共存，旧的 `gamecore/` 模块暂时保留。但建议尽快迁移到新架构。

### Q2: 需要修改客户端代码吗？

**A:** 不需要。Socket 事件名称和数据格式保持不变，客户端无需修改。

### Q3: 数据库需要迁移吗？

**A:** 不需要。新架构使用相同的数据模型，无需修改数据库。

### Q4: 如何回滚到旧架构？

**A:** 修改 `server/src/index.js`，使用旧的 SocketDispatcher：

```javascript
// 回滚到旧架构
const SocketDispatcher = require('./gamecore/socket');
const socketDispatcher = new SocketDispatcher(server);
```

### Q5: 性能会受影响吗？

**A:** 不会。新架构主要是代码组织的改进，运行时性能相同或更好（由于减少了不必要的中间层）。

---

## 代码对比示例

### 示例 1：创建游戏管理器

#### 旧方式
```javascript
// games/chinesechess/index.js
const BaseGameManager = require('../../gamecore/BaseGameManager');
const ChineseChessRoom = require('./rooms/ChineseChessRoom');
const AutoMatchManager = require('../../gamecore/AutoMatchManager');

class ChineseChessManager extends BaseGameManager {
    constructor(io) {
        super(io, 'chinesechess', ChineseChessRoom);
        this.autoMatcher = new AutoMatchManager();
        this.autoMatcher.setMatchFoundHandler((gameType, players) => {
            this.handleMatchFound(players);
        });
    }
}
```

#### 新方式
```javascript
// games/chinesechess/ChineseChessManager.js
const GameManager = require('../../core/hierarchy/GameManager');
const ChineseChessRoom = require('./rooms/ChineseChessRoom');

class ChineseChessManager extends GameManager {
    constructor(io, matchMaker) {
        super(io, 'chinesechess', ChineseChessRoom, matchMaker);
        // matchMaker 已经注入，无需手动创建
    }
}
```

### 示例 2：创建游戏桌

#### 旧方式
```javascript
// 继承链：BaseGameRoom → MatchableGameRoom → ChineseChessRoom
const MatchableGameRoom = require('../../../gamecore/MatchableGameRoom');

class ChineseChessRoom extends MatchableGameRoom {
    constructor(io, roomId, tier) {
        super(io, roomId, 'chinesechess', 2, tier);
        // matchState 由父类创建
    }
    
    onGameStart() {
        // 使用 this.matchState.players
        const redPlayer = this.matchState.players[0];
    }
}
```

#### 新方式
```javascript
// 继承链：GameTable → ChineseChessRoom
const GameTable = require('../../../core/hierarchy/GameTable');

class ChineseChessRoom extends GameTable {
    constructor(io, tableId, tier) {
        super(io, tableId, 'chinesechess', 2, tier);
        // 直接使用 this.players
    }
    
    onGameStart() {
        // 直接使用 this.players
        const redPlayer = this.players[0];
    }
}
```

---

## 总结

新架构的核心改进：

1. **职责分离**：每个模块只做一件事
2. **依赖注入**：通过构造函数传递依赖
3. **层次清晰**：GameManager → GameTier → GameTable
4. **易于扩展**：添加新游戏更简单
5. **代码复用**：通用逻辑在基类中实现

迁移是渐进式的，可以先测试新架构，确认稳定后再清理旧代码。
