# 称号系统实现完成

## 整体流程

```
游戏结束
    ↓
ChineseChessTable.handleWin(winnerSide)
    ├─ 1. EloService.processMatchResult() → 更新等级分
    ├─ 2. Grade.updatePlayerTitles([winnerId, loserId], gameType) → 更新称号和颜色
    ├─ 3. 游戏豆结算（如果非免费室）
    └─ 4. endGame({ winner, winnerId, elo, title }) → 广播游戏结束事件
        ↓
        MatchPlayers.onGameEnd(result)
            └─ broadcast('game_ended', { result, rematchTimeout })
                ↓
                客户端接收 game_ended 事件，显示玩家新的称号和等级分
```

## 核心实现

### 1. Grade.js（中国象棋等级/称号管理）

**位置**：`server/src/games/chinesechess/grade/Grade.js`

**功能**：
- 定义10个称号等级（1-10），对应不同的等级分百分位
- 提供方法计算玩家称号（基于排名百分位）
- 游戏结束后快速更新玩家称号（`updatePlayerTitle`）
- 定时批量更新所有玩家称号（`updateAllPlayerTitles`）
- 获取玩家当前称号信息（`getPlayerTitleInfo`）

**称号规则**（按排名百分位分配）：

| 等级 | 称号名称 | 百分位 | 颜色 |
|------|---------|--------|------|
| 10 | 举世无双 | 前1名 | #FF6200 |
| 9 | 登峰造极 | 前2% | #ffba08 |
| 8 | 傲视群雄 | 前4% | #800080 |
| 7 | 名满江湖 | 前6% | #ffee32 |
| 6 | 炉火纯青 | 前8% | #00FFFF |
| 5 | 出类拔萃 | 前10% | #FF0000 |
| 4 | 锋芒毕露 | 前13% | #0000FF |
| 3 | 渐入佳境 | 前16% | #00FF00 |
| 2 | 小试牛刀 | 前19% | #8f2d56 |
| 1 | 初出茅庐 | 前22% | #000000 |

### 2. ChineseChessTable.js（游戏桌胜利处理）

**修改内容**：
- 引入 `Grade` 模块
- 在 `handleWin()` 方法中，ELO 结算后立即调用 `Grade.updatePlayerTitles()`
- 将返回的称号信息传递给 `endGame()` 方法

**代码流程**：
```javascript
async handleWin(winnerSide) {
    // 1. 获取玩家ID
    const winnerId = ...;
    const loserId = ...;
    
    // 2. 更新等级分
    const eloResult = await EloService.processMatchResult(...);
    
    // 3. 更新称号 [新增]
    const titleResult = await Grade.updatePlayerTitles([winnerId, loserId], gameType);
    
    // 4. 游戏豆结算
    // ...
    
    // 5. 结束游戏，传递称号信息
    this.endGame({
        winner: winnerSide,
        winnerId: winnerId,
        elo: eloResult,
        title: titleResult  // [新增]
    });
}
```

### 3. MatchPlayers.js（游戏结束事件广播）

**无需修改**（已包含 title 信息）：
- `onGameEnd(result)` 广播包含完整 result 对象
- result 现在包含 `title` 字段（由 handleWin 传递）

**广播内容**：
```javascript
this.table.broadcast('game_ended', {
    result: {
        winner: 'r' | 'b',
        winnerId: userId,
        elo: { playerA, playerB },
        title: { [userId]: { title, titleRank, titleColor }, ... }
    },
    rematchTimeout: 30000
});
```

### 4. eloCron.js（定时任务）

**修改内容**：
- 替换 `TitleService` → `Grade`
- 调用 `Grade.updateAllPlayerTitles()` 替代 `TitleService.updateTitles()`

**定时计划**（每天，UTC时间）：
- 09:00 - 更新所有玩家称号（按等级分百分位重新计算）
- 10:00 - 应用等级分时衰减
- 11:00 - 计算新的 Mu Dynamic（基准等级分）
- 12:00 - 生效新的 Mu Dynamic

### 5. UserGameStats 数据库模型

