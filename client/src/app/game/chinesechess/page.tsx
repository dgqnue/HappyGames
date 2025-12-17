'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { ChineseChessCenterClient } from '@/games/chinesechess/gamepagehierarchy/ChineseChessCenterClient';
import { ChineseChessCenterView } from '@/games/chinesechess/gamepagehierarchy/ChineseChessCenterView';

export default function ChineseChessPage() {
    const router = useRouter();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [centerClient, setCenterClient] = useState<ChineseChessCenterClient | null>(null);
    const [loading, setLoading] = useState(true);

    // 初始化 Socket 和 Game Center Client
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/');
            return;
        }

        const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
            auth: { token },
            // 🔧 增强重连配置
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            transports: ['websocket', 'polling']  // 优先使用 WebSocket
        });

        const client = new ChineseChessCenterClient(newSocket);
        
        // 注意：房间级别的快速匹配不需要这个回调，因为用户已经在 GameRoomView 中
        // 这个回调只用于从 GameCenterView 发起的全局匹配（如果仍然支持的话）
        // 由于全局匹配已经被移除，这个回调现在不再需要
        // client.setOnMatchFoundCallback((data: any) => {
        //     console.log('[ChineseChessPage] Match found, navigating to game room...', data);
        //     if (data.roomId) {
        //         router.push(`/game/chinesechess/room/${data.roomId}`);
        //     }
        // });

        setSocket(newSocket);
        setCenterClient(client);
        setLoading(false);

        return () => {
            if (client) {
                client.dispose();
            }
            newSocket.disconnect();
        };
    }, [router]);

    if (loading || !centerClient) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-amber-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
            </div>
        );
    }

    return (
        <ChineseChessCenterView
            centerClient={centerClient}
            onBack={() => router.push('/lobby')}
        />
    );
}
