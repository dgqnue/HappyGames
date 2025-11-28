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
        this.socket.on('move', (data: any) => {
            console.log('[ChineseChess] Move received:', data);
            this.handleStateUpdate({
                board: data.board,
                turn: data.turn
            });
        });

        // 监听匹配队列加入
        this.socket.on('match_queue_joined', (data: any) => {
            console.log('[ChineseChess] Joined match queue:', data);
            // 可以在这里触发回调通知UI
        });

        // 监听匹配成功
        this.socket.on('match_found', (data: any) => {
            console.log('[ChineseChess] Match found:', data);
            // 可以在这里触发回调通知UI
        });

        // 监听准备检查
        this.socket.on('ready_check_start', (data: any) => {
            console.log('[ChineseChess] Ready check started:', data);
            // 这里应该通过某种方式通知UI显示倒计时
            // 由于 GameClientTemplate 目前主要是状态管理，UI逻辑通常在组件中监听
            // 但我们可以通过 updateState 传递一些临时状态，或者让组件直接监听 socket
        });
    }

    protected removeGameListeners(): void {
        this.socket.off('move');
        this.socket.off('match_queue_joined');
        this.socket.off('match_found');
        this.socket.off('ready_check_start');
    }

    // 自定义移动方法
    public sendMove(fromX: number, fromY: number, toX: number, toY: number) {
        super.makeMove({ fromX, fromY, toX, toY });
    }

    // 自动匹配
    public autoMatch(settings: any) {
        this.socket.emit('auto_match', settings);
    }

    // 取消匹配
    public cancelMatch() {
        this.socket.emit('cancel_match');
    }

    // 玩家准备
    public playerReady() {
        this.socket.emit('player_ready');
    }

    // 取消准备
    public playerUnready() {
        this.socket.emit('player_unready');
    }

    // 旁观
    public spectate(roomId: string) {
        this.socket.emit('spectate', { roomId });
    }
}
