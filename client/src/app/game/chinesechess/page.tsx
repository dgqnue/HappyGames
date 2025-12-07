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
            auth: { token }
        });

        const client = new ChineseChessCenterClient(newSocket);
        
        // 设置匹配成功的回调，自动跳转到游戏
        client.setOnMatchFoundCallback((data: any) => {
            console.log('[ChineseChessPage] Match found, navigating to game room...', data);
            // 跳转到游戏房间
            if (data.roomId) {
                router.push(`/game/chinesechess/room/${data.roomId}`);
            }
        });

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
