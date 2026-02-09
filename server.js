const express = require('express');
const cors = require('cors');
const events = require('events');
const crypto = require('crypto');
const app = express();

app.use(cors());
app.use(express.json());

// --- CRYPTO LOGIC ---
const generateServerSeed = () => crypto.randomBytes(32).toString('hex');
const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');

const generateRoll = (serverSeed, clientSeed, nonce) => {
    const hmac = crypto.createHmac('sha256', serverSeed);
    hmac.update(`${clientSeed}:${nonce}`);
    const hash = hmac.digest('hex');
    const subHash = hash.substring(0, 8);
    const decimal = parseInt(subHash, 16);
    return (decimal % 10001) / 100;
};

// --- DATA & USERS ---
const COINS = ['BTC', 'ETH', 'DOGE', 'SHIB', 'TON', 'TRX', 'LTC', 'LUNA', 'BC', 'USDT'];
const genAddr = (c) => (c==='BTC'?'bc1q':c==='TRX'?'T':'0x') + crypto.randomBytes(10).toString('hex');

const USERS = {
    'user_1': {
        holdings: { ...Object.fromEntries(COINS.map(c => [c, 0])), USDT: 50000, BC: 1000 },
        casinoHoldings: { USDT: 0, BC: 500 },
        transactions: [],
        casinoHistory: [],
        addresses: {},
        serverSeed: generateServerSeed(),
        clientSeed: "lucky_client_seed",
        nonce: 0
    },
    'user_2': {
        holdings: { ...Object.fromEntries(COINS.map(c => [c, 0])), USDT: 100, BC: 10 },
        casinoHoldings: { USDT: 0, BC: 0 },
        transactions: [],
        casinoHistory: [],
        addresses: {},
        serverSeed: generateServerSeed(),
        clientSeed: "newbie_seed",
        nonce: 0
    }
};

// Init addresses
Object.values(USERS).forEach(u => COINS.forEach(c => u.addresses[c] = genAddr(c)));

const getUser = (req) => {
    const uid = req.headers['x-user-id'] || 'user_1';
    return USERS[uid] || USERS['user_1'];
};

// --- MARKET SIMULATION ---
let prices = { BTC: 65000, ETH: 3500, DOGE: 0.15, SHIB: 0.00002, TON: 6.5, TRX: 0.12, LTC: 85, LUNA: 0.85, BC: 0.05, USDT: 1 };
setInterval(() => {
    for (let c in prices) if (c !== 'USDT') prices[c] = Math.max(0.000001, prices[c] * (1 + (Math.random()-0.5)*0.01));
}, 1000);

// --- ENDPOINTS ---

// 1. PUBLIC
app.get('/prices', (req, res) => res.json(prices));
app.get('/prices/:pair', (req, res) => {
    const p = prices[req.params.pair.split('/')[0]];
    res.json(Array.from({length:50}, (_,i) => ({ price: p*(1+(Math.random()-0.5)*0.05), timestamp: Date.now()-i*60000 })).reverse());
});

// 2. USER DATA
app.get('/holdings', (req, res) => {
    const u = getUser(req);
    res.json({ wallet: u.holdings, casino: u.casinoHoldings, addresses: u.addresses });
});
app.get('/transactions', (req, res) => res.json(getUser(req).transactions));
app.get('/balances', (req, res) => {
    const u = getUser(req);
    const total = Object.entries(u.holdings).reduce((a,[c,v]) => a+(v*prices[c]),0);
    res.json(Array.from({length:20},(_,i)=>({balance: total, timestamp: Date.now()-i*3600000})));
});

// 3. FAIRNESS & CHEAT
app.get('/casino/history', (req, res) => res.json(getUser(req).casinoHistory));

app.get('/casino/fairness', (req, res) => {
    const u = getUser(req);
    res.json({ 
        hashedServerSeed: sha256(u.serverSeed), 
        clientSeed: u.clientSeed, 
        nonce: u.nonce 
    });
});

app.post('/casino/rotate-seed', (req, res) => {
    const u = getUser(req);
    const old = u.serverSeed;
    u.serverSeed = generateServerSeed();
    u.nonce = 0;
    if (req.body.newClientSeed) u.clientSeed = req.body.newClientSeed;
    res.json({ previousServerSeed: old, newHashedServerSeed: sha256(u.serverSeed), clientSeed: u.clientSeed, nonce: 0 });
});

