'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import io from 'socket.io-client';
import ChessBoard from '../../../components/ChineseChess/ChessBoard';
import { ChineseChessClient } from '../../../components/ChineseChess/ChineseChessClient';

export default function ChineseChessPlay() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tier = searchParams.get('tier') || 'free';

    const [gameClient, setGameClient] = useState<ChineseChessClient | null>(null);
    const [gameState, setGameState] = useState<any>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/');
            return;
        }

        const socket = io('http://localhost:5000', {
            auth: { token }
        });

        socket.on('connect', () => {
            const client = new ChineseChessClient(socket);
            client.init((state) => {
                setGameState(state);
            });
            client.joinTier(tier);
            setGameClient(client);
        });

        return () => {
            socket.disconnect();
        };
    }, [tier, router]);

    const handleMove = (fromX: number, fromY: number, toX: number, toY: number) => {
        if (gameClient) {
            gameClient.makeMove(fromX, fromY, toX, toY);
        }
    };

    if (!gameState) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100">
                <div className="text-2xl font-bold text-amber-900">等待对手...</div>
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
                    {gameState.status === 'waiting' && (
                        <div className="text-center text-xl font-bold text-amber-900 mb-4">
                            等待对手加入...
                        </div>
                    )}

                    {gameState.status === 'playing' && gameState.board && (
                        <ChessBoard
                            board={gameState.board}
                            turn={gameState.turn}
                            mySide={gameState.mySide}
                            onMove={handleMove}
                        />
                    )}

                    {gameState.status === 'ended' && (
                        <div className="text-center">
                            <div className="text-3xl font-bold text-amber-900 mb-4">
                                {gameState.winner === gameState.mySide ? '🎉 你赢了!' : '😢 你输了'}
                            </div>
                            {gameState.elo && (
                                <div className="text-lg text-gray-700">
                                    等级分变化: {gameState.elo.playerA?.delta > 0 ? '+' : ''}{gameState.elo.playerA?.delta}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
