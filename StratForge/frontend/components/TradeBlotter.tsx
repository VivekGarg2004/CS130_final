'use client';

import { useState } from 'react';

const POPULAR_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'AMD'];

export default function TradeBlotter() {
    const [symbol, setSymbol] = useState('AAPL');
    const [qty, setQty] = useState(1);
    const [side, setSide] = useState<'buy' | 'sell'>('buy');
    const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
    const [limitPrice, setLimitPrice] = useState('');
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'loading'; message: string } | null>(null);
    const [showSymbols, setShowSymbols] = useState(false);

    const executeTrade = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus({ type: 'loading', message: 'Submitting order...' });

        try {
            const body: any = { symbol, qty, side, type: orderType };
            if (orderType === 'limit' && limitPrice) {
                body.limit_price = parseFloat(limitPrice);
            }

            const res = await fetch('http://localhost:3000/trade/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (res.ok) {
                setStatus({
                    type: 'success',
                    message: `Order placed! ID: ${data.id?.slice(0, 8)}...`
                });
                // Reset form
                setQty(1);
                setLimitPrice('');
            } else {
                setStatus({
                    type: 'error',
                    message: data.error || 'Order failed'
                });
            }
        } catch (err: any) {
            setStatus({
                type: 'error',
                message: err.message || 'Connection error'
            });
        }
    };

    return (
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-white mb-6">Quick Trade</h2>

            <form onSubmit={executeTrade} className="space-y-4">
                {/* Symbol Input */}
                <div className="relative">
                    <label className="block text-sm font-medium text-gray-400 mb-2">Symbol</label>
                    <input
                        type="text"
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                        onFocus={() => setShowSymbols(true)}
                        onBlur={() => setTimeout(() => setShowSymbols(false), 200)}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="AAPL"
                    />
                    {/* Quick symbol picker */}
                    {showSymbols && (
                        <div className="absolute z-10 mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg shadow-lg">
                            <div className="p-2 flex flex-wrap gap-1">
                                {POPULAR_SYMBOLS.map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => {
                                            setSymbol(s);
                                            setShowSymbols(false);
                                        }}
                                        className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-gray-300 rounded transition-colors"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Buy/Sell Toggle */}
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Side</label>
                    <div className="flex rounded-lg overflow-hidden border border-gray-600">
                        <button
                            type="button"
                            onClick={() => setSide('buy')}
                            className={`flex-1 py-3 font-semibold transition-colors ${side === 'buy'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                }`}
                        >
                            Buy
                        </button>
                        <button
                            type="button"
                            onClick={() => setSide('sell')}
                            className={`flex-1 py-3 font-semibold transition-colors ${side === 'sell'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                }`}
                        >
                            Sell
                        </button>
                    </div>
                </div>

                {/* Quantity */}
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Quantity</label>
                    <input
                        type="number"
                        value={qty}
                        onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                        min={1}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                </div>

                {/* Order Type */}
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Order Type</label>
                    <select
                        value={orderType}
                        onChange={(e) => setOrderType(e.target.value as 'market' | 'limit')}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                        <option value="market">Market</option>
                        <option value="limit">Limit</option>
                    </select>
                </div>

                {/* Limit Price (conditional) */}
                {orderType === 'limit' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Limit Price</label>
                        <input
                            type="number"
                            value={limitPrice}
                            onChange={(e) => setLimitPrice(e.target.value)}
                            step="0.01"
                            min="0"
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            placeholder="0.00"
                        />
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={status?.type === 'loading'}
                    className={`w-full py-4 font-bold rounded-lg transition-all duration-200 ${side === 'buy'
                            ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                            : 'bg-red-600 hover:bg-red-700 active:bg-red-800'
                        } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {status?.type === 'loading' ? (
                        <span className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                            Processing...
                        </span>
                    ) : (
                        `${side.toUpperCase()} ${qty} ${symbol}`
                    )}
                </button>

                {/* Status Message */}
                {status && status.type !== 'loading' && (
                    <div className={`p-3 rounded-lg text-sm ${status.type === 'success'
                            ? 'bg-emerald-900/50 border border-emerald-600 text-emerald-300'
                            : 'bg-red-900/50 border border-red-600 text-red-300'
                        }`}>
                        {status.message}
                    </div>
                )}
            </form>
        </div>
    );
}
