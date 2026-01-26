import redis
import json
import time
import sys
from datetime import datetime
from config import config

def connect_redis():
    """Connect to Redis with retry logic."""
    while True:
        try:
            r = redis.Redis(host=config.REDIS_HOST, port=config.REDIS_PORT, decode_responses=True)
            r.ping()
            print(f"[INFO] Connected to Redis at {config.REDIS_HOST}:{config.REDIS_PORT}")
            return r
        except redis.ConnectionError as e:
            print(f"[WARN] Redis connection failed: {e}. Retrying in 5s...")
            time.sleep(5)

def process_message(message):
    """Process incoming Redis message."""
    try:
        channel = message['channel']
        data = json.loads(message['data'])
        
        # Calculate Latency
        now = datetime.now().timestamp() # System time (usually UTC-aligned epoch)
        
        # Parse timestamp from data (ISO format)
        data_ts_str = data.get('timestamp')
        if data_ts_str:
            # Handle Z for UTC
            if data_ts_str.endswith('Z'):
                data_ts_str = data_ts_str.replace('Z', '+00:00')
            
            # Create timezone-aware datetime
            dt = datetime.fromisoformat(data_ts_str)
            data_ts = dt.timestamp()
            
            latency_ms = (now - data_ts) * 1000
        else:
            latency_ms = -1

        topic_type = "TRADE" if "trades" in channel else "BAR"
        symbol = data.get('symbol', 'UNKNOWN')
        price = data.get('close') if topic_type == "BAR" else data.get('price')
        
        print(f"[{topic_type}] {symbol}: ${price} | Latency: {latency_ms:.2f}ms")

    except Exception as e:
        print(f"[ERROR] Failed to process message: {e}")

def main():
    print("[INFO] Starting Python Strategy Worker...")
    
    r = connect_redis()
    pubsub = r.pubsub()
    
    # Subscribe to patterns
    patterns = ['market_data:*', 'market_trades:*']
    pubsub.psubscribe(*patterns)
    print(f"[INFO] Subscribed to patterns: {patterns}")

    # Blocking listener loop
    while True:
        try:
            for message in pubsub.listen():
                if message['type'] == 'pmessage':
                    process_message(message)
        except redis.ConnectionError:
            print("[WARN] Lost connection to Redis. Reconnecting...")
            r = connect_redis()
            pubsub = r.pubsub()
            pubsub.psubscribe(*patterns)
            print("[INFO] Re-subscribed.")
        except KeyboardInterrupt:
            print("\n[INFO] Shutting down...")
            sys.exit(0)
        except Exception as e:
            print(f"[ERROR] Unexpected error in loop: {e}")
            time.sleep(1)

if __name__ == "__main__":
    main()
