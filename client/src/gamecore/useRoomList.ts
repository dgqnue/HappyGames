/**
 * 双通道房间列表获取 Hook
 * 
 * 自动实现 Socket.IO + HTTP 双通道冗余机制
 * 
 * 特性：
 * - Socket.IO 实时更新（主通道）
 * - HTTP 轮询备份（备用通道）
 * - 自动故障切换
 * - 定时刷新
 * 
 * 使用方法：
 * const rooms = useRoomList(socket, 'chinesechess', 'free');
 */

import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface Room {
    id: string;
    status: 'waiting' | 'playing' | 'ended';
    players: number;
    spectators: number;
}

interface UseRoomListOptions {
    /** 是否启用 HTTP 轮询 */
    enableHttp?: boolean;
    /** 是否启用 Socket.IO */
    enableSocket?: boolean;
    /** 轮询间隔（毫秒） */
    pollInterval?: number;
    /** 是否在组件挂载时立即获取 */
    fetchOnMount?: boolean;
}

/**
 * 使用双通道获取房间列表
 * 
 * @param socket - Socket.IO 实例
 * @param gameType - 游戏类型（如 'chinesechess'）
 * @param tier - 房间等级（'free' | 'beginner' | 'intermediate' | 'advanced'）
 * @param options - 配置选项
 * @returns 房间列表数组
 */
export function useRoomList(
    socket: Socket | null,
    gameType: string,
    tier: string,
    options: UseRoomListOptions = {}
): Room[] {
    const {
        enableHttp = true,
        enableSocket = true,
        pollInterval = 5000,
        fetchOnMount = true
    } = options;

    const [rooms, setRooms] = useState<Room[]>([]);

    useEffect(() => {
        if (!gameType || !tier) return;

        console.log(`[RoomList] Starting room fetch for ${gameType}/${tier}`);

        /**
         * 通过 Socket.IO 获取房间列表
         */
        const fetchRoomsViaSocket = () => {
            if (!enableSocket || !socket || !socket.connected) return;

            console.log('[RoomList] Emitting get_rooms via Socket');
            socket.emit('get_rooms', { tier });
        };

        /**
         * 通过 HTTP 获取房间列表
         */
        const fetchRoomsViaHttp = async () => {
            if (!enableHttp) return;

            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
                const url = `${apiUrl}/api/games/${gameType}/rooms?tier=${tier}`;

                console.log('[RoomList] Fetching via HTTP:', url);

                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    console.log('[RoomList] Received via HTTP:', data);

                    if (Array.isArray(data)) {
                        setRooms(data);
                    }
                } else {
                    console.warn('[RoomList] HTTP fetch failed:', res.status);
                }
            } catch (err) {
                console.error('[RoomList] HTTP fetch error:', err);
            }
        };

        /**
         * Socket.IO 房间列表事件处理
         */
        const handleRoomList = (roomList: Room[]) => {
            console.log('[RoomList] Received via Socket:', roomList);
            if (Array.isArray(roomList)) {
                setRooms(roomList);
            }
        };

        // 设置 Socket.IO 监听
        if (enableSocket && socket) {
            socket.on('room_list', handleRoomList);
        }

        // 初始获取
        if (fetchOnMount) {
            fetchRoomsViaHttp();
            fetchRoomsViaSocket();
        }

        // 定时轮询（双通道）
        const interval = setInterval(() => {
            fetchRoomsViaHttp();
            fetchRoomsViaSocket();
        }, pollInterval);

        // 清理函数
        return () => {
            if (enableSocket && socket) {
                socket.off('room_list', handleRoomList);
            }
            clearInterval(interval);
        };
    }, [socket, gameType, tier, enableHttp, enableSocket, pollInterval, fetchOnMount]);

    return rooms;
}

/**
 * 简化版：仅使用 Socket.IO
 */
export function useRoomListSocket(
    socket: Socket | null,
    gameType: string,
    tier: string
): Room[] {
    return useRoomList(socket, gameType, tier, {
        enableHttp: false,
        enableSocket: true
    });
}

/**
 * 简化版：仅使用 HTTP
 */
export function useRoomListHttp(
    gameType: string,
    tier: string,
    pollInterval: number = 5000
): Room[] {
    return useRoomList(null, gameType, tier, {
        enableHttp: true,
        enableSocket: false,
        pollInterval
    });
}
