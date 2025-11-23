'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Pi } from '@/lib/PiNetwork';
import { useLanguage } from '@/lib/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function Home() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<any>(null);
    const { t } = useLanguage();

    useEffect(() => {
        // Check if user is already logged in (Mock persistence)
        const checkLogin = async () => {
            try {
                const storedUser = localStorage.getItem('mock_pi_user');
                if (storedUser) {
                    const piUser = JSON.parse(storedUser);
                    // Fetch full profile from our backend to get _id and avatar
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: piUser.username, piId: piUser.uid })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setUser(data.user);
                    }
                }
            } catch (error) {
                console.error('Auto-login check failed', error);
            }
        };
        checkLogin();
    }, []);

    const handlePiLogin = async () => {
        setLoading(true);

        // Get referral code from URL if present
        const refCode = searchParams.get('ref');

        try {
            // 1. Call Pi SDK (Mocked in dev)
            const piUser: any = await Pi.authenticate();
            console.log('Pi Auth Success:', piUser);

            // 2. Send Pi User info to our backend to create session/account
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: piUser.username,
                    piId: piUser.uid,
                    avatar: '', // Mock SDK doesn't return avatar yet
                    referralCode: refCode
                })
            });

            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
            } else {
                const errData = await res.json();
                alert('Login failed: ' + (errData.message || res.statusText));
            }
        } catch (error: any) {
            console.error('Login error:', error);
            alert('Connection error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24 relative overflow-hidden">

            {/* Header / Nav */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20">
                <div className="font-bold text-xl text-amber-900">{t.home_title}</div>
                <div className="flex items-center gap-4">
                    <LanguageSwitcher />
                    {user && (
                        <div
                            className="flex items-center gap-3 cursor-pointer hover:bg-white/50 p-2 rounded-full transition-all"
                            onClick={() => router.push(`/profile?userId=${user._id}`)}
                        >
                            <span className="font-bold text-amber-900 hidden md:block">{user.username}</span>
                            <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center text-lg shadow-inner border-2 border-white">
                                {user.avatar ? <img src={user.avatar} alt="Avatar" className="w-full h-full rounded-full" /> : '👤'}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Hero Section */}
            <div className="z-10 flex flex-col items-center text-center max-w-4xl">
                <h1 className="text-6xl md:text-8xl font-extrabold text-white drop-shadow-lg mb-4 tracking-tight">
                    Happy<span className="text-amber-600">Games</span>
                </h1>
                <p className="text-xl md:text-2xl text-amber-900/80 font-medium mb-8 max-w-2xl">
                    {t.home_subtitle}
                </p>

                {/* Login Card - Only show if NOT logged in */}
                {!user ? (
                    <div className="w-full max-w-md bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-white/50 flex flex-col items-center">
                        <h2 className="text-2xl font-bold text-amber-900 mb-2">{t.welcome}</h2>
                        <p className="text-gray-600 mb-6 text-center">
                            {t.auth_msg}
                        </p>

                        <button
                            onClick={handlePiLogin}
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg transform transition hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                            {loading ? (
                                <span>{t.connecting}</span>
                            ) : (
                                <>
                                    {/* Simple Pi Icon SVG */}
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                                    </svg>
                                    {t.login_btn}
                                </>
                            )}
                        </button>

                        <p className="mt-4 text-xs text-gray-500 text-center">
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

            </div >

            {/* Decorative Elements */}
            < div className="absolute top-20 left-20 w-32 h-32 bg-white/20 rounded-full blur-2xl animate-pulse" ></div >
            <div className="absolute bottom-20 right-20 w-48 h-48 bg-orange-500/20 rounded-full blur-3xl"></div>
        </main >
    );
}
