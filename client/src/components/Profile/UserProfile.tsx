'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import WalletExchange from '../Lobby/WalletExchange';
import ReferralDetailsModal from './ReferralDetailsModal';
import { useLanguage } from '@/lib/i18n';

/**
 * User Profile Component
 * Displays user information, wallet balance, and referral stats.
 * Allows users to edit their nickname and manage their assets.
 */
export default function UserProfile() {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const searchParams = useSearchParams();
    const { t } = useLanguage();

    // State for nickname editing modal
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');

    // State for logout confirmation modal
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // State for referral details modal
    const [showReferralDetails, setShowReferralDetails] = useState(false);

    // Get userId from URL query
    const userId = searchParams.get('userId');

    useEffect(() => {
        if (userId) {
            fetchProfile(userId);
        } else {
            setLoading(false);
        }
    }, [userId]);

    /**
     * Fetch User Profile
     * Retrieves user data from the backend.
     * @param {string} id - User ID
     */
    const fetchProfile = async (id: string) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/profile?userId=${id}`);
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
            } else {
                setProfile(null);
            }
        } catch (error) {
            console.error('Failed to fetch profile', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-white text-center mt-20">{t.loading_profile}</div>;

    if (!profile) {
        return (
            <div className="max-w-md mx-auto bg-white/90 p-8 rounded-xl shadow-2xl mt-10">
                <h2 className="text-2xl font-bold mb-4 text-amber-900">{t.profile_not_found}</h2>
                <p className="text-gray-600 mb-4">{t.login_required}</p>
                <a href="/" className="block w-full text-center bg-amber-600 text-white py-2 rounded-md hover:bg-amber-700">
                    {t.go_home}
                </a>
            </div>
        );
    }

    /**
     * Handle Logout
     * Clears local storage and redirects to home page.
     */
    const handleLogout = () => {
        setIsLoggingOut(true);
    };

    const confirmLogout = () => {
        localStorage.removeItem('mock_pi_user');
        window.location.href = '/';
    };

    return (
        <div className="page-container">
            {/* Profile Header */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl mb-6 flex flex-col md:flex-row items-center justify-between border border-white/50 gap-4">
                <div className="flex items-center gap-4 md:gap-6">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-amber-200 rounded-full flex items-center justify-center text-3xl shadow-inner">
                        {profile.avatar ? <img src={profile.avatar} alt="Avatar" className="w-full h-full rounded-full" /> : '👤'}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-mobile-xl font-bold text-amber-900">
                                {profile.nickname || profile.username}
                            </h1>
                            <button
                                onClick={() => {
                                    setEditName(profile.nickname || profile.username);
                                    setIsEditing(true);
                                }}
                                className="text-amber-600 hover:text-amber-800 transition-colors"
                                title={t.edit_nickname}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex gap-3 mt-2">
                            {profile.referralStats.inviteCount > 0 && (
                                <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium border border-amber-200">
                                    Lv.{profile.referralLevel} {t.promoter}
                                </span>
                            )}
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium border border-blue-200">
                                {t.id}: {profile.referralCode}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {t.logout}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Wallet & Exchange */}
                <div className="space-y-6">
                    <WalletExchange userId={profile._id} nickname={profile.nickname || profile.username} />
                </div>

                {/* Right Column: Stats & Referral */}
                <div className="space-y-6">
                    {/* Referral Stats */}
                    <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/50">
                        <h3 className="text-xl font-bold text-amber-900 mb-4">{t.referral_stats}</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                <span className="text-gray-600">{t.invited_users}</span>
                                <span className="font-bold text-mobile-base">{profile.referralStats.inviteCount}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                <span className="text-gray-600">{t.total_flow}</span>
                                <span className="font-bold text-mobile-base">{profile.referralStats.totalFlow.toLocaleString()} {t.beans}</span>
                            </div>
                            <div className="mt-4 p-4 bg-orange-50 rounded-xl border border-orange-100">
                                <p className="text-sm text-orange-800 font-medium mb-2">{t.referral_link}:</p>
                                <code className="block bg-white p-2 rounded border border-orange-200 text-xs text-gray-600 break-all">
                                    {process.env.NEXT_PUBLIC_CLIENT_URL}?ref={profile.referralCode}
                                </code>
                            </div>
                            <button
                                onClick={() => setShowReferralDetails(true)}
                                className="w-full py-2 mt-2 bg-amber-100 text-amber-800 rounded-lg font-bold hover:bg-amber-200 transition-colors"
                            >
                                {t.view_details || 'View Details'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {/* Edit Nickname Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in">
                        <h3 className="text-xl font-bold text-amber-900 mb-4">{t.edit_nickname}</h3>
                        <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full p-3 border border-gray-200 rounded-xl mb-4 focus:ring-2 focus:ring-amber-500 outline-none"
                            placeholder={t.enter_nickname}
                        />
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (!editName.trim()) return;
                                    try {
                                        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/update`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ userId: profile._id, nickname: editName })
                                        });
                                        const data = await res.json();
                                        if (res.ok) {
                                            setProfile({ ...profile, nickname: data.user.nickname });
                                            setIsEditing(false);
                                        } else {
                                            alert(data.message || 'Failed to update nickname');
                                        }
                                    } catch (err) {
                                        alert('Network error');
                                    }
                                }}
                                className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition-colors"
                            >
                                {t.save}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Logout Confirmation Modal */}
            {isLoggingOut && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{t.logout}</h3>
                        <p className="text-gray-500 mb-6">{t.logout_confirm}</p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setIsLoggingOut(false)}
                                className="px-6 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                            >
                                {t.cancel}
                            </button>
                            <button
                                onClick={confirmLogout}
                                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-500/30"
                            >
                                {t.logout}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Referral Details Modal */}
            {showReferralDetails && (
                <ReferralDetailsModal
                    userId={profile._id}
                    onClose={() => setShowReferralDetails(false)}
                />
            )}
        </div>
    );
}
