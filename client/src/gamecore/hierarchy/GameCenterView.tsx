'use client';

import { useEffect, useState } from 'react';
import { GameCenterClient } from './GameCenterClient';
import { GameRoomView } from './GameRoomView';

interface GameCenterViewProps {
    centerClient: GameCenterClient;
    onBack: () => void;
}

export function GameCenterView({ centerClient, onBack }: GameCenterViewProps) {
    const [centerState, setCenterState] = useState(centerClient.getState());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let hasReceivedData = false;

        // 订阅状态更新
        centerClient.init((state) => {
            setCenterState(state);
            // 只在第一次收到数据时设置为加载完成
            if (!hasReceivedData) {
                hasReceivedData = true;
                setIsLoading(false);
            }
        });

        // 加入游戏中心
        centerClient.joinGameCenter();

        // 设置超时，最多加载3秒
        const timeout = setTimeout(() => {
            setIsLoading(false);
        }, 3000);

        return () => {
            clearTimeout(timeout);
            centerClient.leaveGameCenter();
        };
    }, [centerClient]);

    // 如果选择了房间，显示房间视图
    const roomClient = centerClient.getRoomClient();
    if (centerState.selectedRoomId && roomClient) {
        return (
            <GameRoomView
                roomClient={roomClient}
                onBack={() => centerClient.deselectRoom()}
            />
        );
    }

    return (
        <main className="min-h-screen bg-amber-50 p-2 md:p-4">
            <div className="w-full">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="p-2 bg-white rounded-full shadow-md hover:bg-amber-100 transition-colors"
                        >
                            <svg className="w-6 h-6 text-amber-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <h1 className="text-3xl font-bold text-amber-900 flex items-center gap-3">
                            <span className="text-4xl">🏮</span> {centerState.gameType || '游戏'} 游戏中心
                        </h1>
                    </div>

                    {/* User Stats */}
                    {centerState.userStats && (
                        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white rounded-xl p-4 shadow-md">
                                <p className="text-gray-500 text-sm">总场次</p>
                                <p className="text-2xl font-bold text-amber-900">{centerState.userStats.gamesPlayed || 0}</p>
                            </div>
                            <div className="bg-white rounded-xl p-4 shadow-md">
                                <p className="text-gray-500 text-sm">胜率</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {centerState.userStats.gamesPlayed > 0
                                        ? ((centerState.userStats.wins / centerState.userStats.gamesPlayed) * 100).toFixed(1)
                                        : 0}%
                                </p>
                            </div>
                            <div className="bg-white rounded-xl p-4 shadow-md">
                                <p className="text-gray-500 text-sm">等级分</p>
                                <p className="text-2xl font-bold text-blue-600">{centerState.userStats.rating || 1200}</p>
                            </div>
                            <div className="bg-white rounded-xl p-4 shadow-md">
                                <p className="text-gray-500 text-sm">称号</p>
                                <p className="text-lg" style={{ color: centerState.userStats.titleColor || '#000' }}>
                                    {centerState.userStats.title || '初出茅庐'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Room List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoading ? (
                        <div className="col-span-full flex justify-center py-20">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-gray-800"></div>
                        </div>
                    ) : centerState.rooms && centerState.rooms.length > 0 ? (
                        centerState.rooms.map((room: any) => (
                            <div
                                key={room.id}
                                onClick={() => centerClient.selectRoom(room.id)}
                                className="bg-white rounded-2xl p-6 shadow-lg border border-amber-100 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all group relative overflow-hidden"
                            >
                                {/* Room Icon & Status */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-colors ${room.tier === 'free' ? 'bg-green-100' :
                                        room.tier === 'beginner' ? 'bg-blue-100' :
                                            room.tier === 'intermediate' ? 'bg-purple-100' :
                                                'bg-amber-100'
                                        }`}>
                                        {room.tier === 'free' ? '🆓' :
                                            room.tier === 'beginner' ? '🌱' :
                                                room.tier === 'intermediate' ? '⚔️' : '👑'}
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${room.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                        {room.status === 'active' ? '开放中' : '维护中'}
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-gray-800 mb-1">{room.name}</h3>
                                <p className="text-gray-500 text-sm mb-4">{room.description || '标准对局'}</p>

                                <div className="flex items-center justify-between text-sm text-gray-400 border-t border-gray-100 pt-4">
                                    <div className="flex items-center gap-1">
                                        <span>👥</span>
                                        <span>{room.playerCount || 0} 人在线</span>
                                    </div>
                                    <div className="text-amber-600 font-medium group-hover:translate-x-1 transition-transform">
                                        进入 &rarr;
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-20 text-gray-500">
                            <p className="text-lg">暂无可用房间</p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
