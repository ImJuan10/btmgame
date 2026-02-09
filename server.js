const express = require('express');
const cors = require('cors');
const events = require('events');
const crypto = require('crypto'); // <--- NEW: For Provably Fair Math
const app = express();

app.use(cors());
app.use(express.json());

// --- PROVABLY FAIR HELPER FUNCTIONS ---

// 1. Generate a random 64-char hex string (Server Seed)
const generateServerSeed = () => crypto.randomBytes(32).toString('hex');

// 2. Hash the seed (What the user sees before playing)
const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');

// 3. The Holy Grail: Calculate Result using HMAC
const generateRoll = (serverSeed, clientSeed, nonce) => {
    // Create HMAC-SHA256 hash
    const hmac = crypto.createHmac('sha256', serverSeed);
    hmac.update(`${clientSeed}:${nonce}`);
    const hash = hmac.digest('hex');

    // Take first 8 characters (4 bytes) of the hash
    const subHash = hash.substring(0, 8);
    
    // Convert hex to decimal (0 to 4294967295)
    const decimal = parseInt(subHash, 16);

    // Modulo 10001 to get 0-10000, then divide by 100 for 0.00-100.00
    const roll = (decimal % 10001) / 100;
    
    return roll;
};

// --- DATA STORAGE ---

const COINS = ['BTC', 'ETH', 'DOGE', 'SHIB', 'TON', 'TRX', 'LTC', 'LUNA', 'BC', 'USDT'];

// Helper to generate addresses
const genAddr = (coin) => {
    const prefix = coin === 'BTC' ? 'bc1q' : coin === 'ETH' || coin === 'USDT' ? '0x' : 'T';
    return prefix + Math.random().toString(36).substring(2, 12).toUpperCase() + Math.random().toString(36).substring(2, 12).toUpperCase();
};

// Initialize Users with FAIRNESS DATA
const USERS = {
    'user_1': {
        name: "Whale Trader",
        addresses: {},
        holdings: { ...Object.fromEntries(COINS.map(c => [c, 0])), USDT: 50000, BC: 1000 },
        casinoHoldings: { USDT: 0, BC: 500 },
        transactions: [],
        casinoHistory: [],
        // Fairness State
        serverSeed: generateServerSeed(), 
        clientSeed: "client_seed_12345", 
        nonce: 0 
    },
    'user_2': {
        name: "Newbie Degen",
        addresses: {},
        holdings: { ...Object.fromEntries(COINS.map(c => [c, 0])), USDT: 100, BC: 10 },
        casinoHoldings: { USDT: 0, BC: 0 },
        transactions: [],
        casinoHistory: [],
        // Fairness State
        serverSeed: generateServerSeed(), 
        clientSeed: "my_lucky_seed", 
        nonce: 0 
    }
};

Object.keys(USERS).forEach(uid => {
    COINS.forEach(coin => USERS[uid].addresses[coin] = genAddr(coin));
});

let prices = { BTC: 65000.00, ETH: 3500.00, DOGE: 0.15, SHIB: 0.00002, TON: 6.50, TRX: 0.12, LTC: 85.00, LUNA: 0.85, BC: 0.05, USDT: 1.00 };

const getUser = (req) => {
    const uid = req.headers['x-user-id'] || 'user_1';
    return USERS[uid] || USERS['user_1'];
};

// --- SIMULATION ENGINE ---
function simulatePriceChange(currentPrice, currency) {
    if (currency === 'USDT') return 1;
    let change = (Math.random() - 0.5) * 0.02; 
    return Math.max(0.00000001, currentPrice * (1 + change));
}

setInterval(() => {
    for (const c in prices) prices[c] = simulatePriceChange(prices[c], c);
}, 1000);

// --- ENDPOINTS ---

app.get('/prices', (req, res) => res.json(prices));
app.get('/holdings', (req, res) => {
    const user = getUser(req);
    res.json({ 
        wallet: user.holdings, 
        casino: user.casinoHoldings, 
        addresses: user.addresses 
    });
});
app.get('/transactions', (req, res) => res.json(getUser(req).transactions));
app.get('/casino/history', (req, res) => res.json(getUser(req).casinoHistory));
app.get('/balances', (req, res) => res.json([])); // Simplified for brevity

// --- NEW: FAIRNESS ENDPOINT ---
app.get('/casino/fairness', (req, res) => {
    const user = getUser(req);
    res.json({
        hashedServerSeed: sha256(user.serverSeed), // We show the Hash, not the seed!
        clientSeed: user.clientSeed,
        nonce: user.nonce
    });
});

// --- NEW: CHANGE SEED (Rotate) ---
app.post('/casino/rotate-seed', (req, res) => {
    const user = getUser(req);
    const { newClientSeed } = req.body;
    
    // 1. Reveal the OLD seed (So user can verify past bets)
    const previousServerSeed = user.serverSeed;
    
    // 2. Generate NEW seed and reset nonce
    user.serverSeed = generateServerSeed();
    user.nonce = 0;
    if (newClientSeed) user.clientSeed = newClientSeed;

    res.json({
        previousServerSeed: previousServerSeed,
        newHashedServerSeed: sha256(user.serverSeed),
        clientSeed: user.clientSeed,
        nonce: 0
    });
});

