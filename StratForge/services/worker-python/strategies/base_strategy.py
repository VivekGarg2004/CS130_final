from abc import ABC, abstractmethod
from models.market_data import Bar, Trade

class BaseStrategy(ABC):
    def __init__(self, strategy_id: str, symbol: str):
        self.strategy_id = strategy_id
        self.symbol = symbol

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
