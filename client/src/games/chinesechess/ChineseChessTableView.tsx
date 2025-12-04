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

    useEffect(() => {
        // 订阅状态更新
        tableClient.init((state) => {
            setTableState(state);
        });

        // 获取初始状态
        setTableState(tableClient.getState());
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

    return (
        <main className="min-h-screen bg-amber-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
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
                        游戏桌 {tableState.tableId || ''}
                    </h1>
                </div>

                {/* 游戏桌内容 */}
                <div className="bg-white rounded-2xl p-8 shadow-lg">
                    <div className="max-w-2xl mx-auto">
                        <div className="text-center mb-8">
                            <div className="text-6xl mb-4">♟️</div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">中国象棋对战</h2>
                            <p className="text-gray-500">
                                {tableState.players?.length === 2 ? '准备开始...' : '等待玩家加入...'}
                            </p>
                        </div>

                        {/* 玩家列表 */}
                        <div className="space-y-4 mb-8">
                            {tableState.players && tableState.players.length > 0 ? (
                                tableState.players.map((player, index) => (
                                    <div
                                        key={player.socketId}
                                        className={`flex items-center justify-between p-4 rounded-xl border-2 ${index === 0
                                                ? 'bg-red-50 border-red-200'
                                                : 'bg-gray-50 border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${index === 0 ? 'bg-red-500' : 'bg-gray-700'
                                                    } text-white font-bold`}
                                            >
                                                {index === 0 ? '红' : '黑'}
                                            </div>
                                            <div>
                                                <div className="font-medium">
                                                    {player.nickname || player.userId}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {index === 0 ? '红方' : '黑方'}
                                                </div>
                                            </div>
                                        </div>
                                        {player.ready ? (
                                            <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                已准备
                                            </div>
                                        ) : (
                                            <div className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                                                未准备
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-400">
                                    <p>暂无玩家，等待加入...</p>
                                </div>
                            )}
                        </div>

                        {/* 准备按钮 */}
                        <div className="text-center">
                            <button
                                onClick={() => tableClient.setReady(!isReady)}
                                className={`px-8 py-3 rounded-xl font-medium transition-colors ${isReady
                                        ? 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                                        : 'bg-amber-500 text-white hover:bg-amber-600'
                                    }`}
                            >
                                {isReady ? '取消准备' : '准备'}
                            </button>
                        </div>

                        {/* 提示信息 */}
                        {tableState.canStart && (
                            <div className="mt-6 text-center">
                                <div className="inline-block px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
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
