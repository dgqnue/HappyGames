/**
 * 中国象棋游戏桌客户端 (ChineseChessTableClient)
 * 
 * 继承自 GameTableClient
 * 管理中国象棋游戏桌的状态和逻辑
 */

import { Socket } from 'socket.io-client';
import { GameTableClient } from '../../../gamecore/hierarchy/GameTableClient';

export class ChineseChessTableClient extends GameTableClient {
    constructor(socket: Socket) {
        super(socket, 'chinesechess');
        // 象棋游戏桌最多2个玩家
        this.state.maxPlayers = 2;
    }

    /**
     * 设置象棋特定的事件监听
     */
    protected setupTableListeners(): void {
        // 象棋目前没有额外的特定事件
        // 所有事件都在基类中处理
    }

    /**
     * 移除象棋特定的事件监听
     */
    protected removeTableListeners(): void {
        // 象棋目前没有额外的特定事件
    }
}
