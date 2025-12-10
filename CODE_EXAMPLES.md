# 代码实现示例

## 🎯 前端需要实现的代码片段

### 1. 游戏结果对话框组件

**文件**：`client/src/components/GameEndDialog.tsx`

```typescript
'use client';

import React from 'react';
import './GameEndDialog.css';

interface GameEndData {
    won: boolean;
    winner: 'r' | 'b';              // 赤方或黑方
    winnerId: string;                // 胜者ID
    myUserId: string;                // 当前玩家ID
    oldRating: number;
    newRating: number;
    delta: number;                   // +6 or -5
    newTitle: string;                // '举世无双'
    newTitleColor: string;           // '#FF6200'
    newTitleRank: number;            // 10
    rematchTimeout: number;          // 30000ms
    onClose?: () => void;
}

export const GameEndDialog: React.FC<{ data: GameEndData }> = ({ data }) => {
    const [countdown, setCountdown] = React.useState(30);
    const isWinner = data.myUserId === data.winnerId;

    React.useEffect(() => {
        const interval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="game-end-dialog-overlay">
            <div className={`game-end-dialog ${isWinner ? 'victory' : 'defeat'}`}>
                {/* 胜负结果 */}
                <div className="result-header">
                    <h2 className="result-title">
                        {isWinner ? '🎉 恭喜获胜！' : '😢 不幸失败'}
                    </h2>
                    <p className="result-subtitle">
                        {data.winner === 'r' ? '赤方' : '黑方'}获胜
                    </p>
                </div>

                {/* 积分变化 */}
                <div className="rating-section">
                    <h3>📊 等级分变化</h3>
                    <div className="rating-change">
                        <span className="old-rating">
                            原等级分：<strong>{data.oldRating}</strong>
                        </span>
                        <span className="arrow">→</span>
                        <span className={`new-rating ${data.delta > 0 ? 'gain' : 'loss'}`}>
                            新等级分：<strong>{data.newRating}</strong>
                        </span>
                    </div>
                    <div className={`delta-display ${data.delta > 0 ? 'gain' : 'loss'}`}>
                        {data.delta > 0 ? '+' : ''}{data.delta}
                    </div>
                </div>

                {/* 称号变化 */}
                <div className="title-section">
                    <h3>🎖️ 称号信息</h3>
                    <div 
                        className="title-badge"
                        style={{ color: data.newTitleColor }}
                    >
                        <div className="title-name">{data.newTitle}</div>
                        <div className="title-rank">Rank #{data.newTitleRank}</div>
                    </div>
                </div>

                {/* 再来一局倒计时 */}
                <div className="rematch-section">
                    <p>
                        {countdown > 0 
                            ? `${countdown}秒后开始再来一局...` 
                            : '等待玩家确认...'}
                    </p>
                    <div className="countdown-bar">
                        <div 
                            className="countdown-fill"
                            style={{ width: `${(countdown / 30) * 100}%` }}
                        />
                    </div>
                </div>

                {/* 按钮 */}
                <div className="button-group">
                    <button 
                        className="btn btn-primary"
                        onClick={() => window.location.reload()}
                    >
                        同意再来一局
                    </button>
                    <button 
                        className="btn btn-secondary"
                        onClick={() => window.location.href = '/'}
                    >
                        返回大厅
                    </button>
                </div>
            </div>
        </div>
    );
};
```

**样式文件**：`client/src/components/GameEndDialog.css`

