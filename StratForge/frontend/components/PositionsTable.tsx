import { usePositions } from '../hooks/usePositions';

export default function PositionsTable() {
  const { positions, loading } = usePositions();

  if (loading) return <div>Loading positions...</div>;
  if (!positions.length) return <div>No positions</div>;

  return (
    <table className="w-full border border-gray-300">
      <thead>
        <tr className="bg-gray-200">
          <th className="p-2">Symbol</th>
          <th className="p-2">Qty</th>
          <th className="p-2">Avg Price</th>
          <th className="p-2">Market Value</th>
        </tr>
      </thead>
      <tbody>
        {positions.map((p: any) => (
          <tr key={p.symbol} className="text-center border-t border-gray-300">
            <td>{p.symbol}</td>
            <td>{p.qty}</td>
            <td>${p.avg_entry_price}</td>
            <td>${p.market_value}</td>
          </tr>
        ))}
	
      </tbody>
    </table>
  );
}
