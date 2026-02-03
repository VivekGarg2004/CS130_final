import { useIndicators } from '../hooks/useIndicators';

export default function IndicatorsTable() {
  const { indicators, loading, error } = useIndicators();
  
  if (loading) {
    return (
      <div className="p-6 text-gray-400">Loading indicators...</div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6 text-red-400">Failed to load indicators</div>
    );
  }
  
  if (!indicators || indicators.length === 0) {
    return (
      <div className="p-6 text-gray-500">No indicators available</div>
    );
  }
  
  return (
    <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">Market Research</h2>
        <p className="text-sm text-gray-400">
          Technical indicators per symbol
        </p>
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-700/50 border-b border-gray-700">
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                Symbol
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                Interval
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                SMA
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                EMA
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                RSI
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {indicators.map((i: any, idx: number) => (
              <tr
                key={`${i.symbol}-${i.interval}-${idx}`}
                className="hover:bg-gray-700/30 transition-colors"
              >
                <td className="py-3 px-4 font-semibold text-white">
                  {i.symbol ?? '—'}
                </td>
                <td className="py-3 px-4 text-gray-300">
                  {i.interval ?? '—'}
                </td>
                <td className="py-3 px-4 text-right text-gray-300">
                  {i.sma ? i.sma.toFixed(2) : '—'}
                </td>
                <td className="py-3 px-4 text-right text-gray-300">
                  {i.ema ? i.ema.toFixed(2) : '—'}
                </td>
                <td className="py-3 px-4 text-right text-gray-300">
                  {i.rsi ? i.rsi.toFixed(2) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
