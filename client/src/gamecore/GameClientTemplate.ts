/**
 * 游戏客户端通信模板
 * 
 * 提供标准化的游戏客户端通信接口
 * 
 * 特性：
 * - 自动事件监听管理
 * - 标准化的加入/离开房间
 * - 错误处理
 * - 状态更新回调
 * 
 * 使用方法：
 * class MyGameClient extends GameClientTemplate {
 *     constructor(socket) {
 *         super(socket, 'mygame');
 *     }
 *     
 *     protected setupGameListeners() {
 *         // 添加游戏特定的事件监听
 *     }
 * }
 */

import { Socket } from 'socket.io-client';

export abstract class GameClientTemplate {
    protected socket: Socket;
    protected gameType: string;
    protected onStateUpdate: ((state: any) => void) | null = null;
    protected currentRoomId: string | null = null;
    protected currentTier: string | null = null;

    constructor(socket: Socket, gameType: string) {
        this.socket = socket;
        this.gameType = gameType;
    }

    /**
     * 初始化客户端
     * @param onStateUpdate - 状态更新回调函数
     */
    public init(onStateUpdate: (state: any) => void): void {
        this.onStateUpdate = onStateUpdate;
        this.setupCommonListeners();
        this.setupGameListeners();
        console.log(`[${this.gameType}Client] Initialized`);
    }

    /**
     * 设置通用事件监听
     */
    protected setupCommonListeners(): void {
        // 房间状态更新
        this.socket.on('state', (data: any) => {
            console.log(`[${this.gameType}Client] State update:`, data);
            this.handleStateUpdate(data);
        });

        // 游戏开始
        this.socket.on('game_start', (data: any) => {
            console.log(`[${this.gameType}Client] Game started:`, data);
            this.handleStateUpdate({ ...data, status: 'playing' });
        });

        // 游戏结束
        this.socket.on('game_over', (data: any) => {
            console.log(`[${this.gameType}Client] Game over:`, data);
            this.handleStateUpdate({ ...data, status: 'ended' });
        });

        // 错误处理
        this.socket.on('error', (data: any) => {
            console.error(`[${this.gameType}Client] Error:`, data);
            this.handleError(data);
        });
    }

    /**
     * 设置游戏特定的事件监听
     * 子类必须实现此方法
     */
    protected abstract setupGameListeners(): void;

    /**
     * 处理状态更新
     */
    protected handleStateUpdate(state: any): void {
        if (this.onStateUpdate) {
            this.onStateUpdate(state);
        }
    }

    /**
     * 处理错误
     */
    protected handleError(error: any): void {
        const message = error.message || 'An error occurred';
        alert(message);
    }

    /**
     * 加入指定等级（自动匹配）
     */
    public joinTier(tier: string): void {
        console.log(`[${this.gameType}Client] Joining tier:`, tier);
        this.currentTier = tier;
        this.socket.emit(`${this.gameType}_join`, { tier });
    }

    /**
     * 加入指定房间
     */
    public joinRoom(tier: string, roomId: string): void {
        console.log(`[${this.gameType}Client] joinRoom called`);
        console.log(`[${this.gameType}Client] - tier:`, tier);
        console.log(`[${this.gameType}Client] - roomId:`, roomId);
        console.log(`[${this.gameType}Client] - socket connected:`, this.socket.connected);
        console.log(`[${this.gameType}Client] - socket id:`, this.socket.id);

        this.currentTier = tier;
        this.currentRoomId = roomId;

        const eventName = `${this.gameType}_join`;
        const data = { tier, roomId };

        console.log(`[${this.gameType}Client] Emitting event:`, eventName);
        console.log(`[${this.gameType}Client] Event data:`, data);

        this.socket.emit(eventName, data);

        console.log(`[${this.gameType}Client] Event emitted successfully`);
    }

    /**
     * 离开当前房间
     */
    public leave(): void {
        console.log(`[${this.gameType}Client] Leaving room`);
        this.socket.emit(`${this.gameType}_leave`);
        this.currentRoomId = null;
        this.currentTier = null;
    }

    /**
     * 发送移动
     */
    public makeMove(move: any): void {
        console.log(`[${this.gameType}Client] Making move:`, move);
        this.socket.emit(`${this.gameType}_move`, move);
    }

    /**
     * 清理资源
     */
    public dispose(): void {
        console.log(`[${this.gameType}Client] Disposing`);
        this.removeCommonListeners();
        this.removeGameListeners();
        this.onStateUpdate = null;
    }

    /**
     * 移除通用事件监听
     */
    protected removeCommonListeners(): void {
        this.socket.off('state');
        this.socket.off('game_start');
        this.socket.off('game_over');
        this.socket.off('error');
    }

    /**
     * 移除游戏特定的事件监听
     * 子类必须实现此方法
     */
    protected abstract removeGameListeners(): void;

    /**
     * 获取当前房间ID
     */
    public getCurrentRoomId(): string | null {
        return this.currentRoomId;
    }

    /**
     * 获取当前等级
     */
    public getCurrentTier(): string | null {
        return this.currentTier;
    }

    /**
     * 检查是否在房间中
     */
    public isInRoom(): boolean {
        return this.currentRoomId !== null;
    }
}
