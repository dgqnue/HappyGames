/**
 * 游戏匹配系统 - 房间状态管理
 * 
 * 管理房间的匹配条件、玩家准备状态、倒计时等
 */

class MatchRoomState {
    constructor(roomId, maxPlayers = 2) {
        this.roomId = roomId;
        this.maxPlayers = maxPlayers; // 游戏所需玩家数量（可配置）

        // 玩家列表（按入座顺序）
        this.players = []; // [{ userId, socketId, nickname, ready: false, ... }]

        // 观众列表
        this.spectators = []; // [{ userId, socketId, nickname }]

        // 房间状态
        this.status = 'idle'; // idle | waiting | matching | playing | ended

        // 匹配条件（由第一个入座的玩家设置）
        this.matchSettings = {
            baseBet: 1000,           // 底豆
            betRange: [500, 5000],   // 可接受的底豆范围
            winRateRange: [0, 100],  // 对方胜率范围 (%)
            maxDisconnectRate: 100,  // 最大掉线率 (%)
            ratingRange: null        // 对方等级分范围 [min, max]（可选）
        };

        // 准备倒计时
        this.readyTimer = null;
        this.readyTimeout = 30000; // 30秒

        // 僵尸桌清理倒计时
        this.zombieTimer = null;
        this.zombieTimeout = 300000; // 5分钟

        // 房间创建时间
        this.createdAt = Date.now();

        // 第一个玩家入座时间
        this.firstPlayerJoinedAt = null;
    }

    /**
     * 检查玩家是否符合匹配条件
     * ⭐ 以第一个入座玩家的条件为准
     */
    canPlayerJoin(playerStats) {
        // 如果是第一个玩家，直接允许
        if (this.players.length === 0) {
            console.log(`[MatchRoom] First player joining, auto-approved`);
            return true;
        }

        // 获取第一个玩家设置的匹配条件
        const { baseBet, betRange, winRateRange, maxDisconnectRate, ratingRange } = this.matchSettings;

        console.log(`[MatchRoom] Checking player against room criteria:`, {
            roomBaseBet: baseBet,
            roomBetRange: betRange,
            roomWinRateRange: winRateRange,
            roomMaxDisconnectRate: maxDisconnectRate,
            roomRatingRange: ratingRange
        });

        // 1. 检查玩家的胜率是否在第一个玩家设置的范围内
        const winRate = playerStats.gamesPlayed > 0
            ? (playerStats.wins / playerStats.gamesPlayed) * 100
            : 0;

        if (winRate < winRateRange[0] || winRate > winRateRange[1]) {
            console.log(`[MatchRoom] Player rejected: winRate ${winRate.toFixed(1)}% not in range [${winRateRange[0]}, ${winRateRange[1]}]`);
            return false;
        }

        // 2. 检查玩家的掉线率是否符合第一个玩家的要求
        const disconnectRate = playerStats.gamesPlayed > 0
            ? (playerStats.disconnects / playerStats.gamesPlayed) * 100
            : 0;

        if (disconnectRate > maxDisconnectRate) {
            console.log(`[MatchRoom] Player rejected: disconnectRate ${disconnectRate.toFixed(1)}% exceeds max ${maxDisconnectRate}%`);
            return false;
        }

        // 3. 检查玩家的等级分（如果第一个玩家设置了等级分范围）
        if (ratingRange && ratingRange.length === 2) {
            const rating = playerStats.rating || 1200;
            const [minRating, maxRating] = ratingRange;

            if (rating < minRating || rating > maxRating) {
                console.log(`[MatchRoom] Player rejected: rating ${rating} not in range [${minRating}, ${maxRating}]`);
                return false;
            }
        }

        console.log(`[MatchRoom] Player accepted: winRate=${winRate.toFixed(1)}%, disconnectRate=${disconnectRate.toFixed(1)}%`);
        return true;
    }

    /**
     * 玩家入座
     */
    addPlayer(playerData) {
        if (this.players.length >= this.maxPlayers) {
            return { success: false, error: '房间已满' };
        }

        // 检查是否已在房间
        if (this.players.find(p => p.userId === playerData.userId)) {
            return { success: false, error: '已在房间中' };
        }

        this.players.push({
            ...playerData,
            ready: false,
            joinedAt: Date.now()
        });

        // 状态更新逻辑
        if (this.players.length === 1) {
            this.status = 'waiting'; // 1人：等待中

            this.firstPlayerJoinedAt = Date.now();
            if (playerData.matchSettings) {
                // 使用第一个玩家的匹配条件
                this.matchSettings = { ...this.matchSettings, ...playerData.matchSettings };
                console.log(`[MatchRoom] Room match settings set by first player:`, this.matchSettings);
            }
        } else if (this.players.length === this.maxPlayers) {
            // 满座：匹配中（准备阶段）
            // 注意：实际的倒计时启动由 MatchableGameRoom 处理
            // 这里先不设为 matching，等 startReadyCheck 调用时再设，或者现在设也可以
            // 但为了保持一致性，我们让 startReadyCheck 来设置 matching
            // 不过根据用户需求"已满座但未进入游戏时，状态设置为匹配中"，这里应该设为 matching
            // 可是如果 MatchableGameRoom 还没来得及 startReadyCheck 呢？
            // 让我们保持 status = 'waiting' 直到 startReadyCheck 被调用，或者在这里就设为 matching？
            // 既然 MatchableGameRoom 会在 addPlayer 后立即检查是否满座并调用 startReadyCheck
            // 我们这里可以先不改，或者预设。
            // 让我们在 startReadyCheck 里统一设置 matching
        }

        return { success: true };
    }

