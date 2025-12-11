/**
 * 游戏桌客户端基类 (GameTableClient)
 * 
 * 对应后端的 GameTable 类
 * 
 * 职责：
 * - 管理游戏桌状态（玩家列表、准备状态）
 * - 处理玩家加入/离开
 * - 处理准备/取消准备
 * - 触发游戏开始
 * - 管理游戏状态和数据
 * 
 * 使用方法：
 * class MyGameTableClient extends GameTableClient {
 *     constructor(socket, gameType) {
 *         super(socket, gameType);
 *     }
 *     
 *     protected setupTableListeners() {
 *         // 添加游戏特定的事件监听
 *     }
 * }
 */

import { Socket } from 'socket.io-client';

// 全局对话框处理器类型
type GlobalDialogHandler = {
    showError: (title: string, message: string) => void;
    showSuccess: (title: string, message: string) => void;
    showWarning: (title: string, message: string) => void;
    showInfo: (title: string, message: string) => void;
};

// 全局对话框实例
let globalDialogHandler: GlobalDialogHandler | null = null;

// 设置全局对话框处理器的静态方法
export function setGlobalDialogHandler(handler: GlobalDialogHandler) {
    globalDialogHandler = handler;
}

// 获取全局对话框处理器
export function getGlobalDialogHandler(): GlobalDialogHandler | null {
    return globalDialogHandler;
}

export interface Player {
    userId: string;
    socketId: string;
    nickname?: string;
    ready?: boolean;
    [key: string]: any;
}

export interface GameTableState {
    tableId: string | null;
    status: 'idle' | 'waiting' | 'matching' | 'playing';
    baseBet: number;
    players: Player[];
    maxPlayers: number;
    ready: boolean;  // 统一使用ready，而非isReady
    canStart: boolean;
    countdown?: {
        type: 'ready' | 'start' | 'rematch';
        timeout?: number;
        start?: number;
        count?: number;
        message?: string;
    } | null;
    [key: string]: any;
}

export abstract class GameTableClient {
    protected socket: Socket;
    protected gameType: string;
    protected state: GameTableState;
    protected onStateUpdate: ((state: GameTableState) => void) | null = null;

    // 被踢出回调
    protected onKicked: ((data: any) => void) | null = null;

    // 状态变化订阅列表
    protected stateChangeCallbacks: Array<() => void> = [];

    // 当前用户ID
    protected currentUserId: string | null = null;

    constructor(
        socket: Socket,
        gameType: string
    ) {
        this.socket = socket;
        this.gameType = gameType;
        this.state = {
            tableId: null,
            status: 'idle',
            baseBet: 0,
            players: [],
            maxPlayers: 2,
            ready: false,
            canStart: false
        };
    }

    /**
     * 设置被踢出回调
     */
    public setOnKickedCallback(callback: (data: any) => void): void {
        this.onKicked = callback;
    }

    /**
     * 初始化游戏桌客户端
     * @param onStateUpdate - 状态更新回调函数
     */
    public init(onStateUpdate: (state: GameTableState) => void): void {
        this.onStateUpdate = onStateUpdate;
        this.setupCommonListeners();
        this.setupTableListeners();
        console.log(`[${this.gameType}TableClient] Initialized`);
    }

