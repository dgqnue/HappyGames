/**
 * 游戏房间客户端基类 (GameRoomClient)
 * 
 * 对应后端的 GameRoom 类
 * 
 * 职责：
 * - 管理房间信息（房间ID、名称、等级限制）
 * - 获取游戏桌列表
 * - 选择游戏桌
 * - 管理 GameTableClient 实例
 * 
 * 使用方法：
 * class MyGameRoomClient extends GameRoomClient {
 *     constructor(socket, gameType, TableClientClass) {
 *         super(socket, gameType, TableClientClass);
 *     }
 *     
 *     protected setupRoomListeners() {
 *         // 添加游戏特定的事件监听
 *     }
 * }
 */

import { Socket } from 'socket.io-client';
import { GameTableClient } from './GameTableClient';

export interface TableInfo {
    tableId: string;
    playerCount: number;
    maxPlayers: number;
    status: 'waiting' | 'playing' | 'full';
    players?: any[];
    [key: string]: any;
}

export interface RoomInfo {
    id: string;
    name: string;
    minRating?: number;
    maxRating?: number;
    tableCount?: number;
}

export interface GameRoomState {
    currentRoom: RoomInfo | null;
    tables: TableInfo[];
    selectedTableId: string | null;
    [key: string]: any;
}

export abstract class GameRoomClient {
    protected socket: Socket;
    protected gameType: string;
    protected state: GameRoomState;
    protected onStateUpdate: ((state: GameRoomState) => void) | null = null;

    // 游戏桌客户端（选择游戏桌后创建）
    protected tableClient: GameTableClient | null = null;
    protected TableClientClass: new (socket: Socket) => GameTableClient;

    constructor(
        socket: Socket,
        gameType: string,
        TableClientClass: new (socket: Socket) => GameTableClient
    ) {
        this.socket = socket;
        this.gameType = gameType;
        this.TableClientClass = TableClientClass;
        this.state = {
            currentRoom: null,
            tables: [],
            selectedTableId: null
        };
    }

    /**
     * 初始化游戏房间客户端
     * @param onStateUpdate - 状态更新回调函数
     */
    public init(onStateUpdate: (state: GameRoomState) => void): void {
        this.onStateUpdate = onStateUpdate;
        this.setupCommonListeners();
        this.setupRoomListeners();
        console.log(`[${this.gameType}RoomClient] Initialized`);
    }

    /**
     * 设置通用事件监听
     */
    protected setupCommonListeners(): void {
        // 房间列表更新
        this.socket.on('room_list', (data: any) => {
            console.log(`[${this.gameType}RoomClient] Room list update:`, data);
            this.handleRoomListUpdate(data);
        });

        // 游戏桌列表更新
        this.socket.on('table_list', (data: any) => {
            console.log(`[${this.gameType}RoomClient] Table list update:`, data);
            this.handleTableListUpdate(data);
        });

        // 游戏桌状态更新 - 当玩家加入桌子时收到或游戏状态变化时收到
        this.socket.on('table_update', (data: any) => {
            console.log(`[${this.gameType}RoomClient] Table state update received:`, data);
            this.handleTableUpdate(data);
        });

        // 游戏开始事件 - 确保在房间客户端也能收到并处理
        this.socket.on('game_start', (data: any) => {
            console.log(`[${this.gameType}RoomClient] Game start event received:`, data);
            this.handleGameStart(data);
        });
    }

    /**
     * 设置游戏特定的事件监听
     * 子类可以重写此方法
     */
    protected setupRoomListeners(): void {
        // 默认实现为空，子类可以重写
    }

    /**
     * 处理房间列表更新
     */
    protected handleRoomListUpdate(data: any): void {
        // 子类可以重写此方法来处理特定格式的数据
        this.updateState({ rooms: data });
    }

    /**
     * 处理游戏桌列表更新
     */
    protected handleTableListUpdate(data: any): void {
        const tables = Array.isArray(data) ? data : [];
        this.updateState({ tables });
    }

    /**
     * 处理单个游戏桌状态更新
     * 当某个游戏桌的状态变化时（比如从 'matching' 变为 'playing'）调用
     */
    protected handleTableUpdate(data: any): void {
        console.log(`[${this.gameType}RoomClient] Handling table update:`, data);
        
        const tableId = data.roomId || data.tableId;
        if (!tableId) {
            console.warn(`[${this.gameType}RoomClient] No tableId/roomId in table update`);
            return;
        }

        // 更新 tables 列表中对应的表格
        const updatedTables = this.state.tables.map(table => {
            // 支持多种 ID 匹配方式：tableId、id、roomId
            const tableMatches = 
                table.tableId === tableId || 
                table.id === tableId || 
                (table as any).roomId === tableId;
            
            if (tableMatches) {
                console.log(`[${this.gameType}RoomClient] Found matching table, updating status from ${table.status} to ${data.status}`);
                return {
                    ...table,
                    tableId: table.tableId || tableId,  // 确保 tableId 字段存在
                    status: data.status || table.status,
                    players: data.players || table.players,
                    playerCount: data.playerCount || data.players?.length || table.playerCount,
                    maxPlayers: data.maxPlayers || table.maxPlayers,
                    playerList: data.playerList || table.playerList,
                    ...data // 合并其他字段
                };
            }
            return table;
        });

        this.updateState({ tables: updatedTables });

        // 如果这是我所在的表格，记录一下
        if (tableId === this.state.selectedTableId) {
            console.log(`[${this.gameType}RoomClient] This is my table, status is now ${data.status}`);
        }
    }

