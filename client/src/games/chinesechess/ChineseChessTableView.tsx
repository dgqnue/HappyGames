'use client';

import { useEffect, useState } from 'react';
import { ChineseChessTableClient } from './gamepagehierarchy/ChineseChessTableClient';
import { ChineseChessMatchView } from './ChineseChessMatchView';

interface ChineseChessTableViewProps {
    tableClient: ChineseChessTableClient;
    onBack: () => void;
}

export function ChineseChessTableView({ tableClient, onBack }: ChineseChessTableViewProps) {
    const [tableState, setTableState] = useState(tableClient.getState());
    const [countdown, setCountdown] = useState<number | null>(null);

    useEffect(() => {
        // 订阅状态更新
        tableClient.init((state) => {
            setTableState(state);
        });

        // 获取初始状态
        setTableState(tableClient.getState());

        // 监听倒计时事件
        const handleCountdown = (data: any) => {
            setCountdown(data.remaining);
        };

        // 这里需要从 socket 监听倒计时事件
        // tableClient.socket.on('ready_countdown', handleCountdown);

        return () => {
            // tableClient.socket.off('ready_countdown', handleCountdown);
        };
    }, [tableClient]);

    // 如果对局已开始，显示对局视图
    const matchClient = tableClient.getChessMatchClient();
    if (matchClient) {
        return (
            <ChineseChessMatchView
                matchClient={matchClient}
                onBack={() => {
                    // 离开对局，返回游戏桌
                    tableClient.leaveTable();
                    onBack();
                }}
            />
        );
    }

    // 检查当前用户是否已准备
    const isReady = tableState.isReady || false;
    const players = tableState.players || [];
    const maxPlayers = 2; // 中国象棋固定2人
    const isFull = players.length === maxPlayers;
    const allReady = players.length === maxPlayers && players.every((p: any) => p.ready);

    return (
        <main className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="p-2 bg-white rounded-full shadow-md hover:bg-amber-100 transition-colors"
                        >
                            <svg className="w-6 h-6 text-amber-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <h1 className="text-2xl font-bold text-amber-900">
                            游戏桌 {tableState.tableId || ''}
                        </h1>
                    </div>

                    {/* 倒计时提示 */}
                    {countdown !== null && countdown > 0 && (
                        <div className="bg-red-500 text-white px-6 py-3 rounded-xl font-bold text-lg animate-pulse">
                            ⏰ {countdown}秒
                        </div>
                    )}
                </div>

                {/* 游戏桌内容 */}
                <div className="bg-white rounded-2xl p-8 shadow-xl">
                    <div className="max-w-3xl mx-auto">
                        {/* 标题区域 */}
                        <div className="text-center mb-8">
                            <div className="text-7xl mb-4">♟️</div>
                            <h2 className="text-3xl font-bold text-gray-800 mb-2">中国象棋对战</h2>
                            <p className="text-gray-500 text-lg">
                                {isFull
                                    ? allReady
                                        ? '所有玩家已就绪，游戏即将开始...'
                                        : '等待所有玩家就绪...'
                                    : '等待玩家加入...'}
                            </p>
                        </div>

                        {/* 座位区域 */}
                        <div className="flex gap-8 justify-center items-center mb-8">
                            {/* 红方座位 */}
                            <PlayerSeat
                                player={players[0]}
                                side="red"
                                sideLabel="红方"
                                icon="🔴"
                            />

                            <div className="text-5xl text-gray-300 font-bold">VS</div>

                            {/* 黑方座位 */}
                            <PlayerSeat
                                player={players[1]}
                                side="black"
                                sideLabel="黑方"
                                icon="⚫"
                            />
                        </div>

                        {/* 准备状态提示 */}
                        {isFull && !allReady && countdown !== null && countdown > 0 && (
                            <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl text-center">
                                <p className="text-yellow-800 font-medium">
                                    ⚠️ 满座后所有玩家需在 <span className="font-bold text-red-600">{countdown}秒</span> 内点击"开始"按钮
                                </p>
                                <p className="text-yellow-700 text-sm mt-1">
                                    未点击的玩家将被强制下座
                                </p>
                            </div>
                        )}

                        {/* 准备按钮 */}
                        <div className="text-center space-y-4">
                            {players.length > 0 && (
                                <>
                                    <button
                                        onClick={() => tableClient.setReady(!isReady)}
                                        disabled={allReady}
                                        className={`px-12 py-4 rounded-xl font-bold text-lg transition-all ${allReady
                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                : isReady
                                                    ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg'
                                                    : 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg hover:shadow-xl'
                                            }`}
                                    >
                                        {allReady ? '✓ 所有玩家已就绪' : isReady ? '✓ 就绪' : '开始'}
                                    </button>

                                    {/* 状态说明 */}
                                    <div className="text-sm text-gray-500">
                                        {isReady
                                            ? '您已准备就绪，等待其他玩家...'
                                            : '点击"开始"按钮准备游戏'}
                                    </div>

                                    {/* 离座按钮 */}
                                    {!allReady && (
                                        <button
                                            onClick={() => {
                                                tableClient.leaveTable();
                                                onBack();
                                            }}
                                            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                                        >
                                            离座
                                        </button>
                                    )}
                                </>
                            )}
                        </div>

                        {/* 底豆信息 */}
                        {tableState.baseBet && (
                            <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                                <div className="text-sm text-gray-600 mb-1">本局底豆</div>
                                <div className="text-2xl font-bold text-amber-600">
                                    {tableState.baseBet} 豆
                                </div>
                            </div>
                        )}

                        {/* 提示信息 */}
                        {tableState.canStart && (
                            <div className="mt-6 text-center">
                                <div className="inline-block px-6 py-3 bg-green-50 border-2 border-green-300 rounded-xl text-green-700 font-medium">
                                    ✓ 所有玩家已准备，游戏即将开始...
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}

// 玩家座位组件
function PlayerSeat({ player, side, sideLabel, icon }: {
    player: any;
    side: 'red' | 'black';
    sideLabel: string;
    icon: string;
}) {
    const bgColor = side === 'red' ? 'bg-red-50' : 'bg-gray-50';
    const borderColor = side === 'red' ? 'border-red-200' : 'border-gray-300';
    const avatarBg = side === 'red' ? 'bg-red-500' : 'bg-gray-700';

    return (
        <div className={`flex flex-col items-center gap-4 p-6 ${bgColor} rounded-2xl border-2 ${borderColor} min-w-[240px] shadow-md`}>
            {/* 头像 */}
            <div className={`w-20 h-20 rounded-full ${avatarBg} flex items-center justify-center text-4xl shadow-lg`}>
                {player ? (
                    <span className="text-white font-bold">
                        {(player.nickname || player.userId || '?')[0].toUpperCase()}
                    </span>
                ) : (
                    icon
                )}
            </div>

            {/* 玩家信息 */}
            <div className="text-center w-full">
                <div className="font-bold text-lg mb-1">{sideLabel}</div>

                {player ? (
                    <>
                        {/* 昵称 */}
                        <div className="text-sm text-gray-700 font-medium mb-1 truncate">
                            {player.nickname || player.userId}
                        </div>

                        {/* 称号 */}
                        {player.title && (
                            <div
                                className="text-xs px-2 py-1 rounded-full mb-2 inline-block"
                                style={{
                                    backgroundColor: player.titleColor ? `${player.titleColor}20` : '#f0f0f0',
                                    color: player.titleColor || '#666'
                                }}
                            >
                                {player.title}
                            </div>
                        )}

                        {/* 统计信息 */}
                        <div className="flex justify-center gap-3 text-xs text-gray-500 mb-2">
                            {player.winRate !== undefined && (
                                <span>胜率 {player.winRate}%</span>
                            )}
                            {player.disconnectRate !== undefined && (
                                <span>掉线 {player.disconnectRate}%</span>
                            )}
                        </div>

                        {/* 准备状态 */}
                        {player.ready ? (
                            <div className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-bold">
                                ✓ 已就绪
                            </div>
                        ) : (
                            <div className="px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-sm">
                                等待中...
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-gray-400 text-sm py-2">
                        等待玩家入座
                    </div>
                )}
            </div>
        </div>
    );
}
