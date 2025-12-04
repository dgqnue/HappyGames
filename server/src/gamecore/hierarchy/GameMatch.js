/**
 * 游戏对局基类 (GameMatch)
 * 
 * 代表单个对局/游戏会话。
 * 管理游戏从开始到结束的生命周期。
 * 
 * 职责:
 * - 管理对局状态 (状态, 玩家, 历史记录)
 * - 定义游戏规则的抽象接口
 * - 处理通用游戏流程 (开始, 结束, 超时)
 */
class GameMatch {
    constructor(matchId) {
        this.matchId = matchId;
        this.status = 'pending'; // pending(等待中), playing(进行中), finished(已结束), aborted(已中止)
        this.players = []; // 玩家对象数组
        this.history = []; // 移动/动作历史记录数组
        this.startTime = null;
        this.endTime = null;
        this.winner = null;
        this.result = null; // 详细结果对象
    }

    /**
     * 初始化对局玩家
     * @param {Array} players - 加入对局的玩家列表
     */
    init(players) {
        this.players = players;
        this.status = 'ready';
    }

    /**
     * 开始对局
     */
    start() {
        if (this.status !== 'ready') {
            throw new Error('Match is not ready to start');
        }
        this.status = 'playing';
        this.startTime = Date.now();
        this.onStart();
    }

    /**
     * 处理玩家移动
     * @param {Object} player - 执行移动的玩家
     * @param {Object} move - 移动数据
     * @returns {Object} 移动结果 { valid: boolean, ... }
     */
    handleMove(player, move) {
        if (this.status !== 'playing') {
            return { valid: false, message: 'Game is not in progress' };
        }

        // 1. 验证回合 (由子类实现)
        if (!this.isTurn(player)) {
            return { valid: false, message: 'Not your turn' };
        }

        // 2. 验证移动逻辑 (由子类实现)
        const validation = this.validateMove(player, move);
        if (!validation.valid) {
            return validation;
        }

        // 3. 执行移动 (更新状态)
        const moveResult = this.executeMove(player, move);

        // 4. 记录历史
        this.history.push({
            playerId: player.userId || player.id,
            move: move,
            timestamp: Date.now(),
            ...moveResult.historyData
        });

        // 5. 检查胜利条件
        const winResult = this.checkWinCondition();
        if (winResult) {
            this.end(winResult);
        } else {
            // 6. 切换回合 (如果适用)
            this.switchTurn();
        }

        return { valid: true, ...moveResult };
    }

    /**
     * 结束对局
     * @param {Object} result - 对局结果
     */
    end(result) {
        this.status = 'finished';
        this.endTime = Date.now();
        this.result = result;
        this.winner = result.winner;
        this.onEnd(result);
    }

    // --- 抽象方法 (需由子类实现) ---

    onStart() {
        // 可选: 特定开始逻辑
    }

    isTurn(player) {
        throw new Error('Method isTurn() must be implemented');
    }

    validateMove(player, move) {
        throw new Error('Method validateMove() must be implemented');
    }

    executeMove(player, move) {
        throw new Error('Method executeMove() must be implemented');
    }

    checkWinCondition() {
        // 如果游戏继续返回 null，如果结束返回结果对象
        return null;
    }

    switchTurn() {
        // 可选: 切换回合逻辑
    }

    onEnd(result) {
        // 可选: 特定结束逻辑
    }
}

module.exports = GameMatch;
