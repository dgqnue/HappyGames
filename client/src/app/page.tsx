'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Pi } from '@/lib/PiNetwork';
import { useLanguage } from '@/lib/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function Home() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLanguage();

    const [authMode, setAuthMode] = useState<'pi' | 'login' | 'register'>('pi');
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [user, setUser] = useState<any>(null);

    // 默认 API URL
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://happygames-tfdz.onrender.com';

    useEffect(() => {
        // Check if user is already logged in
        const checkLogin = async () => {
            try {
                const token = localStorage.getItem('token');
                if (token) {
                    const res = await fetch(`${API_URL}/api/user/profile`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (res.ok) {
                        const { data } = await res.json();
                        setUser(data);
                        console.log('Auto-login successful');
                    } else {
                        localStorage.removeItem('token');
                    }
                }
            } catch (error) {
                console.error('Auto-login error:', error);
            } finally {
                setIsCheckingAuth(false);
            }
        };
        checkLogin();
    }, []);

    const handlePiLogin = async (retryCount = 0) => {
        setLoading(true);
        const refCode = searchParams.get('ref');

        try {
            // 1. Call Pi SDK (Mocked in dev)
            const piUser: any = await Pi.authenticate();
            console.log('Pi Auth Success:', piUser);

            // 2. Send Pi User info to our backend
            const res = await fetch(`${API_URL}/api/user/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: piUser.username,
                    piId: piUser.uid, // Pi 登录特有字段
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
            console.error('Login error:', error);
            alert('登录错误: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

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
                alert(authMode === 'login' ? '登录成功！' : '注册成功！');
            } else {
                alert(data.message || '操作失败');
            }
        } catch (error: any) {
            console.error('Auth error:', error);
            alert('网络错误: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24 relative overflow-hidden bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50">

            {/* Header / Nav */}
            <div className="absolute top-0 left-0 w-full p-4 md:p-6 flex justify-between items-center z-20">
                <div className="flex items-center gap-3">
                    <img src="/images/logo.png" alt="HappyGames Logo" className="h-12 w-12 object-contain drop-shadow-md hover:scale-110 transition-transform" />
                    <div className="font-bold text-mobile-xl text-amber-900 tracking-tight">{t.home_title}</div>
                </div>
                <div className="flex items-center gap-4">
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

            {/* Hero Section */}
            <div className="z-10 flex flex-col items-center text-center max-w-4xl mt-10 md:mt-0">
                <h1 className="text-mobile-huge font-extrabold text-amber-900 drop-shadow-sm mb-4 tracking-tight">
                    Happy<span className="text-amber-600">Games</span>
                </h1>
                <p className="text-mobile-lg text-amber-800/80 font-medium mb-8 max-w-2xl px-4">
                    {t.home_subtitle}
                </p>

                {/* Login Card - Only show if NOT logged in */}
                {isCheckingAuth ? (
                    <div className="h-[300px] flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
                    </div>
                ) : !user ? (
                    <div className="w-full max-w-md bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-white/50 flex flex-col items-center animate-fade-in transition-all">

                        {authMode === 'pi' ? (
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

            {/* Decorative Elements */}
            <div className="absolute top-20 left-20 w-32 h-32 bg-white/20 rounded-full blur-2xl animate-pulse"></div>
            <div className="absolute bottom-20 right-20 w-48 h-48 bg-orange-500/20 rounded-full blur-3xl"></div>
        </main>
    );
}
