from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class Bar(BaseModel):
    symbol: str
    timeframe: str
    open: float
    high: float
    low: float
    close: float
    volume: float
    timestamp: datetime

class Trade(BaseModel):
    symbol: str
    price: float
    size: float
    timestamp: datetime
    tickType: str

class ControlEvent(BaseModel):
    action: str  # 'subscribe' | 'unsubscribe'
    symbol: str
    type: str    # 'stock' | 'crypto'
    strategyId: Optional[str] = None