    /**
     * 设置通用事件监听
     */
    protected setupCommonListeners(): void {
        // 游戏桌初始状态 (加入成功后收到)
        this.socket.on('table_state', (data: any) => {
            console.log(`[${this.gameType}TableClient] Table state received:`, data);
            this.handleTableState(data);
        });

        // 游戏桌状态更新 (广播)
        this.socket.on('table_update', (data: any) => {
            console.log(`[${this.gameType}TableClient] Table update received:`, data);
            this.handleTableUpdate(data);
        });

        // 加入失败事件处理
        this.socket.on('join_failed', (data: any) => {
            console.warn(`[${this.gameType}TableClient] Join failed:`, data);
            this.handleJoinFailed(data);
        });

        // 服务器错误事件处理
        this.socket.on('error', (data: any) => {
            console.warn(`[${this.gameType}TableClient] Server error:`, data);
            const message = data.message || '操作失败，请稍后重试';
            const handler = getGlobalDialogHandler();
            if (handler) {
                handler.showError('操作失败', message);
            } else {
                console.error('Global dialog handler not initialized');
            }
        });

        // 兼容旧的 state 事件 (如果还有地方用到)
        this.socket.on('state', (data: any) => {
            console.log(`[${this.gameType}TableClient] Legacy state update:`, data);
            this.handleStateUpdate(data);
        });

        // 游戏开始
        this.socket.on('game_start', (data: any) => {
            console.log(`[${this.gameType}TableClient] Game starting event received:`, data);
            this.handleGameStart(data);
        });

        // 调试：监听所有游戏相关事件
        this.socket.onAny((eventName, ...args) => {
            if (eventName.includes('game') || eventName.includes('start') || eventName.includes('match')) {
                console.log(`[${this.gameType}TableClient] Socket event: ${eventName}`, args);
            }
        });

        // 准备倒计时开始
        this.socket.on('ready_check_start', (data: any) => {
            this.updateState({
                status: 'matching',
                countdown: { type: 'ready', timeout: data.timeout, start: Date.now() }
            });
        });

        // 准备倒计时取消
        this.socket.on('ready_check_cancelled', (data: any) => {
            this.updateState({ countdown: null });
        });

        // 游戏开始倒计时
        this.socket.on('game_countdown', (data: any) => {
            console.log('[GameTableClient] game_countdown event received:', data);
            this.updateState({
                countdown: { type: 'start', count: data.count, message: data.message }
            });
        });

        // 游戏结束（再来一局倒计时）
        this.socket.on('game_ended', (data: any) => {
            this.updateState({
                status: 'matching',
                ready: false,  // 取消准备状态
                countdown: { type: 'rematch', timeout: data.rematchTimeout, start: Date.now() }
            });
        });

        // 玩家取消准备
        this.socket.on('players_unready', (data: any) => {
            console.log(`[${this.gameType}TableClient] Players unready:`, data);
            this.updateState({
                ready: false
            });
        });
        // 被踢出
        this.socket.on('kicked', (data: any) => {
            console.warn(`[${this.gameType}TableClient] Kicked:`, data);
            this.leaveTable(); // 清理本地状态
            if (this.onKicked) {
                this.onKicked(data);
            } else {
                // 如果没有设置回调，使用默认的alert
                alert(`您已被移出游戏桌: ${data.reason}`);
            }
        });

        // 游戏桌已满座 - 通知玩家应该准备
        this.socket.on('table_full', (data: any) => {
            console.log(`[${this.gameType}TableClient] Table is full, players should prepare:`, data);
            // 显示提示但不自动准备，让玩家手动点击准备按钮
            this.updateState({ status: 'matching' });
        });

        // 加入成功作为观众
        this.socket.on('joined_as_spectator', (data: any) => {
            console.log(`[${this.gameType}TableClient] Joined as spectator:`, data);
            this.updateState({ status: 'matching' });
        });
    }

    /**
     * 设置游戏特定的事件监听
     * 子类可以重写此方法
     */
    protected setupTableListeners(): void {
        // 默认实现为空，子类可以重写
    }

    /**
     * 处理游戏桌初始状态
     */
    protected handleTableState(data: any): void {
        const players = data.playerList || data.players || [];

        // 调试：检查接收到的玩家头像
        players.forEach((p: any) => {
            if (!p.avatar) {
                console.warn(`[${this.gameType}TableClient] Player ${p.userId} has NO avatar in table_state!`, p);
            } else {
                console.log(`[${this.gameType}TableClient] Player ${p.userId} avatar: ${p.avatar}`);
            }
        });

        // 基础状态更新
        const stateUpdate: any = {
            tableId: data.tableId || data.roomId,  // 加入成功后设置 tableId（优先使用tableId字段）
            status: data.status,
            baseBet: data.baseBet,
            players: players,
            maxPlayers: data.maxPlayers
        };

        // 只在游戏进行时才更新游戏状态数据
        if (data.status === 'playing') {
            if (data.board) stateUpdate.board = data.board;
            if (data.turn) stateUpdate.turn = data.turn;
            if (data.winner !== undefined) stateUpdate.winner = data.winner;
            if (data.mySide) stateUpdate.mySide = data.mySide;
        }

        this.updateState(stateUpdate);
    }

    /**
     * 处理游戏桌状态更新
     */
    protected handleTableUpdate(data: any): void {
        console.log(`[${this.gameType}TableClient] handleTableUpdate received:`, data);
        const players = data.playerList || data.players || [];
        
        // 调试：检查接收到的玩家头像
        players.forEach((p: any) => {
            if (!p.avatar) {
                console.warn(`[${this.gameType}TableClient] Player ${p.userId} has NO avatar in table_update!`, p);
            } else {
                console.log(`[${this.gameType}TableClient] Player ${p.userId} avatar: ${p.avatar}`);
            }
        });

        const canStart = this.checkCanStart(players);

        // 如果状态变为 playing
        if (data.status === 'playing') {
            console.log(`[${this.gameType}TableClient] Status changed to playing via table_update`);
            
            // 更新状态为 playing，并确保其他相关字段也更新
            this.updateState({
                status: 'playing',
                players: players,
                canStart: false, // 游戏开始后不能再开始
                ready: false, // 重置准备状态
                countdown: null, // 清除倒计时
                // 关键：更新游戏数据
                board: data.board,
                turn: data.turn,
                winner: data.winner
            });
            
            // 额外广播一次状态更新，确保所有客户端收到
            this.socket.emit('request_table_state');
        } else {
            // 非playing状态，正常更新
            this.updateState({
                status: data.status,
                players: players,
                canStart: canStart,
                // 即使不是 playing，也可能更新了部分数据
                ...(data.board ? { board: data.board } : {}),
                ...(data.turn ? { turn: data.turn } : {})
            });
        }
    }

