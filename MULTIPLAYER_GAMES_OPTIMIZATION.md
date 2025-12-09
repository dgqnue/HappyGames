# 🎮 多人游戏匹配系统优化方案

**文档版本**: 1.0  
**创建日期**: 2025年12月9日  
**应用范围**: 中国象棋、五子棋、麻将(4人)、扑克(4-6人)等多人游戏

---

## 📋 目录

1. [现状分析](#现状分析)
2. [核心优化策略](#核心优化策略)
3. [详细改进方案](#详细改进方案)
4. [实现清单](#实现清单)
5. [配置示例](#配置示例)
6. [测试计划](#测试计划)

---

## 现状分析

### ✅ 已有的多人支持

当前系统已经包含了基础的多人游戏支持：

```javascript
// MatchRoomState 构造函数
constructor(roomId, maxPlayers = 2) {
    this.maxPlayers = maxPlayers;
    this.players = [];
    // ... 座位分配逻辑已支持多人
}

// 座位分配（多人场景）
if (this.maxPlayers === 2) {
    // 两人特殊处理
    seatIndex = firstPlayerSeat === 0 ? 1 : 0;
} else {
    // 多人场景：分配最小未使用索引
    const usedSeatIndices = this.players.map(p => p.seatIndex);
    while (usedSeatIndices.includes(seatIndex)) {
        seatIndex++;
    }
}
```

### ❌ 存在的限制

1. **硬编码的 maxPlayers=2**
   - 构造函数中默认值为2
   - 某些逻辑仍然有针对两人的特殊处理
   - 四人麻将、六人扑克等场景没有充分测试

2. **准备判断过于简单**
   ```javascript
   // 目前判断
   static areAllPlayersReady(players, maxPlayers) {
       return players.length === maxPlayers && players.every(p => p.ready);
   }
   // 问题：没有考虑玩家掉线、弃牌等多人特有情况
   ```

3. **缺少多人特有的配置**
   - 没有针对不同游戏的座位策略
   - 观众功能未实现
   - 分级竞技没有多人支持

4. **倒计时逻辑不够灵活**
   - 只有 ready_timeout（准备倒计时）
   - 多人游戏可能需要 round_timeout（回合倒计时）
   - 缺少多轮游戏支持

---

## 核心优化策略

### 1️⃣ 策略 A: 座位分配与队伍模式

**四人麻将场景**:
```
座位分配模式：
- 顺序分配：座位 0,1,2,3 按入座顺序分配（当前实现）
- 相对位置：确保每个玩家与其他玩家的相对位置
- 队伍模式：可选的2v2配对（扑克等团队游戏）
```

**代码改进**:
```javascript
// 支持不同的座位策略
static SEAT_ASSIGNMENT_STRATEGY = {
    SEQUENTIAL: 'sequential',    // 顺序分配（麻将）
    BALANCED: 'balanced',        // 平衡分配（扑克）
    TEAM: 'team',               // 团队配对（桥牌）
    RANDOM: 'random'            // 随机分配（增加趣味）
};
```

### 2️⃣ 策略 B: 多人准备就绪判断

**差异化的就绪判断**:
```javascript
// 当前（两人）：所有人都准备
// 需求（多人）：
// - 最少人数要求：至少3/4人准备（允许1人掉线）
// - 活跃人数判断：排除掉线/弃牌的玩家
// - 动态倒计时：根据准备人数调整倒计时时间
```

### 3️⃣ 策略 C: 观众与旁观功能

**多人游戏的观众支持**:
```javascript
// 允许额外的玩家以观众身份加入
// - 不占用游戏座位
// - 可以进行语音/文本交互
// - 若有玩家掉线，观众可转换为玩家
```

### 4️⃣ 策略 D: 动态 maxPlayers 配置

**游戏初始化时设置**:
```javascript
// GameTable 子类中声明
class MahjongTable extends GameTable {
    constructor(io, roomId, tier) {
        super(io, roomId, 4, tier);  // 麻将4人
        // ...
    }
}

class PokerTable extends GameTable {
    constructor(io, roomId, tier) {
        super(io, roomId, 4, tier);  // 扑克4-6人（可配置）
        // ...
    }
}
```

### 5️⃣ 策略 E: 多轮游戏支持

**如麻将、扑克等多轮游戏**:
```javascript
// 一局游戏 = 多个回合 round
// 需要支持：
// - 回合倒计时（每个玩家的出牌时限）
// - 跨回合的状态保持
// - 单个回合超时处理（自动出牌）
```

---

## 详细改进方案

### 改进 1: 游戏配置类（新建）

**文件**: `server/src/gamecore/matching/GameConfig.js`

```javascript
/**
 * 游戏配置管理器
 * 定义不同游戏的配置（玩家数量、座位策略等）
 */
class GameConfig {
    // 游戏配置定义
    static GAME_CONFIGS = {
        chinesechess: {
            name: '中国象棋',
            minPlayers: 2,
            maxPlayers: 2,
            seatStrategy: 'sequential',
            supportSpectators: true,
            supportTeams: false,
            roundBased: false,
            bestOf: 1
        },
        gomoku: {
            name: '五子棋',
            minPlayers: 2,
            maxPlayers: 2,
            seatStrategy: 'sequential',
            supportSpectators: true,
            supportTeams: false,
            roundBased: false,
            bestOf: 1
        },
        mahjong: {
            name: '麻将',
            minPlayers: 3,
            maxPlayers: 4,
            seatStrategy: 'sequential',
            supportSpectators: false,  // 麻将通常不支持观众
            supportTeams: false,
            roundBased: true,
            bestOf: 8  // 8圈共32局
        },
        poker: {
            name: '扑克',
            minPlayers: 3,
            maxPlayers: 6,
            seatStrategy: 'balanced',
            supportSpectators: true,
            supportTeams: true,  // 可选的2v2或3v3
            roundBased: true,
            bestOf: 10
        }
    };

    /**
     * 获取游戏配置
     */
    static getConfig(gameType) {
        return this.GAME_CONFIGS[gameType] || null;
    }

    /**
     * 验证玩家数量是否有效
     */
    static isValidPlayerCount(gameType, playerCount) {
        const config = this.getConfig(gameType);
        if (!config) return false;
        return playerCount >= config.minPlayers && playerCount <= config.maxPlayers;
    }

    /**
     * 获取游戏是否需要人数满足才能开始
     */
    static requiresFullPlayers(gameType) {
        const config = this.getConfig(gameType);
        return config && config.minPlayers === config.maxPlayers;
    }
}

module.exports = GameConfig;
```

### 改进 2: 优化 MatchingRules（多人特定规则）

**关键增强**:

```javascript
/**
 * 多人游戏特定规则
 */
class MatchingRules {
    // ... 保留现有代码 ...

    /**
     * 检查多人场景下是否满足开始条件
     * @param {Array} players - 玩家列表
     * @param {number} maxPlayers - 最大玩家数
     * @param {Object} gameConfig - 游戏配置
     * @returns {Object} { canStart: boolean, reason: string }
     */
    static canStartMultiplayer(players, maxPlayers, gameConfig = {}) {
        const { minPlayers = maxPlayers, requireAllReady = true } = gameConfig;

        // 玩家数量检查
        if (players.length < minPlayers) {
            return {
                canStart: false,
                reason: `玩家数不足。需要 ${minPlayers} 人，当前 ${players.length} 人`
            };
        }

        // 如果要求所有人都准备
        if (requireAllReady && !players.every(p => p.ready)) {
            const unreadyCount = players.filter(p => !p.ready).length;
            return {
                canStart: false,
                reason: `${unreadyCount} 个玩家未准备`
            };
        }

        // 如果允许部分玩家掉线（留出1个人的余量）
        const readyCount = players.filter(p => p.ready).length;
        if (!requireAllReady && readyCount < minPlayers) {
            return {
                canStart: false,
                reason: `就绪玩家数不足。需要 ${minPlayers} 人，当前 ${readyCount} 人`
            };
        }

        return { canStart: true, reason: '满足开始条件' };
    }

    /**
     * 座位分配策略
     */
    static assignSeat(strategy, existingSeats, maxPlayers) {
        const usedSeats = new Set(existingSeats);

        switch (strategy) {
            case 'sequential':
                // 顺序分配：找到第一个未使用的座位
                for (let i = 0; i < maxPlayers; i++) {
                    if (!usedSeats.has(i)) return i;
                }
                return -1;  // 座位满

            case 'balanced':
                // 平衡分配：尽可能让玩家均匀分布
                // 优先分配"对面"座位，避免相邻
                const opposite = Math.floor(maxPlayers / 2);
                if (maxPlayers >= 4) {
                    // 4人：分配顺序 0, 2, 1, 3（尽可能对面）
                    const preferredOrder = [0, opposite, 1, 3];
                    for (let seat of preferredOrder) {
                        if (seat < maxPlayers && !usedSeats.has(seat)) {
                            return seat;
                        }
                    }
                }
                // 回退到顺序分配
                for (let i = 0; i < maxPlayers; i++) {
                    if (!usedSeats.has(i)) return i;
                }
                return -1;

            case 'random':
                // 随机分配
                const available = [];
                for (let i = 0; i < maxPlayers; i++) {
                    if (!usedSeats.has(i)) available.push(i);
                }
                return available.length > 0 
                    ? available[Math.floor(Math.random() * available.length)]
                    : -1;

            default:
                return -1;
        }
    }

    /**
     * 获取缺失的玩家数
     */
    static getMissingPlayers(playerCount, minPlayers, maxPlayers) {
        if (playerCount < minPlayers) {
            return minPlayers - playerCount;
        }
        return 0;
    }
}
```

### 改进 3: 优化 MatchRoomState（多人状态管理）

**关键增强**:

```javascript
class MatchRoomState {
    constructor(roomId, maxPlayers = 2, gameConfig = null) {
        this.roomId = roomId;
        this.maxPlayers = maxPlayers;
        this.gameConfig = gameConfig || {};  // 新增：游戏配置
        
        this.players = [];
        this.spectators = [];  // 新增：观众列表
        this.minPlayers = this.gameConfig.minPlayers || maxPlayers;  // 新增：最小玩家数
        
        this.status = MatchingRules.TABLE_STATUS.IDLE;
        this.matchSettings = { ...MatchingRules.DEFAULT_SETTINGS };

        // ... 保留现有定时器 ...

        // 新增：跨回合状态（多轮游戏）
        this.currentRound = 0;
        this.totalRounds = this.gameConfig.bestOf || 1;
        this.roundResults = [];  // 每轮的赢家
    }

    /**
     * 添加观众
     */
    addSpectator(spectatorData) {
        if (this.spectators.find(s => s.userId === spectatorData.userId)) {
            return { success: false, error: '已在房间观看中' };
        }

        this.spectators.push({
            ...spectatorData,
            joinedAt: Date.now()
        });

        return { success: true };
    }

    /**
     * 移除观众
     */
    removeSpectator(userId) {
        const index = this.spectators.findIndex(s => s.userId === userId);
        if (index !== -1) {
            this.spectators.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * 观众转换为玩家（填补空位）
     */
    promoteSpectatorToPlayer(spectatorData) {
        if (this.players.length >= this.maxPlayers) {
            return { success: false, error: '座位已满' };
        }

        // 从观众列表移除
        this.removeSpectator(spectatorData.userId);

        // 添加为玩家
        spectatorData.ready = false;  // 新加入的玩家需要重新准备
        return this.addPlayer(spectatorData);
    }

    /**
     * 改进版本：支持多人的 addPlayer
     */
    addPlayer(playerData) {
        if (this.players.length >= this.maxPlayers) {
            return { success: false, error: '房间已满' };
        }

        if (this.players.find(p => p.userId === playerData.userId)) {
            return { success: false, error: '已在房间中' };
        }

        // 使用配置的座位策略
        const seatStrategy = this.gameConfig.seatStrategy || 'sequential';
        const existingSeats = this.players.map(p => p.seatIndex);
        const seatIndex = MatchingRules.assignSeat(seatStrategy, existingSeats, this.maxPlayers);

        if (seatIndex === -1) {
            return { success: false, error: '没有可用座位' };
        }

        const playerWithSeat = {
            ...playerData,
            ready: false,
            joinedAt: Date.now(),
            seatIndex: seatIndex,
            isActive: true  // 新增：玩家是否活跃（处理掉线/弃牌）
        };

        this.players.push(playerWithSeat);

        // 更新房间状态
        const newState = MatchingRules.getStateAfterPlayerJoin(this.players.length, this.maxPlayers);
        if (newState) {
            this.status = newState;
        }

        // 第一个玩家：设置房间匹配条件
        if (this.players.length === 1 && playerData.matchSettings) {
            this.matchSettings = { ...this.matchSettings, ...playerData.matchSettings };
        }

        return { success: true, seatIndex };
    }

    /**
     * 改进版本：多人的 allPlayersReady
     */
    allPlayersReady() {
        // 检查是否满足最小玩家数要求
        if (this.players.length < this.minPlayers) {
            return false;
        }

        // 检查所有活跃玩家是否都已准备
        const activePlayers = this.players.filter(p => p.isActive);
        return activePlayers.every(p => p.ready);
    }

    /**
     * 获取就绪状态概览
     */
    getReadyStatus() {
        const ready = this.players.filter(p => p.ready && p.isActive).length;
        const total = this.players.filter(p => p.isActive).length;
        const inactive = this.players.filter(p => !p.isActive).length;

        return {
            ready,
            total,
            inactive,
            percentage: total > 0 ? Math.round((ready / total) * 100) : 0,
            canStart: this.allPlayersReady()
        };
    }

    /**
     * 多轮游戏：下一轮准备
     */
    prepareNextRound() {
        if (this.currentRound >= this.totalRounds) {
            return { success: false, error: '所有回合已完成' };
        }

        this.currentRound++;
        this.resetReadyStatus();
        this.status = MatchingRules.TABLE_STATUS.MATCHING;

        return { success: true, round: this.currentRound, totalRounds: this.totalRounds };
    }

    /**
     * 记录回合结果
     */
    recordRoundResult(winnerIds) {
        this.roundResults.push({
            round: this.currentRound,
            winners: winnerIds,
            timestamp: Date.now()
        });
    }

    /**
     * 获取比赛进度
     */
    getMatchProgress() {
        return {
            currentRound: this.currentRound,
            totalRounds: this.totalRounds,
            roundResults: this.roundResults,
            isComplete: this.currentRound >= this.totalRounds
        };
    }
}
```

### 改进 4: 优化 MatchPlayers（多人匹配管理）

**关键增强**:

```javascript
class MatchPlayers {
    /**
     * 改进的构造函数
     */
    constructor(table) {
        this.table = table;
        this.io = table.io;
        this.roomId = table.roomId;
        this.gameType = table.gameType;
        this.maxPlayers = table.maxPlayers;

        // 新增：游戏配置
        this.gameConfig = GameConfig.getConfig(this.gameType) || {};

        // 使用匹配状态管理器
        this.matchState = new MatchRoomState(this.roomId, this.maxPlayers, this.gameConfig);

        // ... 保留现有代码 ...
    }

    /**
     * 处理观众加入
     */
    async spectatorJoin(socket) {
        const userId = socket.user._id.toString();
        
        if (!MatchingRules.canJoinTable(this.matchState.status, this.matchState.players.length, this.maxPlayers)) {
            // 如果不能作为玩家加入，尝试作为观众加入
            if (!this.gameConfig.supportSpectators) {
                socket.emit('error', { message: '该游戏不支持观众' });
                return false;
            }

            const spectatorData = {
                userId,
                socketId: socket.id,
                nickname: socket.user.nickname || socket.user.username,
            };

            const result = this.matchState.addSpectator(spectatorData);
            if (result.success) {
                socket.emit('spectator_accepted', { message: '已进入观看模式' });
                this.table.broadcastRoomState();
            } else {
                socket.emit('error', { message: result.error });
            }
            return result.success;
        }

        // 能作为玩家加入
        return this.playerJoin(socket);
    }

    /**
     * 改进的玩家离座：考虑多人场景
     */
    async _playerLeave(socket) {
        const userId = socket.user._id.toString();
        const playerIndex = this.matchState.players.findIndex(p => p.userId === userId);

        if (playerIndex === -1) {
            // 可能是观众
            this.matchState.removeSpectator(userId);
            this.table.broadcastRoomState();
            return;
        }

        // 如果游戏已开始，标记为不活跃而不是删除
        if (this.matchState.status === MatchingRules.TABLE_STATUS.PLAYING) {
            this.matchState.players[playerIndex].isActive = false;
            
            // 如果有观众，自动晋升为玩家
            if (this.gameConfig.supportSpectators && this.matchState.spectators.length > 0) {
                const spectator = this.matchState.spectators[0];
                const promoteResult = this.matchState.promoteSpectatorToPlayer(spectator);
                
                if (promoteResult.success) {
                    // 通知晋升的观众
                    const spectatorSocket = this.io.sockets.sockets.get(spectator.socketId);
                    if (spectatorSocket) {
                        spectatorSocket.emit('promoted_to_player', {
                            message: '玩家掉线，您已被提升为玩家',
                            seatIndex: promoteResult.seatIndex
                        });
                    }
                }
            }
        } else {
            // 游戏未开始：直接移除玩家
            this.matchState.removePlayer(userId);

            // 检查是否需要取消准备倒计时
            if (this.matchState.readyTimer) {
                const readyStatus = this.matchState.getReadyStatus();
                if (readyStatus.total < this.maxPlayers) {
                    this.cancelReadyCheck();
                }
            }
        }

        const newState = MatchingRules.getStateAfterPlayerLeave(
            this.matchState.players.length,
            this.maxPlayers
        );
        if (newState) {
            this.matchState.status = newState;
        }

        this.table.broadcastRoomState();
    }

    /**
     * 改进的准备就绪检查：支持多人
     */
    startReadyCheck() {
        if (this.matchState.readyTimer) {
            clearTimeout(this.matchState.readyTimer);
        }

        // 广播准备倒计时开始
        this.table.broadcast('ready_check_start', {
            timeout: MatchingRules.COUNTDOWN_CONFIG.readyTimeout,
            playerCount: this.matchState.players.length,
            maxPlayers: this.maxPlayers
        });

        const timeout = MatchingRules.COUNTDOWN_CONFIG.readyTimeout;
        let countdown = Math.ceil(timeout / 1000);

        // 每秒更新倒计时
        const countdownInterval = setInterval(() => {
            countdown--;

            // 定期检查是否所有玩家都准备了
            if (this.matchState.allPlayersReady()) {
                clearInterval(countdownInterval);
                clearTimeout(this.matchState.readyTimer);
                this.startGame();
                return;
            }

            if (countdown <= 0) {
                clearInterval(countdownInterval);
                clearTimeout(this.matchState.readyTimer);

                // 多人场景：允许部分玩家准备完成就开始
                const readyStatus = this.matchState.getReadyStatus();
                if (readyStatus.ready >= this.gameConfig.minPlayers) {
                    this.startGame();
                } else {
                    // 仍未满足最小玩家数
                    this.cancelReadyCheck('缺少足够的就绪玩家');
                }
                return;
            }

            if (countdown % 5 === 0 || countdown <= 3) {
                this.table.broadcast('countdown_update', { countdown });
            }
        }, 1000);

        this.matchState.readyTimer = setTimeout(() => {
            clearInterval(countdownInterval);
        }, timeout);
    }

    /**
     * 多轮游戏：游戏结束处理
     */
    endRound(roundWinners) {
        // 记录本轮结果
        this.matchState.recordRoundResult(roundWinners);

        // 检查是否需要进行下一轮
        if (this.matchState.currentRound < this.matchState.totalRounds) {
            // 准备下一轮
            const nextRound = this.matchState.prepareNextRound();
            
            this.table.broadcast('round_complete', {
                roundNumber: this.matchState.currentRound,
                winners: roundWinners,
                nextRound: nextRound.round,
                totalRounds: this.matchState.totalRounds
            });

            // 进入再来一局倒计时（5秒后自动开始）
            this.startRematchCountdown(5000);
        } else {
            // 整个比赛完成
            this.endGame(this.matchState.roundResults);
        }
    }

    /**
     * 获取房间详细信息（多人版本）
     */
    getRoomDetail() {
        const readyStatus = this.matchState.getReadyStatus();
        const matchProgress = this.matchState.getMatchProgress();

        return {
            roomId: this.roomId,
            gameType: this.gameType,
            status: this.status,
            players: this.matchState.players.map(p => ({
                userId: p.userId,
                nickname: p.nickname,
                seatIndex: p.seatIndex,
                ready: p.ready,
                isActive: p.isActive,
                joinedAt: p.joinedAt
            })),
            spectators: this.matchState.spectators.map(s => ({
                userId: s.userId,
                nickname: s.nickname,
                joinedAt: s.joinedAt
            })),
            maxPlayers: this.maxPlayers,
            minPlayers: this.gameConfig.minPlayers || this.maxPlayers,
            readyStatus,
            matchProgress: matchProgress,
            baseBet: this.matchState.matchSettings.baseBet,
            matchSettings: this.matchState.matchSettings
        };
    }
}
```

---

## 实现清单

### 第一阶段：核心基础（必须实现）

- [ ] **创建 GameConfig.js**
  - 定义不同游戏的配置
  - 验证玩家数量的有效性
  
- [ ] **升级 MatchingRules**
  - 添加 `canStartMultiplayer()` 方法
  - 添加 `assignSeat()` 支持多种策略
  - 添加 `getMissingPlayers()` 方法

- [ ] **升级 MatchRoomState**
  - 添加 `gameConfig` 参数
  - 添加 `spectators` 列表和相关方法
  - 改进 `addPlayer()` 使用配置策略
  - 改进 `allPlayersReady()` 支持最小玩家数
  - 添加 `getReadyStatus()` 方法

### 第二阶段：功能完善（推荐实现）

- [ ] **升级 MatchPlayers**
  - 集成 GameConfig
  - 添加 `spectatorJoin()` 方法
  - 改进 `_playerLeave()` 处理观众晋升
  - 改进 `startReadyCheck()` 支持多人判断
  - 添加 `endRound()` 多轮支持
  - 添加 `getRoomDetail()` 扩展版本

- [ ] **升级 GameTableClient.ts**
  - 支持 `spectators` 状态
  - 支持座位分配显示
  - 支持多人UI布局
  - 支持观众列表显示

### 第三阶段：高级特性（可选实现）

- [ ] **多轮游戏完整支持**
  - Best-of 系列支持
  - 跨轮状态保持
  - 最终排名计算

- [ ] **分级竞技多人支持**
  - 多人ELO计算
  - 段位显示

- [ ] **观众交互功能**
  - 观众评论
  - 棋谱分析

---

## 配置示例

### 例子1：四人麻将

```javascript
// server/src/games/mahjong/MahjongTable.js

class MahjongTable extends GameTable {
    constructor(io, roomId, tier) {
        super(io, roomId, 4, tier);  // 麻将：4人
        this.gameType = 'mahjong';
        // ...
    }

    // 麻将特定的初始化
    async initializeGame() {
        // 使用 GameConfig 自动配置
        const config = GameConfig.getConfig('mahjong');
        // config.minPlayers = 3
        // config.maxPlayers = 4
        // config.seatStrategy = 'sequential'
        // config.roundBased = true
        // config.bestOf = 8
    }
}
```

### 例子2：六人德州扑克

```javascript
// server/src/games/poker/PokerTable.js

class PokerTable extends GameTable {
    constructor(io, roomId, tier) {
        super(io, roomId, 6, tier);  // 扑克：6人
        this.gameType = 'poker';
        // ...
    }
}
```

### 例子3：客户端显示多人座位

```typescript
// client/src/components/MultiplayerBoard.tsx

interface SeatProps {
    players: Player[];
    maxPlayers: number;
    seatStrategy: string;
    spectators?: Player[];
}

export const MultiplayerBoard: React.FC<SeatProps> = ({ 
    players, 
    maxPlayers, 
    spectators 
}) => {
    // 根据 maxPlayers 和 seatStrategy 动态渲染座位
    
    if (maxPlayers === 2) {
        return <TwoPlayerLayout players={players} />;
    } else if (maxPlayers === 4) {
        return <FourPlayerLayout players={players} />;
    } else if (maxPlayers === 6) {
        return <SixPlayerLayout players={players} />;
    }
};
```

---

## 测试计划

### 单元测试

```javascript
// test/matching.test.js

describe('MatchingRules - 多人支持', () => {
    test('座位分配 - sequential 策略', () => {
        const seats = MatchingRules.assignSeat('sequential', [0], 4);
        expect(seats).toBe(1);
    });

    test('座位分配 - balanced 策略', () => {
        const seats = MatchingRules.assignSeat('balanced', [0], 4);
        expect(seats).toBe(2);  // 对面座位
    });

    test('多人就绪检查 - 满足最小人数', () => {
        const players = [
            { ready: true, isActive: true },
            { ready: true, isActive: true },
            { ready: false, isActive: true }
        ];
        const result = MatchingRules.canStartMultiplayer(
            players, 
            4, 
            { minPlayers: 3, requireAllReady: false }
        );
        expect(result.canStart).toBe(true);
    });
});
```

### 集成测试场景

1. **两人象棋**（基线）
   - 玩家A入座 → 状态应为 waiting
   - 玩家B入座 → 状态应为 matching
   - 两人都准备 → 游戏开始

2. **四人麻将**
   - A、B、C、D依次入座
   - A掉线→D自动晋升（如支持观众）
   - 一局完成→准备下一轮
   - 8圈完成→计算最终排名

3. **六人扑克**
   - 前4人入座→等待中
   - 第5、6人入座→匹配中
   - 观众加入→加入观众列表
   - 一人掉线→观众自动替补

---

## 性能考虑

### 内存优化

- 座位管理使用 Map/Set 而非数组（查询 O(1) vs O(n)）
- 观众列表独立存储，避免与玩家混淆
- 圆形结构：当玩家离线，其座位可复用

### 网络优化

- 只广播座位变化，不广播整个玩家列表
- 观众列表可选加载（降低初始化包大小）
- 就绪状态使用百分比而非列表（节省带宽）

---

## 迁移路径

### 对现有两人游戏的影响

✅ **零影响** - 所有改动都是向后兼容的

```javascript
// 旧的两人游戏继续工作
const matchPlayers = new MatchPlayers(table);  // maxPlayers=2（默认）
// 使用新的方法但行为与旧相同

// 新的多人游戏
const matchPlayers = new MatchPlayers(mahjongTable);  // maxPlayers=4
// 自动使用正确的配置
```

---

## 总结

| 方面 | 改进前 | 改进后 |
|------|------|------|
| 玩家数量 | 硬编码2人 | 支持2-6人 |
| 座位分配 | 只有两人特殊处理 | 3种可配置策略 |
| 准备检查 | 所有人都要准备 | 支持最小人数+最大超时时间 |
| 观众支持 | 无 | 完整的观众列表和晋升 |
| 多轮游戏 | 单局 | Best-of 系列支持 |
| 状态管理 | 简单2态机 | 完整的生命周期管理 |
| 扩展性 | 低 | 高（游戏配置驱动） |

