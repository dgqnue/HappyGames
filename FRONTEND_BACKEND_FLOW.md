# 前后端交互流程：积分与称号系统

## 📋 整体架构概述

根据你的设计方案，系统分为两个独立的体系：

1. **ELO 积分系统**：通用于所有游戏，在游戏结束后计算
2. **Grade 称号系统**：仅用于中国象棋，根据积分百分比分配称号

整个交互流程分为 **3 个阶段**：
- **游戏进行中**：前端发送游戏状态，后端处理逻辑
- **游戏结束**：后端计算积分+称号，返回给前端
- **用户登录/个人中心**：前端从服务器读取最新数据

---

## 🎮 第一阶段：游戏进行中

### 前端负责：
- 管理棋盘状态
- 渲染游戏UI（棋盘、计时器等）
- 监听玩家操作（移动棋子、认输等）
- 向后端发送移动指令

### 后端负责：
- 验证移动合法性
- 更新游戏逻辑
- 检测游戏结束条件（被将军、超时、认输等）

### Socket.IO 事件流

```
前端 ─→ 后端
       chinesechess_move
       {
           move: { from: [0,0], to: [1,1] },
           timestamp: 1702200000000
       }

后端 ─→ 前端
       move
       {
           board: [[...], [...], ...],  // 更新后的棋盘
           turn: 'r' | 'b',              // 当前回合
           captured: { piece: '炮', position: [2,3] }  // 被吃的棋子
       }
```

---

## 🏁 第二阶段：游戏结束处理（关键流程）

### 1️⃣ 游戏结束触发点

游戏结束的情况：
- 玩家被将军（checkmate）
- 玩家认输（resign）
- 玩家因超时判负（timeout）
- 对手离线（disconnect）

### 2️⃣ 后端处理流程

```
ChineseChessTable.handleWin(winnerSide)
    │
    ├─【第1步：ELO 计算】
    │  └─ EloService.processMatchResult()
    │     ├─ 获取两个玩家的当前 stats
    │     ├─ 计算 K 值（动态系数）
    │     ├─ 计算预期胜率（Expected Score）
    │     ├─ 计算积分变化（Delta）
    │     ├─ 更新数据库：UserGameStats { rating, wins/losses, gamesPlayed, lastPlayedAt }
    │     └─ 返回 eloResult {
    │            playerA: { oldRating, newRating, delta },
    │            playerB: { oldRating, newRating, delta }
    │        }
    │
    ├─【第2步：称号更新（仅中国象棋）】
    │  └─ Grade.updatePlayerTitles([winnerId, loserId], 'chinesechess')
    │     ├─ 对每个玩家计算新排名
    │     │  • betterPlayers = rating > 该玩家rating 的玩家数
    │     │  • rank = betterPlayers + 1
    │     │
    │     ├─ 获取总玩家数
    │     │
    │     ├─ 根据排名获取称号配置
    │     │  Grade.getTitleByRank(rank, totalPlayers)
    │     │
    │     ├─ 更新数据库：UserGameStats { title, titleRank, titleColor }
    │     │
    │     └─ 返回 titleResult {
    │            winnerId: { title: '举世无双', titleRank: 10, titleColor: '#FF6200' },
    │            loserId: { title: '初出茅庐', titleRank: 1, titleColor: '#000000' }
    │        }
    │
    ├─【第3步：游戏豆结算（非免费室）】
    │  └─ this.settle(winner, loser, betAmount)
    │     └─ 更新 Wallet 表（后续再开发）
    │
    └─【第4步：结束游戏，广播结果】
       └─ this.endGame(result)
          └─ MatchPlayers.onGameEnd(result)
             └─ 广播 'game_ended' 事件
```

### 3️⃣ 后端返回数据格式

