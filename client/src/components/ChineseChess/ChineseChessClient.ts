// client/src/components/ChineseChess/ChineseChessClient.ts
import { GameClientTemplate } from '../../gamecore/GameClientTemplate';
import { Socket } from 'socket.io-client';

interface ChessState {
    status: 'waiting' | 'playing' | 'ended';
    board: (string | null)[][];
    turn: 'r' | 'b';
    players: { r: string | null; b: string | null };
    mySide?: 'r' | 'b';
    winner?: string | null;
    elo?: any;
}

export class ChineseChessClient extends GameClientTemplate {
    constructor(socket: Socket) {
        // 游戏类型必须是 'chinesechess'，与服务端匹配
        super(socket, 'chinesechess');
    }

    protected setupGameListeners(): void {
        // 监听移动事件
        // 服务端 BaseGameManager 会广播 'move' 事件（不是 'chinesechess_move'，那是客户端发的）
        this.socket.on('move', (data: any) => {
            console.log('[ChineseChess] Move received:', data);
            this.handleStateUpdate({
                board: data.board,
                turn: data.turn
            });
        });
    }

    protected removeGameListeners(): void {
        this.socket.off('move');
    }

    // 自定义移动方法
    public makeMove(fromX: number, fromY: number, toX: number, toY: number) {
        // 发送 'chinesechess_move' 事件（BaseGameManager 监听这个）
        super.makeMove({ fromX, fromY, toX, toY });
    }

    // 覆盖父类方法以支持旧的调用方式（如果需要）
    // 或者直接使用父类的 joinTier, joinRoom, leave
}
