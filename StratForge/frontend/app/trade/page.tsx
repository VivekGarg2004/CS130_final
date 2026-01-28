'use client';

import DashboardLayout from '@/components/DashboardLayout';
import TradeBlotter from '@/components/TradeBlotter';

export default function TradePage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-white">Trade</h1>
                    <p className="text-gray-400 mt-1">Execute trades on your paper trading account</p>
                </div>

                {/* Trade form centered */}
                <div className="max-w-md mx-auto">
                    <TradeBlotter />
                </div>

                {/* Trading tips */}
                <div className="max-w-md mx-auto mt-6">
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-300 mb-2">💡 Paper Trading Tips</h3>
                        <ul className="text-xs text-gray-400 space-y-1">
                            <li>• Market orders execute immediately at current price</li>
                            <li>• Limit orders wait until price reaches your target</li>
                            <li>• This is paper trading - no real money is used</li>
                        </ul>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