// Standard Action Endpoints (Deposit/Withdraw/Trade) - Kept same as before
app.post('/deposit', (req, res) => {
    const user = getUser(req);
    const { amount, currency } = req.body;
    user.holdings[currency] += parseFloat(amount);
    user.transactions.unshift({ orderDate: new Date().toLocaleString(), type: 'Deposit', pair: currency, price: '1.00', amount: `+${amount}`, total: 'Completed' });
    res.json({ message: 'Success' });
});
app.post('/withdraw', (req, res) => {
    const user = getUser(req);
    const { amount, currency, address } = req.body;
    if (user.holdings[currency] < amount) return res.status(400).json({message: 'Insufficient Funds'});
    user.holdings[currency] -= parseFloat(amount);
    user.transactions.unshift({ orderDate: new Date().toLocaleString(), type: 'Withdraw', pair: currency, price: '1.00', amount: `-${amount}`, total: `To: ${address.slice(0,6)}...` });
    res.json({ message: 'Success' });
});
app.post('/buy', (req, res) => {
    const user = getUser(req); const { pair, amount } = req.body; const [base, quote] = pair.split('/'); const cost = parseFloat(amount) * prices[base];
    if (user.holdings[quote] < cost) return res.status(400).json({message: 'Insufficient USDT'});
    user.holdings[quote] -= cost; user.holdings[base] += parseFloat(amount);
    user.transactions.unshift({ orderDate: new Date().toLocaleString(), type: 'Buy', pair, price: prices[base].toFixed(4), amount: `+${amount}`, total: `-${cost.toFixed(2)} USDT` });
    res.json({ message: 'Bought' });
});
app.post('/sell', (req, res) => {
    const user = getUser(req); const { pair, amount } = req.body; const [base, quote] = pair.split('/'); const val = parseFloat(amount) * prices[base];
    if (user.holdings[base] < amount) return res.status(400).json({message: `Insufficient ${base}`});
    user.holdings[base] -= parseFloat(amount); user.holdings[quote] += val;
    user.transactions.unshift({ orderDate: new Date().toLocaleString(), type: 'Sell', pair, price: prices[base].toFixed(4), amount: `-${amount}`, total: `+${val.toFixed(2)} USDT` });
    res.json({ message: 'Sold' });
});
app.post('/transfer-to-casino', (req, res) => {
    const user = getUser(req); const { amount, currency } = req.body;
    if (user.holdings[currency] < amount) return res.status(400).json({message: 'Insufficient Funds'});
    user.holdings[currency] -= parseFloat(amount); user.casinoHoldings[currency] += parseFloat(amount);
    res.json({ message: 'Transferred' });
});
app.post('/transfer-to-wallet', (req, res) => {
    const user = getUser(req); const { amount, currency } = req.body;
    if (user.casinoHoldings[currency] < amount) return res.status(400).json({message: 'Insufficient Casino Funds'});
    user.casinoHoldings[currency] -= parseFloat(amount); user.holdings[currency] += parseFloat(amount);
    res.json({ message: 'Transferred' });
});

// --- UPDATED CASINO PLAY ---
app.post('/casino/play', (req, res) => {
    const user = getUser(req);
    const { amount, currency, winChance } = req.body;
    
    if (user.casinoHoldings[currency] < amount) return res.status(400).json({message: 'Insufficient Casino Funds'});

    // 1. Increment Nonce (Crucial for fairness)
    user.nonce += 1;

    // 2. Generate Roll Deterministically
    const roll = generateRoll(user.serverSeed, user.clientSeed, user.nonce);

    const chance = parseFloat(winChance) || 50;
    const target = 100 - chance;
    const multiplier = 99 / chance;
    
    const isWin = roll >= target;
    const profit = isWin ? (amount * multiplier) - amount : -amount;

    if (isWin) user.casinoHoldings[currency] += profit;
    else user.casinoHoldings[currency] -= parseFloat(amount);

    const record = { 
        id: Date.now(), 
        time: new Date(), 
        bet: amount, 
        multiplier: multiplier.toFixed(4), 
        target: target.toFixed(2), 
        roll: roll.toFixed(2), 
        win: isWin, 
        profit, 
        currency,
        // Save Fairness Data so user can check later
        nonce: user.nonce,
        clientSeed: user.clientSeed,
        hashedServerSeed: sha256(user.serverSeed) 
    };
    
    user.casinoHistory.unshift(record);
    if (user.casinoHistory.length > 50) user.casinoHistory.pop();

    res.json({ result: isWin ? 'win' : 'lose', record });
});

app.get('/transactions/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
});

app.listen(3000, () => console.log('Provably Fair Server running on 3000'));
