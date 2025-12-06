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
 * - 管理 GameMatchClient 实例
 * 
 * 使用方法：
 * class MyGameTableClient extends GameTableClient {
 *     constructor(socket, gameType, MatchClientClass) {
 *         super(socket, gameType, MatchClientClass);
 *     }
 *     
 *     protected setupTableListeners() {
 *         // 添加游戏特定的事件监听
 *     }
 * }
 */

import { Socket } from 'socket.io-client';
import { GameMatchClient } from './GameMatchClient';

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

    // 对局客户端（游戏开始后创建）
    protected matchClient: GameMatchClient | null = null;
    protected MatchClientClass: new (socket: Socket) => GameMatchClient;
    // 当前用户ID
    protected currentUserId: string | null = null;

    constructor(
        socket: Socket,
        gameType: string,
        MatchClientClass: new (socket: Socket) => GameMatchClient
    ) {
        this.socket = socket;
        this.gameType = gameType;
        this.MatchClientClass = MatchClientClass;
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
            this.updateState({
                countdown: { type: 'start', count: data.count, message: data.message }
            });
        });

        // 游戏结束（再来一局倒计时）
        this.socket.on('game_ended', (data: any) => {
            this.updateState({
                status: 'matching',
                countdown: { type: 'rematch', timeout: data.rematchTimeout, start: Date.now() }
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

        this.updateState({
            tableId: data.roomId,
            status: data.status,
            baseBet: data.baseBet,
            players: players,
            maxPlayers: data.maxPlayers,
        });
    }

    /**
     * 处理游戏桌状态更新
     */
    protected handleTableUpdate(data: any): void {
        const players = data.playerList || data.players || [];
        const canStart = this.checkCanStart(players);

        this.updateState({
            status: data.status,
            players: players,
            canStart: canStart
        });
    }

    /**
     * 处理旧版状态更新 (兼容)
     */
    protected handleStateUpdate(data: any): void {
        this.updateState(data);
    }

    /**
     * 处理游戏开始
     */
    protected handleGameStart(data: any): void {
        console.log(`[${this.gameType}TableClient] Game starting:`, data);
        
        // 创建对局客户端
        if (!this.matchClient) {
            console.log(`[${this.gameType}TableClient] Creating match client`);
            this.matchClient = new this.MatchClientClass(this.socket);
            this.matchClient.init((matchState) => {
                console.log(`[${this.gameType}TableClient] Match state update:`, matchState);
                // 将对局状态合并到游戏桌状态
                this.updateState({ ...(matchState as any) });
            });
        }

        this.updateState({
            status: 'playing',
            ...data
        });
        console.log(`[${this.gameType}TableClient] State updated to playing, current state:`, this.state);
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
        this.updateState({ tableId });
    }

    /**
     * 离开游戏桌
     */
    public leaveTable(): void {
        console.log(`[${this.gameType}TableClient] Leaving table`);
        this.socket.emit(`${this.gameType}_leave`);

        // 清理对局客户端
        if (this.matchClient) {
            this.matchClient.dispose();
            this.matchClient = null;
        }

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
    protected updateState(newState: Partial<GameTableState>): void {
        const oldStatus = this.state.status;
        this.state = { ...this.state, ...newState };
        if (oldStatus !== this.state.status) {
            console.log(`[${this.gameType}TableClient] Status changed from ${oldStatus} to ${this.state.status}`);
        }
        if (this.onStateUpdate) {
            this.onStateUpdate(this.state);
        }
    }

    /**
     * 获取当前状态
     */
    public getState(): GameTableState {
        return { ...this.state };
    }

    /**
     * 获取对局客户端
     */
    public getMatchClient(): GameMatchClient | null {
        return this.matchClient;
    }

    /**
     * 清理资源
     */
    public dispose(): void {
        console.log(`[${this.gameType}TableClient] Disposing`);

        // 清理对局客户端
        if (this.matchClient) {
            this.matchClient.dispose();
            this.matchClient = null;
        }

        this.removeCommonListeners();
        this.removeTableListeners();
        this.onStateUpdate = null;
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
