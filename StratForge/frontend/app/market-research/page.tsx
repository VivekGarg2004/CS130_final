'use client';
import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import IndicatorsTable from '@/components/IndicatorsTable';
import CandlestickChart from '@/components/CandlestickChart';
import { useIndicators } from '@/hooks/useIndicators';

export default function MarketResearchPage() {
    const [selectedInterval, setSelectedInterval] = useState('1m');
    const [selectedSymbol, setSelectedSymbol] = useState('BTC/USD');
    
    const { indicators, loading, error } = useIndicators();
    
    const availableIntervals = indicators
        .filter(ind => ind.symbol === selectedSymbol)
        .map(ind => ind.interval);
    
    const currentIndicator = indicators.find(
        ind => ind.symbol === selectedSymbol && ind.interval === selectedInterval
    );

    if (!loading && availableIntervals.length > 0 && !availableIntervals.includes(selectedInterval)) {
        setSelectedInterval(availableIntervals[0]);
    }

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Market Research</h1>
                    <p className="text-gray-400 mt-1">
                        Live technical indicators and market analysis
                    </p>
                </div>

                <div className="flex gap-3">
                    {['BTC/USD', 'ETH/USD', 'AAPL', 'SPY', 'QQQ'].map(sym => (
                        <button
                            key={sym}
                            onClick={() => setSelectedSymbol(sym)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                selectedSymbol === sym
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                        >
                            {sym}
                        </button>
                    ))}
                </div>

                {error ? (
                    <div className="bg-gray-800 rounded-xl shadow-lg p-6">
                        <div className="text-red-400">Failed to load chart data</div>
                    </div>
                ) : (
                    <CandlestickChart
                        symbol={selectedSymbol}
                        ohlcv={currentIndicator?.ohlcv || []}
                        sma={currentIndicator?.sma ? [currentIndicator.sma] : []}
                        ema={currentIndicator?.ema ? [currentIndicator.ema] : []}
                        interval={selectedInterval}
                        availableIntervals={availableIntervals}
                        onIntervalChange={setSelectedInterval}
                    />
                )}

                <IndicatorsTable />
            </div>
        </DashboardLayout>
    );
}
