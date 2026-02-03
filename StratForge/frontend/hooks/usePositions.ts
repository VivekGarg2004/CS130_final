'use client';

import { useState, useEffect } from 'react';
import { getToken } from '@/lib/auth';

interface Position {
  symbol: string;
  quantity: number;
  avgEntryPrice: number;
  lastUpdated: string;
}

export const usePositions = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPositions = async () => {
      setLoading(true);
      try {
        const token = getToken();
        const res = await fetch('http://localhost:3000/api/trade/my-positions', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch positions');
        const json = await res.json();
        setPositions(json.positions || []);
        setError(null);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchPositions();
    const interval = setInterval(fetchPositions, 5000);
    return () => clearInterval(interval);
  }, []);

  return { positions, loading, error };
};
