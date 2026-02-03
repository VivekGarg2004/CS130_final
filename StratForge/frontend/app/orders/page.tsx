'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

interface Order {
    id: string;
    symbol: string;
    qty: string;
    side: string;
    type: string;
    status: string;
    filled_avg_price: string | null;
    submitted_at: string;
    filled_at: string | null;
}

type FilterType = 'all' | 'open' | 'closed';

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<FilterType>('all');

    const fetchOrders = async (status: FilterType) => {
        setIsLoading(true);
        try {
	   const res = await fetch(`http://localhost:3000/api/trade/orders?status=${status}`);

            if (res.ok) {
                setOrders(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders(filter);
    }, [filter]);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusBadge = (status: string) => {
        const statusStyles: Record<string, string> = {
            new: 'bg-blue-900/50 text-blue-300 border-blue-600',
            accepted: 'bg-blue-900/50 text-blue-300 border-blue-600',
            pending_new: 'bg-yellow-900/50 text-yellow-300 border-yellow-600',
            partially_filled: 'bg-purple-900/50 text-purple-300 border-purple-600',
            filled: 'bg-emerald-900/50 text-emerald-300 border-emerald-600',
            canceled: 'bg-gray-700/50 text-gray-400 border-gray-600',
            expired: 'bg-gray-700/50 text-gray-400 border-gray-600',
            rejected: 'bg-red-900/50 text-red-300 border-red-600',
        };

        return (
            <span className={`px-2 py-1 text-xs font-medium rounded border ${statusStyles[status] || 'bg-gray-700 text-gray-300'}`}>
                {status.replace('_', ' ').toUpperCase()}
            </span>
        );
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Orders</h1>
                        <p className="text-gray-400 mt-1">View and manage your order history</p>
                    </div>
                    <button
                        onClick={() => fetchOrders(filter)}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors text-sm"
                    >
                        ↻ Refresh
                    </button>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-2">
                    {(['all', 'open', 'closed'] as FilterType[]).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${filter === f
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Orders Table */}
                <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg">
                    {isLoading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mx-auto"></div>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No orders found
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-700/50 border-b border-gray-700">
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Symbol</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Side</th>
                                        <th className="text-right py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Qty</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                                        <th className="text-right py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Fill Price</th>
                                        <th className="text-right py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Submitted</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700/50">
                                    {orders.map((order) => (
                                        <tr key={order.id} className="hover:bg-gray-700/30 transition-colors">
                                            <td className="py-3 px-4 font-semibold text-white">{order.symbol}</td>
                                            <td className="py-3 px-4">
                                                <span className={`font-medium ${order.side === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {order.side.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right text-gray-300">{order.qty}</td>
                                            <td className="py-3 px-4 text-gray-300">{order.type}</td>
                                            <td className="py-3 px-4">{getStatusBadge(order.status)}</td>
                                            <td className="py-3 px-4 text-right text-gray-300">
                                                {order.filled_avg_price ? `$${parseFloat(order.filled_avg_price).toFixed(2)}` : '-'}
                                            </td>
                                            <td className="py-3 px-4 text-right text-gray-400 text-sm">
                                                {formatDate(order.submitted_at)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
