# 前后端积分与称号系统 - 快速参考

## 🚀 快速理解整个流程

### 分三个阶段

```
1️⃣ 游戏进行中
   └─ 前端管理游戏逻辑，后端验证移动

2️⃣ 游戏结束（关键）
   └─ 后端计算：ELO → Grade → 返回结果给前端

3️⃣ 用户登录
   └─ 前端读取最新数据并显示
```

---

## 📊 游戏结束流程（最关键）

### 后端处理步骤

```javascript
// ChineseChessTable.handleWin(winnerSide)

1️⃣ ELO 计算
   EloService.processMatchResult(gameType, winnerId, loserId, 1)
   → 返回: { playerA: {oldRating, newRating, delta}, playerB: {...} }
   → 更新 DB: UserGameStats.rating

2️⃣ 称号更新（仅中国象棋）
   Grade.updatePlayerTitles([winnerId, loserId], 'chinesechess')
   → 根据新的 rating 计算排名
   → 根据排名查表获取称号
   → 返回: { userId: {title, titleRank, titleColor}, ... }
   → 更新 DB: UserGameStats.{title, titleRank, titleColor}

3️⃣ 游戏豆结算（后续开发）
   this.settle(winner, loser, amount)

4️⃣ 广播给前端
   io.to(tableId).emit('game_ended', {
       result: {
           winner: 'r'|'b',
           winnerId: string,
           elo: { playerA: {...}, playerB: {...} },
           title: { userId: {title, titleRank, titleColor}, ... }
       }
   })
```

### 前端收到的数据

```javascript
{
    result: {
        winner: 'r',  // 赤方胜
        winnerId: 'userId123',
        
        // 积分变化
        elo: {
            playerA: { oldRating: 1800, newRating: 1806, delta: +6 },
            playerB: { oldRating: 1600, newRating: 1595, delta: -5 }
        },
        
        // 称号变化
        title: {
            userId123: { 
                title: '举世无双', 
                titleRank: 10, 
                titleColor: '#FF6200'
            },
            userId456: { 
                title: '初出茅庐', 
                titleRank: 1, 
                titleColor: '#000000'
            }
        }
    }
}
```

### 前端需要做的：

```typescript
// 1. 监听事件
socket.on('game_ended', (data) => {
    // 2. 提取当前用户的新数据
    const myData = data.result.title[myUserId];
    
    // 3. 显示结果对话框
    showGameEndDialog({
        winner: data.result.winner,
        myNewTitle: myData.title,
        myNewRating: data.result.elo.playerA.newRating,  // 或 playerB
        myDelta: data.result.elo.playerA.delta,
        titleColor: myData.titleColor
    });
    
    // 4. 可选：保存到 localStorage
    localStorage.setItem('userTitle', JSON.stringify(myData));
});
```

---

## 📱 用户登录 & 获取数据

### 登录流程

```
玩家登录
  ↓
POST /api/user/login
  ↓
后端验证 → 返回 token + userId
  ↓
localStorage.setItem('token', token)
  ↓
跳转到个人中心
```

### 获取用户完整信息

```javascript
// GET /api/user/profile?userId=abc123
// Header: Authorization: Bearer token

// 响应数据结构
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
    
    // ✅ 游戏统计（已添加）
    gameStats: {
        chinesechess: {
            rating: 1606,           // 当前等级分
            title: '举世无双',       // 当前称号
            titleRank: 10,          // 等级（1-10）
            titleColor: '#FF6200',  // 称号颜色
            gamesPlayed: 45,
            wins: 30,
            losses: 15,
            draws: 0,
            lastPlayedAt: '2025-12-10T12:30:00Z'
        },
        gomoku: { ... },
        poker: { ... }
    }
}
```

### 前端使用数据

```tsx
const [profile, setProfile] = useState(null);

useEffect(() => {
    fetchProfile();
}, []);

const fetchProfile = async () => {
    const res = await fetch(`${API_URL}/api/user/profile?userId=${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setProfile(data);
};

// 显示用户信息
<div className="profile">
    {/* 基本信息 */}
    <h1>{profile.nickname}</h1>
    <img src={profile.avatar} alt="avatar" />
    
    {/* 中国象棋成绩 */}
    <div className="chess">
        {/* 称号 - 使用 titleColor 显示 */}
        <h3 style={{ color: profile.gameStats?.chinesechess?.titleColor }}>
            {profile.gameStats?.chinesechess?.title}
        </h3>
        
        {/* 等级分 */}
        <p>等级分: {profile.gameStats?.chinesechess?.rating}</p>
        
        {/* 战绩 */}
        <p>胜: {profile.gameStats?.chinesechess?.wins}</p>
        <p>负: {profile.gameStats?.chinesechess?.losses}</p>
    </div>
