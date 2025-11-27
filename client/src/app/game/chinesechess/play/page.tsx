'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import io from 'socket.io-client';
import ChessBoard from '../../../../components/ChineseChess/ChessBoard';
import { ChineseChessClient } from '../../../../components/ChineseChess/ChineseChessClient';

export default function ChineseChessPlay() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tier = searchParams.get('tier') || 'free';

    const [status, setStatus] = useState<'connecting' | 'lobby' | 'matching' | 'playing'>('connecting');
    const [gameClient, setGameClient] = useState<ChineseChessClient | null>(null);
    const [gameState, setGameState] = useState<any>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/');
            return;
        }

        const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
            auth: { token }
        });

        socket.on('connect', () => {
            console.log('Connected to Game Server');
            const client = new ChineseChessClient(socket);
            client.init((state) => {
                setGameState(state);
                if (state.status === 'playing') {
                    setStatus('playing');
                }
            });

            // Notify server we are in this game mode, but don't join a room yet
            socket.emit('start_game', 'chinesechess');

            setGameClient(client);
            setStatus('lobby');
        });

        return () => {
            socket.disconnect();
        };
    }, [router]);

    const handleFindMatch = () => {
        if (!gameClient) return;
        setStatus('matching');
        // Auto-match in the selected tier
        gameClient.joinTier(tier);
    };

    const handleMove = (fromX: number, fromY: number, toX: number, toY: number) => {
        if (gameClient) {
            gameClient.makeMove(fromX, fromY, toX, toY);
        }
    };

    if (status === 'connecting') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100">
                <div className="text-3xl font-bold text-amber-900 mb-4 animate-bounce">🔍 寻找对手中...</div>
                <p className="text-gray-600">请稍候，正在为您匹配旗鼓相当的对手</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-8 px-6 py-2 text-gray-500 hover:text-gray-700 underline"
                >
                    取消
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100 p-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-4 mb-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-amber-900">🏮 中国象棋</h1>
                    <button
                        onClick={() => router.push('/game/chinesechess')}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all"
                    >
                        退出
                    </button>
                </div>

                {/* Game Board */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6">
                    {gameState && gameState.status === 'playing' && gameState.board && (
                        <ChessBoard
                            board={gameState.board}
                            turn={gameState.turn}
                            mySide={gameState.mySide}
                            onMove={handleMove}
                        />
                    )}

                    {gameState && gameState.status === 'ended' && (
                        <div className="text-center py-10">
                            <div className="text-4xl font-bold text-amber-900 mb-6">
                                {gameState.winner === gameState.mySide ? '🎉 恭喜获胜!' : '😢 遗憾落败'}
                            </div>
                            {gameState.elo && (
                                <div className="text-xl text-gray-700 mb-8">
                                    等级分变化: <span className={gameState.elo.playerA?.delta > 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                                        {gameState.elo.playerA?.delta > 0 ? '+' : ''}{gameState.elo.playerA?.delta}
                                    </span>
                                </div>
                            )}
                            <button
                                onClick={() => window.location.reload()}
                                className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105"
                            >
                                再来一局
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