**已有字段**：
```javascript
{
    userId: ObjectId,
    gameType: String,
    rating: Number,         // 等级分
    gamesPlayed: Number,
    wins: Number,
    losses: Number,
    draws: Number,
    lastPlayedAt: Date,
    title: String,          // 称号名称，如"傲视群雄"
    titleRank: Number,      // 称号等级，1-10
    titleColor: String      // 称号颜色，如"#800080"
}
```

## 客户端显示规范

### 玩家信息显示

在任何地方显示玩家信息时，都应该包含：
1. 玩家昵称
2. 称号（带颜色）
3. 等级分

**示例**（HTML）：
```html
<div class="player-info">
    <span class="nickname">张三</span>
    <span class="title" style="color: #800080">[傲视群雄]</span>
    <span class="rating">1850分</span>
</div>
```

**示例**（React）：
```tsx
<div className="player-info">
    <span>{player.nickname}</span>
    <span style={{ color: player.titleColor }}>
        [{player.title}]
    </span>
    <span>{player.rating}分</span>
</div>
```

### 游戏结束界面

在游戏结束时，显示双方的新称号和等级分变化：

```
游戏结束

红方（胜）
  张三 [傲视群雄] 1850分
  等级分变化: +25 (1825→1850)

黑方（负）
  李四 [初出茅庐] 1200分
  等级分变化: -25 (1225→1200)

[再来一局] [返回大厅]
```

### 玩家列表/排行榜

按等级分排序显示玩家，同时展示称号和颜色：

| 排名 | 玩家昵称 | 称号 | 等级分 | 胜率 |
|------|---------|------|--------|------|
| 1 | 张三 | [傲视群雄] #800080 | 1850 | 65% |
| 2 | 李四 | [锋芒毕露] #0000FF | 1720 | 58% |
| ... | ... | ... | ... | ... |

## 实现优势

1. **实时更新**：游戏结束后立即更新称号，玩家看到最新的称号和等级分
2. **精确排名**：称号基于实时排名百分位计算，确保排名准确
3. **定期批量更新**：每天凌晨统一更新所有玩家称号，确保百分位分布准确
4. **数据持久化**：称号和颜色存储在数据库中，避免重复计算
5. **易于显示**：客户端只需读取 `titleColor` 字段即可正确显示颜色

## 数据库查询示例

### 获取玩家当前称号
```javascript
const stats = await UserGameStats.findOne({ 
    userId: '507f1f77bcf86cd799439011', 
    gameType: 'chinesechess' 
});
// 结果: { title: '傲视群雄', titleRank: 8, titleColor: '#800080', rating: 1850 }
```

### 获取排行榜（前10名）
```javascript
const topPlayers = await UserGameStats
    .find({ gameType: 'chinesechess' })
    .sort({ rating: -1 })
    .limit(10)
    .select('userId nickname title titleColor rating wins losses');
```

### 获取特定等级的玩家
```javascript
const diamonds = await UserGameStats.find({ 
    gameType: 'chinesechess',
    titleRank: 8  // 傲视群雄
});
```

## 测试检查清单

- [ ] 游戏结束时，ELO 等级分正确更新
- [ ] 获胜者的称号和颜色立即更新（在数据库中）
- [ ] 失败者的称号和颜色立即更新（在数据库中）
- [ ] `game_ended` 事件包含正确的称号信息
- [ ] 客户端收到称号信息并显示正确的颜色
- [ ] 定时任务每天 09:00 UTC 运行，更新所有玩家称号
- [ ] 多个玩家对局后，排名正确变化，称号相应调整
- [ ] 排行榜显示正确的称号和颜色

## 后续扩展

1. **称号徽章**：为每个称号增加图标/徽章资源
2. **称号动画**：游戏结束时播放称号升级/降级的动画
3. **成就系统**：基于称号历史，颁发特殊成就（如"曾经傲视群雄"）
4. **竞赛排行**：分别统计不同游戏类型的称号和排名
5. **段位保护**：高段位玩家的称号保护机制，防止频繁降级