    /**
     * 处理旧版状态更新 (兼容)
     */
    protected handleStateUpdate(data: any): void {
        this.updateState(data);
    }

    /**
     * 处理加入失败事件
     */
    protected handleJoinFailed(data: any): void {
        console.warn(`[${this.gameType}TableClient] Join failed:`, data);
        
        // 立即清理可能的部分状态，防止界面错误显示
        this.updateState({
            tableId: null,
            status: 'idle',
            players: [],
            ready: false,
            canStart: false,
            board: null,
            turn: null,
            winner: null,
            countdown: null
        });
        
        // 使用全局对话框显示错误
        const message = data?.message || '加入失败';
        const handler = getGlobalDialogHandler();
        
        if (handler && handler.showError) {
            handler.showError('无法入座', message);
        } else {
            console.warn(`[${this.gameType}TableClient] Global dialog not available, falling back to alert`);
            console.warn(`[${this.gameType}TableClient] Please ensure setGlobalDialogHandler was called before joining table`);
            alert(`无法入座: ${message}`);
        }
    }

    /**
     * 处理游戏开始
     */
    protected handleGameStart(data: any): void {
        console.log(`[${this.gameType}TableClient] Game starting event received:`, data);

        // 调试：检查接收到的玩家头像
        if (data.playerInfos) {
            data.playerInfos.forEach((p: any) => {
                if (!p.avatar) {
                    console.warn(`[${this.gameType}TableClient] Player ${p.userId} has NO avatar in game_start!`, p);
                } else {
                    console.log(`[${this.gameType}TableClient] Player ${p.userId} avatar: ${p.avatar}`);
                }
            });
        }

        try {
            // 更新状态为 playing，保持倒计时状态直到倒计时完成
            this.updateState({
                status: 'playing',
                ...data,
                canStart: false, // 游戏开始后不能再开始
                ready: false // 重置准备状态
                // 注意：不清除 countdown，让它继续显示直到倒计时完成
            });
            
            console.log(`[${this.gameType}TableClient] State updated to playing, current state:`, this.state);
            
            // 额外广播一次状态更新，确保所有客户端收到
            this.socket.emit('request_table_state');
        } catch (error) {
            console.error(`[${this.gameType}TableClient] Error handling game start:`, error);
            this.updateState({ status: 'idle' });
        }
    }

    /**
     * 检查是否可以开始游戏
     */
    protected checkCanStart(players: Player[]): boolean {
        return players.length === this.state.maxPlayers &&
            players.every(p => p.ready);
    }

    /**
     * 加入游戏桌
     * @param tier - 房间等级
     * @param tableId - 游戏桌ID
     */
    public joinTable(tier: string, tableId: string): void {
        console.log(`[${this.gameType}TableClient] Joining table:`, { tier, tableId });
        this.socket.emit(`${this.gameType}_join`, { tier, roomId: tableId });
        // 不要立即更新 tableId，等待服务器确认加入成功后再更新
        // this.updateState({ tableId });
    }

    /**
     * 离开游戏桌
     */
    public leaveTable(): void {
        console.log(`[${this.gameType}TableClient] Leaving table`);
        this.socket.emit(`${this.gameType}_leave`);

        this.updateState({
            tableId: null,
            players: [],
            ready: false,
            canStart: false
        });
    }

    /**
     * 设置准备状态
     * @param ready - 是否准备
     */
    public setReady(ready: boolean): void {
        console.log(`[${this.gameType}TableClient] Setting ready:`, ready);
        const event = ready ? 'player_ready' : 'player_unready';
        this.socket.emit(event);
        this.updateState({ ready: ready });
    }

