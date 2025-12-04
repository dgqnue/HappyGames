'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { ChineseChessCenterClient, ChineseChessCenterState } from '@/games/chinesechess/gamepagehierarchy/ChineseChessCenterClient';
import { ChineseChessRoomClient } from '@/games/chinesechess/gamepagehierarchy/ChineseChessRoomClient';
import { useLanguage } from '@/lib/i18n';

// Define extended interface for UI display
interface ExtendedRoomInfo {
    id: string;
    name: string;
    minRating?: number;
    maxRating?: number;
    tableCount?: number;
    status?: string;
    playerCount?: number;
}

export default function ChineseChessPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [centerClient, setCenterClient] = useState<ChineseChessCenterClient | null>(null);
    const [centerState, setCenterState] = useState<ChineseChessCenterState | null>(null);
    const [loading, setLoading] = useState(true);

    // Initialize Socket and Game Center Client
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/');
            return;
        }

        const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', {
            auth: { token }
        });

        const client = new ChineseChessCenterClient(newSocket);

        setSocket(newSocket);
        setCenterClient(client);

        // Initialize client and subscribe to state updates
        client.init((state) => {
            setCenterState(state);
            setLoading(false);
        });

        // Join the game center
        client.joinGameCenter();

        return () => {
            client.leaveGameCenter();
            client.dispose();
            newSocket.disconnect();
        };
    }, [router]);

    // Handle Room Selection
    const handleRoomSelect = (roomId: string) => {
        if (centerClient) {
            centerClient.selectRoom(roomId);
        }
    };

    // Handle Back to Room List
    const handleBackToCenter = () => {
        if (centerClient) {
            centerClient.deselectRoom();
        }
    };

    if (loading || !centerState) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-amber-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
            </div>
        );
    }

    // If a room is selected, show the Room View (Placeholder for now, or basic implementation)
    if (centerState.selectedRoomId && centerClient?.getRoomClient()) {
        return (
            <RoomView
                roomClient={centerClient.getRoomClient() as ChineseChessRoomClient}
                onBack={handleBackToCenter}
            />
        );
    }

    // Default: Show Game Center (Room List)
    return (
        <main className="min-h-screen bg-amber-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/lobby')}
                            className="p-2 bg-white rounded-full shadow-md hover:bg-amber-100 transition-colors"
                        >
                            <svg className="w-6 h-6 text-amber-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <h1 className="text-3xl font-bold text-amber-900 flex items-center gap-3">
                            <span className="text-4xl">🏮</span> 中国象棋大厅
                        </h1>
                    </div>

                    {/* User Stats */}
                    {centerState.userStats && (
                        <div className="bg-white px-6 py-3 rounded-xl shadow-sm border border-amber-100 flex gap-6">
                            <div className="text-center">
                                <div className="text-xs text-gray-500">等级分</div>
                                <div className="font-bold text-amber-600">{centerState.userStats.rating || 1000}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xs text-gray-500">胜/负</div>
                                <div className="font-bold text-gray-700">
                                    <span className="text-green-600">{centerState.userStats.wins || 0}</span>
                                    /
                                    <span className="text-red-500">{centerState.userStats.losses || 0}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Room List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(centerState.rooms as unknown as ExtendedRoomInfo[]).map((room) => (
                        <div
                            key={room.id}
                            onClick={() => handleRoomSelect(room.id)}
                            className="bg-white rounded-2xl p-6 shadow-lg border border-amber-100 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-2xl group-hover:bg-amber-200 transition-colors">
                                    {getRoomIcon(room.id)}
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold ${getRoomStatusColor(room.status || 'active')}`}>
                                    {room.status === 'full' ? '已满' : '进行中'}
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-gray-800 mb-2">{room.name}</h3>
                            <p className="text-gray-500 text-sm mb-4">{getRoomDescription(room.id)}</p>

                            <div className="flex items-center justify-between text-sm text-gray-400 border-t border-gray-100 pt-4">
                                <div className="flex items-center gap-1">
                                    <span>👥</span>
                                    <span>{room.playerCount || 0} 在线</span>
                                </div>
                                <div className="text-amber-600 font-medium group-hover:translate-x-1 transition-transform">
                                    进入房间 &rarr;
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {centerState.rooms.length === 0 && (
                    <div className="text-center py-20 text-gray-400">
                        <div className="text-6xl mb-4">📭</div>
                        <p>暂无可用房间，请稍后再试</p>
                    </div>
                )}
            </div>
        </main>
    );
}

// Helper Components & Functions

function RoomView({ roomClient, onBack }: { roomClient: ChineseChessRoomClient, onBack: () => void }) {
    const [roomState, setRoomState] = useState<any>(null);

    useEffect(() => {
        roomClient.init((state) => {
            setRoomState(state);
        });
    }, [roomClient]);

    if (!roomState) return <div>Loading Room...</div>;

    return (
        <main className="min-h-screen bg-amber-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={onBack}
                        className="p-2 bg-white rounded-full shadow-md hover:bg-amber-100 transition-colors"
                    >
                        <svg className="w-6 h-6 text-amber-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <h1 className="text-2xl font-bold text-amber-900">
                        {roomState.name || '游戏房间'}
                    </h1>
                </div>

                <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
                    <h2 className="text-xl text-gray-600 mb-4">房间功能开发中...</h2>
                    <p className="text-gray-500">这里将显示游戏桌列表 (Table List)</p>
                    <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center gap-2 hover:border-amber-400 hover:bg-amber-50 cursor-pointer transition-all">
                                <div className="text-4xl">♟️</div>
                                <div className="font-medium text-gray-500">Table {i}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}

function getRoomIcon(id: string) {
    if (id.includes('beginner')) return '🌱';
    if (id.includes('intermediate')) return '⚔️';
    if (id.includes('advanced')) return '🏆';
    return '🎲';
}

function getRoomDescription(id: string) {
    if (id.includes('beginner')) return '适合新手练习，低倍率';
    if (id.includes('intermediate')) return '高手过招，中等倍率';
    if (id.includes('advanced')) return '大师对决，高倍率';
    return '标准游戏房间';
}

function getRoomStatusColor(status: string) {
    switch (status) {
        case 'active': return 'bg-green-100 text-green-700';
        case 'full': return 'bg-red-100 text-red-700';
        default: return 'bg-gray-100 text-gray-600';
    }
}

