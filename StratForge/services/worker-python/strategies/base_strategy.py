from abc import ABC, abstractmethod
import requests
from models.market_data import Bar, Trade

GATEWAY_URL = "http://localhost:3000"

class BaseStrategy(ABC):
    def __init__(self, strategy_id: str, symbol: str, session_id: str = None):
        self.strategy_id = strategy_id
        self.symbol = symbol
        self.session_id = session_id

    @abstractmethod
    def on_bar(self, bar: Bar):
        """Called when a new bar (candle) is closed."""
        pass

    @abstractmethod
    def on_trade(self, trade: Trade):
        """Called on every tick/trade."""
        pass
    
    def on_start(self):
        print(f"[{self.strategy_id}] Strategy Started for {self.symbol}")

    def on_stop(self):
        print(f"[{self.strategy_id}] Strategy Stopped")

    def send_signal(self, action: str, price: float, quantity: float = 1, confidence: float = 0.5):
        """Send a trade signal to the gateway for execution."""
        if not self.session_id:
            print(f"[{self.strategy_id}] WARN: No session_id, cannot send signal")
            return
        
        payload = {
            "sessionId": self.session_id,
            "symbol": self.symbol,
            "action": action,
            "price": price,
            "quantity": quantity,
            "confidence": confidence
        }
        
        try:
            resp = requests.post(f"{GATEWAY_URL}/internal/execute", json=payload, timeout=5)
            if resp.status_code == 201:
                print(f"[{self.strategy_id}] Signal EXECUTED: {action} {quantity} {self.symbol} @ {price}")
            else:
                print(f"[{self.strategy_id}] Signal FAILED: {resp.text}")
        except Exception as e:
            print(f"[{self.strategy_id}] Signal ERROR: {e}")

