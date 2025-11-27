'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import io from 'socket.io-client';

const TIERS = [
    { id: 'free', name: '免费室', desc: '无需游戏豆', minRating: 0, maxRating: 9999, color: 'bg-gray-100' },
    { id: 'beginner', name: '初级室', desc: '< 1500分', minRating: 0, maxRating: 1499, color: 'bg-green-100' },
    { id: 'intermediate', name: '中级室', desc: '1500-1800分', minRating: 1500, maxRating: 1800, color: 'bg-blue-100' },
    { id: 'advanced', name: '高级室', desc: '> 1800分', minRating: 1801, maxRating: 9999, color: 'bg-purple-100' }
];

export default function ChineseChessCenter() {
    const router = useRouter();
    const [socket, setSocket] = useState<any>(null);
    const [userStats, setUserStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Connect socket
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/');
            return;
        }

        const newSocket = io({
            auth: { token }
        });

        newSocket.on('connect', () => {
            console.log('Connected to Chinese Chess');
            // Request user stats
            newSocket.emit('get_stats', { gameType: 'chinesechess' });
        });

        newSocket.on('user_stats', (stats) => {
            setUserStats(stats);
            setLoading(false);
        });

        setSocket(newSocket);

        // Set a fallback timeout to stop loading if server is slow
        const timer = setTimeout(() => setLoading(false), 2000);

        return () => {
            newSocket.disconnect();
            clearTimeout(timer);
        };
    }, [router]);

    const handleEnterRoom = (tier: string) => {
        if (!socket) return;
        // Don't emit start_game here, let the play page handle it
        router.push(`/game/chinesechess/play?tier=${tier}`);
    };

    const canAccessTier = (tier: any) => {
        // If stats not loaded yet, default to allowing free room
        if (!userStats) return tier.id === 'free';

        if (tier.id === 'free') return true;
        const rating = userStats.rating || 1200;
        return rating >= tier.minRating && rating <= tier.maxRating;
    };

    if (loading) {
        // Show a lighter loading state or just render with defaults
        // For now, let's keep it but make it faster/timeout
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100 p-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-amber-900">🏮 中国象棋</h1>
                            <p className="text-amber-800/60 mt-1">Chinese Chess (Xiangqi)</p>
                        </div>
                        <button
                            onClick={() => router.push('/lobby')}
                            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all"
                        >
                            返回大厅
                        </button>
                    </div>
                </div>

                {/* User Stats */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6">
                    <h2 className="text-xl font-bold text-amber-900 mb-4">📊 我的战绩</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="text-3xl font-bold" style={{ color: userStats?.titleColor || '#000' }}>
                                {userStats?.rating || 1200}
                            </div>
                            <div className="text-sm text-gray-600">等级分</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-amber-900">{userStats?.gamesPlayed || 0}</div>
                            <div className="text-sm text-gray-600">对局数</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-green-600">{userStats?.wins || 0}</div>
                            <div className="text-sm text-gray-600">胜</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold" style={{ color: userStats?.titleColor || '#000' }}>
                                {userStats?.title || '初出茅庐'}
                            </div>
                            <div className="text-sm text-gray-600">称号</div>
                        </div>
                    </div>
                </div>

                {/* Room Tiers */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6">
                    <h2 className="text-xl font-bold text-amber-900 mb-4">🚪 选择游戏室</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {TIERS.map(tier => {
                            const accessible = canAccessTier(tier);
                            return (
                                <div
                                    key={tier.id}
                                    className={`${tier.color} rounded-xl p-6 border-2 ${accessible ? 'border-amber-300' : 'border-gray-300 opacity-50'}`}
                                >
                                    <h3 className="text-2xl font-bold text-amber-900 mb-2">{tier.name}</h3>
                                    <p className="text-gray-700 mb-4">{tier.desc}</p>
                                    <button
                                        onClick={() => handleEnterRoom(tier.id)}
                                        disabled={!accessible}
                                        className={`w-full py-3 rounded-xl font-bold transition-all ${accessible
                                            ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            }`}
                                    >
                                        {accessible ? '进入' : '等级不符'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
