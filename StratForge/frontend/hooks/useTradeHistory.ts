'use client';

import { useState, useEffect } from 'react';
import { getToken } from '@/lib/auth';

interface RecentTrade {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  executedAt: string;
  strategyName: string;
}

export const useTradeHistory = () => {
  const [trades, setTrades] = useState<RecentTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrades = async () => {
      setLoading(true);
      try {
        const token = getToken();
        const res = await fetch('http://localhost:3000/api/trade/history', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch trades');
        const json = await res.json();
        setTrades((json.trades || []).slice(0, 5)); // last 5 trades
        setError(null);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchTrades();
    const interval = setInterval(fetchTrades, 5000);
    return () => clearInterval(interval);
  }, []);

  return { trades, loading, error };
};
