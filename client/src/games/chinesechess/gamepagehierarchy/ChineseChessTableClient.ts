/**
 * 中国象棋游戏桌客户端 (ChineseChessTableClient)
 * 
 * 继承自 GameTableClient
 * 管理中国象棋游戏桌的状态和逻辑
 */

import { Socket } from 'socket.io-client';
import { GameTableClient } from '../../../gamecore/hierarchy/GameTableClient';

export class ChineseChessTableClient extends GameTableClient {
    // 本地状态：选中的棋子 (用于在组件重挂载时保持状态)
    private selectedPiece: { row: number; col: number } | null = null;
    
    // 移动事件回调
    public onMove?: (data: any) => void;
    // 加入失败回调
    public onJoinFailed?: (data: any) => void;

    constructor(socket: Socket) {
        super(socket, 'chinesechess');
        // 象棋游戏桌最多2个玩家
        this.state.maxPlayers = 2;
    }

    public getSelectedPiece() {
        return this.selectedPiece;
    }

    public setSelectedPiece(piece: { row: number; col: number } | null) {
        this.selectedPiece = piece;
    }

    /**
     * 设置象棋特定的事件监听
     */
    protected setupTableListeners(): void {
        // 监听移动事件
        this.socket.on('move', (data: any) => {
            console.log(`[${this.gameType}TableClient] Move received:`, data);
            this.handleMove(data);
        });

        // 监听错误事件
        this.socket.on('error', (data: any) => {
            console.error(`[${this.gameType}TableClient] Error:`, data);
            // 可以选择通过回调通知UI显示错误，或者直接alert
            // alert(data.message || '操作失败');
        });

        // 监听加入失败
        this.socket.on('join_failed', (data: any) => {
            console.warn(`[${this.gameType}TableClient] Join failed:`, data);
            if (this.onJoinFailed) this.onJoinFailed(data);
        });
    }

    /**
     * 处理移动事件
     */
    protected handleMove(data: any): void {
        // 更新棋盘和回合
        this.updateState({
            board: data.board,
            turn: data.turn
        });
        
        // 触发移动回调
        if (this.onMove) {
            this.onMove(data);
        }
        
        // 如果有获胜者，可能需要处理（通常由 game_ended 处理，但这里也可以更新状态）
        if (data.winner) {
            this.updateState({ winner: data.winner });
        }
    }

    /**
     * 移除象棋特定的事件监听
     */
    protected removeTableListeners(): void {
        this.socket.off('move');
        this.socket.off('error');
    }
}
