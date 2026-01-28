'use client';

import DashboardLayout from '@/components/DashboardLayout';
import Portfolio from '@/components/Portfolio';
import TradeBlotter from '@/components/TradeBlotter';

export default function DashboardPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                    <p className="text-gray-400 mt-1">Overview of your portfolio and positions</p>
                </div>

                {/* Main content grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Portfolio - takes 2 columns on large screens */}
                    <div className="lg:col-span-2">
                        <Portfolio />
                    </div>

                    {/* Quick Trade */}
                    <div className="lg:col-span-1">
                        <TradeBlotter />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
