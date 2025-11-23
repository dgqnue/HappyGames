'use client';

import { useState, useEffect } from 'react';

interface Player {
    userId: string;
    username: string;
    ready: boolean;
    socketId: string;
}

interface TableProps {
    socket: any;
    roomId: string;
    tableId: string;
}

export default function GameTable({ socket, roomId, tableId }: TableProps) {
    const [tableState, setTableState] = useState<any>(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (!socket) return;

        socket.emit('join_table', { roomId, tableId });

        socket.on('table_update', (data: any) => {
            setTableState(data);
        });

        return () => {
            socket.off('table_update');
        };
    }, [socket, roomId, tableId]);

    const handleReady = () => {
        socket.emit('player_ready', { roomId, tableId });
        setIsReady(true);
    };

    if (!tableState) return <div>Loading table...</div>;

    return (
        <div className="flex flex-col items-center justify-center min-h-[600px] bg-green-800 rounded-3xl p-8 relative overflow-hidden">
            {/* Table Surface */}
            <div className="w-full max-w-4xl aspect-video bg-green-700 rounded-[100px] border-8 border-amber-900 relative shadow-2xl flex items-center justify-center">

                {/* Center Info */}
                <div className="text-center text-white/50">
                    <p className="text-2xl font-bold">Base: {tableState.baseBeans}</p>
                    <p>{tableState.status === 'waiting' ? 'Waiting for players...' : 'Game in progress'}</p>
                </div>

                {/* Players */}
                {tableState.players.map((player: Player, index: number) => (
                    <div
                        key={player.socketId}
                        className={`absolute w-24 h-24 bg-white rounded-full flex flex-col items-center justify-center shadow-lg
              ${index === 0 ? 'bottom-4' : ''}
              ${index === 1 ? 'left-4 top-1/2 -translate-y-1/2' : ''}
              ${index === 2 ? 'top-4' : ''}
              ${index === 3 ? 'right-4 top-1/2 -translate-y-1/2' : ''}
            `}
                    >
                        <div className="w-16 h-16 bg-gray-200 rounded-full mb-1 overflow-hidden">
                            {/* Avatar placeholder */}
                            <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500"></div>
                        </div>
                        <span className="text-xs font-bold truncate w-20 text-center">{player.username}</span>
                        {player.ready && <span className="absolute -top-2 right-0 bg-green-500 text-white text-xs px-1 rounded">Ready</span>}
                    </div>
                ))}
            </div>

            {/* Controls */}
            <div className="mt-8 flex gap-4">
                {!isReady && (
                    <button
                        onClick={handleReady}
                        className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-amber-900 font-bold rounded-full shadow-lg transform transition hover:scale-105"
                    >
                        READY
                    </button>
                )}
                <button className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-full shadow-lg">
                    LEAVE
                </button>
            </div>
        </div>
    );
}
