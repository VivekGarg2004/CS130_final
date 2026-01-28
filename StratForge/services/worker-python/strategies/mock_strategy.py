from strategies.base_strategy import BaseStrategy
from models.market_data import Bar, Trade

class MockStrategy(BaseStrategy):
    def on_bar(self, bar: Bar):
        print(f"[{self.strategy_id}] {bar.symbol} Bar: O={bar.open} C={bar.close}")
        
        # Simple Logic: Green Candle = Buy
        if bar.close > bar.open:
            print(f"[{self.strategy_id}] SIGNAL: BUY {bar.symbol} @ {bar.close}")
        else:
             print(f"[{self.strategy_id}] SIGNAL: SELL/HOLD {bar.symbol}")

    def on_trade(self, trade: Trade):
        # Too noisy to log every trade usually, but good for debug
        # print(f"[{self.strategy_id}] Tick: {trade.price}")
        pass
