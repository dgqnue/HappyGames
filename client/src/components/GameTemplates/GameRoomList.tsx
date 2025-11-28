import React from 'react';

interface Room {
    id: string;
    status: 'waiting' | 'playing' | 'ended';
    players: number;
    spectators: number;
}

interface GameRoomListProps {
    gameName: string;
    tier: string;
    rooms: Room[];
    onJoinRoom: (roomId: string) => void;
    onQuickStart: () => void;
    onLeave: () => void;
}

export const GameRoomList: React.FC<GameRoomListProps> = ({
    gameName,
    tier,
    rooms,
    onJoinRoom,
    onQuickStart,
    onLeave
}) => {
    const getTierName = (tierId: string) => {
        switch (tierId) {
            case 'free': return '免费室';
            case 'beginner': return '初级室';
            case 'intermediate': return '中级室';
            case 'advanced': return '高级室';
            default: return tierId;
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100 p-4">
            <div className="w-full max-w-4xl mt-8">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-amber-900">🏮 {gameName} - {getTierName(tier)}</h1>
                        <p className="text-gray-600">选择一个空闲桌子加入，或点击快速开始</p>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={onQuickStart}
                            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg transform transition hover:scale-105"
                        >
                            ⚡ 快速开始
                        </button>
                        <button
                            onClick={onLeave}
                            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-all"
                        >
                            返回游戏中心
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rooms.map((room) => (
                        <div key={room.id} className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-amber-100 shadow-md hover:shadow-lg transition-all">
                            <div className="flex justify-between items-center mb-3">
                                <span className="font-bold text-amber-900">游戏桌: {room.id.split('_').pop()}</span>
                                <span className={`px-2 py-1 rounded text-xs font-bold ${room.status === 'waiting' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {room.status === 'waiting' ? '等待中' : '游戏中'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
                                <span>人数: {room.players}/2</span>
                                <span>观众: {room.spectators}</span>
                            </div>
                            <button
                                onClick={() => onJoinRoom(room.id)}
                                disabled={room.status !== 'waiting' || room.players >= 2}
                                className={`w-full py-2 rounded-lg font-bold transition-all ${room.status === 'waiting' && room.players < 2
                                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                {room.status === 'waiting' && room.players < 2 ? '入座' : '已满员'}
                            </button>
                        </div>
                    ))}
                    {rooms.length === 0 && (
                        <div className="col-span-full text-center py-10 text-gray-500">
                            暂无游戏桌，点击"快速开始"创建一个
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
