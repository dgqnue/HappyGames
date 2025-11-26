// client/src/components/ChineseChess/ChineseChessClient.ts
import { BaseGameClient } from '../../gamecore/BaseGameClient';
import { Socket } from 'socket.io-client';

interface ChessState {
    status: 'waiting' | 'playing' | 'ended';
    board: (string | null)[][];
    turn: 'r' | 'b';
    players: { r: string | null; b: string | null };
    mySide?: 'r' | 'b';
}

export class ChineseChessClient extends BaseGameClient {
    protected state: ChessState = {
        status: 'waiting',
        board: [],
        turn: 'r',
        players: { r: null, b: null }
    };

    constructor(socket: Socket) {
        super(socket, 'chinesechess');
    }

    protected setupListeners(): void {
        this.socket.on('state', (data: any) => {
            this.updateState(data);
        });

        this.socket.on('game_start', (data: any) => {
            this.updateState({ status: 'playing', ...data });
        });

        this.socket.on('move', (data: any) => {
            this.updateState({
                board: data.board,
                turn: data.turn
            });
        });

        this.socket.on('game_over', (data: any) => {
            this.updateState({
                status: 'ended',
                winner: data.winner,
                elo: data.elo
            });
        });

        this.socket.on('error', (data: any) => {
            console.error('Chess Error:', data);
        });
    }

    protected removeListeners(): void {
        this.socket.off('state');
        this.socket.off('game_start');
        this.socket.off('move');
        this.socket.off('game_over');
        this.socket.off('error');
    }

    public makeMove(fromX: number, fromY: number, toX: number, toY: number) {
        this.socket.emit('chess_move', { fromX, fromY, toX, toY });
    }

    public joinTier(tier: string) {
        this.socket.emit('chess_join', { tier });
    }
}
