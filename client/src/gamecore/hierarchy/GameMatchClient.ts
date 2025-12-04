/**
 * 游戏对局客户端基类 (GameMatchClient)
 * 
 * 对应后端的 GameMatch 类
 * 
 * 职责：
 * - 管理游戏状态（棋盘、回合、玩家信息）
 * - 处理游戏移动
 * - 监听游戏更新事件
 * - 判断游戏结束
 * 
 * 使用方法：
 * class MyGameMatchClient extends GameMatchClient {
 *     constructor(socket, gameType) {
 *         super(socket, gameType);
 *     }
 *     
 *     protected setupMatchListeners() {
 *         // 添加游戏特定的事件监听
 *     }
 * }
 */

import { Socket } from 'socket.io-client';

export interface GameMatchState {
    status: 'waiting' | 'playing' | 'ended';
    players: any;
    currentPlayer?: string;
    winner?: string | null;
    [key: string]: any;
}

export abstract class GameMatchClient {
    protected socket: Socket;
    protected gameType: string;
    protected state: GameMatchState;
    protected onStateUpdate: ((state: GameMatchState) => void) | null = null;

    constructor(socket: Socket, gameType: string) {
        this.socket = socket;
        this.gameType = gameType;
        this.state = {
            status: 'waiting',
            players: []
        };
    }

    /**
     * 初始化对局客户端
     * @param onStateUpdate - 状态更新回调函数
     */
    public init(onStateUpdate: (state: GameMatchState) => void): void {
        this.onStateUpdate = onStateUpdate;
        this.setupCommonListeners();
        this.setupMatchListeners();
        console.log(`[${this.gameType}MatchClient] Initialized`);
    }

    /**
     * 设置通用事件监听
     */
    protected setupCommonListeners(): void {
        // 游戏开始
        this.socket.on('game_start', (data: any) => {
            console.log(`[${this.gameType}MatchClient] Game started:`, data);
            this.handleGameStart(data);
        });

        // 游戏结束
        this.socket.on('game_over', (data: any) => {
            console.log(`[${this.gameType}MatchClient] Game over:`, data);
            this.handleGameEnd(data);
        });

        // 移动更新
        this.socket.on('move', (data: any) => {
            console.log(`[${this.gameType}MatchClient] Move received:`, data);
            this.handleMove(data);
        });
    }

    /**
     * 设置游戏特定的事件监听
     * 子类必须实现此方法
     */
    protected abstract setupMatchListeners(): void;

    /**
     * 处理游戏开始
     */
    protected handleGameStart(data: any): void {
        this.updateState({
            status: 'playing',
            ...data
        });
    }

    /**
     * 处理游戏结束
     */
    protected handleGameEnd(data: any): void {
        this.updateState({
            status: 'ended',
            winner: data.winner,
            ...data
        });
    }

    /**
     * 处理移动
     */
    protected handleMove(data: any): void {
        this.updateState(data);
    }

    /**
     * 发送移动
     * @param move - 移动数据
     */
    public makeMove(move: any): void {
        console.log(`[${this.gameType}MatchClient] Making move:`, move);
        this.socket.emit(`${this.gameType}_move`, move);
    }

    /**
     * 更新状态并通知UI
     */
    protected updateState(newState: Partial<GameMatchState>): void {
        this.state = { ...this.state, ...newState };
        if (this.onStateUpdate) {
            this.onStateUpdate(this.state);
        }
    }

    /**
     * 获取当前状态
     */
    public getState(): GameMatchState {
        return { ...this.state };
    }

    /**
     * 清理资源
     */
    public dispose(): void {
        console.log(`[${this.gameType}MatchClient] Disposing`);
        this.removeCommonListeners();
        this.removeMatchListeners();
        this.onStateUpdate = null;
    }

    /**
     * 移除通用事件监听
     */
    protected removeCommonListeners(): void {
        this.socket.off('game_start');
        this.socket.off('game_over');
        this.socket.off('move');
    }

    /**
     * 移除游戏特定的事件监听
     * 子类必须实现此方法
     */
    protected abstract removeMatchListeners(): void;
}
