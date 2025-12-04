/**
 * 中国象棋对局客户端 (ChineseChessMatchClient)
 * 
 * 继承自 GameMatchClient
 * 管理中国象棋对局的状态、逻辑、渲染和用户交互
 */

import { Socket } from 'socket.io-client';
import { GameMatchClient, GameMatchState } from '../../../gamecore/hierarchy/GameMatchClient';

export interface ChineseChessMatchState extends GameMatchState {
    board: (string | null)[][];
    turn: 'r' | 'b';
    players: { r: string | null; b: string | null };
    mySide?: 'r' | 'b';
    winner?: string | null;
    elo?: any;
}

// 棋子名称映射
const PIECE_NAMES: Record<string, string> = {
    'K': '帅', 'k': '将',
    'A': '仕', 'a': '士',
    'B': '相', 'b': '象',
    'N': '马', 'n': '马',
    'R': '车', 'r': '车',
    'C': '炮', 'c': '炮',
    'P': '兵', 'p': '卒'
};

export class ChineseChessMatchClient extends GameMatchClient {
    declare protected state: ChineseChessMatchState;

    // 棋盘渲染常量
    public readonly CELL_SIZE = 50;
    public readonly BOARD_WIDTH = 9 * 50;
    public readonly BOARD_HEIGHT = 10 * 50;

    // 状态变化监听器
    private stateChangeListeners: Array<() => void> = [];

    constructor(socket: Socket) {
        super(socket, 'chinesechess');
    }

    /**
     * 初始化对局状态
     */
    protected initializeMatchState(): void {
        this.state = {
            ...this.state,
            board: [],
            turn: 'r',
            players: { r: null, b: null }
        };
    }

    /**
     * 处理游戏开始事件
     */
    protected handleGameStart(data: any): void {
        console.log('[ChineseChessMatchClient] Game started:', data);
        this.updateState({
            board: data.board,
            turn: data.turn,
            players: data.players,
            mySide: data.mySide
        });
        this.notifyStateChange();
    }

    /**
     * 处理移动事件
     */
    protected handleMove(data: any): void {
        console.log('[ChineseChessMatchClient] Move received:', data);
        this.updateState({
            board: data.board,
            turn: data.turn
        });
        this.notifyStateChange();
    }

    /**
     * 发送移动
     */
    public sendMove(fromX: number, fromY: number, toX: number, toY: number): void {
        console.log('[ChineseChessMatchClient] Sending move:', { fromX, fromY, toX, toY });
        this.socket.emit(`${this.gameType}_move`, { fromX, fromY, toX, toY });
    }

    /**
     * 获取棋盘
     */
    public getBoard(): (string | null)[][] {
        return this.state.board || [];
    }

    /**
     * 获取当前回合
     */
    public getTurn(): 'r' | 'b' {
        return this.state.turn || 'r';
    }

    /**
     * 获取我的阵营
     */
    public getMySide(): 'r' | 'b' | undefined {
        return this.state.mySide;
    }

    /**
     * 绘制棋盘到Canvas
     * @param ctx Canvas 2D渲染上下文
     * @param board 棋盘数据
     * @param selected 当前选中的棋子位置
     */
    public drawBoardToCanvas(
        ctx: CanvasRenderingContext2D,
        board: (string | null)[][],
        selected: { x: number; y: number } | null
    ): void {
        const CELL_SIZE = this.CELL_SIZE;
        const BOARD_WIDTH = this.BOARD_WIDTH;
        const BOARD_HEIGHT = this.BOARD_HEIGHT;

        // Clear
        ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

        // Draw grid
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;

        // Vertical lines
        for (let i = 0; i < 9; i++) {
            ctx.beginPath();
            ctx.moveTo(i * CELL_SIZE + 25, 25);
            ctx.lineTo(i * CELL_SIZE + 25, BOARD_HEIGHT - 25);
            ctx.stroke();
        }

        // Horizontal lines
        for (let i = 0; i < 10; i++) {
            ctx.beginPath();
            ctx.moveTo(25, i * CELL_SIZE + 25);
            ctx.lineTo(BOARD_WIDTH - 25, i * CELL_SIZE + 25);
            ctx.stroke();
        }

        // Draw river text
        ctx.font = '20px Arial';
        ctx.fillStyle = '#8B4513';
        ctx.fillText('楚河', BOARD_WIDTH / 2 - 60, CELL_SIZE * 4.5 + 35);
        ctx.fillText('汉界', BOARD_WIDTH / 2 + 20, CELL_SIZE * 4.5 + 35);

        // Draw pieces
        board.forEach((row, y) => {
            row.forEach((piece, x) => {
                if (piece) {
                    this.drawPiece(ctx, piece, x, y);
                }
            });
        });

        // Draw selection
        if (selected) {
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(
                selected.x * CELL_SIZE + 25,
                selected.y * CELL_SIZE + 25,
                22,
                0,
                2 * Math.PI
            );
            ctx.stroke();
        }
    }

    /**
     * 绘制棋子
     */
    private drawPiece(ctx: CanvasRenderingContext2D, piece: string, x: number, y: number): void {
        const CELL_SIZE = this.CELL_SIZE;
        const centerX = x * CELL_SIZE + 25;
        const centerY = y * CELL_SIZE + 25;

        // Draw circle
        ctx.fillStyle = piece === piece.toUpperCase() ? '#FF6B6B' : '#4ECDC4';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw text
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(PIECE_NAMES[piece] || piece, centerX, centerY);
    }

    /**
     * 将点击坐标转换为棋盘格子坐标
     */
    public clickToGridPosition(clickX: number, clickY: number): { x: number; y: number } | null {
        const gridX = Math.round((clickX - 25) / this.CELL_SIZE);
        const gridY = Math.round((clickY - 25) / this.CELL_SIZE);

        if (gridX < 0 || gridX > 8 || gridY < 0 || gridY > 9) {
            return null;
        }

        return { x: gridX, y: gridY };
    }

    /**
     * 检查是否可以选中指定位置的棋子
     */
    public canSelectPiece(x: number, y: number): boolean {
        const board = this.getBoard();
        const mySide = this.getMySide();

        if (!board[y] || !board[y][x]) return false;

        const piece = board[y][x];
        if (!piece) return false;

        // 检查是否是己方棋子
        if (mySide === 'r' && piece === piece.toUpperCase()) return true;
        if (mySide === 'b' && piece === piece.toLowerCase()) return true;

        return false;
    }

    /**
     * 订阅状态变化
     */
    public onStateChange(callback: () => void): () => void {
        this.stateChangeListeners.push(callback);

        // 返回取消订阅函数
        return () => {
            const index = this.stateChangeListeners.indexOf(callback);
            if (index > -1) {
                this.stateChangeListeners.splice(index, 1);
            }
        };
    }

    /**
     * 通知所有监听器状态已变化
     */
    private notifyStateChange(): void {
        this.stateChangeListeners.forEach(listener => listener());
    }

    /**
     * 设置象棋特定的事件监听
     */
    protected setupMatchListeners(): void {
        // 象棋目前没有额外的特定事件
        // 所有事件都在基类中处理
    }

    /**
     * 移除象棋特定的事件监听
     */
    protected removeMatchListeners(): void {
        // 象棋目前没有额外的特定事件
        this.stateChangeListeners = [];
    }
}
