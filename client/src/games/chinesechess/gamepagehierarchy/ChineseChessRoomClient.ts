/**
 * 中国象棋游戏房间客户端 (ChineseChessRoomClient)
 * 
 * 继承自 GameRoomClient
 * 管理中国象棋游戏房间的状态和逻辑
 */

import { Socket } from 'socket.io-client';
import { GameRoomClient, GameRoomState, RoomInfo } from '../../../gamecore/hierarchy/GameRoomClient';
import { ChineseChessTableClient } from './ChineseChessTableClient';

export interface ChineseChessRoomState extends GameRoomState {
    // 象棋特定的房间状态
    availableRooms?: RoomInfo[];
}

export class ChineseChessRoomClient extends GameRoomClient {
    declare protected state: ChineseChessRoomState;
    declare protected tableClient: ChineseChessTableClient | null;

    constructor(socket: Socket) {
        super(socket, 'chinesechess', ChineseChessTableClient);
    }

    /**
     * 设置象棋特定的事件监听
     */
    protected setupRoomListeners(): void {
        // 象棋目前没有额外的特定事件
        // 所有事件都在基类中处理
    }

    /**
     * 移除象棋特定的事件监听
     */
    protected removeRoomListeners(): void {
        // 象棋目前没有额外的特定事件
    }

    /**
     * 处理房间列表更新（象棋特定格式）
     */
    protected handleRoomListUpdate(data: any): void {
        // 如果数据是数组，存储为 availableRooms
        if (Array.isArray(data)) {
            this.updateState({ availableRooms: data });
        } else {
            super.handleRoomListUpdate(data);
        }
    }

    /**
     * 获取象棋游戏桌客户端
     */
    public getChessTableClient(): ChineseChessTableClient | null {
        return this.tableClient;
    }

    /**
     * 快速加入（选择房间并加入游戏桌）
     * @param roomId - 房间ID
     * @param tableId - 游戏桌ID
     */
    public quickJoin(roomId: string, tableId: string): void {
        // 先进入房间
        this.enterRoom({ id: roomId, name: roomId });

        // 然后选择游戏桌
        this.selectTable(tableId);
    }
}
