'use client';

import { useEffect, useRef, useState } from 'react';
import { GameMatchClient } from './GameMatchClient';

interface GameMatchViewProps {
    matchClient: any; // 使用 any 以支持不同游戏的 MatchClient
    onBack: () => void;
}

/**
 * 通用游戏对局视图
 * 
 * 注意：这个组件目前包含中国象棋特定的实现
 * 未来需要重构为更通用的结构，或者为每个游戏创建独立的 MatchView
 */
export function GameMatchView({ matchClient, onBack }: GameMatchViewProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [selected, setSelected] = useState<{ x: number; y: number } | null>(null);
    const [, forceUpdate] = useState({});

    // 订阅状态变化
    useEffect(() => {
        if (typeof matchClient.onStateChange === 'function') {
            const unsubscribe = matchClient.onStateChange(() => {
                forceUpdate({});
            });

            return () => {
                unsubscribe();
            };
        }
    }, [matchClient]);

    // 绘制棋盘
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (typeof matchClient.getBoard === 'function' && typeof matchClient.drawBoardToCanvas === 'function') {
            const board = matchClient.getBoard();
            matchClient.drawBoardToCanvas(ctx, board, selected);
        }
    }, [matchClient, selected]);

    // 处理点击
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        if (typeof matchClient.clickToGridPosition !== 'function') return;

        const pos = matchClient.clickToGridPosition(clickX, clickY);
        if (!pos) return;

        const turn = matchClient.getTurn?.();
        const mySide = matchClient.getMySide?.();

        // 检查是否轮到我
        if (turn !== mySide) {
            console.log('Not your turn');
            return;
        }

        // 如果没有选中棋子，尝试选中
        if (!selected) {
            if (matchClient.canSelectPiece?.(pos.x, pos.y)) {
                setSelected(pos);
            }
        } else {
            // 如果已经选中，尝试移动
            matchClient.sendMove?.(selected.x, selected.y, pos.x, pos.y);
            setSelected(null);
        }
    };

    const state = matchClient.getState();

    return (
        <main className="min-h-screen bg-amber-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
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
                        <h1 className="text-2xl font-bold text-amber-900">游戏对局</h1>
                    </div>

                    {/* 回合指示 */}
                    {state.turn && (
                        <div className="bg-white px-6 py-3 rounded-xl shadow-sm border border-amber-100">
                            <div className="text-sm text-gray-500">当前回合</div>
                            <div className="font-bold text-lg">
                                {state.turn === 'r' ? '🔴 红方' : state.turn === 'b' ? '⚫ 黑方' : state.turn}
                            </div>
                        </div>
                    )}
                </div>

                {/* 游戏区域 */}
                <div className="bg-white rounded-2xl p-8 shadow-lg">
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* 棋盘 */}
                        <div className="flex-1 flex justify-center">
                            <canvas
                                ref={canvasRef}
                                width={matchClient.BOARD_WIDTH || 600}
                                height={matchClient.BOARD_HEIGHT || 600}
                                onClick={handleCanvasClick}
                                className="border-2 border-amber-200 rounded-lg cursor-pointer"
                            />
                        </div>

                        {/* 侧边栏 */}
                        <div className="lg:w-64 space-y-4">
                            {/* 玩家信息 */}
                            {state.players?.r && (
                                <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-bold">
                                            红
                                        </div>
                                        <span className="font-medium">{state.players.r || '等待中...'}</span>
                                    </div>
                                    {state.mySide === 'r' && (
                                        <div className="text-xs text-red-600 font-medium">你的阵营</div>
                                    )}
                                </div>
                            )}

                            {state.players?.b && (
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold">
                                            黑
                                        </div>
                                        <span className="font-medium">{state.players.b || '等待中...'}</span>
                                    </div>
                                    {state.mySide === 'b' && (
                                        <div className="text-xs text-gray-600 font-medium">你的阵营</div>
                                    )}
                                </div>
                            )}

                            {/* 游戏状态 */}
                            {state.winner && (
                                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-center">
                                    <div className="text-2xl mb-2">🏆</div>
                                    <div className="font-bold text-amber-900">
                                        {state.winner === 'r' ? '红方' : state.winner === 'b' ? '黑方' : state.winner} 获胜！
                                    </div>
                                </div>
                            )}

                            {/* 提示 */}
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                                <div className="text-sm text-blue-800">
                                    <div className="font-medium mb-1">操作提示：</div>
                                    <ul className="text-xs space-y-1">
                                        <li>• 点击选中己方棋子</li>
                                        <li>• 再次点击目标位置移动</li>
                                        <li>• 轮到你时才能移动</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
