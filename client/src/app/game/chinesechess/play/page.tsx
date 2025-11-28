'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import io from 'socket.io-client';
import ChessBoard from '../../../../components/ChineseChess/ChessBoard';
import { ChineseChessClient } from '../../../../components/ChineseChess/ChineseChessClient';
import { useRoomList } from '@/gamecore/useRoomList';
import { GameRoomList } from '@/components/GameTemplates/GameRoomList';
import { GamePlayLayout } from '@/components/GameTemplates/GamePlayLayout';

export default function ChineseChessPlay() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tier = searchParams.get('tier') || 'free';

    const [status, setStatus] = useState<'connecting' | 'lobby' | 'matching' | 'playing'>('connecting');
    const [gameClient, setGameClient] = useState<ChineseChessClient | null>(null);
    const [gameState, setGameState] = useState<any>(null);
    const [socket, setSocket] = useState<any>(null);

    // 使用双通道获取房间列表
    const rooms = useRoomList(socket, 'chinesechess', tier, {
        enableHttp: true,
        enableSocket: true,
        pollInterval: 5000
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/');
            return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        console.log('Connecting to game server:', apiUrl);

        const newSocket = io(apiUrl, {
            auth: { token },
            transports: ['polling', 'websocket'],
            reconnection: true
        });

        newSocket.on('connect', () => {
            console.log('[Socket] Connected');
            const client = new ChineseChessClient(newSocket);

            client.init((state) => {
                setGameState(state);
                if (state.status === 'playing') {
                    setStatus('playing');
                } else if (state.status === 'ended') {
                    // 保持在 playing 视图以显示结算
                }
            });

            // 通知服务端准备就绪
            // 注意：BaseGameManager 不需要 start_game，它通过 join 事件驱动
            // 但为了兼容旧逻辑，我们可以保留或移除
            // newSocket.emit('start_game', 'chinesechess');

            setGameClient(client);
            setSocket(newSocket);
            setStatus('lobby');
        });

        newSocket.on('connect_error', (err: any) => {
            console.error('Socket error:', err);
            if (err.message.includes('Authentication error')) {
                router.push('/');
            }
        });

        return () => {
            if (gameClient) {
                gameClient.leave();
                gameClient.dispose();
            }
            newSocket.disconnect();
        };
    }, [router]);

    const handleJoinRoom = (roomId: string) => {
        if (!gameClient) return;
        setStatus('matching');
        gameClient.joinRoom(tier, roomId);
    };

    const handleQuickStart = () => {
        if (!gameClient) return;
        setStatus('matching');
        gameClient.joinTier(tier);
    };

    const handleLeave = () => {
        if (gameClient) {
            gameClient.leave();
        }
        router.push('/game/chinesechess');
    };

    const handleMove = (fromX: number, fromY: number, toX: number, toY: number) => {
        if (gameClient) {
            gameClient.makeMove(fromX, fromY, toX, toY);
        }
    };

    if (status === 'connecting') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100">
                <div className="text-2xl font-bold text-amber-900 animate-pulse">连接服务器中...</div>
            </div>
        );
    }

    if (status === 'lobby') {
        return (
            <GameRoomList
                gameName="中国象棋"
                tier={tier}
                rooms={rooms}
                onJoinRoom={handleJoinRoom}
                onQuickStart={handleQuickStart}
                onLeave={handleLeave}
            />
        );
    }

    if (status === 'matching') {
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
        <GamePlayLayout
            gameName="中国象棋"
            gameState={gameState}
            onLeave={handleLeave}
            onRestart={() => window.location.reload()}
        >
            {gameState && gameState.board && (
                <ChessBoard
                    board={gameState.board}
                    turn={gameState.turn}
                    mySide={gameState.mySide}
                    onMove={handleMove}
                />
            )}
        </GamePlayLayout>
    );
}