```css
.game-end-dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.game-end-dialog {
    background: white;
    border-radius: 20px;
    padding: 40px;
    max-width: 600px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: slideUp 0.5s ease-out;
}

.game-end-dialog.victory {
    border: 4px solid #FFD700;
    background: linear-gradient(135deg, #fff9e6 0%, #fff 100%);
}

.game-end-dialog.defeat {
    border: 4px solid #ddd;
    background: linear-gradient(135deg, #f5f5f5 0%, #fff 100%);
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(100px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.result-header {
    text-align: center;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 2px solid #eee;
}

.result-title {
    font-size: 32px;
    margin: 0 0 10px 0;
    font-weight: bold;
}

.result-subtitle {
    font-size: 14px;
    color: #666;
    margin: 0;
}

.rating-section,
.title-section,
.rematch-section {
    margin: 20px 0;
}

.rating-section h3,
.title-section h3,
.rematch-section h3 {
    font-size: 16px;
    margin: 0 0 15px 0;
    color: #333;
}

.rating-change {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 15px;
    padding: 15px;
    background: #f9f9f9;
    border-radius: 10px;
}

.old-rating,
.new-rating {
    flex: 1;
    text-align: center;
}

.new-rating.gain {
    color: #4CAF50;
    font-weight: bold;
}

.new-rating.loss {
    color: #FF6B6B;
    font-weight: bold;
}

.arrow {
    margin: 0 10px;
    color: #999;
}

.delta-display {
    text-align: center;
    font-size: 28px;
    font-weight: bold;
    padding: 10px;
    border-radius: 10px;
    margin: 10px 0;
}

.delta-display.gain {
    color: #4CAF50;
    background: #E8F5E9;
}

.delta-display.loss {
    color: #FF6B6B;
    background: #FFEBEE;
}

.title-badge {
    padding: 20px;
    text-align: center;
    background: #f0f0f0;
    border-radius: 15px;
    font-size: 24px;
    font-weight: bold;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.title-name {
    font-size: 28px;
    margin-bottom: 5px;
}

.title-rank {
    font-size: 14px;
    color: #666;
    margin-top: 5px;
}

.countdown-bar {
    width: 100%;
    height: 8px;
    background: #eee;
    border-radius: 4px;
    overflow: hidden;
    margin-top: 10px;
}

.countdown-fill {
    height: 100%;
    background: linear-gradient(90deg, #4CAF50, #45a049);
    transition: width 1s linear;
}

.rematch-section {
    text-align: center;
    padding: 20px;
    background: #f0f8ff;
    border-radius: 10px;
}

.rematch-section p {
    margin: 0 0 15px 0;
    color: #333;
    font-weight: 500;
}

.button-group {
    display: flex;
    gap: 10px;
    margin-top: 30px;
}

.btn {
    flex: 1;
    padding: 15px 20px;
    border: none;
    border-radius: 10px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-primary {
    background: linear-gradient(135deg, #4CAF50, #45a049);
    color: white;
}

.btn-primary:hover {
    background: linear-gradient(135deg, #45a049, #3d8b40);
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(76, 175, 80, 0.3);
}

.btn-secondary {
    background: #f0f0f0;
    color: #333;
    border: 2px solid #ddd;
}

.btn-secondary:hover {
    background: #e0e0e0;
    border-color: #999;
    transform: translateY(-2px);
}
```

---

### 2. ChineseChessTableClient 处理游戏结束

**文件**：`client/src/games/chinesechess/gamepagehierarchy/ChineseChessTableClient.ts`

```typescript
/**
 * 处理游戏结束事件（需要改进的部分）
 */
protected handleGameEnded(data: any): void {
    console.log(`[ChineseChessTableClient] Game ended:`, data);
    
    // 1. 提取当前用户信息
    const myUserId = localStorage.getItem('userId');
    const myTeam = /* 根据玩家ID判断红黑方 */;
    
    // 2. 提取积分数据
    const eloData = data.result?.elo;
    const myEloInfo = myTeam === 'red' ? eloData?.playerA : eloData?.playerB;
    const oldRating = myEloInfo?.oldRating || 1200;
    const newRating = myEloInfo?.newRating || 1200;
    const delta = myEloInfo?.delta || 0;
    
    // 3. 提取称号数据
    const titleData = data.result?.title;
    const myTitleInfo = titleData?.[myUserId];
    const newTitle = myTitleInfo?.title || '初出茅庐';
    const newTitleColor = myTitleInfo?.titleColor || '#000000';
    const newTitleRank = myTitleInfo?.titleRank || 1;
    
    // 4. 更新本地用户信息（可选，便于不需要重新登录就能显示新信息）
    localStorage.setItem('userRating', newRating.toString());
    localStorage.setItem('userTitle', newTitle);
    localStorage.setItem('userTitleColor', newTitleColor);
    localStorage.setItem('userTitleRank', newTitleRank.toString());
    
    // 5. 更新游戏状态
    this.updateState({
        status: 'matching',
        winner: data.result?.winner,
        gameResult: data.result
    });
    
    // 6. 显示游戏结果对话框
    this.showGameEndDialog({
        won: data.result?.winnerId === myUserId,
        winner: data.result?.winner,
        winnerId: data.result?.winnerId,
        myUserId: myUserId!,
        oldRating,
        newRating,
        delta,
        newTitle,
        newTitleColor,
        newTitleRank,
        rematchTimeout: data.rematchTimeout || 30000
    });
    
    // 7. 触发回调（如果有的话）
    if (this.onGameEnded) {
        this.onGameEnded(data.result);
    }
}

/**
 * 显示游戏结果对话框（需要实现的回调）
 */
private showGameEndDialog(gameEndData: any): void {
    // 这里可以通过 emit 事件或者回调函数来通知 UI 层显示对话框
    // 例如：
    if (this.onShowGameEndDialog) {
        this.onShowGameEndDialog(gameEndData);
    } else {
        console.warn('[ChineseChessTableClient] onShowGameEndDialog callback not set');
    }
}

// 在类初始化时需要设置回调
public onShowGameEndDialog?: (data: any) => void;
```

