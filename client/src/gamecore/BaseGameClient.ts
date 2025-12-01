// client/src/gamecore/BaseGameClient.ts
import { Socket } from 'socket.io-client';

export interface GameState {
    status: 'waiting' | 'playing' | 'ended';
    // Add other common state properties here
}

export abstract class BaseGameClient {
    protected socket: Socket;
    protected gameId: string;
    protected roomId: string | null = null;
    protected state: GameState = { status: 'waiting' };

    // Callback for UI updates
    protected onStateChange: ((state: any) => void) | null = null;

    constructor(socket: Socket, gameId: string) {
        this.socket = socket;
        this.gameId = gameId;
    }

    /**
     * Initialize listeners for this game
     */
    public init(onStateChange: (state: any) => void) {
        this.onStateChange = onStateChange;
        this.setupListeners();
    }

    /**
     * Clean up listeners
     */
    public dispose() {
        this.removeListeners();
        this.onStateChange = null;
    }

    /**
     * Join the game matchmaking or room
     */
    public join() {
        this.socket.emit('start_game', this.gameId);
    }

    /**
     * Leave the game
     */
    public leave() {
        if (this.roomId) {
            this.socket.emit(`game_${this.gameId}_leave`, { roomId: this.roomId });
        }
    }

    /**
     * Setup socket listeners specific to this game
     * Must be implemented by subclasses to listen for game-specific events
     */
    protected abstract setupListeners(): void;

    /**
     * Remove socket listeners
     * Must be implemented by subclasses
     */
    protected abstract removeListeners(): void;

    /**
     * Helper to update state and notify UI
     */
    protected updateState(newState: Partial<any>) {
        this.state = { ...this.state, ...newState };
        if (this.onStateChange) {
            this.onStateChange(this.state);
        }
    }
}
