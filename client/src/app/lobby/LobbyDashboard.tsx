/**
 * 大厅仪表板组件 (LobbyDashboard)
 * 
 * 这是游戏大厅的主要内容组件，包含以下功能：
 * 1. 轮播横幅 - 显示推广信息、新游戏预告等
 * 2. 统计面板 - 显示总豆子数、生态池储备、官方钱包地址
 * 3. 游戏列表 - 展示所有可玩的游戏（中国象棋、幸运骰子等）
 * 4. 大厅动态 - 实时显示玩家活动（加入、充值、提现、获胜等）
 * 
 * 布局结构：
 * - 顶部：轮播横幅 + 返回首页按钮
 * - 左侧（2/3宽度）：统计面板 + 游戏列表
 * - 右侧（1/3宽度）：大厅动态Feed
 */

'use client';

import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';

/**
 * 大厅仪表板主组件
 */
export default function LobbyDashboard() {
    const router = useRouter();

    // ========== 状态管理 ==========

    /** Socket.io 连接实例 */
    const [socket, setSocket] = useState<any>(null);

    /** 大厅数据（统计信息、生态池等） */
    const [lobbyData, setLobbyData] = useState<any>(null);

    /** 大厅动态Feed（玩家活动记录） */
    const [lobbyFeed, setLobbyFeed] = useState<any[]>([
        { id: 1, type: 'join', user: 'CryptoKing', time: 'Just now' },
        { id: 2, type: 'win', user: 'PiMaster99', amount: 500, time: '2m ago' },
        { id: 3, type: 'join', user: 'Alice_Wonder', time: '5m ago' },
        { id: 4, type: 'jackpot', user: 'LuckyStar', amount: 10000, time: '10m ago' },
    ]);

    /** 是否正在匹配中 */
    const [isMatching, setIsMatching] = useState(false);

    /** 国际化翻译函数 */
    const { t } = useLanguage();

    // ========== 轮播横幅配置 ==========

    /** 当前显示的幻灯片索引 */
    const [currentSlide, setCurrentSlide] = useState(0);

    /** 轮播幻灯片数据 */
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

    // ========== Socket.io 连接和事件监听 ==========

    useEffect(() => {
        // 创建 Socket.io 连接
        const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
            auth: {
                token: localStorage.getItem('token')
            }
        });
        setSocket(newSocket);

        // 连接成功后加入大厅
        newSocket.on('connect', () => {
            newSocket.emit('join_lobby', { username: 'Guest' });
        });

        // 监听大厅数据更新（统计信息等）
        newSocket.on('lobby_update', (data: any) => {
            setLobbyData(data);
        });

        // 监听大厅动态Feed（新的活动记录）
        newSocket.on('lobby_feed', (feedItem: any) => {
            // 添加新记录到Feed顶部，保留最新20条
            setLobbyFeed(prev => [feedItem, ...prev].slice(0, 20));
        });

        // 组件卸载时断开连接
        return () => {
            newSocket.disconnect();
        };
    }, [t]);

    // ========== 轮播自动播放 ==========

    useEffect(() => {
        // 每5秒自动切换到下一张幻灯片
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 5000);

        return () => clearInterval(timer);
    }, [slides.length]);

    // ========== 事件处理函数 ==========

    /**
     * 处理开始匹配
     * （目前未使用，保留用于未来的快速匹配功能）
     */
    const handleMatchmaking = () => {
        if (socket) {
            setIsMatching(true);
            socket.emit('start_matchmaking', { minBeans: 1000, maxBeans: 5000 });
        }
    };

    // ========== 渲染 ==========

    return (
        <>
            {/* ==================== 顶部：轮播横幅 ==================== */}
            <div className="relative mb-8 rounded-2xl overflow-hidden shadow-xl group">

                {/* 返回首页按钮 */}
                <a
                    href="/"
                    className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all hover:scale-110"
                    title={t.back_home}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                </a>

                {/* 轮播幻灯片容器 */}
                <div className="relative h-48 md:h-64 transition-all duration-500 ease-in-out">
                    {slides.map((slide, index) => (
                        <div
                            key={slide.id}
                            className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                                }`}
                        >
                            {/* 纯图片展示 */}
                            <div className="w-full h-full relative">
                                <img
                                    src={slide.image}
                                    alt={slide.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => e.currentTarget.style.display = 'none'}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* 轮播指示器（小圆点） */}
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

            {/* ==================== 主网格布局 ==================== */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* ==================== 左侧栏：统计 + 游戏列表（2/3宽度）==================== */}
                <div className="lg:col-span-2 space-y-8">

                    {/* ---------- 统计面板 ---------- */}
                    <div className="bg-gradient-to-br from-amber-100 to-orange-50 backdrop-blur-md rounded-2xl border border-amber-200 shadow-lg p-3 md:p-6 relative overflow-hidden">

                        {lobbyData ? (
                            <>
                                {/* 统计数据网格 */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 relative z-10">

                                    {/* 总豆子数 */}
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center text-3xl">
                                            💰
                                        </div>
                                        <div>
                                            <p className="text-amber-800 font-medium mb-1 text-mobile-base">{t.total_beans}</p>
                                            <p className="text-mobile-lg font-bold text-amber-900">{lobbyData.ecoPool.totalBeans.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    {/* 生态池储备 */}
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

                                {/* 官方钱包地址区域 */}
                                <div className="mt-6 pt-4 border-t border-amber-200/50">
                                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-3">

                                        {/* 钱包地址显示 */}
                                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 text-sm text-amber-800/80 w-full">
                                            <span className="font-bold whitespace-nowrap">🏦 {t.official_wallet}:</span>
                                            <span className="font-mono bg-white/50 px-2 py-1 rounded border border-amber-100 text-xs md:text-sm break-all">
                                                {lobbyData.ecoPool.officialWallet}
                                            </span>
                                        </div>

                                        {/* 复制按钮 */}
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

                                    {/* 区块链浏览器链接 */}
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
                            </>
                        ) : (
                            <>
                                {/* 骨架屏 - 加载状态 */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 relative z-10 animate-pulse">
                                    {/* 总豆子数骨架 */}
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-amber-500/20 rounded-full"></div>
                                        <div className="flex-1">
                                            <div className="h-4 bg-amber-300/30 rounded w-24 mb-2"></div>
                                            <div className="h-6 bg-amber-400/30 rounded w-32"></div>
                                        </div>
                                    </div>

                                    {/* 生态池储备骨架 */}
                                    <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-amber-200 pt-4 md:pt-0 md:pl-8">
                                        <div className="w-16 h-16 bg-green-500/20 rounded-full"></div>
                                        <div className="flex-1">
                                            <div className="h-4 bg-amber-300/30 rounded w-28 mb-2"></div>
                                            <div className="h-6 bg-green-400/30 rounded w-36"></div>
                                        </div>
                                    </div>
                                </div>

                                {/* 钱包地址骨架 */}
                                <div className="mt-6 pt-4 border-t border-amber-200/50 animate-pulse">
                                    <div className="h-4 bg-amber-300/30 rounded w-full mb-2"></div>
                                    <div className="h-4 bg-amber-300/30 rounded w-3/4"></div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* ---------- 游戏列表 ---------- */}

                    {/* 中国象棋游戏卡片 */}
                    <div
                        className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-white/50 shadow-xl hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden group transform hover:-translate-y-1"
                        onClick={() => router.push('/game/chinesechess')}
                    >
                        {/* NEW 标签 */}
                        <div className="absolute top-0 right-0 bg-gradient-to-bl from-red-500 to-rose-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl shadow-md z-10">
                            NEW
                        </div>

                        {/* 游戏信息 */}
                        <div className="flex items-start gap-5">
                            {/* 游戏图标 */}
                            <div className="w-20 h-20 bg-gradient-to-br from-red-200 to-rose-200 rounded-2xl flex items-center justify-center text-4xl shadow-inner group-hover:scale-110 transition-transform">
                                🏮
                            </div>

                            {/* 游戏详情 */}
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

                        {/* 底部信息栏 */}
                        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                            <div className="text-sm text-gray-600">
                                免费室 · 初级 · 中级 · 高级
                            </div>
                            <button className="text-red-600 font-bold text-sm hover:underline">
                                进入 &rarr;
                            </button>
                        </div>
                    </div>

                    {/* 幸运骰子游戏卡片（即将推出） */}
                    <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-white/50 shadow-xl hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden group transform hover:-translate-y-1">
                        <div className="flex items-start gap-5">
                            {/* 游戏图标 */}
                            <div className="w-20 h-20 bg-gray-200 rounded-2xl flex items-center justify-center text-4xl shadow-inner group-hover:scale-110 transition-transform">
                                🎲
                            </div>

                            {/* 游戏详情 */}
                            <div>
                                <h3 className="text-2xl font-bold text-gray-700">{t.lucky_dice}</h3>
                                <p className="text-sm text-gray-500 mt-3">{t.high_stakes}</p>
                            </div>
                        </div>

                        {/* 底部信息栏 */}
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
                {/* 左侧栏结束 */}

                {/* ==================== 右侧栏：大厅动态Feed（1/3宽度）==================== */}
                <div className="lg:col-span-1">
                    <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-white/50 sticky top-6">

                        {/* Feed 标题 */}
                        <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-6 text-lg border-b border-gray-100 pb-4">
                            📢 {t.lobby_feed}
                        </h3>

                        {/* Feed 列表 */}
                        <div className="space-y-4">
                            {lobbyFeed.map((item) => (
                                <div key={item.id} className="flex items-start gap-3 p-3 bg-white/50 rounded-xl border border-white/60 shadow-sm hover:bg-white/80 transition-colors">

                                    {/* 活动类型图标 */}
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm
                                        ${item.type === 'join' ? 'bg-blue-100 text-blue-600' :
                                            item.type === 'deposit' ? 'bg-green-100 text-green-600' :
                                                item.type === 'withdraw' ? 'bg-red-100 text-red-600' :
                                                    item.type === 'win' ? 'bg-green-100 text-green-600' :
                                                        'bg-amber-100 text-amber-600'}`}>
                                        {item.type === 'join' ? '👋' :
                                            item.type === 'deposit' ? '💰' :
                                                item.type === 'withdraw' ? '🏧' :
                                                    item.type === 'win' ? '🏆' : '🎰'}
                                    </div>

                                    {/* 活动详情 */}
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

                        {/* Feed 底部说明 */}
                        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                            <p className="text-xs text-gray-400 italic">
                                {t.recent_activity}
                            </p>
                        </div>
                    </div>
                </div>
                {/* 右侧栏结束 */}

            </div>
            {/* 网格布局结束 */}
        </>
    );
}
