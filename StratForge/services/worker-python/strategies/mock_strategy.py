from strategies.base_strategy import BaseStrategy
from models.market_data import Bar, Trade

class MockStrategy(BaseStrategy):
    def on_bar(self, bar: Bar):
        print(f"[{self.strategy_id}] {bar.symbol} Bar: O={bar.open} C={bar.close}")
        
        # Simple Logic: Green Candle = Buy, Red = Sell
        if bar.close > bar.open:
            print(f"[{self.strategy_id}] SIGNAL: BUY {bar.symbol} @ {bar.close}")
            self.send_signal("BUY", bar.close, quantity=1)
        elif bar.close < bar.open:
            print(f"[{self.strategy_id}] SIGNAL: SELL {bar.symbol} @ {bar.close}")
            self.send_signal("SELL", bar.close, quantity=1)

    def on_trade(self, trade: Trade):
        # Too noisy to log every trade usually
        pass

