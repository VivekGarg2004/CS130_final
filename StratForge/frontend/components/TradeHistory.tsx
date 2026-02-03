import { useTradeHistory } from '../hooks/useTradeHistory';

export default function TradeHistory() {
  const { trades, loading } = useTradeHistory();

  if (loading) return <div>Loading trade history...</div>;
  if (!trades.length) return <div>No trades yet</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Trade History</h2>
      <ul className="space-y-1">
        {trades.map((t: any) => (
          <li key={t.id} className="border-b border-gray-300 py-1">
            {t.symbol} | {t.side.toUpperCase()} | {t.qty} @ ${t.price}
          </li>
        ))}
      </ul>
    </div>
  );
}