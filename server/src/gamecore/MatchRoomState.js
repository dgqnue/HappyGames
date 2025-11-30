/**
 * 游戏匹配系统 - 房间状态管理
 * 
 * 管理房间的匹配条件、玩家准备状态、倒计时等
 */

const MatchingRules = require('./MatchingRules');

class MatchRoomState {
    constructor(roomId, maxPlayers = 2) {
        this.roomId = roomId;
        this.maxPlayers = maxPlayers;

        this.players = [];

        this.spectators = [];

        // 房间状态
        this.status = MatchingRules.TABLE_STATUS.IDLE;
        console.log(`[MatchRoomState] Room ${roomId} initialized with status: ${this.status}`);

        // 匹配条件（由第一个入座的玩家设置）
        this.matchSettings = { ...MatchingRules.DEFAULT_SETTINGS };

        // 准备倒计时
        this.readyTimer = null;
        this.readyTimeout = MatchingRules.COUNTDOWN_CONFIG.readyTimeout;

        // 僵尸桌清理倒计时
        this.zombieTimer = null;
        this.zombieTimeout = MatchingRules.COUNTDOWN_CONFIG.zombieTimeout;

        // 房间创建时间
        this.createdAt = Date.now();

        // 第一个玩家入座时间
        this.firstPlayerJoinedAt = null;
    }

    /**
     * 检查玩家是否符合匹配条件
     */
    canPlayerJoin(playerStats, playerSettings = null) {
        const isFirstPlayer = this.players.length === 0;
        const result = MatchingRules.checkMatchCriteria(
            playerStats,
            playerSettings,
            this.matchSettings,
            isFirstPlayer
        );

        console.log(`[MatchRoom] ${result.reason}`);
        return result.canJoin;
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
        const newState = MatchingRules.getStateAfterPlayerJoin(this.players.length, this.maxPlayers);
        if (newState) {
            this.status = newState;
        }

        if (this.players.length === 1) {
            this.firstPlayerJoinedAt = Date.now();
            if (playerData.matchSettings) {
                // 使用第一个玩家的匹配条件
                this.matchSettings = { ...this.matchSettings, ...playerData.matchSettings };
                console.log(`[MatchRoom] Room match settings set by first player:`, this.matchSettings);
            }
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
        const newState = MatchingRules.getStateAfterPlayerLeave(this.players.length, this.maxPlayers);
        if (newState) {
            this.status = newState;
        }

        // 如果房间空了，重置匹配条件和计时器
        if (this.players.length === 0) {
            if (this.zombieTimer) {
                clearTimeout(this.zombieTimer);
                this.zombieTimer = null;
            }
            this.firstPlayerJoinedAt = null;

            // 重置匹配条件为默认值
            this.matchSettings = { ...MatchingRules.DEFAULT_SETTINGS };
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
        return MatchingRules.areAllPlayersReady(this.players, this.maxPlayers);
    }

    /**
     * 开始准备检查
     */
    startReadyCheck() {
        if (this.status === MatchingRules.TABLE_STATUS.MATCHING) return;

        this.status = MatchingRules.TABLE_STATUS.MATCHING;
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
        const newState = MatchingRules.getStateAfterCancelReadyCheck(this.players.length);
        this.status = newState;
    }

    /**
     * 获取未准备的玩家
     */
    getUnreadyPlayers() {
        return MatchingRules.getUnreadyPlayers(this.players);
    }

    /**
     * 重置所有玩家的准备状态
     */
    resetReadyStatus() {
        this.players.forEach(p => p.ready = false);
    }

    /**
     * 检查是否是僵尸桌
     */
    isZombieRoom() {
        return MatchingRules.isZombieTable(this.firstPlayerJoinedAt, this.status);
    }

    /**
     * 获取房间信息
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
