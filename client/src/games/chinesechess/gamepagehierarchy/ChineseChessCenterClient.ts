/**
 * 中国象棋游戏中心客户端 (ChineseChessCenterClient)
 * 
 * 继承自 GameCenterClient
 * 管理中国象棋游戏中心的状态和逻辑
 */

import { Socket } from 'socket.io-client';
import { GameCenterClient, GameCenterState } from '../../../gamecore/hierarchy/GameCenterClient';
import { ChineseChessRoomClient } from './ChineseChessRoomClient';

export interface ChineseChessCenterState extends GameCenterState {
    // 象棋特定的中心状态
    myStats?: any;
}

export class ChineseChessCenterClient extends GameCenterClient {
    declare protected state: ChineseChessCenterState;
    declare protected roomClient: ChineseChessRoomClient | null;
    
    // 匹配成功时的回调函数
    private onMatchFoundCallback: ((data: any) => void) | null = null;

    constructor(socket: Socket) {
        super(socket, 'chinesechess', ChineseChessRoomClient);
    }

    /**
     * 设置匹配成功的回调函数
     * @param callback - 回调函数
     */
    public setOnMatchFoundCallback(callback: (data: any) => void): void {
        this.onMatchFoundCallback = callback;
    }

    /**
     * 设置象棋特定的事件监听
     */
    protected setupCenterListeners(): void {
        // 象棋目前没有额外的特定事件
        // 所有事件都在基类中处理
    }

    /**
     * 移除象棋特定的事件监听
     */
    protected removeCenterListeners(): void {
        // 象棋目前没有额外的特定事件
    }

    /**
     * 重写基类的 handleMatchFound 方法，处理象棋特定的逻辑
     */
    protected handleMatchFound(data: any): void {
        console.log('[ChineseChessCenterClient] Match found! Routing to game...', data);
        this.updateState({ matchFoundData: data });
        
        // 调用回调函数通知UI层
        if (this.onMatchFoundCallback) {
            this.onMatchFoundCallback(data);
        }
    }

    /**
     * 获取象棋房间客户端
     */
    public getChessRoomClient(): ChineseChessRoomClient | null {
        return this.roomClient;
    }

    /**
     * 快速开始（自动匹配）
     * @param settings - 匹配设置
     */
    public quickStart(settings: any = {}): void {
        console.log('[ChineseChessCenterClient] Quick start:', settings);
        this.socket.emit('auto_match', settings);
    }
}
