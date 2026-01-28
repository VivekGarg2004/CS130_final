'use client';

import { useEffect, useState } from 'react';

interface Account {
    equity: string;
    buying_power: string;
    cash: string;
    portfolio_value: string;
}

interface Position {
    asset_id: string;
    symbol: string;
    qty: string;
    market_value: string;
    unrealized_pl: string;
    unrealized_plpc: string;
    current_price: string;
    avg_entry_price: string;
}

export default function Portfolio() {
    const [account, setAccount] = useState<Account | null>(null);
    const [positions, setPositions] = useState<Position[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [accRes, posRes] = await Promise.all([
                    fetch('http://localhost:3000/trade/account'),
                    fetch('http://localhost:3000/trade/positions'),
                ]);

                if (accRes.ok) {
                    setAccount(await accRes.json());
                }
                if (posRes.ok) {
                    setPositions(await posRes.json());
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

    const formatCurrency = (value: string | number) => {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(num);
    };

    const formatPercent = (value: string | number) => {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return `${num >= 0 ? '+' : ''}${(num * 100).toFixed(2)}%`;
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
            <h2 className="text-lg font-semibold text-white mb-6">Portfolio Overview</h2>

            {/* Account Summary Cards */}
            {account && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-emerald-900/50 to-emerald-800/30 border border-emerald-700/50 rounded-lg p-4">
                        <p className="text-sm text-emerald-300/70">Total Equity</p>
                        <p className="text-2xl font-bold text-white mt-1">
                            {formatCurrency(account.equity)}
                        </p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border border-blue-700/50 rounded-lg p-4">
                        <p className="text-sm text-blue-300/70">Buying Power</p>
                        <p className="text-2xl font-bold text-white mt-1">
                            {formatCurrency(account.buying_power)}
                        </p>
                    </div>
                </div>
            )}

            {/* Positions Table */}
            <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3">Open Positions</h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-700">
                                <th className="text-left py-3 px-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Symbol</th>
                                <th className="text-right py-3 px-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Qty</th>
                                <th className="text-right py-3 px-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Price</th>
                                <th className="text-right py-3 px-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Value</th>
                                <th className="text-right py-3 px-2 text-xs font-medium text-gray-400 uppercase tracking-wider">P&L</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                            {positions.map((pos) => {
                                const pl = parseFloat(pos.unrealized_pl);
                                const plpc = parseFloat(pos.unrealized_plpc || '0');
                                const isPositive = pl >= 0;

                                return (
                                    <tr key={pos.asset_id} className="hover:bg-gray-700/30 transition-colors">
                                        <td className="py-3 px-2">
                                            <span className="font-semibold text-white">{pos.symbol}</span>
                                        </td>
                                        <td className="py-3 px-2 text-right text-gray-300">{pos.qty}</td>
                                        <td className="py-3 px-2 text-right text-gray-300">
                                            {formatCurrency(pos.current_price)}
                                        </td>
                                        <td className="py-3 px-2 text-right text-gray-300">
                                            {formatCurrency(pos.market_value)}
                                        </td>
                                        <td className={`py-3 px-2 text-right font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                            <div>{formatCurrency(pos.unrealized_pl)}</div>
                                            <div className="text-xs opacity-75">{formatPercent(plpc)}</div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {positions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-gray-500">
                                        No open positions
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
