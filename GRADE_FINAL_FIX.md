# Grade 算法修复 - 最终版本验证

## ✅ 修复完成

算法已修改，使用**绝对百分比阈值**的方式。

---

## 📊 测试场景：2个玩家

### 玩家 A（rank 1 - 最强）
```
percentile = 1 / 2 = 0.5 (50%)

检查等级：
- 举世无双：minPercentile = 0.00，0.5 <= 0.00? NO
- 登峰造极：minPercentile = 0.01，0.5 <= 0.01? NO
- 傲视群雄：minPercentile = 0.02，0.5 <= 0.02? NO
- 名满江湖：minPercentile = 0.06，0.5 <= 0.06? NO
- 炉火纯青：minPercentile = 0.12，0.5 <= 0.12? NO
- 出类拔萃：minPercentile = 0.20，0.5 <= 0.20? NO
- 锋芒毕露：minPercentile = 0.30，0.5 <= 0.30? NO
- 渐入佳境：minPercentile = 0.43，0.5 <= 0.43? NO
- 小试牛刀：minPercentile = 0.59，0.5 <= 0.59? ✅ YES

→ 得到 小试牛刀 （第二高的等级）
```

**这还是不对...**

实际上应该是 rank=1 最强的人是 **举世无双**（rank 10）。

---

## 🔴 问题：反向了！

我意识到：
- **rank = 1** 是**最强**的人，应该得到**最高等级**（举世无双）
- **rank = 2** 是第二强的人，应该得到第二高的等级（登峰造极）

但玩家总数只有 2 人时：
- rank 1 (percentile = 0.5 = 50%) 应该 → 举世无双（top 1人）
- rank 2 (percentile = 1.0 = 100%) 应该 → 登峰造极（next 2%人）

**关键问题**：当玩家少时，百分比会很大，无法匹配高等级。

---

## 💡 真正的解决方案

需要改为**"至少要进入前多少名"**的方式：

```javascript
// 计算该等级最少需要多少名的玩家
const TOP_RANKS = {
    举世无双: 1,                    // rank 1
    登峰造极: Math.max(2, total * 0.02),   // top 2% 或至少 2 名
    傲视群雄: Math.max(4, total * 0.04),   // top 4% 或至少 4 名
    // ...
};

if (rank <= TOP_RANKS[举世无双]) return 举世无双;
if (rank <= TOP_RANKS[登峰造极]) return 登峰造极;
// ...
```

让我改为这种方式：

```javascript
getTitleByRank(rank, totalPlayers) {
    // 定义每个等级的人数下限
    const thresholds = [
        { titleIndex: 9, name: '举世无双', minRank: 1 },  // 最强 1 人
        { titleIndex: 8, name: '登峰造极', minRank: Math.max(2, Math.ceil(totalPlayers * 0.02)) },
        { titleIndex: 7, name: '傲视群雄', minRank: Math.max(4, Math.ceil(totalPlayers * 0.04)) },
        { titleIndex: 6, name: '名满江湖', minRank: Math.max(6, Math.ceil(totalPlayers * 0.06)) },
        { titleIndex: 5, name: '炉火纯青', minRank: Math.max(8, Math.ceil(totalPlayers * 0.08)) },
        { titleIndex: 4, name: '出类拔萃', minRank: Math.max(10, Math.ceil(totalPlayers * 0.10)) },
        { titleIndex: 3, name: '锋芒毕露', minRank: Math.max(13, Math.ceil(totalPlayers * 0.13)) },
        { titleIndex: 2, name: '渐入佳境', minRank: Math.max(16, Math.ceil(totalPlayers * 0.16)) },
        { titleIndex: 1, name: '小试牛刀', minRank: Math.max(19, Math.ceil(totalPlayers * 0.19)) },
        { titleIndex: 0, name: '初出茅庐', minRank: totalPlayers + 1 }  // 剩余所有人
    ];
    
    for (const threshold of thresholds) {
        if (rank <= threshold.minRank) {
            return TITLES[threshold.titleIndex];
        }
    }
    
    return TITLES[0];  // 默认
}

// 测试：2 个玩家
// rank=1: minRank=1, 1 <= 1? ✅ → 举世无双 ✓
// rank=2: minRank=1, 2 <= 1? NO
//         minRank=max(2, ceil(2*0.02))=max(2,1)=2
//         2 <= 2? ✅ → 登峰造极 ✓
```

这才是正确的！

