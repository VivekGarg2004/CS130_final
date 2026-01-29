import json
from services.redis_client import RedisClient
from services.strategy_manager import StrategyManager
from models.market_data import ControlEvent

class ControlListener:
    def __init__(self, manager: StrategyManager):
        self.manager = manager
        self.pubsub = RedisClient().get_pubsub()
        self.channel = 'system:subscription_updates'

    def start(self):
        print(f"[CONTROL] Listening on {self.channel}...")
        self.pubsub.subscribe(self.channel)
        
        for message in self.pubsub.listen():
            if message['type'] == 'message':
                try:
                    data = json.loads(message['data'])
                    event = ControlEvent(**data) # Validate with Pydantic
                    
                    if event.action == 'subscribe':
                        # Default ID if none provided (for manual testing)
                        sid = event.strategyId or f"strat_{event.symbol}"
                        session_id = event.sessionId if hasattr(event, 'sessionId') else None
                        self.manager.start_session(event.symbol, sid, session_id=session_id)
                    
                    elif event.action == 'unsubscribe':
                        # Stop ALL strategies for this symbol? Or specific ID?
                        # For now, simplistic approach: stop active sessions
                        # Since Ingestor unsubscribes when count=0, we should assume all are stopped
                        # But realistically we need session ID here.
                        # HACK: Iterate and stop
                        print(f"[CONTROL] Stopping all sessions for {event.symbol}")
                        # In real world, we would stop specific ID passed in event
                        if event.symbol in self.manager.active_strategies:
                             strategies = list(self.manager.active_strategies[event.symbol].keys())
                             for sid in strategies:
                                 self.manager.stop_session(event.symbol, sid)
                                 
                except Exception as e:
                    print(f"[CONTROL] Error processing message: {e}")
