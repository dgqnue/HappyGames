// client/src/gamecore/GameClientManager.ts
import { Socket } from 'socket.io-client';
import { BaseGameClient } from './BaseGameClient';

export class GameClientManager {
    private static instance: GameClientManager;
    private socket: Socket | null = null;
    private activeClient: BaseGameClient | null = null;
    private gameClients: Map<string, new (socket: Socket) => BaseGameClient> = new Map();

    private constructor() { }

    public static getInstance(): GameClientManager {
        if (!GameClientManager.instance) {
            GameClientManager.instance = new GameClientManager();
        }
        return GameClientManager.instance;
    }

    public setSocket(socket: Socket) {
        this.socket = socket;
    }

    /**
     * Register a game client class
     */
    public registerGame(gameId: string, clientClass: new (socket: Socket) => BaseGameClient) {
        this.gameClients.set(gameId, clientClass);
    }

    /**
     * Start a game
     */
    public async startGame(gameId: string, onStateChange: (state: any) => void): Promise<BaseGameClient | null> {
        if (!this.socket) {
            console.error('Socket not initialized');
            return null;
        }

        // Dispose previous client if any
        if (this.activeClient) {
            this.activeClient.dispose();
            this.activeClient = null;
        }

        const ClientClass = this.gameClients.get(gameId);
        if (!ClientClass) {
            console.error(`Game client for ${gameId} not registered`);
            return null;
        }

        const client = new ClientClass(this.socket);
        client.init(onStateChange);
        client.join();

        this.activeClient = client;
        return client;
    }

    /**
     * Get active client
     */
    public getActiveClient(): BaseGameClient | null {
        return this.activeClient;
    }
}
