'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import io from 'socket.io-client';
import { GameTierSelector } from '@/components/GameTemplates/GameTierSelector';

export default function ChineseChessCenter() {
    const router = useRouter();
    const [userStats, setUserStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/');
            return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const newSocket = io(apiUrl, {
            auth: { token }
        });

        newSocket.on('connect', () => {
            console.log('Connected to Chinese Chess');
            newSocket.emit('get_stats', { gameType: 'chinesechess' });
        });

        newSocket.on('user_stats', (stats) => {
            setUserStats(stats);
            setLoading(false);
        });

        // Fallback timeout
        const timer = setTimeout(() => setLoading(false), 2000);

        return () => {
            newSocket.disconnect();
            clearTimeout(timer);
        };
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100">
                <div className="text-2xl font-bold text-amber-900 animate-pulse">加载中...</div>
            </div>
        );
    }

    return (
        <GameTierSelector
            gameName="中国象棋"
            gameNameEn="Chinese Chess (Xiangqi)"
            gamePath="/game/chinesechess"
            userStats={userStats}
        />
    );
}