</div>
```

---

## 🎯 称号表（Grade.js）

前端在渲染时需要使用这些颜色：

| 等级 | 名称 | 百分比 | 颜色代码 | RGB |
|------|------|--------|---------|-----|
| 1 | 初出茅庐 | 22% | #000000 | 黑 |
| 2 | 小试牛刀 | 19% | #8f2d56 | 紫红 |
| 3 | 渐入佳境 | 16% | #00FF00 | 绿 |
| 4 | 锋芒毕露 | 13% | #0000FF | 蓝 |
| 5 | 出类拔萃 | 10% | #FF0000 | 红 |
| 6 | 炉火纯青 | 8% | #00FFFF | 青 |
| 7 | 名满江湖 | 6% | #ffee32 | 黄 |
| 8 | 傲视群雄 | 4% | #800080 | 紫 |
| 9 | 登峰造极 | 2% | #ffba08 | 橙 |
| 10 | 举世无双 | <1% | #FF6200 | 橙红 |

---

## 🔄 数据库更新流程

### UserGameStats 表

游戏结束时 ELO + Grade 都会更新这个表：

```javascript
{
    userId: 'abc123',
    gameType: 'chinesechess',
    
    // ELO 系统更新
    rating: 1606,              // ← EloService 更新
    gamesPlayed: 45,           // ← EloService 更新
    wins: 30,                  // ← EloService 更新
    losses: 15,                // ← EloService 更新
    draws: 0,                  // ← EloService 更新
    lastPlayedAt: Date,        // ← EloService 更新
    
    // Grade 系统更新（仅中国象棋）
    title: '举世无双',          // ← Grade 更新
    titleRank: 10,             // ← Grade 更新
    titleColor: '#FF6200'      // ← Grade 更新
}
```

---

## ✅ 系统状态检查清单

- [x] **后端 ELO 系统**
  - [x] EloService.processMatchResult() - 计算积分
  - [x] EloService.calculateK() - 动态系数
  - [x] EloService.calculateExpected() - 预期得分
  - [x] EloService.calculateDelta() - 积分变化
  - [x] 支持时间衰减和 Mu Dynamic

- [x] **后端 Grade 系统**
  - [x] Grade.updatePlayerTitles() - 批量更新
  - [x] Grade.updatePlayerTitle() - 单个更新
  - [x] Grade.getTitleByRank() - 根据排名获取称号
  - [x] 支持所有 10 个等级

- [x] **后端游戏流程**
  - [x] ChineseChessTable.handleWin() - 集成 ELO + Grade
  - [x] game_ended 事件包含完整结果数据
  - [x] UserGameStats 字段完整

- [x] **后端 API**
  - [x] /api/user/profile - 已添加 gameStats 返回

- [x] **前端接收**
  - [x] ChineseChessTableClient 监听 game_ended 事件
  - [x] handleGameEnded() 处理游戏结果
  - [x] UserProfile 可以显示 gameStats

---

## 🔧 常见问题

### Q1: 如果玩家离线怎么办？
A: ChineseChessTable.onPlayerLeaveDuringGame() 会调用 handleWin()，判对方获胜，同样的流程。

### Q2: 称号更新需要多久？
A: 游戏结束后立即更新（同步操作）。

### Q3: 如果两个玩家积分相同？
A: Grade 会根据排名顺序处理，数据库中有 unique index 吗？没有的话可能会有平手情况，此时都是同一个等级。

### Q4: 前端如何显示称号特效？
A: 根据 titleColor 字段设置 CSS color 属性，可以加 text-shadow 等特效。

### Q5: 积分变为负数怎么办？
A: 等级分通常有下限（如 0 或 1000），需要在 EloService 中检查。

---

## 📝 代码片段

### 前端显示游戏结果

```tsx
const handleGameEnded = (data: any) => {
    const myUserId = localStorage.getItem('userId');
    const myTeam = /* 根据玩家颜色判断 */;
    const myEloInfo = data.result.elo[myTeam === 'red' ? 'playerA' : 'playerB'];
    const myTitleInfo = data.result.title?.[myUserId];

    // 显示对话框
    setGameResult({
        won: data.result.winner === (myTeam === 'red' ? 'r' : 'b'),
        oldRating: myEloInfo.oldRating,
        newRating: myEloInfo.newRating,
        delta: myEloInfo.delta,
        newTitle: myTitleInfo?.title || '初出茅庐',
        newTitleColor: myTitleInfo?.titleColor || '#000000',
        newTitleRank: myTitleInfo?.titleRank || 1
    });
    
    setShowGameEndDialog(true);
};
```

### 后端 Grade 系统如何工作

```javascript
// Grade.updatePlayerTitles([userId1, userId2], 'chinesechess')

// 步骤 1: 对每个玩家获取排名
const stats = await UserGameStats.findOne({ userId, gameType });
const betterPlayers = await UserGameStats.countDocuments({
    gameType,
    rating: { $gt: stats.rating }  // 比该玩家评分更高的玩家数
});
const rank = betterPlayers + 1;

// 步骤 2: 根据排名获取称号
const totalPlayers = await UserGameStats.countDocuments({ gameType });
const titleConfig = getTitleByRank(rank, totalPlayers);
// 例如：rank=1, totalPlayers=100 → 举世无双 (rank 10)
// rank=50, totalPlayers=100 → 初出茅庐 (rank 1)

// 步骤 3: 更新数据库
stats.title = titleConfig.name;
stats.titleRank = titleConfig.rank;
stats.titleColor = titleConfig.color;
await stats.save();
```

---

## 📚 相关文件位置

### 后端
- `server/src/gamecore/EloService.js` - ELO 计算
- `server/src/games/chinesechess/grade/Grade.js` - 称号系统
- `server/src/games/chinesechess/gamepagehierarchy/ChineseChessTable.js` - 游戏逻辑整合
- `server/src/controllers/userController.js` - 用户 API（已更新）
- `server/src/models/UserGameStats.js` - 游戏统计数据模型

### 前端
- `client/src/games/chinesechess/gamepagehierarchy/ChineseChessTableClient.ts` - 游戏客户端
- `client/src/app/profile/UserProfile.tsx` - 用户个人中心

---

这就是整个系统的完整流程！🎉

