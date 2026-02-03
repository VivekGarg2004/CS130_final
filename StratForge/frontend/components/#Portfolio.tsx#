'use client';

import { useEffect, useState } from 'react';
import { getToken } from '@/lib/auth';

interface VirtualPortfolio {
    balance: number;
    startingBalance: number;
    pnl: number;
    totalTrades: number;
    buys: number;
    sells: number;
}

interface Position {
    symbol: string;
    quantity: number;
    avgEntryPrice: number;
    lastUpdated: string;
}

interface RecentTrade {
    id: string;
    symbol: string;
    action: 'BUY' | 'SELL';
    price: number;
    quantity: number;
    executedAt: string;
    strategyName: string;
}

export default function Portfolio() {
    const [portfolio, setPortfolio] = useState<VirtualPortfolio | null>(null);
    const [positions, setPositions] = useState<Position[]>([]);
    const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = getToken();
                const headers = { Authorization: `Bearer ${token}` };

                const [portfolioRes, positionsRes, tradesRes] = await Promise.all([
                    fetch('http://localhost:3000/api/trade/portfolio', { headers }),
                    fetch('http://localhost:3000/api/trade/my-positions', { headers }),
                    fetch('http://localhost:3000/api/trade/history', { headers }),
                ]);

                if (portfolioRes.ok) {
                    setPortfolio(await portfolioRes.json());
                }
                if (positionsRes.ok) {
                    const data = await positionsRes.json();
                    setPositions(data.positions || []);
                }
                if (tradesRes.ok) {
                    const data = await tradesRes.json();
                    setRecentTrades((data.trades || []).slice(0, 5)); // Show last 5 trades
                }
                setError(null);
            } catch (err) {
                setError('Failed to fetch portfolio data');
                console.error("Failed to fetch portfolio data", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(value);
    };

    if (isLoading) {
        return (
            <div className="bg-gray-800 rounded-xl p-6 animate-pulse">
                <div className="h-6 bg-gray-700 rounded w-1/4 mb-6"></div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="h-24 bg-gray-700 rounded"></div>
                    <div className="h-24 bg-gray-700 rounded"></div>
                </div>
                <div className="h-32 bg-gray-700 rounded"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-gray-800 rounded-xl p-6">
                <div className="text-red-400 text-center py-8">{error}</div>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Virtual Portfolio</h2>
                <span className="px-2 py-1 text-xs font-medium bg-blue-500/20 text-blue-400 rounded">
                    Paper Trading
                </span>
            </div>

            {/* Portfolio Summary Cards */}
            {portfolio && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-emerald-900/50 to-emerald-800/30 border border-emerald-700/50 rounded-lg p-4">
                        <p className="text-sm text-emerald-300/70">Virtual Balance</p>
                        <p className="text-2xl font-bold text-white mt-1">
                            {formatCurrency(portfolio.balance)}
                        </p>
                    </div>
                    <div className={`bg-gradient-to-br ${portfolio.pnl >= 0 ? 'from-emerald-900/50 to-emerald-800/30 border-emerald-700/50' : 'from-red-900/50 to-red-800/30 border-red-700/50'} border rounded-lg p-4`}>
                        <p className={`text-sm ${portfolio.pnl >= 0 ? 'text-emerald-300/70' : 'text-red-300/70'}`}>Total P&L</p>
                        <p className={`text-2xl font-bold ${portfolio.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'} mt-1`}>
                            {portfolio.pnl >= 0 ? '+' : ''}{formatCurrency(portfolio.pnl)}
                        </p>
                    </div>
                </div>
            )}

            {/* Stats Row */}
            {portfolio && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-white">{portfolio.totalTrades}</p>
                        <p className="text-xs text-gray-400">Total Trades</p>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-emerald-400">{portfolio.buys}</p>
                        <p className="text-xs text-gray-400">Buys</p>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-red-400">{portfolio.sells}</p>
                        <p className="text-xs text-gray-400">Sells</p>
                    </div>
                </div>
            )}

            {/* Positions */}
            {positions.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-400 mb-3">Your Holdings</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-700">
                                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-400">Symbol</th>
                                    <th className="text-right py-2 px-2 text-xs font-medium text-gray-400">Qty</th>
                                    <th className="text-right py-2 px-2 text-xs font-medium text-gray-400">Avg Price</th>
                                    <th className="text-right py-2 px-2 text-xs font-medium text-gray-400">Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                                {positions.map((pos) => (
                                    <tr key={pos.symbol} className="hover:bg-gray-700/30 transition-colors">
                                        <td className="py-2 px-2">
                                            <span className="font-semibold text-white">{pos.symbol}</span>
                                        </td>
                                        <td className="py-2 px-2 text-right text-gray-300">{pos.quantity}</td>
                                        <td className="py-2 px-2 text-right text-gray-300">
                                            {formatCurrency(pos.avgEntryPrice)}
                                        </td>
                                        <td className="py-2 px-2 text-right text-emerald-400">
                                            {formatCurrency(pos.quantity * pos.avgEntryPrice)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Recent Trades */}
            <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3">Recent Trades</h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-700">
                                <th className="text-left py-2 px-2 text-xs font-medium text-gray-400">Symbol</th>
                                <th className="text-center py-2 px-2 text-xs font-medium text-gray-400">Action</th>
                                <th className="text-right py-2 px-2 text-xs font-medium text-gray-400">Price</th>
                                <th className="text-right py-2 px-2 text-xs font-medium text-gray-400">Qty</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                            {recentTrades.map((trade) => (
                                <tr key={trade.id} className="hover:bg-gray-700/30 transition-colors">
                                    <td className="py-2 px-2">
                                        <span className="font-semibold text-white">{trade.symbol}</span>
                                    </td>
                                    <td className="py-2 px-2 text-center">
                                        <span className={`px-2 py-0.5 text-xs font-bold rounded ${trade.action === 'BUY'
                                            ? 'bg-emerald-500/20 text-emerald-400'
                                            : 'bg-red-500/20 text-red-400'
                                            }`}>
                                            {trade.action}
                                        </span>
                                    </td>
                                    <td className="py-2 px-2 text-right text-gray-300">
                                        {formatCurrency(trade.price)}
                                    </td>
                                    <td className="py-2 px-2 text-right text-gray-300">{trade.quantity}</td>
                                </tr>
                            ))}
                            {recentTrades.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-6 text-center text-gray-500">
                                        No trades yet. Run a strategy to get started!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

