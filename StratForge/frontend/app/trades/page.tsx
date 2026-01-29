'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getToken } from '@/lib/auth';

interface Trade {
    id: string;
    symbol: string;
    action: 'BUY' | 'SELL';
    price: number;
    quantity: number;
    executedAt: string;
    strategyName: string;
}

interface Portfolio {
    balance: number;
    startingBalance: number;
    pnl: number;
    totalTrades: number;
    buys: number;
    sells: number;
}

export default function TradesPage() {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = async () => {
        try {
            const token = getToken();
            const headers = { Authorization: `Bearer ${token}` };

            const [tradesRes, portfolioRes] = await Promise.all([
                fetch('http://localhost:3000/api/trade/history', { headers }),
                fetch('http://localhost:3000/api/trade/portfolio', { headers })
            ]);

            if (tradesRes.ok) {
                const data = await tradesRes.json();
                setTrades(data.trades || []);
            }

            if (portfolioRes.ok) {
                const data = await portfolioRes.json();
                setPortfolio(data);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch data');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Refresh every 10 seconds
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6">
                <h1 className="text-2xl font-bold text-white">Trade Log</h1>

                {error && (
                    <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded">
                        {error}
                    </div>
                )}

                {/* Portfolio Summary */}
                {portfolio && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-800 rounded-lg p-4">
                            <div className="text-gray-400 text-sm">Balance</div>
                            <div className="text-2xl font-bold text-white">
                                ${portfolio.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4">
                            <div className="text-gray-400 text-sm">P&L</div>
                            <div className={`text-2xl font-bold ${portfolio.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {portfolio.pnl >= 0 ? '+' : ''}{portfolio.pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4">
                            <div className="text-gray-400 text-sm">Total Trades</div>
                            <div className="text-2xl font-bold text-white">{portfolio.totalTrades}</div>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4">
                            <div className="text-gray-400 text-sm">Buys / Sells</div>
                            <div className="text-2xl font-bold text-white">
                                <span className="text-emerald-400">{portfolio.buys}</span>
                                {' / '}
                                <span className="text-red-400">{portfolio.sells}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Trades Table */}
                <div className="bg-gray-800 rounded-lg overflow-hidden">
                    {isLoading ? (
                        <div className="p-8 text-center text-gray-400">Loading trades...</div>
                    ) : trades.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">
                            No trades yet. Run a strategy to generate signals!
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-700/50">
                                <tr>
                                    <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Time</th>
                                    <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Symbol</th>
                                    <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Action</th>
                                    <th className="text-right py-3 px-4 text-gray-400 text-sm font-medium">Price</th>
                                    <th className="text-right py-3 px-4 text-gray-400 text-sm font-medium">Qty</th>
                                    <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Strategy</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                                {trades.map((trade) => (
                                    <tr key={trade.id} className="hover:bg-gray-700/30">
                                        <td className="py-3 px-4 text-gray-400 text-sm">
                                            {new Date(trade.executedAt).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-4 font-medium text-white">{trade.symbol}</td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${trade.action === 'BUY'
                                                    ? 'bg-emerald-500/20 text-emerald-400'
                                                    : 'bg-red-500/20 text-red-400'
                                                }`}>
                                                {trade.action}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right text-white">
                                            ${trade.price.toFixed(2)}
                                        </td>
                                        <td className="py-3 px-4 text-right text-gray-400">
                                            {trade.quantity}
                                        </td>
                                        <td className="py-3 px-4 text-gray-400 text-sm">
                                            {trade.strategyName}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
