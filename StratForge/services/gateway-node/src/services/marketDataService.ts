import { createClient } from 'redis';
import { config } from '../config/index.js';

const redis = createClient({ url: config.REDIS_URL });
await redis.connect();

export async function getMarketDataWithIndicators(
  symbol: string,
  interval: string,
  indicator?: string
) {
  if (!symbol || !interval) {
    throw new Error("symbol and interval are required");
  }

  const key = `market_indicators:${symbol.toUpperCase()}:${interval}`;
  const cached = await redis.get(key);

  if (!cached) {
    return {
      symbol,
      interval,
      ohlcv: [],
      indicator: null,
    };
  }

  const parsed = JSON.parse(cached);

  if (indicator) {
    return {
      symbol,
      interval,
      ohlcv: parsed.ohlcv,
      indicator: parsed.indicators?.[indicator] ?? null,
    };
  }

  return {
    symbol,
    interval,
    ohlcv: parsed.ohlcv,
    indicator: parsed.indicators,
  };
}