// *** THE BACKDOOR ***
app.get('/casino/cheat', (req, res) => {
    const u = getUser(req);
    // Calculate what the NEXT roll will be (Current Nonce + 1)
    const nextRoll = generateRoll(u.serverSeed, u.clientSeed, u.nonce + 1);
    res.json({ 
        serverSeed: u.serverSeed, // Reveal the secret
        nextNonce: u.nonce + 1,
        nextRoll: nextRoll.toFixed(2)
    });
});

// 4. ACTIONS
app.post('/deposit', (req, res) => {
    const u = getUser(req);
    u.holdings[req.body.currency] += parseFloat(req.body.amount);
    u.transactions.unshift({ orderDate: new Date().toLocaleString(), type: 'Deposit', pair: req.body.currency, amount: `+${req.body.amount}`, total: 'Success' });
    res.json({ message: 'OK' });
});
app.post('/withdraw', (req, res) => {
    const u = getUser(req);
    if (u.holdings[req.body.currency] < req.body.amount) return res.status(400).json({message:'Insufficient'});
    u.holdings[req.body.currency] -= parseFloat(req.body.amount);
    u.transactions.unshift({ orderDate: new Date().toLocaleString(), type: 'Withdraw', pair: req.body.currency, amount: `-${req.body.amount}`, total: 'Success' });
    res.json({ message: 'OK' });
});
app.post('/buy', (req, res) => {
    const u = getUser(req);
    const { pair, amount } = req.body;
    const [b, q] = pair.split('/');
    const cost = amount * prices[b];
    if (u.holdings[q] < cost) return res.status(400).json({message:'Insufficient'});
    u.holdings[q] -= cost; u.holdings[b] += parseFloat(amount);
    u.transactions.unshift({ orderDate: new Date().toLocaleString(), type: 'Buy', pair, price: prices[b].toFixed(6), amount, total: cost.toFixed(2) });
    res.json({ message: 'OK' });
});
app.post('/sell', (req, res) => {
    const u = getUser(req);
    const { pair, amount } = req.body;
    const [b, q] = pair.split('/');
    const val = amount * prices[b];
    if (u.holdings[b] < amount) return res.status(400).json({message:'Insufficient'});
    u.holdings[b] -= parseFloat(amount); u.holdings[q] += val;
    u.transactions.unshift({ orderDate: new Date().toLocaleString(), type: 'Sell', pair, price: prices[b].toFixed(6), amount, total: val.toFixed(2) });
    res.json({ message: 'OK' });
});
app.post('/transfer-to-casino', (req, res) => {
    const u = getUser(req);
    if (u.holdings[req.body.currency] < req.body.amount) return res.status(400).json({message:'Insufficient'});
    u.holdings[req.body.currency] -= parseFloat(req.body.amount);
    u.casinoHoldings[req.body.currency] += parseFloat(req.body.amount);
    res.json({ message: 'OK' });
});
app.post('/transfer-to-wallet', (req, res) => {
    const u = getUser(req);
    if (u.casinoHoldings[req.body.currency] < req.body.amount) return res.status(400).json({message:'Insufficient'});
    u.casinoHoldings[req.body.currency] -= parseFloat(req.body.amount);
    u.holdings[req.body.currency] += parseFloat(req.body.amount);
    res.json({ message: 'OK' });
});

app.post('/casino/play', (req, res) => {
    const u = getUser(req);
    const { amount, currency, winChance } = req.body;
    if (u.casinoHoldings[currency] < amount) return res.status(400).json({message:'Insufficient'});
    
    u.nonce++; // Increment nonce BEFORE rolling
    const roll = generateRoll(u.serverSeed, u.clientSeed, u.nonce);
    const chance = parseFloat(winChance) || 50;
    const target = 100 - chance;
    const isWin = roll >= target;
    const mult = 99/chance;
    const profit = isWin ? (amount*mult)-amount : -amount;
    
    u.casinoHoldings[currency] += profit; // Add profit or deduct loss (if profit is negative)
    
    const rec = { id: Date.now(), time: new Date(), bet: amount, multiplier: mult.toFixed(4), target: target.toFixed(2), roll: roll.toFixed(2), win: isWin, profit, nonce: u.nonce };
    u.casinoHistory.unshift(rec);
    if(u.casinoHistory.length>50) u.casinoHistory.pop();
    
    res.json({ result: isWin?'win':'lose', record: rec });
});

app.post('/market-hack', (req, res) => {
    marketHackMultiplier = req.body.direction === 'up' ? 1.1 : 0.9;
    setTimeout(() => marketHackMultiplier=1, 10000);
    res.json({message:'OK'});
});

app.get('/transactions/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
});

app.listen(3000, () => console.log('Server on 3000'));
