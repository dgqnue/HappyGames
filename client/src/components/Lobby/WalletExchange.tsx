'use client';

import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useLanguage } from '@/lib/i18n';

interface WalletExchangeProps {
    userId: string;
    nickname: string;
}

export default function WalletExchange({ userId, nickname }: WalletExchangeProps) {
    const [wallet, setWallet] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [exchangeAmount, setExchangeAmount] = useState('');
    const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
    const { t } = useLanguage();
    const [socket, setSocket] = useState<any>(null);

    // Withdraw Form State
    const [withdrawAddress, setWithdrawAddress] = useState('');

    // Deposit Success Modal State
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successData, setSuccessData] = useState<{ amount: number; orderId?: string } | null>(null);

    useEffect(() => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://happygames-tfdz.onrender.com';
        const newSocket = io(apiUrl);
        setSocket(newSocket);
        return () => {
            newSocket.disconnect();
        };
    }, []);

    const fetchWallet = async () => {
        try {
            setError(null);
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://happygames-tfdz.onrender.com';
            const res = await fetch(`${apiUrl}/api/wallet/${userId}`);
            if (res.ok) {
                const data = await res.json();
                setWallet(data);
            } else {
                const errText = await res.text();
                setError(`Failed to load wallet: ${res.status} ${res.statusText}`);
            }
        } catch (error: any) {
            setError(`Network Error: ${error.message}`);
        }
    };

    const fetchTransactions = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://happygames-tfdz.onrender.com';
            const res = await fetch(`${apiUrl}/api/wallet/transactions/${userId}`);
            if (res.ok) {
                const data = await res.json();
                setTransactions(data);
            }
        } catch (error) {
            console.error('Failed to fetch transactions', error);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchWallet();
            fetchTransactions();
        }
    }, [userId]);

    const handleExchange = async () => {
        setLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://happygames-tfdz.onrender.com';
        try {
            if (activeTab === 'deposit') {
                // Auto-detect deposit
                // Simulate scanning delay
                await new Promise(resolve => setTimeout(resolve, 1500));

                const res = await fetch(`${apiUrl}/api/wallet/deposit`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId })
                });

                if (res.ok) {
                    const data = await res.json();
                    setSuccessData({ amount: data.beansReceived, orderId: data.orderId });
                    setShowSuccessModal(true);
                    fetchWallet();
                    fetchTransactions();

                    // Emit deposit event to lobby feed
                    if (socket) {
                        socket.emit('deposit', {
                            amount: data.beansReceived, // Or Pi amount if available
                            txId: data.orderId,
                            username: nickname
                        });
                    }
                } else {
                    const err = await res.json();
                    alert('Deposit Failed: ' + err.error);
                }
            } else {
                // Withdraw
                if (!exchangeAmount || isNaN(Number(exchangeAmount))) {
                    alert('Please enter amount');
                    setLoading(false);
                    return;
                }

                if (!withdrawAddress) {
                    alert('Please enter a destination address');
                    setLoading(false);
                    return;
                }

                const res = await fetch(`${apiUrl}/api/wallet/withdraw`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId,
                        amountBeans: parseFloat(exchangeAmount),
                        destinationAddress: withdrawAddress
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    alert(`Withdrawal Successful! TxHash: ${data.txHash}`);
                    fetchWallet();
                    fetchTransactions();
                    setExchangeAmount('');
                    setWithdrawAddress('');

                    // Emit withdraw event to lobby feed
                    if (socket) {
                        socket.emit('withdraw', {
                            amount: parseFloat(exchangeAmount),
                            txId: data.txHash,
                            username: nickname
                        });
                    }
                } else {
                    const err = await res.json();
                    alert('Withdrawal Failed: ' + err.error);
                }
            }
        } catch (error) {
            console.error('Exchange error', error);
            alert('Exchange Error');
        } finally {
            setLoading(false);
        }
    };

    if (error) return (
        <div className="p-4 text-center text-red-500 bg-red-50 rounded-xl border border-red-200">
            <p>{error}</p>
            <button onClick={fetchWallet} className="mt-2 text-sm underline">Retry</button>
        </div>
    );

    if (!wallet) return <div className="p-4 text-center text-amber-800">Loading Wallet...</div>;

    // Generate a consistent mock address based on userId
    const depositAddress = `G-HAPPY-USER-${userId.substring(0, 6).toUpperCase()}-8888`;

    return (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50">
            <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">💰</span>
                <h2 className="text-xl font-bold text-amber-900">{t.wallet.title}</h2>
            </div>

            {/* Balances */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                    <div className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-1">{t.wallet.beans}</div>
                    <div className="text-2xl font-bold text-amber-900">{wallet.happyBeans?.toLocaleString() || '0'}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                    <div className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">{t.wallet.commission}</div>
                    <div className="text-2xl font-bold text-purple-900">{wallet.totalCommissionEarned?.toLocaleString() || '0'}</div>
                </div>
            </div>

            {/* Info Alert */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex gap-3">
                <div className="text-blue-500 text-xl">ℹ️</div>
                <p className="text-sm text-blue-800 leading-relaxed">
                    {t.wallet.alert}
                </p>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
                <button
                    onClick={() => setActiveTab('deposit')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'deposit' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    {t.wallet.tab_deposit}
                </button>
                <button
                    onClick={() => setActiveTab('withdraw')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'withdraw' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    {t.wallet.tab_withdraw}
                </button>
            </div>

            {/* Action Area */}
            <div className="bg-amber-50/50 rounded-xl p-6 border border-amber-100 mb-6">
                {activeTab === 'deposit' ? (
                    <div className="text-center">
                        <h3 className="text-amber-900 font-bold mb-4">{t.wallet.deposit_addr}</h3>

                        {/* QR Code Placeholder */}
                        <div className="w-48 h-48 bg-white mx-auto rounded-xl border-2 border-dashed border-amber-200 flex items-center justify-center mb-4 shadow-sm">
                            <span className="text-gray-400 text-sm">[Unique QR]</span>
                        </div>

                        <div className="bg-white p-3 rounded-lg border border-amber-200 inline-block mb-4 shadow-sm">
                            <code className="text-amber-800 font-mono font-bold text-lg tracking-wide">
                                {depositAddress}
                            </code>
                        </div>

                        <div className="flex items-center justify-center gap-2 text-xs text-green-700 font-medium bg-green-50 py-2 px-4 rounded-full mx-auto w-fit mb-6 border border-green-100">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            {t.wallet.no_memo}
                        </div>

                        <button
                            onClick={handleExchange}
                            disabled={loading}
                            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-[1.02] disabled:opacity-50"
                        >
                            {loading ? 'Checking...' : t.wallet.check_deposit}
                        </button>
                    </div>
                ) : (
                    <div>
                        <h3 className="text-amber-900 font-bold mb-4">提现表单</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t.wallet.amount_beans}</label>
                                <input
                                    type="number"
                                    value={exchangeAmount}
                                    onChange={(e) => setExchangeAmount(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t.wallet.withdraw_addr}</label>
                                <input
                                    type="text"
                                    value={withdrawAddress}
                                    onChange={(e) => setWithdrawAddress(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                                    placeholder="G-..."
                                />
                            </div>
                            <button
                                onClick={handleExchange}
                                disabled={loading}
                                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 mt-2"
                            >
                                {loading ? 'Processing...' : t.wallet.withdraw_btn}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Transactions */}
            <div>
                <h3 className="text-lg font-bold text-amber-900 mb-4">{t.wallet.history}</h3>
                <div className="space-y-3">
                    {transactions.length === 0 ? (
                        <div className="text-center text-gray-500 py-4 text-sm bg-gray-50 rounded-lg">No transactions yet</div>
                    ) : (
                        transactions.map((tx) => (
                            <div key={tx._id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
                                <div>
                                    <div className="font-bold text-gray-800 capitalize">{tx.type}</div>
                                    <div className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleString()}</div>
                                </div>
                                <div className={`font-bold ${tx.type === 'deposit' || tx.type === 'win' ? 'text-green-600' : 'text-red-600'}`}>
                                    {tx.type === 'deposit' || tx.type === 'win' ? '+' : '-'}{tx.amount}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Success Modal */}
            {showSuccessModal && successData && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl transform scale-100 transition-transform">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Deposit Successful!</h3>
                        <p className="text-gray-600 mb-6">
                            You have received <span className="font-bold text-amber-600">{successData.amount}</span> Happy Beans.
                        </p>
                        <button
                            onClick={() => setShowSuccessModal(false)}
                            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg transition-colors"
                        >
                            Awesome!
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