    /**
     * 处理游戏开始事件
     */
    protected handleGameStart(data: any): void {
        console.log(`[${this.gameType}RoomClient] Handling game start:`, data);
        // 游戏开始时，确保选中的桌子ID正确设置
        if (data.roomId) {
            console.log(`[${this.gameType}RoomClient] Setting selectedTableId to ${data.roomId}`);
            this.updateState({
                selectedTableId: data.roomId
            });

            // 如果tableClient不存在，创建它
            if (!this.tableClient) {
                console.log(`[${this.gameType}RoomClient] Creating table client for room ${data.roomId}`);
                this.tableClient = new this.TableClientClass(this.socket);
                this.tableClient.init((tableState) => {
                    // 将游戏桌状态合并到房间状态
                    this.updateState({ ...tableState });
                });
            }

            // 确保tableClient加入游戏桌（如果当前在房间中）
            if (this.state.currentRoom && this.tableClient) {
                console.log(`[${this.gameType}RoomClient] Ensuring table client is joined to table ${data.roomId}`);
                this.tableClient.joinTable(this.state.currentRoom.id, data.roomId);
            }
        }
    }

    /**
     * 获取房间列表
     * @param roomType - 房间类型（如：beginner, intermediate, advanced）
     */
    public getRoomList(roomType?: string): void {
        console.log(`[${this.gameType}RoomClient] Getting room list:`, roomType);
        const event = `${this.gameType}_get_rooms`;
        this.socket.emit(event, roomType ? { roomType } : {});
    }

    /**
     * 进入房间
     * @param roomInfo - 房间信息
     */
    public enterRoom(roomInfo: RoomInfo): void {
        console.log(`[${this.gameType}RoomClient] Entering room:`, roomInfo);
        this.updateState({
            currentRoom: roomInfo,
            tables: [] // 清空旧的游戏桌列表
        });

        // 请求游戏桌列表
        this.getTableList(roomInfo.id);
    }

    /**
     * 离开房间
     */
    public leaveRoom(): void {
        console.log(`[${this.gameType}RoomClient] Leaving room`);

        // 清理游戏桌客户端
        if (this.tableClient) {
            this.tableClient.dispose();
            this.tableClient = null;
        }

        this.updateState({
            currentRoom: null,
            tables: [],
            selectedTableId: null
        });
    }

    /**
     * 获取游戏桌列表
     * @param roomId - 房间ID
     */
    public getTableList(roomId: string): void {
        console.log(`[${this.gameType}RoomClient] Getting table list for room:`, roomId);
        // 通常游戏桌列表会自动推送，这里可以主动请求
        const event = `${this.gameType}_get_tables`;
        this.socket.emit(event, { roomId });
    }

    /**
     * 选择游戏桌
     * @param tableId - 游戏桌ID
     */
    public selectTable(tableId: string): void {
        console.log(`[${this.gameType}RoomClient] Selecting table:`, tableId);

        if (!this.state.currentRoom) {
            console.error(`[${this.gameType}RoomClient] No room selected`);
            return;
        }

        // 创建游戏桌客户端
        if (!this.tableClient) {
            this.tableClient = new this.TableClientClass(this.socket);
            this.tableClient.init((tableState) => {
                // 将游戏桌状态合并到房间状态
                this.updateState({ ...tableState });
            });
        }

        // 加入游戏桌
        const roomId = this.state.currentRoom.id;
        this.tableClient.joinTable(roomId, tableId);

        this.updateState({ selectedTableId: tableId });
    }

    /**
     * 取消选择游戏桌
     */
    public deselectTable(): void {
        console.log(`[${this.gameType}RoomClient] Deselecting table`);

        // 离开游戏桌
        if (this.tableClient) {
            this.tableClient.leaveTable();
            this.tableClient.dispose();
            this.tableClient = null;
        }

        this.updateState({ selectedTableId: null });

        // 延迟刷新游戏桌列表，确保服务器已更新状态
        setTimeout(() => {
            if (this.state.currentRoom) {
                this.getTableList(this.state.currentRoom.id);
                // 额外触发一次房间更新，确保其他玩家看到正确状态
                this.socket.emit(`${this.gameType}_refresh_room`, { roomId: this.state.currentRoom.id });
            }
        }, 200);
    }

    /**
     * 更新状态并通知UI
     */
    protected updateState(newState: Partial<GameRoomState>): void {
        this.state = { ...this.state, ...newState };
        if (this.onStateUpdate) {
            this.onStateUpdate(this.state);
        }
    }

    /**
     * 获取当前状态
     */
    public getState(): GameRoomState {
        return { ...this.state };
    }

    /**
     * 获取游戏桌客户端
     */
    public getTableClient(): GameTableClient | null {
        return this.tableClient;
    }

    /**
     * 清理资源
     */
    public dispose(): void {
        console.log(`[${this.gameType}RoomClient] Disposing`);

        // 清理游戏桌客户端
        if (this.tableClient) {
            this.tableClient.dispose();
            this.tableClient = null;
        }

        this.removeCommonListeners();
        this.removeRoomListeners();
        this.onStateUpdate = null;
    }

    /**
     * 移除通用事件监听
     */
    protected removeCommonListeners(): void {
        this.socket.off('room_list');
        this.socket.off('table_list');
    }

    /**
     * 移除游戏特定的事件监听
     * 子类可以重写此方法
     */
    protected removeRoomListeners(): void {
        // 默认实现为空，子类可以重写
    }
}
