'use client';
import DashboardLayout from '@/components/DashboardLayout';
import IndicatorsTable from '@/components/IndicatorsTable';

export default function MarketResearchPage() {
    return (
        <DashboardLayout>
            <div className="space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-white">Market Research</h1>
                    <p className="text-gray-400 mt-1">
                        Live technical indicators and market analysis
                    </p>
                </div>
                {/* Indicators */}
                <IndicatorsTable />
            </div>
        </DashboardLayout>
    );
}