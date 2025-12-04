/**
 * 游戏中心客户端基类 (GameCenterClient)
 * 
 * 对应后端的 GameCenter 类
 * 
 * 职责：
 * - 连接到游戏中心
 * - 获取房间列表
 * - 处理房间选择
 * - 管理用户统计数据
 * - 管理 GameRoomClient 实例
 * 
 * 使用方法：
 * class MyGameCenterClient extends GameCenterClient {
 *     constructor(socket, gameType, RoomClientClass) {
 *         super(socket, gameType, RoomClientClass);
 *     }
 *     
 *     protected setupCenterListeners() {
 *         // 添加游戏特定的事件监听
 *     }
 * }
 */

import { Socket } from 'socket.io-client';
import { GameRoomClient, RoomInfo } from './GameRoomClient';

export interface UserStats {
    userId: string;
    rating: number;
    wins: number;
    losses: number;
    draws: number;
    [key: string]: any;
}

export interface GameCenterState {
    rooms: RoomInfo[];
    userStats: UserStats | null;
    selectedRoomId: string | null;
    [key: string]: any;
}

export abstract class GameCenterClient {
    protected socket: Socket;
    protected gameType: string;
    protected state: GameCenterState;
    protected onStateUpdate: ((state: GameCenterState) => void) | null = null;

    // 游戏房间客户端（选择房间后创建）
    protected roomClient: GameRoomClient | null = null;
    protected RoomClientClass: new (socket: Socket) => GameRoomClient;

    constructor(
        socket: Socket,
        gameType: string,
        RoomClientClass: new (socket: Socket) => GameRoomClient
    ) {
        this.socket = socket;
        this.gameType = gameType;
        this.RoomClientClass = RoomClientClass;
        this.state = {
            rooms: [],
            userStats: null,
            selectedRoomId: null
        };
    }

    /**
     * 初始化游戏中心客户端
     * @param onStateUpdate - 状态更新回调函数
     */
    public init(onStateUpdate: (state: GameCenterState) => void): void {
        this.onStateUpdate = onStateUpdate;
        this.setupCommonListeners();
        this.setupCenterListeners();
        console.log(`[${this.gameType}CenterClient] Initialized`);
    }

    /**
     * 设置通用事件监听
     */
    protected setupCommonListeners(): void {
        // 房间列表更新
        this.socket.on('room_list', (data: any) => {
            console.log(`[${this.gameType}CenterClient] Room list update:`, data);
            this.handleRoomListUpdate(data);
        });

        // 用户统计更新
        this.socket.on('user_stats', (data: any) => {
            console.log(`[${this.gameType}CenterClient] User stats update:`, data);
            this.handleUserStatsUpdate(data);
        });
    }

    /**
     * 设置游戏特定的事件监听
     * 子类可以重写此方法
     */
    protected setupCenterListeners(): void {
        // 默认实现为空，子类可以重写
    }

    /**
     * 处理房间列表更新
     */
    protected handleRoomListUpdate(data: any): void {
        const rooms = Array.isArray(data) ? data : [];
        this.updateState({ rooms });
    }

    /**
     * 处理用户统计更新
     */
    protected handleUserStatsUpdate(data: any): void {
        this.updateState({ userStats: data });
    }

    /**
     * 加入游戏中心
     */
    public joinGameCenter(): void {
        console.log(`[${this.gameType}CenterClient] Joining game center`);
        this.socket.emit('start_game', this.gameType);

        // 请求房间列表
        this.getRoomList();

        // 请求用户统计
        this.getUserStats();
    }

    /**
     * 离开游戏中心
     */
    public leaveGameCenter(): void {
        console.log(`[${this.gameType}CenterClient] Leaving game center`);
        this.socket.emit(`${this.gameType}_leave_center`);

        // 清理房间客户端
        if (this.roomClient) {
            this.roomClient.dispose();
            this.roomClient = null;
        }

        this.updateState({
            rooms: [],
            userStats: null,
            selectedRoomId: null
        });
    }

    /**
     * 获取房间列表
     */
    public getRoomList(): void {
        console.log(`[${this.gameType}CenterClient] Getting room list`);
        this.socket.emit(`${this.gameType}_get_rooms`);
    }

    /**
     * 获取用户统计
     */
    public getUserStats(): void {
        console.log(`[${this.gameType}CenterClient] Getting user stats`);
        this.socket.emit(`${this.gameType}_get_stats`);
    }

    /**
     * 选择房间
     * @param roomId - 房间ID
     */
    public selectRoom(roomId: string): void {
        console.log(`[${this.gameType}CenterClient] Selecting room:`, roomId);

        const room = this.state.rooms.find(r => r.id === roomId);
        if (!room) {
            console.error(`[${this.gameType}CenterClient] Room not found:`, roomId);
            return;
        }

        // 创建房间客户端
        if (!this.roomClient) {
            this.roomClient = new this.RoomClientClass(this.socket);
            this.roomClient.init((roomState) => {
                // 将房间状态合并到中心状态
                this.updateState({ ...roomState });
            });
        }

        // 进入房间
        this.roomClient.enterRoom(room);

        this.updateState({ selectedRoomId: roomId });
    }

    /**
     * 取消选择房间
     */
    public deselectRoom(): void {
        console.log(`[${this.gameType}CenterClient] Deselecting room`);

        // 离开房间
        if (this.roomClient) {
            this.roomClient.leaveRoom();
            this.roomClient.dispose();
            this.roomClient = null;
        }

        this.updateState({ selectedRoomId: null });

        // 刷新房间列表
        this.getRoomList();
    }

    /**
     * 快速开始（自动匹配）
     * @param settings - 匹配设置
     */
    public quickStart(settings: any = {}): void {
        console.log(`[${this.gameType}CenterClient] Quick start:`, settings);
        this.socket.emit('auto_match', settings);
    }


    /**
     * 更新状态并通知UI
     */
    protected updateState(newState: Partial<GameCenterState>): void {
        this.state = { ...this.state, ...newState };
        if (this.onStateUpdate) {
            this.onStateUpdate(this.state);
        }
    }

    /**
     * 获取当前状态
     */
    public getState(): GameCenterState {
        return { ...this.state };
    }

    /**
     * 获取房间客户端
     */
    public getRoomClient(): GameRoomClient | null {
        return this.roomClient;
    }

    /**
     * 清理资源
     */
    public dispose(): void {
        console.log(`[${this.gameType}CenterClient] Disposing`);

        // 清理房间客户端
        if (this.roomClient) {
            this.roomClient.dispose();
            this.roomClient = null;
        }

        this.removeCommonListeners();
        this.removeCenterListeners();
        this.onStateUpdate = null;
    }

    /**
     * 移除通用事件监听
     */
    protected removeCommonListeners(): void {
        this.socket.off('room_list');
        this.socket.off('user_stats');
    }

    /**
     * 移除游戏特定的事件监听
     * 子类可以重写此方法
     */
    protected removeCenterListeners(): void {
        // 默认实现为空，子类可以重写
    }
}
