import redis
import json
import threading
import time
from services.redis_client import RedisClient
from services.strategy_manager import StrategyManager
from services.control_listener import ControlListener
from services.data_consumer import DataConsumer

def main():
    print("[INIT] Starting Python Strategy Worker...")
    
    # Check Connectivity
    redis_client = RedisClient()
    if not redis_client.test_connection():
        print("[FATAL] Could not connect to Redis.")
        exit(1)
        
    print("[INIT] Redis Connected.")
    
    # Initialize Core Strategy Manager
    strategy_manager = StrategyManager()
    
    # Create Workers
    control_worker = ControlListener(strategy_manager)
    data_worker = DataConsumer(strategy_manager)
    
    # Start Threads
    control_thread = threading.Thread(target=control_worker.start, daemon=True)
    data_thread = threading.Thread(target=data_worker.start, daemon=True)
    
    control_thread.start()
    data_thread.start()
    
    # Keep main thread alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[SHUTDOWN] Stopping worker...")

if __name__ == "__main__":
    main()