---

### 3. 个人中心显示更新

**文件**：`client/src/app/profile/UserProfile.tsx`

```typescript
// 修改 fetchProfile 后的数据处理
const fetchProfile = async () => {
    try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');
        
        const res = await fetch(`${API_URL}/api/user/profile?userId=${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('Failed to fetch profile');
        
        const data = await res.json();
        
        // ✅ 现在可以访问 gameStats
        console.log('Profile with gameStats:', data.gameStats);
        
        setProfile(data);
    } catch (error) {
        console.error('Failed to fetch profile', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
        setLoading(false);
    }
};

// 修改渲染部分
return (
    <div className="user-profile">
        {/* 基本信息 */}
        <div className="profile-header">
            <img src={profile.avatar} alt="avatar" className="avatar" />
            <h1>{profile.nickname}</h1>
            <p>@{profile.username}</p>
        </div>

        {/* 游戏统计 */}
        <div className="game-stats">
            {/* 中国象棋 */}
            {profile.gameStats?.chinesechess && (
                <div className="game-card chinesechess">
                    <h3>中国象棋</h3>
                    
                    {/* 称号显示 */}
                    <div 
                        className="title-display"
                        style={{ color: profile.gameStats.chinesechess.titleColor }}
                    >
                        <div className="title-text">
                            {profile.gameStats.chinesechess.title}
                        </div>
                        <div className="title-rank">
                            Rank #{profile.gameStats.chinesechess.titleRank}
                        </div>
                    </div>
                    
                    {/* 等级分 */}
                    <div className="rating-box">
                        <span className="label">等级分</span>
                        <span className="value">
                            {profile.gameStats.chinesechess.rating}
                        </span>
                    </div>
                    
                    {/* 战绩 */}
                    <div className="record-grid">
                        <div className="record-item">
                            <span className="label">总局</span>
                            <span className="value">
                                {profile.gameStats.chinesechess.gamesPlayed}
                            </span>
                        </div>
                        <div className="record-item">
                            <span className="label">胜</span>
                            <span className="value win">
                                {profile.gameStats.chinesechess.wins}
                            </span>
                        </div>
                        <div className="record-item">
                            <span className="label">负</span>
                            <span className="value loss">
                                {profile.gameStats.chinesechess.losses}
                            </span>
                        </div>
                        <div className="record-item">
                            <span className="label">平</span>
                            <span className="value">
                                {profile.gameStats.chinesechess.draws}
                            </span>
                        </div>
                    </div>
                    
                    {/* 战胜率 */}
                    {profile.gameStats.chinesechess.gamesPlayed > 0 && (
                        <div className="winrate">
                            <span className="label">胜率</span>
                            <span className="value">
                                {(
                                    (profile.gameStats.chinesechess.wins / 
                                    profile.gameStats.chinesechess.gamesPlayed) * 100
                                ).toFixed(1)}%
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* 其他游戏（gomoku, poker 等）可以类似地显示 */}
        </div>
    </div>
);
```

---

## 🔧 后端已实现的关键函数

### EloService 计算流程

```javascript
// server/src/gamecore/EloService.js
async processMatchResult(gameType, playerAId, playerBId, resultA) {
    // 1. 获取玩家数据
    const statsA = await this.getOrCreateStats(playerAId, gameType);
    const statsB = await this.getOrCreateStats(playerBId, gameType);

    // 2. 获取 Mu Dynamic（服务器平衡基准）
    const meta = await GameMeta.findOne({ gameType });
    const muDynamic = meta ? meta.muDynamic : 1200;

    // 3. 计算 K 值
    const kA = this.calculateK(statsA.rating, statsA.gamesPlayed, muDynamic);
    const kB = this.calculateK(statsB.rating, statsB.gamesPlayed, muDynamic);

    // 4. 计算预期胜率
    const expectedA = this.calculateExpected(statsA.rating, statsB.rating);
    const expectedB = this.calculateExpected(statsB.rating, statsA.rating);

    // 5. 计算积分变化
    const resultB = 1 - resultA;
    const deltaA = this.calculateDelta(kA, resultA, expectedA);
    const deltaB = this.calculateDelta(kB, resultB, expectedB);

    // 6. 更新数据库
    statsA.rating += deltaA;
    statsA.gamesPlayed += 1;
    statsA.lastPlayedAt = new Date();
    if (resultA === 1) statsA.wins++;
    else if (resultA === 0.5) statsA.draws++;
    else statsA.losses++;
    await statsA.save();

    // 同样处理 statsB...

    // 7. 返回结果
    return {
        playerA: { oldRating: statsA.rating - deltaA, newRating: statsA.rating, delta: deltaA },
        playerB: { oldRating: statsB.rating - deltaB, newRating: statsB.rating, delta: deltaB }
    };
}
```

### Grade 计算流程

```javascript
// server/src/games/chinesechess/grade/Grade.js
async updatePlayerTitles(userIds, gameType) {
    const results = {};
    
    for (const userId of userIds) {
        // 1. 获取玩家的当前评分
        const stats = await UserGameStats.findOne({ userId, gameType });
        if (!stats) continue;

        // 2. 计算排名
        const betterPlayers = await UserGameStats.countDocuments({
            gameType,
            rating: { $gt: stats.rating }
        });
        const rank = betterPlayers + 1;

        // 3. 获取总玩家数
        const totalPlayers = await UserGameStats.countDocuments({ gameType });

        // 4. 获取称号配置
        const titleConfig = this.getTitleByRank(rank, totalPlayers);

        // 5. 更新数据库
        stats.title = titleConfig.name;
        stats.titleRank = titleConfig.rank;
        stats.titleColor = titleConfig.color;
        await stats.save();

        results[userId] = {
            title: titleConfig.name,
            titleRank: titleConfig.rank,
            titleColor: titleConfig.color
        };
    }

    return results;
}
```

---

## 🎨 样式参考

### 称号颜色样式

```css
.title-display {
    padding: 20px;
    text-align: center;
    font-size: 24px;
    font-weight: bold;
    border-radius: 10px;
    background: linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.5));
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    margin: 15px 0;
}

/* 根据不同等级添加不同效果 */
.title-display[style*="#FF6200"] {
    /* 举世无双 - 橙红色 */
    background: linear-gradient(135deg, #fff3e0, #ffe0b2);
    box-shadow: 0 4px 15px rgba(255, 98, 0, 0.3);
}

.title-display[style*="#ffba08"] {
    /* 登峰造极 - 橙色 */
    background: linear-gradient(135deg, #fff8e1, #ffe082);
    box-shadow: 0 4px 15px rgba(255, 186, 8, 0.2);
}

.title-display[style*="#800080"] {
    /* 傲视群雄 - 紫色 */
    background: linear-gradient(135deg, #f3e5f5, #e1bee7);
    box-shadow: 0 4px 15px rgba(128, 0, 128, 0.2);
}
```

---

这就是前端需要实现的全部关键代码！🚀

