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
    
    // 游戏结束事件回调
    public onGameEnded?: (data: any) => void;

    // 移动事件监听器列表
    private moveListeners: ((data: any) => void)[] = [];
    
    // 实例 ID 用于调试
    public readonly instanceId: string;

    /**
     * 添加移动事件监听器
     */
    public addMoveListener(listener: (data: any) => void) {
        console.log(`[ChineseChessTableClient:${this.instanceId}] Adding move listener. Total listeners: ${this.moveListeners.length + 1}`);
        this.moveListeners.push(listener);
    }

    /**
     * 移除移动事件监听器
     */
    public removeMoveListener(listener: (data: any) => void) {
        const initialLength = this.moveListeners.length;
        this.moveListeners = this.moveListeners.filter(l => l !== listener);
        console.log(`[ChineseChessTableClient:${this.instanceId}] Removing move listener. Count: ${initialLength} -> ${this.moveListeners.length}`);
    }

    constructor(socket: Socket) {
        super(socket, 'chinesechess');
        this.instanceId = Math.random().toString(36).substring(2, 9);
        console.log(`[ChineseChessTableClient:${this.instanceId}] Created`);
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
            console.log(`[${this.gameType}TableClient] Move event received from server:`, { move: data.move, captured: data.captured });
            this.handleMove(data);
        });

        // 监听游戏结束事件
        this.socket.on('game_ended', (data: any) => {
            console.log(`[${this.gameType}TableClient] Game ended event received from server:`, data);
            this.handleGameEnded(data);
        });

        // join_failed 监听器现在在基类 GameTableClient 中处理
    }

    /**
     * 处理移动事件
     */
    protected handleMove(data: any): void {
        // 更新棋盘和回合
        console.log(`[ChineseChessTableClient] handleMove: Received move event from server:`, { 
            move: data.move, 
            captured: data.captured, 
            turn: data.turn,
            boardSize: data.board ? data.board.length : 'null'
        });
        
        this.updateState({
            board: data.board,
            turn: data.turn
        });
        
        // 触发移动回调
        if (this.onMove) {
            console.log(`[ChineseChessTableClient] handleMove: Calling onMove callback, captured=${data.captured}`);
            this.onMove(data);
        } else {
            console.log(`[ChineseChessTableClient] handleMove: No onMove callback registered`);
        }

        // 触发所有注册的监听器
        if (this.moveListeners.length > 0) {
            console.log(`[ChineseChessTableClient:${this.instanceId}] handleMove: Calling ${this.moveListeners.length} move listeners`);
            this.moveListeners.forEach((listener, index) => {
                try {
                    listener(data);
                } catch (err) {
                    console.error(`[ChineseChessTableClient:${this.instanceId}] Error in move listener ${index}:`, err);
                }
            });
        } else {
            console.log(`[ChineseChessTableClient:${this.instanceId}] handleMove: No move listeners registered`);
        }
        
        // 如果有获胜者，可能需要处理（通常由 game_ended 处理，但这里也可以更新状态）
        if (data.winner) {
            this.updateState({ winner: data.winner });
        }
    }

    /**
     * 处理游戏结束事件
     */
    protected handleGameEnded(data: any): void {
        // 更新游戏状态
        this.updateState({
            // status: 'matching', // 基类已处理
            winner: data.result?.winner,
            isRoundEnded: true // 标记回合结束，触发UI显示开始按钮
        });

        // 触发游戏结束回调
        if (this.onGameEnded) {
            console.log(`[ChineseChessTableClient] handleGameEnded: Calling onGameEnded callback, winner=${data.result?.winner}`);
            this.onGameEnded(data);
        } else {
            console.log(`[ChineseChessTableClient] handleGameEnded: No onGameEnded callback registered`);
        }
    }

    /**
     * 移除象棋特定的事件监听
     */
    protected removeTableListeners(): void {
        this.socket.off('move');
        this.socket.off('game_ended');
    }
}
