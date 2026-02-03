import json
import redis
import pandas as pd
import talib
from collections import defaultdict, deque

# Redis connection
r = redis.Redis(host="localhost", port=6379, decode_responses=True)

MAX_BARS = 200
MIN_BARS = 5 #changed from 30 for now

# Store raw 1m bars
history = defaultdict(lambda: deque(maxlen=MAX_BARS))

# Timeframe aggregation windows (in minutes)
TIMEFRAMES = {
    "1m": 1,
    "5m": 5,
    "1h": 60,
    "1d": 1440,
}

def aggregate_bars(bars: list, interval_minutes: int) -> list:
    """Aggregate 1m bars into higher timeframe candles."""
    if not bars:
        return []

    df = pd.DataFrame(bars)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.set_index("timestamp").sort_index()

    # Floor timestamps to the target timeframe
    df.index = df.index.floor(f"{interval_minutes}min")

    agg = df.groupby(df.index).agg(
        open=("open", "first"),
        high=("high", "max"),
        low=("low", "min"),
        close=("close", "last"),
        volume=("volume", "sum"),
    ).dropna()

    agg = agg.reset_index()
    agg["timestamp"] = agg["timestamp"].dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")
    agg["symbol"] = bars[0]["symbol"]
    agg["timeframe"] = f"{interval_minutes}m" if interval_minutes < 1440 else "1d"

    return agg.to_dict(orient="records")


def compute_indicators(symbol: str, interval: str, bars: list):
    """Compute indicators on a given set of bars."""
    df = pd.DataFrame(bars)
    if len(df) < MIN_BARS:
        print(f"[INDICATOR] {symbol}:{interval} — waiting for bars: {len(df)}/{MIN_BARS}")
        return None

    close = df["close"].astype(float)
    sma = talib.SMA(close, timeperiod=min(20, len(close)))
    ema = talib.EMA(close, timeperiod=min(20, len(close)))
    rsi = talib.RSI(close, timeperiod=14) if len(close) > 14 else pd.Series(dtype=float)
    macd, macd_signal, macd_hist = talib.MACD(close)

    print(f"[INDICATOR] {symbol}:{interval} — computed. SMA={sma.iloc[-1]:.2f}, EMA={ema.iloc[-1]:.2f}")

    return {
        "symbol": symbol,
        "interval": interval,
        "ohlcv": bars,
        "indicators": {
            "SMA_20": sma.dropna().tolist(),
            "EMA_20": ema.dropna().tolist(),
            "RSI_14": rsi.dropna().tolist(),
            "MACD": macd.dropna().tolist(),
            "MACD_signal": macd_signal.dropna().tolist(),
            "MACD_hist": macd_hist.dropna().tolist(),
        }
    }


def publish_result(symbol: str, interval: str, result):
    if result:
        key = f"market_indicators:{symbol}:{interval}"
        payload = json.dumps(result)
        r.set(key, payload)
        r.publish(key, payload)
        print(f"[INDICATOR] Published -> {key}")


def start_indicator_worker():
    pubsub = r.pubsub()
    pubsub.psubscribe("market_data:*")
    print("[INDICATOR] Listening for OHLCV bars...")

    for message in pubsub.listen():
        if message["type"] != "pmessage":
            continue
        try:
            bar = json.loads(message["data"])
            symbol = bar["symbol"]
            interval = bar.get("interval") or bar.get("timeframe", "1m")

            # Store raw 1m bar
            history[(symbol, "1m")].append(bar)
            raw_bars = list(history[(symbol, "1m")])

            # Compute and publish for each timeframe
            for tf, minutes in TIMEFRAMES.items():
                if tf == "1m":
                    agg_bars = raw_bars
                else:
                    agg_bars = aggregate_bars(raw_bars, minutes)

                if not agg_bars:
                    continue

                result = compute_indicators(symbol, tf, agg_bars)
                publish_result(symbol, tf, result)

        except Exception as e:
            print(f"[INDICATOR] Error: {e}")


if __name__ == "__main__":
    start_indicator_worker()