    /**
     * 更新状态并通知UI
     */
    public updateState(newState: Partial<GameTableState>): void {
        const oldStatus = this.state.status;
        const oldState = { ...this.state };
        this.state = { ...this.state, ...newState };
        
        console.log(`[${this.gameType}TableClient] updateState called:`, {
            oldStatus,
            newStatus: this.state.status,
            oldState,
            newState: this.state,
            hasOnStateUpdate: !!this.onStateUpdate
        });
        
        if (oldStatus !== this.state.status) {
            console.log(`[${this.gameType}TableClient] Status changed from ${oldStatus} to ${this.state.status}`);
        }
        
        if (this.onStateUpdate) {
            console.log(`[${this.gameType}TableClient] Calling onStateUpdate callback`);
            this.onStateUpdate(this.state);
        } else {
            console.warn(`[${this.gameType}TableClient] onStateUpdate is null, cannot notify UI`);
        }

        // 调用所有订阅的状态变化回调
        this.stateChangeCallbacks.forEach(callback => {
            try {
                callback();
            } catch (err) {
                console.error(`[${this.gameType}TableClient] Error in state change callback:`, err);
            }
        });
    }

    /**
     * 获取当前状态
     */
    public getState(): GameTableState {
        return { ...this.state };
    }

    // ===== 游戏特定方法（简化架构 - 直接在 GameTableClient 中）=====

    /**
     * 获取棋盘数据
     */
    public getBoard(): any {
        return this.state.board || [];
    }

    /**
     * 获取当前回合
     */
    public getTurn(): string {
        return this.state.turn || 'r';
    }

    /**
     * 获取我的方
     */
    public getMySide(): string | undefined {
        return this.state.mySide;
    }

    /**
     * 获取游戏状态
     */
    public getGameState(): any {
        return {
            board: this.state.board,
            turn: this.state.turn,
            mySide: this.state.mySide,
            players: this.state.players,
            status: this.state.status,
            winner: this.state.winner
        };
    }

    /**
     * 发送棋子移动
     */
    public sendMove(fromX: number, fromY: number, toX: number, toY: number): void {
        console.log(`[${this.gameType}TableClient] Sending move: (${fromX}, ${fromY}) → (${toX}, ${toY})`);
        this.socket.emit(`${this.gameType}_move`, { fromX, fromY, toX, toY });
    }

    /**
     * 订阅状态变化（提供给游戏视图）
     */
    public onStateChange(callback: () => void): () => void {
        // 添加回调到列表
        this.stateChangeCallbacks.push(callback);
        
        // 立即调用一次以获取初始状态
        try {
            callback();
        } catch (err) {
            console.error(`[${this.gameType}TableClient] Error in initial state change callback:`, err);
        }
        
        // 返回一个取消订阅函数
        return () => {
            this.stateChangeCallbacks = this.stateChangeCallbacks.filter(cb => cb !== callback);
        };
    }

    /**
     * 改进3: 报告本地状态供服务器验证
     * 定期将客户端状态发送给服务器进行一致性检查
     * @param interval - 检查间隔（毫秒），默认30秒
     */
    public startStateConsistencyCheck(interval: number = 30000): void {
        if (!this.state.tableId) {
            console.warn(`[${this.gameType}TableClient] Cannot start consistency check without tableId`);
            return;
        }

        console.log(`[${this.gameType}TableClient] Starting state consistency check (interval: ${interval}ms)`);

        const checkTimer = setInterval(() => {
            // 发送当前客户端状态给服务器
            this.socket.emit(`${this.gameType}_check_state_consistency`, {
                tableId: this.state.tableId,
                clientStatus: this.state.status,
                playerCount: this.state.players.length,
                ready: this.state.ready,
                timestamp: Date.now()
            });
        }, interval);

        // 保存定时器ID，以便后续清理
        (this as any)._consistencyCheckTimer = checkTimer;
    }

    /**
     * 停止状态一致性检查
     */
    public stopStateConsistencyCheck(): void {
        const timer = (this as any)._consistencyCheckTimer;
        if (timer) {
            clearInterval(timer);
            (this as any)._consistencyCheckTimer = null;
            console.log(`[${this.gameType}TableClient] Stopped state consistency check`);
        }
    }

    /**
     * 清理资源
     */
    public dispose(): void {
        console.log(`[${this.gameType}TableClient] Disposing`);
        
        // 停止状态一致性检查
        this.stopStateConsistencyCheck();
        
        this.removeCommonListeners();
        this.removeTableListeners();
        this.onStateUpdate = null;
        this.stateChangeCallbacks = [];
    }

    /**
     * 移除通用事件监听
     */
    protected removeCommonListeners(): void {
        this.socket.off('state');
        this.socket.off('player_joined');
        this.socket.off('player_left');
        this.socket.off('player_ready_changed');
        this.socket.off('game_start');
        this.socket.off('table_state');
        this.socket.off('table_update');
    }

    /**
     * 移除游戏特定的事件监听
     * 子类可以重写此方法
     */
    protected removeTableListeners(): void {
        // 默认实现为空，子类可以重写
    }
}
