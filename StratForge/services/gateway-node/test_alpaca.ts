import AlpacaRaw from '@alpacahq/alpaca-trade-api';
const Alpaca = AlpacaRaw as any;
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// ESM dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const alpaca_crypto = new Alpaca({
    keyId: process.env.ALPACA_API_KEY,
    secretKey: process.env.ALPACA_SECRET_KEY,
    paper: true,
    feed: 'paper_v1beta3',
});

const alpaca_paper = new Alpaca({
    keyId: process.env.ALPACA_API_KEY,
    secretKey: process.env.ALPACA_SECRET_KEY,
    paper: true,
    feed: 'iex', // Required for Free Paper Trading accounts to avoid 404/403
});

async function testAlpaca(): Promise<void> {
    console.log('Testing Alpaca Connectivity...');

    try {
        const account = await alpaca_paper.getAccount();
        console.log('Account Status:', account.status);
        console.log('Buying Power:', account.buying_power);
        console.log('Currency:', account.currency);
        console.log('Alpaca Access: SUCCESS');
    } catch (error: any) {
        console.error('Alpaca Access: FAILED');
        console.error(error.message);
    }
}

async function testWebsocket(durationSeconds: number = 30): Promise<void> {
    console.log('\nTesting Stock WebSocket Connectivity...');
    console.log(`Will run for ${durationSeconds} seconds...\n`);

    const socket = (alpaca_paper as any).data_stream_v2;

    return new Promise((resolve, reject) => {
        let isConnected = false;

        socket.onConnect(() => {
            console.log("Connected to Stock Stream!");
            isConnected = true;
            socket.subscribeForBars(["AAPL"]);
            console.log("Subscribed to AAPL bars\n");
        });

        socket.onError((err: any) => {
            console.log("Error:", err);
            reject(err);
        });

        socket.onStockBar((bar: any) => {
            console.log("BAR:", {
                symbol: bar.Symbol,
                open: `$${bar.OpenPrice}`,
                high: `$${bar.HighPrice}`,
                low: `$${bar.LowPrice}`,
                close: `$${bar.ClosePrice}`,
                volume: bar.Volume,
                timestamp: new Date(bar.Timestamp).toLocaleString()
            });
        });

        socket.onStateChange((state: any) => {
            console.log("State changed:", state);
        });

        socket.onDisconnect(() => {
            console.log("Disconnected");
            resolve();
        });

        socket.connect();

        setTimeout(() => {
            if (isConnected) {
                console.log(`\n ${durationSeconds} seconds elapsed, disconnecting...`);
                socket.disconnect();
            } else {
                resolve();
            }
        }, durationSeconds * 1000);
    });
}



import WebSocket from 'ws'; // Make sure to import this at the top

async function testCryptoWebsocket(durationSeconds: number = 30): Promise<void> {
    console.log('\nTesting Crypto WebSocket Connectivity (Raw v1beta3)...');
    console.log(`Will run for ${durationSeconds} seconds...\n`);

    // 1. Define credentials and URI manually to ensure they are correct
    const API_KEY = process.env.ALPACA_API_KEY || 'YOUR_KEY_HERE';
    const SECRET_KEY = process.env.ALPACA_SECRET_KEY || 'YOUR_SECRET_HERE';
    const URI = 'wss://stream.data.alpaca.markets/v1beta3/crypto/us';

    const ws = new WebSocket(URI);

    return new Promise((resolve, reject) => {
        let isConnected = false;

        // 2. Handle Connection & Authentication
        ws.on('open', () => {
            console.log("Connected to Crypto Stream!");

            // Step A: Send Auth
            const authMsg = {
                action: 'auth',
                key: API_KEY,
                secret: SECRET_KEY
            };
            ws.send(JSON.stringify(authMsg));
        });

        // 3. Handle Incoming Messages
        ws.on('message', (data: WebSocket.RawData) => {
            const messageString = data.toString();
            const parsed = JSON.parse(messageString);

            // Alpaca sends arrays of messages
            const messages = Array.isArray(parsed) ? parsed : [parsed];
            console.log(messages);

            messages.forEach((msg: any) => {
                // Check for successful auth
                if (msg.T === 'success' && msg.msg === 'connected') {
                    console.log("Authenticated! Subscribing...");
                    isConnected = true;
                    // Step B: Subscribe after auth success
                    const subMsg = {
                        action: 'subscribe',
                        quotes: ['BTC/USD'],
                        bars: ['BTC/USD']
                    };
                    ws.send(JSON.stringify(subMsg));
                }
                // Check for Subscription success
                else if (msg.T === 'subscription') {
                    console.log(`Subscribed to: ${msg.bars.join(', ')}\n`);
                }
                // Check for Bars (Type 'b')
                else if (msg.T === 'b') {
                    console.log("CRYPTO BAR:", {
                        symbol: msg.S,
                        open: `$${msg.o}`,
                        high: `$${msg.h}`,
                        low: `$${msg.l}`,
                        close: `$${msg.c}`,
                        volume: msg.v,
                        timestamp: new Date(msg.t).toLocaleString()
                    });
                }
                // Check for Errors
                else if (msg.T === 'error') {
                    console.error("Stream Error:", msg.msg);
                }
            });
        });

        ws.on('error', (err) => {
            console.log("WebSocket Error:", err);
            reject(err);
        });

        ws.on('close', () => {
            console.log("Disconnected");
            resolve();
        });

        // 4. Timer to close connection
        setTimeout(() => {
            if (isConnected) {
                console.log(`\n ${durationSeconds} seconds elapsed, disconnecting...`);
                ws.close();
            } else {
                resolve();
            }
        }, durationSeconds * 1000);
    });
}

// Usage
testCryptoWebsocket(100).catch(console.error);

// testAlpaca().then(() => testCryptoWebsocket(10)).catch(console.error);
// testAlpaca().then(() => testWebsocket(10)).catch(console.error);
