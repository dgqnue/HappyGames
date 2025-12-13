/**
 * 首页组件 (HomePage)
 * 
 * 这是应用的首页，负责处理用户的登录、注册和初始引导。
 * 
 * 主要功能：
 * 1. 用户认证：
 *    - 支持 Pi Network 免密登录 (主要认证方式)
 *    - 支持传统的用户名/密码登录和注册 (备用/测试用)
 *    - 自动检测本地 Token 实现自动登录
 * 
 * 2. 状态管理：
 *    - 管理登录状态 (loading, checking auth)
 *    - 管理表单数据 (username, password)
 *    - 管理当前认证模式 (Pi, Login, Register)
 * 
 * 3. UI 展示：
 *    - 响应式布局，适配移动端和桌面端
 *    - 包含品牌 Logo、标题和宣传语
 *    - 根据登录状态动态展示登录卡片或进入大厅按钮
 *    - 集成语言切换器
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Pi } from '@/lib/PiNetwork';
import { useLanguage } from '@/lib/i18n';
import LanguageSwitcher from './language/LanguageSwitcher';

export default function HomePage() {
    // ========== Hooks ==========
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLanguage();

    // ========== 状态管理 ==========

    /** 当前认证模式：'pi'(Pi登录), 'login'(账号登录), 'register'(账号注册) */
    const [authMode, setAuthMode] = useState<'pi' | 'login' | 'register'>('pi');

    /** 传统登录/注册的表单数据 */
    const [formData, setFormData] = useState({ username: '', password: '' });

    /** 加载状态，用于防止重复提交和显示加载动画 */
    const [loading, setLoading] = useState(false);

    /** 初始身份验证检查状态，用于显示加载占位符 */
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    /** 当前登录的用户信息 */
    const [user, setUser] = useState<any>(null);

    // API 基础地址
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://happygames-tfdz.onrender.com';

    // ========== 副作用：自动登录检查 ==========
    useEffect(() => {
        const checkLogin = async () => {
            try {
                const token = localStorage.getItem('token');
                if (token) {
                    // 如果本地有 token，尝试获取用户信息
                    const res = await fetch(`${API_URL}/api/user/profile`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (res.ok) {
                        const { data } = await res.json();
                        setUser(data);
                        console.log('自动登录成功');
                    } else {
                        // Token 无效，清除
                        localStorage.removeItem('token');
                    }
                }
            } catch (error) {
                console.error('自动登录出错:', error);
            } finally {
                setIsCheckingAuth(false);
            }
        };
        checkLogin();
    }, []);

    // ========== 事件处理：社交媒体跳转 ==========
    const handleSocialClick = (e: React.MouseEvent, platform: 'x' | 'telegram') => {
        e.preventDefault();
        
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        if (platform === 'x') {
            const webUrl = 'https://x.com/HappyGames2025';
            const appUrl = 'twitter://user?screen_name=HappyGames2025';
            
            if (isMobile) {
                // 尝试打开 App
                window.location.href = appUrl;
                
                // 如果 App 没打开（浏览器未挂起），则跳转网页
                setTimeout(() => {
                    // 简单的检测：如果页面还在前台，说明 App 没拉起
                    if (!document.hidden) {
                        window.open(webUrl, '_blank');
                    }
                }, 1500);
            } else {
                window.open(webUrl, '_blank');
            }
        } else if (platform === 'telegram') {
            const webUrl = 'https://t.me/+2O5kln2Jac8xNWY1';
            // Telegram 的 web 链接通常能很好地唤起 App，但也可以尝试 tg://
            // const appUrl = 'tg://resolve?domain=...'; 
            // 对于群组链接，直接用 webUrl 即可，Telegram 官网脚本会处理
            window.open(webUrl, '_blank');
        }
    };

    // ========== 事件处理：Pi 登录 ==========
    const handlePiLogin = async (retryCount = 0) => {
        setLoading(true);
        const refCode = searchParams.get('ref'); // 获取推荐码

        try {
            // 1. 调用 Pi SDK 进行认证 (开发环境下为模拟)
            const piUser: any = await Pi.authenticate();
            console.log('Pi 认证成功:', piUser);

            // 2. 将 Pi 用户信息发送到后端进行登录/注册
            const res = await fetch(`${API_URL}/api/user/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: piUser.username,
                    piId: piUser.uid, // Pi 平台唯一 ID
                    password: '', // Pi 用户无密码
                    referralCode: refCode
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.token) {
                    localStorage.setItem('token', data.token);
                }
                setUser(data.user);
            } else {
                const errData = await res.json();
                alert('登录失败: ' + (errData.message || '未知错误'));
            }
        } catch (error: any) {
            console.error('登录错误:', error);
            alert('登录错误: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // ========== 事件处理：传统账号登录/注册 ==========
    const handleStandardAuth = async () => {
        if (!formData.username || !formData.password) {
            alert('请输入用户名和密码');
            return;
        }

        setLoading(true);
        const endpoint = authMode === 'login' ? '/api/user/login' : '/api/user/register';

        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                if (data.token) {
                    localStorage.setItem('token', data.token);
                }
                setUser(data.user);
            } else {
                alert(data.message || '操作失败');
            }
        } catch (error: any) {
            console.error('认证错误:', error);
            alert('网络错误: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // ========== 渲染逻辑 ==========
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24 relative overflow-hidden">

            {/* 顶部导航栏 */}
            <div className="absolute top-0 left-0 w-full p-4 md:p-6 flex justify-between items-center z-20">
                <div className="flex items-center gap-3">
                    <img src="/images/logo.png" alt="HappyGames Logo" className="h-12 w-12 object-contain drop-shadow-md hover:scale-110 transition-transform" />
                </div>
                <div className="flex items-center gap-4">
                    {/* Social Media Links */}
                    <div className="flex items-center gap-2 mr-2">
                        {/* X (Twitter) */}
                        <a 
                            href="https://x.com/HappyGames2025" 
                            onClick={(e) => handleSocialClick(e, 'x')}
                            className="w-9 h-9 bg-black rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-sm cursor-pointer"
                            title="Follow us on X"
                        >
                            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" aria-hidden="true">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                        </a>

                        {/* Telegram */}
                        <a 
                            href="https://t.me/+2O5kln2Jac8xNWY1" 
                            onClick={(e) => handleSocialClick(e, 'telegram')}
                            className="w-9 h-9 bg-[#0088cc] rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-sm cursor-pointer"
                            title="Join our Telegram Group"
                        >
                            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" aria-hidden="true">
                                <path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z" />
                            </svg>
                        </a>
                    </div>

                    <LanguageSwitcher />
                    {user && (
                        <div
                            className="flex items-center gap-3 cursor-pointer hover:bg-white/50 p-2 rounded-full transition-all"
                            onClick={() => router.push(`/profile?userId=${user._id}`)}
                        >
                            <span className="font-bold text-amber-900 hidden md:block">{user.username}</span>
                            <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center text-lg shadow-inner border-2 border-white overflow-hidden">
                                {user.avatar ?
                                    <img
                                        src={user.avatar}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                    : '👤'
                                }
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 主要内容区域 (Hero Section) */}
            <div className="z-10 flex flex-col items-center text-center max-w-4xl mt-10 md:mt-0">
                <h1 className="text-mobile-huge font-extrabold text-amber-900 drop-shadow-sm mb-4 tracking-tight">
                    Happy<span className="text-amber-600">Games</span>
                </h1>
                <p className="text-mobile-lg text-amber-800/80 font-medium mb-8 max-w-2xl px-4">
                    {t.home_subtitle}
                </p>

                {/* 登录/注册卡片 - 仅在未登录时显示 */}
                {isCheckingAuth ? (
                    // 加载中状态
                    <div className="h-[300px] flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
                    </div>
                ) : !user ? (
                    // 登录表单
                    <div className="w-full max-w-md bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-white/50 flex flex-col items-center animate-fade-in transition-all">

                        {authMode === 'pi' ? (
                            // Pi 登录模式
                            <>
                                <h2 className="text-2xl font-bold text-amber-900 mb-2">{t.welcome}</h2>
                                <p className="text-gray-600 mb-6 text-center">{t.auth_msg}</p>

                                <button
                                    onClick={() => handlePiLogin(0)}
                                    disabled={loading}
                                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg transform transition hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mb-4"
                                >
                                    {loading ? <span>{t.connecting}</span> : (
                                        <>
                                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" /></svg>
                                            {t.login_btn} (Pi Network)
                                        </>
                                    )}
                                </button>

                                <div className="relative w-full my-4">
                                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
                                    <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">或者</span></div>
                                </div>

                                <button
                                    onClick={() => setAuthMode('login')}
                                    className="w-full py-3 bg-white border-2 border-amber-500 text-amber-600 font-bold rounded-xl hover:bg-amber-50 transition-colors"
                                >
                                    账号密码登录
                                </button>
                            </>
                        ) : (
                            // 传统登录/注册模式
                            <>
                                <h2 className="text-2xl font-bold text-amber-900 mb-6">
                                    {authMode === 'login' ? '账号登录' : '注册新账号'}
                                </h2>

                                <div className="w-full space-y-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                                        <input
                                            type="text"
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                                            placeholder="请输入用户名"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                                        <input
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                                            placeholder="请输入密码"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleStandardAuth}
                                    disabled={loading}
                                    className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg transform transition hover:scale-[1.02] disabled:opacity-50"
                                >
                                    {loading ? '处理中...' : (authMode === 'login' ? '登录' : '注册')}
                                </button>

                                <div className="flex justify-between w-full mt-4 text-sm">
                                    <button
                                        onClick={() => setAuthMode('pi')}
                                        className="text-gray-500 hover:text-gray-700"
                                    >
                                        &larr; 返回 Pi 登录
                                    </button>
                                    <button
                                        onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                                        className="text-amber-600 hover:text-amber-800 font-medium"
                                    >
                                        {authMode === 'login' ? '没有账号？去注册' : '已有账号？去登录'}
                                    </button>
                                </div>
                            </>
                        )}

                        <p className="mt-6 text-xs text-gray-500 text-center">
                            {t.login_agree}
                        </p>
                    </div>
                ) : (
                    // 已登录状态，显示进入大厅按钮
                    <div className="animate-fade-in mt-8">
                        <button
                            onClick={() => router.push('/lobby')}
                            className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-full shadow-xl text-xl hover:scale-105 transition-transform flex items-center gap-2"
                        >
                            {t.enter_lobby}
                            <span className="text-2xl">&rarr;</span>
                        </button>
                    </div>
                )}

            </div>

            {/* 装饰性背景元素 */}
            <div className="absolute top-20 left-20 w-32 h-32 bg-white/20 rounded-full blur-2xl animate-pulse"></div>
            <div className="absolute bottom-20 right-20 w-48 h-48 bg-orange-500/20 rounded-full blur-3xl"></div>
        </main>
    );
}
