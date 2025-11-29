'use client';

import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';

export default function GameList() {
    const router = useRouter();
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

    // Carousel State
    const [currentSlide, setCurrentSlide] = useState(0);
    const slides = [
        {
            id: 1,
            image: `${process.env.NEXT_PUBLIC_API_URL || ''}/images/banner_referral_v3.png`,
            title: 'Invite & Earn!',
            desc: 'Get 10% Commission!',
            color: 'from-amber-400 to-orange-500'
        },
        {
            id: 2,
            image: `${process.env.NEXT_PUBLIC_API_URL || ''}/images/banner_gomoku_v2.png`,
            title: 'Gomoku',
            desc: 'Coming Soon',
            color: 'from-blue-400 to-indigo-500'
        },
        {
            id: 3,
            image: `${process.env.NEXT_PUBLIC_API_URL || ''}/images/banner_chinese_chess_v2.png`,
            title: 'Xiangqi',
            desc: 'Coming Soon',
            color: 'from-red-400 to-rose-500'
        }
    ];

    useEffect(() => {
        const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');
        setSocket(newSocket);

        newSocket.on('connect', () => {
            newSocket.emit('join_lobby', { username: 'Guest' });
        });

        newSocket.on('lobby_update', (data: any) => {
            setLobbyData(data);
        });

        newSocket.on('lobby_feed', (feedItem: any) => {
            setLobbyFeed(prev => [feedItem, ...prev].slice(0, 20));
        });

        return () => {
            newSocket.disconnect();
        };
    }, [t]);

    // Carousel Auto-play
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [slides.length]);

    const handleMatchmaking = () => {
        if (socket) {
            setIsMatching(true);
            socket.emit('start_matchmaking', { minBeans: 1000, maxBeans: 5000 });
        }
    };

    return (
        <div className="page-container">
            {/* Header Carousel & Back Button */}
            <div className="relative mb-8 rounded-2xl overflow-hidden shadow-xl group">
                {/* Back Button */}
                <a
                    href="/"
                    className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all hover:scale-110"
                    title={t.back_home}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                </a>

                {/* Carousel Slides */}
                <div className="relative h-48 md:h-64 transition-all duration-500 ease-in-out">
                    {slides.map((slide, index) => (
                        <div
                            key={slide.id}
                            className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                                }`}
                        >
                            <div className={`w-full h-full bg-gradient-to-br ${slide.color} flex items-center justify-center relative overflow-hidden`}>
                                <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-10 -translate-y-10 blur-xl"></div>
                                <div className="absolute bottom-0 right-0 w-40 h-40 bg-black/10 rounded-full translate-x-10 translate-y-10 blur-xl"></div>

                                <div className="text-center text-white p-6 relative z-10">
                                    <h2 className="text-3xl md:text-4xl font-bold mb-2 drop-shadow-md">{slide.title}</h2>
                                    <p className="text-white/90 font-medium text-lg">{slide.desc}</p>
                                </div>

                                <img
                                    src={slide.image}
                                    alt={slide.title}
                                    className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay"
                                    onError={(e) => e.currentTarget.style.display = 'none'}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Carousel Indicators */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                    {slides.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentSlide(index)}
                            className={`w-2 h-2 rounded-full transition-all ${index === currentSlide ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/80'
                                }`}
                        />
                    ))}
                </div>
            </div>

            {/* Main Grid Layout */}
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
                                        <p className="text-amber-800 font-medium mb-1 text-mobile-base">{t.eco_pool_min_reserve}</p>
                                        <p className="text-mobile-lg font-bold text-green-900">{lobbyData.ecoPool.piReserve.toFixed(2)} / {lobbyData.ecoPool.minReserve.toFixed(2)}</p>
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


                    <div
                        className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-white/50 shadow-xl hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden group transform hover:-translate-y-1"
                        onClick={() => router.push('/game/chinesechess')}
                    >
                        <div className="absolute top-0 right-0 bg-gradient-to-bl from-red-500 to-rose-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl shadow-md z-10">
                            NEW
                        </div>
                        <div className="flex items-start gap-5">
                            <div className="w-20 h-20 bg-gradient-to-br from-red-200 to-rose-200 rounded-2xl flex items-center justify-center text-4xl shadow-inner group-hover:scale-110 transition-transform">
                                🏮
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-amber-900">中国象棋</h3>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="px-2.5 py-0.5 bg-red-100 text-red-800 text-xs font-bold rounded-full border border-red-200">
                                        Xiangqi
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-3 flex items-center gap-1">
                                    <span>🎯</span> 分级房间 | ELO排名
                                </p>
                            </div>
                        </div>
                        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                            <div className="text-sm text-gray-600">
                                免费室 · 初级 · 中级 · 高级
                            </div>
                            <button className="text-red-600 font-bold text-sm hover:underline">
                                进入 &rarr;
                            </button>
                        </div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-white/50 shadow-xl hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden group transform hover:-translate-y-1">
                        <div className="flex items-start gap-5">
                            <div className="w-20 h-20 bg-gray-200 rounded-2xl flex items-center justify-center text-4xl shadow-inner group-hover:scale-110 transition-transform">
                                🎲
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-gray-700">{t.lucky_dice}</h3>
                                <p className="text-sm text-gray-500 mt-3">{t.high_stakes}</p>
                            </div>
                        </div>
                        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                            <div className="text-sm text-gray-600">
                                Classic
                            </div>
                            <button className="text-gray-600 font-bold text-sm hover:underline">
                                Play &rarr;
                            </button>
                        </div>
                    </div>
                </div>
                {/* 左侧栏结束 (Left Column Ends Here) */}

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
                                            item.type === 'deposit' ? 'bg-green-100 text-green-600' :
                                                item.type === 'withdraw' ? 'bg-red-100 text-red-600' :
                                                    item.type === 'win' ? 'bg-green-100 text-green-600' :
                                                        'bg-amber-100 text-amber-600'}`}>
                                        {item.type === 'join' ? '👋' : item.type === 'deposit' ? '💰' : item.type === 'withdraw' ? '🏧' : item.type === 'win' ? '🏆' : '🎰'}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-800">
                                            <span className="font-bold text-amber-900">{item.user}</span>
                                            {' '}
                                            {item.type === 'join' && <span className="text-gray-500">{t.feed_joined}</span>}
                                            {item.type === 'deposit' && <span className="text-gray-500">{t.feed_deposit}: {item.amount} Pi</span>}
                                            {item.type === 'withdraw' && <span className="text-gray-500">{t.feed_withdraw}: {item.amount} Pi</span>}
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
                {/* 右侧栏结束 (Right Column Ends Here) */}

            </div>
            {/* Grid 结束 (End of Grid) */}

            {/* Page Container 结束 (End of Page Container) */}
        </div>
    );
}
