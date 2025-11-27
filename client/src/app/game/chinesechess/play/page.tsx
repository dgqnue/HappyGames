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
    const [socket, setSocket] = useState<any>(null);
    const [rooms, setRooms] = useState<any[]>([]);

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
            transports: ['polling', 'websocket'], // Allow polling as fallback
            reconnection: true,
            reconnectionAttempts: 20,
            reconnectionDelay: 2000,
            timeout: 20000
        });

        newSocket.on('connect', () => {
            console.log('[Socket] Connected to Game Server (ID:', newSocket.id, ')');
            const client = new ChineseChessClient(newSocket);
            client.init((state) => {
                setGameState(state);
                if (state.status === 'playing') {
                    setStatus('playing');
                }
            });

            newSocket.emit('start_game', 'chinesechess');

            setGameClient(client);
            setSocket(newSocket);
            setStatus('lobby');
        });

        newSocket.on('connect_error', (err) => {
            console.error('Socket connection error:', err.message);
            console.error('Socket error details:', err);
            if (err.message.includes('Authentication error') || err.message.includes('jwt')) {
                alert('登录已过期，请重新登录');
                localStorage.removeItem('token');
                router.push('/');
            }
        });

        return () => {
            // 主动离开房间
            if (gameClient) {
                gameClient.leave();
            }
            newSocket.disconnect();
        };
    }, [router]);

    useEffect(() => {
        if (status === 'lobby') {
            console.log('[Room List] Starting room fetch loop for tier:', tier);

            const fetchRoomsViaSocket = () => {
                if (socket && socket.connected) {
                    console.log('[Room List] Emitting get_rooms via Socket');
                    socket.emit('get_rooms', { tier });
                }
            };

            const fetchRoomsViaHttp = async () => {
                try {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
                    console.log('[Room List] Fetching via HTTP:', `${apiUrl}/api/games/chinesechess/rooms?tier=${tier}`);
                    const res = await fetch(`${apiUrl}/api/games/chinesechess/rooms?tier=${tier}`);
                    if (res.ok) {
                        const data = await res.json();
                        console.log('[Room List] Received via HTTP:', data);
                        if (Array.isArray(data)) {
                            setRooms(data);
                        }
                    } else {
                        console.warn('[Room List] HTTP fetch failed:', res.status);
                    }
                } catch (err) {
                    console.error('[Room List] HTTP fetch error:', err);
                }
            };

            // Initial fetch
            fetchRoomsViaHttp();
            fetchRoomsViaSocket();

            // Listen for room list from socket
            const handleRoomList = (roomList: any[]) => {
                console.log('[Room List] Received via Socket:', roomList);
                if (Array.isArray(roomList)) {
                    setRooms(roomList);
                }
            };

            if (socket) {
                socket.on('room_list', handleRoomList);
            }

            // Poll every 5 seconds (using both methods for redundancy)
            const interval = setInterval(() => {
                fetchRoomsViaHttp();
                fetchRoomsViaSocket();
            }, 5000);

            return () => {
                if (socket) {
                    socket.off('room_list', handleRoomList);
                }
                clearInterval(interval);
            };
        }
    }, [status, socket, tier]);

    const handleFindMatch = () => {
        if (!gameClient) return;
        setStatus('matching');
        gameClient.joinTier(tier);
    };

    const handleMove = (fromX: number, fromY: number, toX: number, toY: number) => {
        if (gameClient) {
            gameClient.makeMove(fromX, fromY, toX, toY);
        }
    };

    const handleJoinRoom = (roomId: string) => {
        if (!gameClient) return;
        setStatus('matching');
        gameClient.joinRoom(tier, roomId);
    };

    const handleLeaveRoom = () => {
        if (gameClient) {
            gameClient.leave();
        }
        router.push('/game/chinesechess');
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
            <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100 p-4">
                <div className="w-full max-w-4xl mt-8">
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6 flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-amber-900">🏮 {tier === 'free' ? '免费室' : tier === 'beginner' ? '初级室' : '高级室'}</h1>
                            <p className="text-gray-600">选择一个空闲桌子加入，或点击快速开始</p>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={handleFindMatch}
                                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg transform transition hover:scale-105"
                            >
                                ⚡ 快速开始
                            </button>
                            <button
                                onClick={handleLeaveRoom}
                                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-all"
                            >
                                退出房间
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {rooms.map((room) => (
                            <div key={room.id} className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-amber-100 shadow-md hover:shadow-lg transition-all">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="font-bold text-amber-900">桌号: {room.id.split('_').pop()}</span>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${room.status === 'waiting' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {room.status === 'waiting' ? '等待中' : '游戏中'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
                                    <span>人数: {room.players}/2</span>
                                    <span>观众: {room.spectators}</span>
                                </div>
                                <button
                                    onClick={() => handleJoinRoom(room.id)}
                                    disabled={room.status !== 'waiting' || room.players >= 2}
                                    className={`w-full py-2 rounded-lg font-bold transition-all ${room.status === 'waiting' && room.players < 2
                                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    {room.status === 'waiting' && room.players < 2 ? '加入游戏' : '已满员'}
                                </button>
                            </div>
                        ))}
                        {rooms.length === 0 && (
                            <div className="col-span-full text-center py-10 text-gray-500">
                                暂无房间，点击"快速开始"创建一个
                            </div>
                        )}
                    </div>
                </div>
            </div>
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
        <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100 p-4">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-4 mb-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-amber-900">🏮 中国象棋</h1>
                    <button
                        onClick={handleLeaveRoom}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all"
                    >
                        退出
                    </button>
                </div>

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
