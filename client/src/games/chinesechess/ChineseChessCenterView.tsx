'use client';

import { useEffect, useState } from 'react';
import { ChineseChessCenterClient } from './gamepagehierarchy/ChineseChessCenterClient';
import { ChineseChessRoomView } from './ChineseChessRoomView';

interface ChineseChessCenterViewProps {
    centerClient: ChineseChessCenterClient;
    onBack: () => void;
}

export function ChineseChessCenterView({ centerClient, onBack }: ChineseChessCenterViewProps) {
    const [centerState, setCenterState] = useState(centerClient.getState());

    useEffect(() => {
        // 订阅状态更新
        centerClient.init((state) => {
            setCenterState(state);
        });

        // 加入游戏中心
        centerClient.joinGameCenter();

        return () => {
            centerClient.leaveGameCenter();
        };
    }, [centerClient]);

    // 如果选择了房间，显示房间视图
    const roomClient = centerClient.getChessRoomClient();
    if (centerState.selectedRoomId && roomClient) {
        return (
            <ChineseChessRoomView
                roomClient={roomClient}
                onBack={() => centerClient.deselectRoom()}
            />
        );
    }

    // 默认显示游戏中心（房间列表）
    return (
        <main className="min-h-screen bg-amber-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
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
                            <span className="text-4xl">🏮</span> 中国象棋大厅
                        </h1>
                    </div>

                    {/* 用户统计 */}
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

                {/* 房间列表 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {centerState.rooms.map((room) => (
                        <div
                            key={room.id}
                            onClick={() => centerClient.selectRoom(room.id)}
                            className="bg-white rounded-2xl p-6 shadow-lg border border-amber-100 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-2xl group-hover:bg-amber-200 transition-colors">
                                    {getRoomIcon(room.id)}
                                </div>
                                <div className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                    进行中
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-gray-800 mb-2">{room.name}</h3>
                            <p className="text-gray-500 text-sm mb-4">{getRoomDescription(room.id)}</p>

                            <div className="flex items-center justify-between text-sm text-gray-400 border-t border-gray-100 pt-4">
                                <div className="flex items-center gap-1">
                                    <span>👥</span>
                                    <span>{(room as any).playerCount || 0} 在线</span>
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
