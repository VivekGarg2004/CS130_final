'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getToken } from '@/lib/auth';

interface Strategy {
    id: string;
    name: string;
    symbol: string;
    logicExplanation: string | null;
    createdAt: string;
}

export default function StrategiesPage() {
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newStrategy, setNewStrategy] = useState({
        name: '',
        symbol: '',
        pythonCode: '',
        logicExplanation: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [runningId, setRunningId] = useState<string | null>(null);
    const [stoppingId, setStoppingId] = useState<string | null>(null);

    const fetchStrategies = async () => {
        try {
            const token = getToken();
            const res = await fetch('http://localhost:3000/api/strategies', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStrategies(data.strategies);
            }
        } catch (err) {
            console.error('Failed to fetch strategies:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStrategies();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const token = getToken();
            const res = await fetch('http://localhost:3000/api/strategies', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(newStrategy)
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess('Strategy created!');
                setShowCreate(false);
                setNewStrategy({ name: '', symbol: '', pythonCode: '', logicExplanation: '' });
                fetchStrategies();
            } else {
                setError(data.error || 'Failed to create strategy');
            }
        } catch (err: any) {
            setError(err.message || 'Connection error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this strategy?')) return;
        setError('');
        setSuccess('');

        try {
            const token = getToken();
            const res = await fetch(`http://localhost:3000/api/strategies/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                setSuccess('Strategy deleted successfully');
                fetchStrategies();
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to delete strategy');
            }
        } catch (err: any) {
            console.error('Failed to delete:', err);
            setError(err.message || 'Connection error');
        }
    };

    const handleRun = async (strategy: Strategy) => {
        setRunningId(strategy.id);
        setError('');
        setSuccess('');

        try {
            // Determine type based on symbol (crypto has /)
            const type = strategy.symbol.includes('/') ? 'crypto' : 'stock';

            const res = await fetch('http://localhost:3000/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: strategy.symbol,
                    strategyId: strategy.id,
                    type: type
                })
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(`✅ Session started for ${strategy.symbol}! Check worker logs.`);
            } else {
                setError(data.error || 'Failed to start session');
            }
        } catch (err: any) {
            setError(err.message || 'Connection error');
        } finally {
            setRunningId(null);
        }
    };

    const handleStop = async (strategy: Strategy) => {
        setStoppingId(strategy.id);
        setError('');
        setSuccess('');

        try {
            const token = getToken();
            const res = await fetch(`http://localhost:3000/api/strategies/${strategy.id}/stop`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = await res.json();

            if (res.ok) {
                if (data.sessionsStopped > 0) {
                    setSuccess(`⏹️ Stopped ${data.sessionsStopped} session(s) for ${strategy.symbol}`);
                } else {
                    setSuccess(`No running sessions for ${strategy.symbol}`);
                }
            } else {
                setError(data.error || 'Failed to stop sessions');
            }
        } catch (err: any) {
            setError(err.message || 'Connection error');
        } finally {
            setStoppingId(null);
        }
    };

    const sampleCode = `from strategies.base_strategy import BaseStrategy

class MyStrategy(BaseStrategy):
    def on_bar(self, bar):
        # Buy if price drops 1%
        if bar.close < bar.open * 0.99:
            print(f"[{self.strategy_id}] BUY signal at {bar.close}")
    
    def on_trade(self, trade):
        pass`;

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Strategies</h1>
                        <p className="text-gray-400 mt-1">Manage your trading strategies</p>
                    </div>
                    <button
                        onClick={() => setShowCreate(!showCreate)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                    >
                        {showCreate ? 'Cancel' : '+ New Strategy'}
                    </button>
                </div>

                {/* Success/Error Messages */}
                {success && (
                    <div className="p-4 bg-emerald-900/50 border border-emerald-600 rounded-lg text-emerald-300">
                        {success}
                    </div>
                )}
                {error && (
                    <div className="p-4 bg-red-900/50 border border-red-600 rounded-lg text-red-300">
                        {error}
                    </div>
                )}

                {/* Create Form */}
                {showCreate && (
                    <form onSubmit={handleCreate} className="bg-gray-800 rounded-xl p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-white mb-4">Create Strategy</h2>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={newStrategy.name}
                                    onChange={(e) => setNewStrategy({ ...newStrategy, name: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                                    placeholder="My SMA Strategy"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Symbol</label>
                                <input
                                    type="text"
                                    value={newStrategy.symbol}
                                    onChange={(e) => setNewStrategy({ ...newStrategy, symbol: e.target.value.toUpperCase() })}
                                    required
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                                    placeholder="AAPL"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Description (optional)</label>
                            <input
                                type="text"
                                value={newStrategy.logicExplanation}
                                onChange={(e) => setNewStrategy({ ...newStrategy, logicExplanation: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                                placeholder="Buy when RSI < 30"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-sm text-gray-400">Python Code</label>
                                <button
                                    type="button"
                                    onClick={() => setNewStrategy({ ...newStrategy, pythonCode: sampleCode })}
                                    className="text-xs text-emerald-400 hover:text-emerald-300"
                                >
                                    Use Sample Template
                                </button>
                            </div>
                            <textarea
                                value={newStrategy.pythonCode}
                                onChange={(e) => setNewStrategy({ ...newStrategy, pythonCode: e.target.value })}
                                required
                                rows={12}
                                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-green-400 font-mono text-sm"
                                placeholder="# Your Python strategy code here..."
                            />
                            <p className="text-xs text-gray-500 mt-1">Must include a `def on_bar` method</p>
                        </div>

                        <button
                            type="submit"
                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium"
                        >
                            Create Strategy
                        </button>
                    </form>
                )}

                {/* Strategies List */}
                <div className="bg-gray-800 rounded-xl overflow-hidden">
                    {isLoading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mx-auto"></div>
                        </div>
                    ) : strategies.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No strategies yet. Create your first one!
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-700/50 border-b border-gray-700">
                                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase">Name</th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase">Symbol</th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase">Description</th>
                                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-400 uppercase">Created</th>
                                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                                {strategies.map((strategy) => (
                                    <tr key={strategy.id} className="hover:bg-gray-700/30">
                                        <td className="py-3 px-4 font-medium text-white">{strategy.name}</td>
                                        <td className="py-3 px-4 text-emerald-400">{strategy.symbol}</td>
                                        <td className="py-3 px-4 text-gray-400 text-sm">
                                            {strategy.logicExplanation || '-'}
                                        </td>
                                        <td className="py-3 px-4 text-right text-gray-400 text-sm">
                                            {new Date(strategy.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="py-3 px-4 text-right space-x-2">
                                            <button
                                                onClick={() => handleRun(strategy)}
                                                disabled={runningId === strategy.id}
                                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
                                            >
                                                {runningId === strategy.id ? 'Starting...' : '▶ Run'}
                                            </button>
                                            <button
                                                onClick={() => handleStop(strategy)}
                                                disabled={stoppingId === strategy.id}
                                                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
                                            >
                                                {stoppingId === strategy.id ? 'Stopping...' : '⏹ Stop'}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(strategy.id)}
                                                className="text-red-400 hover:text-red-300 text-sm"
                                            >
                                                Delete
                                            </button>
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
