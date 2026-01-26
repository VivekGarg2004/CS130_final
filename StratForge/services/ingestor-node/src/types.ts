export interface NormalizedBar {
    symbol: string;
    timeframe: "1m";
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    timestamp: string; // UTC ISO String
}

export interface AlpacaBar {
    Symbol: string;
    OpenPrice: number;
    HighPrice: number;
    LowPrice: number;
    ClosePrice: number;
    Volume: number;
    Timestamp: string;
}

export interface NormalizedTrade {
    symbol: string;
    price: number;
    size: number;
    timestamp: string; // UTC ISO String
    tickType: 'trade';
}

export interface AlpacaTrade {
    Symbol: string;
    Price: number;
    Size: number;
    Timestamp: string;
}
