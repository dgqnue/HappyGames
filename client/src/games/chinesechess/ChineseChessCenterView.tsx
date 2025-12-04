'use client';

import { useEffect, useState } from 'react';
import { ChineseChessCenterClient } from './gamepagehierarchy/ChineseChessCenterClient';
import { ChineseChessRoomView } from './ChineseChessRoomView';

interface ChineseChessCenterViewProps {
    centerClient: ChineseChessCenterClient;
    onBack: () => void;
}

interface MatchSettings {
    baseBet: number;
    betRange: [number, number];
    winRateRange: [number, number];
    maxDisconnectRate: number;
}

const DEFAULT_SETTINGS: MatchSettings = {
    baseBet: 1000,
    betRange: [500, 5000],
    winRateRange: [0, 100],
    maxDisconnectRate: 20
};

export function ChineseChessCenterView({ centerClient, onBack }: ChineseChessCenterViewProps) {
    const [centerState, setCenterState] = useState(centerClient.getState());
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState<MatchSettings>(DEFAULT_SETTINGS);

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

    const handleAutoMatch = () => {
        setShowSettings(false);
        centerClient.quickStart(settings);
    };

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

                    <div className="flex items-center gap-4">
                        {/* 自动匹配按钮 */}
                        <button
                            onClick={() => setShowSettings(true)}
                            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                        >
                            <span>⚡</span> 自动匹配
                        </button>

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

            {/* 匹配设置弹窗 */}
            {showSettings && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">自动匹配设置</h2>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* 游戏底豆 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    游戏底豆: <span className="text-amber-600 font-bold">{settings.baseBet}</span>
                                </label>
                                <input
                                    type="range"
                                    min="100"
                                    max="100000"
                                    step="100"
                                    value={settings.baseBet}
                                    onChange={(e) => setSettings({ ...settings, baseBet: parseInt(e.target.value) })}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                                />
                                <div className="flex justify-between text-xs text-gray-400 mt-1">
                                    <span>100</span>
                                    <span>100,000</span>
                                </div>
                            </div>

                            {/* 可接受底豆范围 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    可接受底豆范围: <span className="text-amber-600 font-bold">{settings.betRange[0]} - {settings.betRange[1]}</span>
                                </label>
                                <div className="flex gap-4 items-center">
                                    <input
                                        type="number"
                                        min="100"
                                        max={settings.betRange[1]}
                                        value={settings.betRange[0]}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            betRange: [parseInt(e.target.value), settings.betRange[1]]
                                        })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                                    />
                                    <span className="text-gray-400">-</span>
                                    <input
                                        type="number"
                                        min={settings.betRange[0]}
                                        max="100000"
                                        value={settings.betRange[1]}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            betRange: [settings.betRange[0], parseInt(e.target.value)]
                                        })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* 对方胜率要求 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    对方胜率要求: <span className="text-amber-600 font-bold">{settings.winRateRange[0]}% - {settings.winRateRange[1]}%</span>
                                </label>
                                <div className="flex gap-4">
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={settings.winRateRange[0]}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            winRateRange: [parseInt(e.target.value), Math.max(parseInt(e.target.value), settings.winRateRange[1])]
                                        })}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                                    />
                                </div>
                            </div>

                            {/* 最大掉线率 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    最大掉线率: <span className="text-amber-600 font-bold">≤ {settings.maxDisconnectRate}%</span>
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={settings.maxDisconnectRate}
                                    onChange={(e) => setSettings({ ...settings, maxDisconnectRate: parseInt(e.target.value) })}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                                />
                            </div>
                        </div>

                        <div className="mt-8 flex gap-3">
                            <button
                                onClick={() => setShowSettings(false)}
                                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleAutoMatch}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
                            >
                                开始匹配
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