```javascript
// 广播给前端的 game_ended 事件
{
    result: {
        winner: 'r' | 'b',              // 胜方颜色
        winnerId: 'userId123',          // 胜者ID
        
        // ELO 积分信息
        elo: {
            playerA: {
                oldRating: 1800,
                newRating: 1806,
                delta: +6
            },
            playerB: {
                oldRating: 1600,
                newRating: 1595,
                delta: -5
            }
        },
        
        // 称号信息（仅中国象棋）
        title: {
            'userId123': {              // 胜者
                title: '举世无双',
                titleRank: 10,
                titleColor: '#FF6200'
            },
            'userId456': {              // 失败者
                title: '初出茅庐',
                titleRank: 1,
                titleColor: '#000000'
            }
        }
    },
    
    rematchTimeout: 30000  // 再来一局倒计时（毫秒）
}
```

### 4️⃣ 前端处理逻辑

```typescript
// ChineseChessTableClient.ts
this.socket.on('game_ended', (data: any) => {
    console.log('[ChineseChessTableClient] Game ended:', data);
    
    // 1. 存储游戏结果（用于显示在UI中）
    const result = data.result;
    
    // 2. 提取当前用户的新数据
    const myUserId = getCurrentUserId();  // 从 localStorage 或 context 获取
    
    // 3. 更新本地用户信息（如果有的话）
    if (result.title && result.title[myUserId]) {
        // 保存用户新的称号信息到 localStorage 或 context
        localStorage.setItem('userTitle', JSON.stringify(result.title[myUserId]));
        localStorage.setItem('userRating', result.elo.playerA.newRating);  // 示意
    }
    
    // 4. 更新UI显示
    this.handleGameEnded(data);  // 显示游戏结果对话框
    this.updateState({
        status: 'matching',      // 状态改为等待再来一局
        winner: result.winner,
        gameResult: result       // 保存完整结果供UI显示
    });
    
    // 5. 触发UI回调，显示：
    //    - 胜负结果
    //    - 积分变化 (delta)
    //    - 新的称号和颜色
    //    - 再来一局倒计时
});
```

### 5️⃣ 前端显示游戏结果

前端需要在游戏结束时显示：

```
┌─────────────────────────────────┐
│         游戏结束                 │
├─────────────────────────────────┤
│  赤方获胜！                     │
│                                 │
│  🎖️ 称号提升                    │
│  您的新称号：举世无双            │
│  颜色：#FF6200                  │
│                                 │
│  📊 积分变化                     │
│  老等级分：1600                 │
│  新等级分：1606                 │
│  变化：+6                        │
│                                 │
│  ⏱️ 30秒后开始再来一局...        │
│  [同意] [拒绝]                  │
└─────────────────────────────────┘
```

---

## 👤 第三阶段：用户登录 & 数据同步

### 登录流程

```
【前端】                          【后端】
用户输入用户名/密码或 Pi 登录
    │
    ├─→ POST /api/user/login
    │   {
    │       username: 'player1',
    │       password: '***' (如果是账密登录)
    │   }
    │                              验证用户
    │                              生成 JWT Token
    │                              返回 token + userId
    ←─ {
         token: 'eyJhbGciOi...',
         userId: 'abc123',
         username: 'player1'
       }
    │
    ├─ 保存 token 到 localStorage
    ├─ 保存 userId 到 localStorage/context
    └─ 跳转到游戏大厅或个人中心
```

### 获取用户游戏数据

#### 当前问题：
`/api/user/profile` 端点返回的数据**不包含游戏的 rating、title、titleRank、titleColor**。

#### 需要改进的端点：

```javascript
// 旧的 getUserProfile - 需要优化
{
    _id: 'abc123',
    username: 'player1',
    nickname: '玩家1',
    assets: {
        happyBeans: 1000,
        piBalance: 10,
        totalCommission: 50
    }
    // ❌ 缺少游戏数据！
}

// 新的 getUserProfile（建议）
{
    _id: 'abc123',
    username: 'player1',
    nickname: '玩家1',
    avatar: 'https://...',
    assets: {
        happyBeans: 1000,
        piBalance: 10,
        totalCommission: 50
    },
    
    // ✅ 添加游戏统计
    gameStats: {
        chinesechess: {
            rating: 1606,              // 当前等级分
            title: '举世无双',          // 当前称号
            titleRank: 10,             // 称号等级（1-10）
            titleColor: '#FF6200',     // 称号颜色
            gamesPlayed: 45,           // 总对局数
            wins: 30,                  // 胜场数
            losses: 15,                // 负场数
            draws: 0,                  // 平手数
            lastPlayedAt: '2025-12-10T12:30:00Z'
        },
        gomoku: {
            rating: 1500,
            title: '初出茅庐',
            // ...
        }
        // 其他游戏...
    }
}
```