    /**
     * 玩家离座
     */
    removePlayer(userId) {
        const index = this.players.findIndex(p => p.userId === userId);
        if (index === -1) return false;

        this.players.splice(index, 1);

        // 取消准备检查
        if (this.readyTimer) {
            clearTimeout(this.readyTimer);
            this.readyTimer = null;
        }

        // 状态更新逻辑
        if (this.status === 'matching' || this.status === 'playing' || this.status === 'ended' || this.status === 'waiting') {
            if (this.players.length === 0) {
                this.status = 'idle'; // 0人：空闲
            } else if (this.players.length < this.maxPlayers) {
                this.status = 'waiting'; // 不满座：等待中
            }
        }

        // 如果房间空了，重置匹配条件和计时器
        if (this.players.length === 0) {
            if (this.zombieTimer) {
                clearTimeout(this.zombieTimer);
                this.zombieTimer = null;
            }
            this.firstPlayerJoinedAt = null;

            // 重置匹配条件为默认值
            this.matchSettings = {
                baseBet: 1000,
                betRange: [500, 5000],
                winRateRange: [0, 100],
                maxDisconnectRate: 100,
                ratingRange: null
            };
            console.log(`[MatchRoom] Room emptied, match settings reset to default`);
        }

        return true;
    }

    /**
     * 添加观众
     */
    addSpectator(spectatorData) {
        if (this.spectators.find(s => s.userId === spectatorData.userId)) {
            return { success: false, error: '已在观众席' };
        }

        this.spectators.push(spectatorData);
        return { success: true };
    }

    /**
     * 移除观众
     */
    removeSpectator(userId) {
        const index = this.spectators.findIndex(s => s.userId === userId);
        if (index === -1) return false;

        this.spectators.splice(index, 1);
        return true;
    }

    /**
     * 玩家准备
     */
    setPlayerReady(userId, ready = true) {
        const player = this.players.find(p => p.userId === userId);
        if (!player) return false;

        player.ready = ready;

        // 检查是否所有玩家都准备好了
        if (this.allPlayersReady()) {
            this.cancelReadyCheck();
            return 'all_ready';
        }

        return true;
    }

    /**
     * 检查所有玩家是否都准备好
     */
    allPlayersReady() {
        return this.players.length === this.maxPlayers &&
            this.players.every(p => p.ready);
    }

    /**
     * 开始准备检查（30秒倒计时）
     */
    startReadyCheck() {
        if (this.status === 'matching') return;

        this.status = 'matching'; // 满座准备阶段：匹配中
        return {
            started: true,
            timeout: this.readyTimeout
        };
    }

    /**
     * 取消准备检查
     */
    cancelReadyCheck() {
        if (this.readyTimer) {
            clearTimeout(this.readyTimer);
            this.readyTimer = null;
        }

        // 恢复状态
        if (this.players.length === 0) {
            this.status = 'idle';
        } else {
            this.status = 'waiting';
        }
    }

    /**
     * 获取未准备的玩家
     */
    getUnreadyPlayers() {
        return this.players.filter(p => !p.ready);
    }

    /**
     * 重置所有玩家的准备状态
     */
    resetReadyStatus() {
        this.players.forEach(p => p.ready = false);
    }

    /**
     * 检查是否是僵尸桌（5分钟无匹配）
     */
    isZombieRoom() {
        if (!this.firstPlayerJoinedAt) return false;
        if (this.status === 'playing') return false;

        const elapsed = Date.now() - this.firstPlayerJoinedAt;
        return elapsed >= this.zombieTimeout;
    }

    /**
     * 获取房间信息（用于房间列表展示）
     */
    getRoomInfo() {
        return {
            roomId: this.roomId,
            status: this.status,
            players: this.players.length,
            maxPlayers: this.maxPlayers,
            spectators: this.spectators.length,
            baseBet: this.matchSettings.baseBet,
            matchSettings: this.matchSettings, // 包含完整的匹配条件
            playerList: this.players.map(p => ({
                nickname: p.nickname,
                title: p.title,
                winRate: p.winRate,
                disconnectRate: p.disconnectRate,
                ready: p.ready
            }))
        };
    }

    /**
     * 清理资源
     */
    cleanup() {
        if (this.readyTimer) {
            clearTimeout(this.readyTimer);
            this.readyTimer = null;
        }
        if (this.zombieTimer) {
            clearTimeout(this.zombieTimer);
            this.zombieTimer = null;
        }
    }
}

module.exports = MatchRoomState;
