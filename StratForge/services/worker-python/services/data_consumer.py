import json
from services.redis_client import RedisClient
from services.strategy_manager import StrategyManager
from models.market_data import Bar, Trade

class DataConsumer:
    def __init__(self, manager: StrategyManager):
        self.manager = manager
        self.pubsub = RedisClient().get_pubsub()
        
    def start(self):
        print("[DATA] Listening to market_data:* and market_trades:*...")
        self.pubsub.psubscribe('market_data:*', 'market_trades:*')
        
        for message in self.pubsub.listen():
            if message['type'] == 'pmessage':
                channel = message['channel']
                data_str = message['data']
                
                try:
                    payload = json.loads(data_str)
                    
                    if 'market_data' in channel:
                        # It's a Bar
                        bar = Bar(**payload)
                        self.manager.on_bar(bar)
                    
                    elif 'market_trades' in channel:
                        # It's a Trade
                        trade = Trade(**payload)
                        # self.manager.on_trade(trade) # Uncomment to enable
                        pass

                except Exception as e:
                    # Specific error handling to avoid spam
                    pass
                    # print(f"[DATA] Error: {e}")