#### 实现代码（后端）

需要修改 `userController.js` 的 `getUserProfile` 方法：

```javascript
exports.getUserProfile = async (req, res) => {
    try {
        const userId = req.query.userId;

        if (!userId) {
            return res.status(400).json({ message: 'User ID required' });
        }

        const user = await User.findById(userId).populate('referrer', 'username');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const wallet = await Wallet.findOne({ user: userId });

        // ✅ 添加：获取所有游戏的统计数据
        const gameStats = {};
        const stats = await UserGameStats.find({ userId });
        
        stats.forEach(stat => {
            gameStats[stat.gameType] = {
                rating: stat.rating,
                title: stat.title,
                titleRank: stat.titleRank,
                titleColor: stat.titleColor,
                gamesPlayed: stat.gamesPlayed,
                wins: stat.wins,
                losses: stat.losses,
                draws: stat.draws,
                lastPlayedAt: stat.lastPlayedAt
            };
        });

        res.json({
            _id: user._id,
            username: user.username,
            nickname: user.nickname,
            avatar: user.avatar,
            referralCode: user.referralCode,
            referralLevel: user.referralLevel,
            referralStats: user.referralStats,
            referrer: user.referrer ? user.referrer.username : 'None',
            assets: {
                happyBeans: wallet ? wallet.happyBeans : 0,
                piBalance: wallet ? wallet.piBalance : 0,
                totalCommission: wallet ? wallet.totalCommissionEarned : 0
            },
            // ✅ 新增：游戏统计
            gameStats: gameStats
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
```

### 前端使用游戏数据

```typescript
// UserProfile.tsx
const fetchProfile = async () => {
    try {
        const res = await fetch(`${API_URL}/api/user/profile?userId=${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();
        
        // 提取中国象棋数据
        const chessStats = data.gameStats?.chinesechess || {
            rating: 1200,
            title: '初出茅庐',
            titleRank: 1,
            titleColor: '#000000'
        };
        
        setProfile({
            ...data,
            chessStats  // 用于在 UI 中显示
        });
        
    } catch (error) {
        console.error('Failed to fetch profile', error);
    }
};
```

### 前端显示用户信息

```tsx
// 在 UserProfile 组件中显示
<div className="user-profile">
    <img src={profile.avatar} alt="avatar" />
    <h1>{profile.nickname}</h1>
    
    {/* 中国象棋成绩 */}
    <div className="game-stats">
        <h3>中国象棋</h3>
        
        {/* 称号显示 */}
        <div 
            className="title-badge"
            style={{ color: profile.chessStats.titleColor }}
        >
            {profile.chessStats.title}
            <span className="rank">#{profile.chessStats.titleRank}</span>
        </div>
        
        {/* 等级分显示 */}
        <div className="rating">
            <span>等级分：{profile.chessStats.rating}</span>
        </div>
        
        {/* 战绩统计 */}
        <div className="record">
            <span>胜：{profile.chessStats.wins}</span>
            <span>负：{profile.chessStats.losses}</span>
            <span>平：{profile.chessStats.draws}</span>
            <span>总局：{profile.chessStats.gamesPlayed}</span>
        </div>
    </div>
</div>
```

---

## 🔄 完整的数据流时序图

```
【登录】
玩家
  │
  ├─→ POST /api/user/login
  │        ↓ (服务器验证)
  │   ← JWT token + userId
  │
  ├─ localStorage.setItem('token', token)
  └─ 跳转到个人中心或游戏大厅
  
【首次加载个人中心】
  │
  ├─→ GET /api/user/profile?userId=abc123
  │   (header: Authorization: Bearer token)
  │        ↓ (服务器查询数据库)
  │        ├─ User 表
  │        ├─ UserGameStats 表（所有游戏）
  │        └─ Wallet 表
  │   ← {
  │       profile: {...},
  │       gameStats: {
  │           chinesechess: { rating, title, titleRank, titleColor, ... }
  │       }
  │    }
  │
  └─ 前端渲染用户信息（含称号）

