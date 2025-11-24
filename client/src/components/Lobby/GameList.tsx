'use client';

import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useLanguage } from '@/lib/i18n';


export default function GameList() {
    const [socket, setSocket] = useState<any>(null);
    const [lobbyData, setLobbyData] = useState<any>(null);
    const [lobbyFeed, setLobbyFeed] = useState<any[]>([
        { id: 1, type: 'join', user: 'CryptoKing', time: 'Just now' },
        { id: 2, type: 'win', user: 'PiMaster99', amount: 500, time: '2m ago' },
        { id: 3, type: 'join', user: 'Alice_Wonder', time: '5m ago' },
        { id: 4, type: 'jackpot', user: 'LuckyStar', amount: 10000, time: '10m ago' },
    ]);
    const [isMatching, setIsMatching] = useState(false);
    const { t } = useLanguage();

    useEffect(() => {
        const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');
        setSocket(newSocket);

        newSocket.on('connect', () => {
            newSocket.emit('join_lobby');
        });

        newSocket.on('lobby_update', (data: any) => {
            setLobbyData(data);
        });

        newSocket.on('match_success', (data: any) => {
            console.log('Match found!', data);
            setIsMatching(false);
            // Redirect to game room
            // router.push(`/game/${data.roomId}/${data.tableId}`);
            alert(t.match_found + ' ' + t.joining);
        });

        return () => {
            newSocket.disconnect();
        };
    }, [t]);

    const handleMatchmaking = () => {
        if (socket) {
            setIsMatching(true);
            // Default criteria or empty since settings are now per-room
            socket.emit('start_matchmaking', { minBeans: 1000, maxBeans: 5000 });
        }
    };

    return (
        <div className="page-container">
            {/* Header Row */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-mobile-xl font-bold text-amber-900 flex items-center gap-3">
                        🎮 {t.lobby_title}
                    </h2>
                    <p className="text-amber-800/60 mt-1 font-medium text-mobile-base">{t.lobby_subtitle}</p>
                </div>
                <a
                    href="/"
                    className="w-full md:w-auto text-center px-6 py-2.5 bg-white/80 hover:bg-white text-amber-900 rounded-xl shadow-sm hover:shadow-md transition-all font-bold flex items-center justify-center gap-2 backdrop-blur-sm relative z-[9999] cursor-pointer"
                >
                    <span>🏠</span> {t.back_home}
                </a>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Stats & Games (2/3 width) */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Stats Row */}
                    {lobbyData && (
                        <div className="bg-gradient-to-br from-amber-100 to-orange-50 backdrop-blur-md rounded-2xl border border-amber-200 shadow-lg p-3 md:p-6 relative overflow-hidden">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center text-3xl">
                                        💰
                                    </div>
                                    <div>
                                        <p className="text-amber-800 font-medium mb-1 text-mobile-base">{t.total_beans}</p>
                                        <p className="text-mobile-lg font-bold text-amber-900">{lobbyData.ecoPool.totalBeans.toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-amber-200 pt-4 md:pt-0 md:pl-8">
                                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center text-3xl">
                                        🌱
                                    </div>
                                    <div>
                                        <p className="text-amber-800 font-medium mb-1 text-mobile-base">{t.eco_pool} (Pi)</p>
                                        <p className="text-mobile-lg font-bold text-green-900">{lobbyData.ecoPool.piReserve.toFixed(2)}</p>
                                        <p className="text-xs text-green-700 mt-1 font-medium bg-green-100 px-2 py-0.5 rounded-full inline-block">
                                            📉 {t.min_reserve}: {lobbyData.ecoPool.minReserve.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Official Wallet Address */}
                            <div className="mt-6 pt-4 border-t border-amber-200/50">
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-3">
                                    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 text-sm text-amber-800/80 w-full">
                                        <span className="font-bold whitespace-nowrap">🏦 {t.official_wallet}:</span>
                                        <span className="font-mono bg-white/50 px-2 py-1 rounded border border-amber-100 text-xs md:text-sm break-all">
                                            {lobbyData.ecoPool.officialWallet}
                                        </span>
                                    </div>
                                    <button
                                        className="w-full md:w-auto text-xs bg-amber-200 hover:bg-amber-300 text-amber-900 px-3 py-2 md:py-1 rounded-full font-bold transition-colors"
                                        onClick={() => {
                                            navigator.clipboard.writeText(lobbyData.ecoPool.officialWallet);
                                            alert(t.copied);
                                        }}
                                    >
                                        📋
                                    </button>
                                </div>

                                <div className="flex gap-4 text-lg">
                                    <a
                                        href={`https://minepi.com/blockexplorer/account/${lobbyData.ecoPool.officialWallet}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-amber-700 hover:text-amber-900 hover:scale-110 transition-transform"
                                        title={t.wallet_query}
                                    >
                                        🔍
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Game List */}
                    <div>
                        <h3 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
                            🔥 {t.available_games}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-white/50 shadow-xl hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden group transform hover:-translate-y-1">
                                <div className="absolute top-0 right-0 bg-gradient-to-bl from-amber-500 to-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl shadow-md z-10">
                                    {t.hot}
                                </div>
                                <div className="flex items-start gap-5">
                                    <div className="w-20 h-20 bg-gradient-to-br from-amber-200 to-orange-200 rounded-2xl flex items-center justify-center text-4xl shadow-inner group-hover:scale-110 transition-transform">
                                        🃏
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-amber-900">{t.game_poker}</h3>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-full border border-amber-200">
                                                {t.texas_holdem}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-3 flex items-center gap-1">
                                            <span>💰</span> {t.min_entry}: <span className="font-bold text-amber-700">1,000 {t.beans}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                                    <div className="flex -space-x-2">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs">👤</div>
                                        ))}
                                        <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs font-bold text-gray-500">+120</div>
                                    </div>
                                    <button
                                        onClick={handleMatchmaking}
                                        className="text-amber-600 font-bold text-sm hover:underline"
                                    >
                                        Join Now &rarr;
                                    </button>
                                </div>
                            </div>

                            {/* Coming Soon Card */}
                            <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-6 border border-white/30 shadow-sm relative overflow-hidden grayscale opacity-70">
                                <div className="absolute inset-0 flex items-center justify-center bg-black/5 z-10">
                                    <span className="bg-black/10 text-black/50 px-4 py-1 rounded-full text-sm font-bold backdrop-blur-md border border-white/20">{t.coming_soon}</span>
                                </div>
                                <div className="flex items-start gap-5">
                                    <div className="w-20 h-20 bg-gray-200 rounded-2xl flex items-center justify-center text-4xl shadow-inner">
                                        🎲
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-gray-700">{t.lucky_dice}</h3>
                                        <p className="text-sm text-gray-500 mt-3">{t.high_stakes}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Match Settings (1/3 width) */}
                <div className="lg:col-span-1">
                    <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-white/50 sticky top-6">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-6 text-lg border-b border-gray-100 pb-4">
                            📢 {t.lobby_feed}
                        </h3>

                        <div className="space-y-4">
                            {lobbyFeed.map((item) => (
                                <div key={item.id} className="flex items-start gap-3 p-3 bg-white/50 rounded-xl border border-white/60 shadow-sm hover:bg-white/80 transition-colors">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm
                                        ${item.type === 'join' ? 'bg-blue-100 text-blue-600' :
                                            item.type === 'win' ? 'bg-green-100 text-green-600' :
                                                'bg-amber-100 text-amber-600'}`}>
                                        {item.type === 'join' ? '👋' : item.type === 'win' ? '🏆' : '🎰'}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-800">
                                            <span className="font-bold text-amber-900">{item.user}</span>
                                            {' '}
                                            {item.type === 'join' && <span className="text-gray-500">{t.feed_joined}</span>}
                                            {item.type === 'win' && <span className="text-gray-500">{t.feed_win} <span className="font-bold text-green-600">{item.amount} Beans</span></span>}
                                            {item.type === 'jackpot' && <span className="font-bold text-amber-600">{t.feed_jackpot} <span className="text-amber-800">({item.amount})</span></span>}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">{item.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                            <p className="text-xs text-gray-400 italic">
                                {t.recent_activity}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
