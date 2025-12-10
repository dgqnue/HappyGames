# 称号系统快速参考

## 核心功能

### Grade 类的主要方法

```javascript
// 1. 游戏结束后快速更新（单个玩家）
await Grade.updatePlayerTitle(userId, gameType)
// 返回: { title, titleRank, titleColor }

// 2. 游戏结束后快速更新（多个玩家）
await Grade.updatePlayerTitles([userId1, userId2], gameType)
// 返回: { userId1: {...}, userId2: {...} }

// 3. 定期批量更新所有玩家（每天凌晨）
await Grade.updateAllPlayerTitles(gameType)

// 4. 获取玩家当前称号信息
await Grade.getPlayerTitleInfo(userId, gameType)
// 返回: { title, titleRank, titleColor, rating }
```

## 调用流程

### 游戏结束时（ChineseChessTable.js）

```javascript
async handleWin(winnerSide) {
    // 1. 更新ELO
    const eloResult = await EloService.processMatchResult(...);
    
    // 2. 更新称号 ← 新增
    const titleResult = await Grade.updatePlayerTitles(
        [winnerId, loserId], 
        this.gameType
    );
    
    // 3. 结束游戏并广播
    this.endGame({
        winner: winnerSide,
        elo: eloResult,
        title: titleResult  // 包含新称号信息
    });
}
```

## 称号配置

### TITLES 常量
位于 `Grade.js` 中，定义10个称号等级。

### 排名计算规则

```
排名百分比 = (玩家排名 - 1) / 总玩家数

根据百分比确定称号：
- 排名第1 → 举世无双 (rank 10)
- 百分比 < 2% → 登峰造极 (rank 9)
- 百分比 < 4% → 傲视群雄 (rank 8)
- ...
- 百分比 < 22% → 初出茅庐 (rank 1)
```

## 数据库字段

### UserGameStats 模型

```javascript
{
    rating: Number,        // 等级分（ELO）
    title: String,         // "傲视群雄" 等
    titleRank: Number,     // 1-10
    titleColor: String     // "#800080" 等
}
```

## 客户端显示

### 基础显示

```tsx
// 显示玩家信息时
<span style={{ color: player.titleColor }}>
    {player.nickname} [{player.title}] {player.rating}分
</span>
```

### 游戏结束界面

```tsx
// 显示对局结果和称号变化
<div>
    <div className="winner">
        {winnerName} [{newTitle}]
        +{eloDelta} ({oldRating}→{newRating})
    </div>
    <div className="loser">
        {loserName} [{newTitle}]
        {eloDelta} ({oldRating}→{newRating})
    </div>
</div>
```

## 颜色参考

| 称号 | 颜色代码 | RGB |
|------|---------|------|
| 举世无双 | #FF6200 | 红橙 |
| 登峰造极 | #ffba08 | 金黄 |
| 傲视群雄 | #800080 | 紫色 |
| 名满江湖 | #ffee32 | 黄色 |
| 炉火纯青 | #00FFFF | 青色 |
| 出类拔萃 | #FF0000 | 红色 |
| 锋芒毕露 | #0000FF | 蓝色 |
| 渐入佳境 | #00FF00 | 绿色 |
| 小试牛刀 | #8f2d56 | 紫红 |
| 初出茅庐 | #000000 | 黑色 |

## 日志输出

### 游戏结束后

```
[ChineseChessTable] Title updated after win: {
  '507f1f77bcf86cd799439011': { 
    title: '傲视群雄', 
    titleRank: 8, 
    titleColor: '#800080' 
  },
  '507f1f77bcf86cd799439012': { 
    title: '初出茅庐', 
    titleRank: 1, 
    titleColor: '#000000' 
  }
}
```

### 定时任务

```
[CRON] Starting Title Update...
[GRADE] Starting title update for chinesechess...
[GRADE] Total players: 1234
[GRADE] Updated 507f...: rank=15, title=傲视群雄, color=#800080
...
[GRADE] Title update complete for chinesechess. Updated 1234 players.
```

## 排查问题

### 称号没有更新
1. 检查 Grade.js 中的 updatePlayerTitle 是否被调用
2. 查看数据库中的 title, titleRank, titleColor 字段是否存在
3. 确认 ELO 等级分已更新（title 基于 rating 排名）

### 颜色显示错误
1. 检查客户端是否读取了 titleColor 字段
2. 确认 CSS 样式中使用了 `style={{ color: titleColor }}`
3. 验证颜色代码格式（需要 # 前缀）

### 称号与排名不符
1. 检查 getTitleByRank 方法是否正确计算百分位
2. 验证总玩家数是否正确（可能有新注册玩家）
3. 运行定时任务的批量更新确保一致性