【游戏进行中】
  │
  ├─→ chinesechess_move (每步移动)
  │        ↓
  │   ← move (返回新的棋盘状态)
  │
  └─ UI 实时更新

【游戏结束】
  │
  ├─ 后端：handleWin()
  │  ├─ EloService.processMatchResult() → 更新 rating
  │  ├─ Grade.updatePlayerTitles() → 更新 title, titleRank, titleColor
  │  └─ 保存到 UserGameStats 表
  │
  ├─ 广播 game_ended 事件
  │   {
  │       result: {
  │           winner: 'r',
  │           elo: {...},
  │           title: {
  │               winnerId: { title, titleRank, titleColor },
  │               loserId: { title, titleRank, titleColor }
  │           }
  │       }
  │   }
  │
  └─ 前端：
     ├─ 显示游戏结果对话框
     ├─ 显示称号变化和积分变化
     ├─ localStorage 保存本地用户信息（可选）
     └─ 等待玩家选择"再来一局"或"离开"

【下一次登录】
  │
  └─ GET /api/user/profile → 获取最新数据（已更新的 rating 和 title）
```

---

## 🛠️ 需要实现的核心文件

### 后端改进清单

- [ ] **userController.js**
  - 修改 `getUserProfile()` 方法，添加游戏统计数据

### 前端改进清单

- [ ] **UserProfile.tsx**
  - 使用新的 gameStats 数据
  - 在用户信息中显示中国象棋的称号和等级分
  - 显示称号颜色（根据 Grade.js 定义）

- [ ] **GameEndDialog.tsx** (需要创建或优化)
  - 显示游戏结果
  - 显示称号变化
  - 显示积分变化
  - 显示再来一局倒计时

### 数据库检查清单

- [x] **UserGameStats** 模型
  - `rating`: 当前等级分
  - `title`: 当前称号
  - `titleRank`: 称号等级
  - `titleColor`: 称号颜色
  - 其他字段已完整

- [x] **GameMeta** 模型
  - `muDynamic`: 当前 Mu Dynamic
  - `pendingMuDynamic`: 待生效的 Mu Dynamic

---

## 📖 Grade.js 称号配置

前端需要根据后端返回的 `titleColor` 来显示对应的颜色：

```javascript
const TITLES = [
    { rank: 1, name: '初出茅庐', color: '#000000' },        // 黑色
    { rank: 2, name: '小试牛刀', color: '#8f2d56' },        // 紫红
    { rank: 3, name: '渐入佳境', color: '#00FF00' },        // 绿色
    { rank: 4, name: '锋芒毕露', color: '#0000FF' },        // 蓝色
    { rank: 5, name: '出类拔萃', color: '#FF0000' },        // 红色
    { rank: 6, name: '炉火纯青', color: '#00FFFF' },        // 青色
    { rank: 7, name: '名满江湖', color: '#ffee32' },        // 黄色
    { rank: 8, name: '傲视群雄', color: '#800080' },        // 紫色
    { rank: 9, name: '登峰造极', color: '#ffba08' },        // 橙色
    { rank: 10, name: '举世无双', color: '#FF6200' }        // 橙红
];
```

---

## 总结

### 前端只需做两件事：
1. **显示游戏结果**：接收 `game_ended` 事件，显示称号变化和积分变化
2. **显示用户信息**：登录后从 `/api/user/profile` 获取 gameStats，显示当前称号和等级分

### 后端已完成：
1. ✅ ELO 计算（EloService.processMatchResult）
2. ✅ 称号分配（Grade.updatePlayerTitles）
3. ✅ 游戏结束广播（game_ended 事件包含 ELO + Title 信息）
4. ❌ **需要改进**：`getUserProfile` 端点返回数据时包含 gameStats

### 数据流向：
```
游戏结束 → ELO计算 + 称号计算 → 保存DB → 广播给前端
         ↓
前端显示结果和新称号
         ↓
用户登录 → 从DB读取最新数据 → 显示在个人中心
```

