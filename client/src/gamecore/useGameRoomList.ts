/**
 * 游戏房间列表 Hook (useGameRoomList)
 * 
 * 这是一个整合了新架构的房间列表 Hook，专门为 GameRoomClient 设计。
 * 
 * 特性：
 * - 与 GameRoomClient 无缝集成
 * - Socket.IO 实时更新（主通道）
 * - HTTP 轮询备份（备用通道）
 * - 自动故障切换
 * - 定时刷新
 * 
 * 使用方法：
 * ```tsx
 * const roomClient = useRef(new ChineseChessRoomClient(socket, ChineseChessTableClient));
 * const rooms = useGameRoomList(roomClient.current, 'beginner');
 * ```
 */

import { useState, useEffect } from 'react';
import { GameRoomClient } from './hierarchy/GameRoomClient';

export interface RoomListItem {
    id: string;
    name: string;
    status: 'waiting' | 'playing' | 'ended';
    players: number;
    spectators: number;
    minRating?: number;
    maxRating?: number;
    tableCount?: number;
}

export interface UseGameRoomListOptions {
    /** 是否启用 HTTP 轮询备份 */
    enableHttpFallback?: boolean;
    /** 轮询间隔（毫秒） */
    pollInterval?: number;
    /** 是否在组件挂载时立即获取 */
    fetchOnMount?: boolean;
}

/**
 * 使用游戏房间列表
 * 
 * @param roomClient - GameRoomClient 实例
 * @param roomType - 房间类型（如 'beginner', 'intermediate', 'advanced'）
 * @param options - 配置选项
 * @returns 房间列表数组
 */
export function useGameRoomList(
    roomClient: GameRoomClient | null,
    roomType: string = 'beginner',
    options: UseGameRoomListOptions = {}
): RoomListItem[] {
    const {
        enableHttpFallback = true,
        pollInterval = 5000,
        fetchOnMount = true
    } = options;

    const [rooms, setRooms] = useState<RoomListItem[]>([]);

    useEffect(() => {
        if (!roomClient) return;

        console.log(`[useGameRoomList] Initializing for room type: ${roomType}`);

        /**
         * 通过 Socket.IO 获取房间列表（主通道）
         */
        const fetchRoomsViaSocket = () => {
            if (!roomClient) return;
            console.log('[useGameRoomList] Fetching via Socket.IO');
            roomClient.getRoomList(roomType);
        };

        /**
         * 通过 HTTP 获取房间列表（备用通道）
         */
        const fetchRoomsViaHttp = async () => {
            if (!enableHttpFallback) return;

            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://happygames-tfdz.onrender.com';
                const gameType = (roomClient as any).gameType || 'chinesechess';
                const url = `${apiUrl}/api/games/${gameType}/rooms?tier=${roomType}`;

                console.log('[useGameRoomList] Fetching via HTTP:', url);

                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    console.log('[useGameRoomList] Received via HTTP:', data);

                    if (Array.isArray(data)) {
                        setRooms(data);
                    }
                } else {
                    console.warn('[useGameRoomList] HTTP fetch failed:', res.status);
                }
            } catch (err) {
                console.error('[useGameRoomList] HTTP fetch error:', err);
            }
        };

        /**
         * 监听 GameRoomClient 的状态更新
         */
        const handleStateUpdate = (state: any) => {
            if (state.rooms && Array.isArray(state.rooms)) {
                console.log('[useGameRoomList] Received rooms from GameRoomClient:', state.rooms);
                setRooms(state.rooms);
            }
        };

        // 初始化 GameRoomClient（如果还没初始化）
        if (roomClient && typeof (roomClient as any).init === 'function') {
            (roomClient as any).init(handleStateUpdate);
        }

        // 初始获取
        if (fetchOnMount) {
            fetchRoomsViaSocket();
            if (enableHttpFallback) {
                fetchRoomsViaHttp();
            }
        }

        // 定时轮询
        const interval = setInterval(() => {
            fetchRoomsViaSocket();
            if (enableHttpFallback) {
                fetchRoomsViaHttp();
            }
        }, pollInterval);

        // 清理函数
        return () => {
            clearInterval(interval);
        };
    }, [roomClient, roomType, enableHttpFallback, pollInterval, fetchOnMount]);

    return rooms;
}

/**
 * 简化版：仅使用 Socket.IO（推荐）
 */
export function useGameRoomListSocket(
    roomClient: GameRoomClient | null,
    roomType: string = 'beginner'
): RoomListItem[] {
    return useGameRoomList(roomClient, roomType, {
        enableHttpFallback: false
    });
}

/**
 * 完整版：Socket.IO + HTTP 双通道（高可靠性）
 */
export function useGameRoomListDual(
    roomClient: GameRoomClient | null,
    roomType: string = 'beginner',
    pollInterval: number = 5000
): RoomListItem[] {
    return useGameRoomList(roomClient, roomType, {
        enableHttpFallback: true,
        pollInterval
    });
}
