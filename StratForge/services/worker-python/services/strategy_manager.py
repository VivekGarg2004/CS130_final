from typing import Dict, List
from strategies.base_strategy import BaseStrategy
from strategies.mock_strategy import MockStrategy
from models.market_data import Bar, Trade

from services.db_client import DBClient

class StrategyManager:
    def __init__(self):
        # symbol -> { strategy_id -> instance }
        self.active_strategies: Dict[str, Dict[str, BaseStrategy]] = {}
        self.db_client = DBClient()

    def start_session(self, symbol: str, strategy_id: str, strategy_type: str = "mock"):
        if symbol not in self.active_strategies:
            self.active_strategies[symbol] = {}

        if strategy_id in self.active_strategies[symbol]:
            print(f"[WARN] Strategy {strategy_id} already running for {symbol}")
            return

        # 1. Fetch Strategy Metadata from DB
        print(f"[MANAGER] Fetching strategy details for ID: {strategy_id}...")
        strat_data = self.db_client.fetch_strategy(strategy_id)
        
        if strat_data:
            print(f"[DB-VERIFIED] Found Strategy: {strat_data.get('name')} | Symbol: {strat_data.get('symbol')}")
            # Ensure symbol matches (Safety check)
            db_symbol = strat_data.get('symbol')
            if db_symbol and db_symbol != symbol:
                print(f"[WARN] Mismatch! Request says {symbol}, DB says {db_symbol}. Using DB symbol.")
                symbol = db_symbol # Update symbol to match DB truth
        else:
             print(f"[WARN] Strategy {strategy_id} NOT FOUND in DB. Proceeding with mock data from request.")

        # Factory Logic (Expand later with more types)
        if strategy_type == "mock":
            strategy = MockStrategy(strategy_id, symbol)
        else:
            print(f"[ERROR] Unknown strategy type: {strategy_type}")
            return

        self.active_strategies[symbol][strategy_id] = strategy
        strategy.on_start()
        print(f"[MANAGER] Started {strategy_id} on {symbol}. Active: {len(self.active_strategies[symbol])}")

    def stop_session(self, symbol: str, strategy_id: str):
        if symbol in self.active_strategies and strategy_id in self.active_strategies[symbol]:
            strategy = self.active_strategies[symbol].pop(strategy_id)
            strategy.on_stop()
            print(f"[MANAGER] Stopped {strategy_id} on {symbol}")
            
            # Clean up empty dict
            if not self.active_strategies[symbol]:
                del self.active_strategies[symbol]
        else:
            print(f"[WARN] Session {strategy_id} on {symbol} not found to stop.")

    def on_bar(self, bar: Bar):
        """Route incoming Bar to all interested strategies"""
        symbol = bar.symbol
        if symbol in self.active_strategies:
            for strategy in self.active_strategies[symbol].values():
                try:
                    strategy.on_bar(bar)
                except Exception as e:
                    print(f"[ERROR] Strategy {strategy.strategy_id} failed on_bar: {e}")

    def on_trade(self, trade: Trade):
        """Route incoming Trade to all interested strategies"""
        symbol = trade.symbol
        if symbol in self.active_strategies:
            for strategy in self.active_strategies[symbol].values():
                try:
                    strategy.on_trade(trade)
                except Exception as e:
                     print(f"[ERROR] Strategy {strategy.strategy_id} failed on_trade: {e}")
