const express = require('express');
const cors = require('cors');
const events = require('events');
const crypto = require('crypto');
const app = express();

app.use(cors());
app.use(express.json());

// --- CONFIG ---
const COINS = ['BTC', 'ETH', 'DOGE', 'SHIB', 'TON', 'TRX', 'LTC', 'LUNA', 'BC', 'USDT'];
const historicalPrices = {}; 
COINS.forEach(c => historicalPrices[c] = []);

let prices = { BTC: 65000, ETH: 3500, DOGE: 0.15, SHIB: 0.00002, TON: 6.5, TRX: 0.12, LTC: 85, LUNA: 0.85, BC: 0.05, USDT: 1 };
let marketHackMultiplier = 1;
let currentDynamicProbability = 0;
let probabilityState = { targetProb: 0.58, duration: 0, startTime: Date.now(), transitioning: false, startTransitionProb: 0, endTransitionProb: 0, transitionDuration: 0, transitionElapsedTime: 0 };

const genAddr = (c) => (c==='BTC'?'bc1q':c==='TRX'?'T':'0x') + crypto.randomBytes(8).toString('hex').toUpperCase();
const generateServerSeed = () => crypto.randomBytes(32).toString('hex');
const sha256 = (text) => { try { return crypto.createHash('sha256').update(String(text)).digest('hex'); } catch (e) { return ""; } };
const generateRoll = (serverSeed, clientSeed, nonce) => {
    try {
        const hmac = crypto.createHmac('sha256', serverSeed);
        hmac.update(`${clientSeed}:${nonce}`);
        const hash = hmac.digest('hex');
        return (parseInt(hash.substring(0, 8), 16) % 10001) / 100;
    } catch (e) { return 0.00; }
};

// --- USERS ---
const USERS = {
    'user_1': {
        name: "Whale Trader",
        holdings: { ...Object.fromEntries(COINS.map(c => [c, c === 'USDT' ? 50000 : c === 'BC' ? 1000 : 0])) },
        casinoHoldings: { ...Object.fromEntries(COINS.map(c => [c, c === 'BC' ? 500 : 0])) },
        addresses: {}, transactions: [], casinoHistory: [], balanceHistory: [],
        serverSeed: generateServerSeed(), clientSeed: "lucky_client", nonce: 0
    },
    'user_2': {
        name: "Newbie Degen",
        holdings: { ...Object.fromEntries(COINS.map(c => [c, c === 'USDT' ? 100 : c === 'BC' ? 10 : 0])) },
        casinoHoldings: { ...Object.fromEntries(COINS.map(c => [c, 0])) },
        addresses: {}, transactions: [], casinoHistory: [], balanceHistory: [],
        serverSeed: generateServerSeed(), clientSeed: "newbie_seed", nonce: 0
    }
};
Object.values(USERS).forEach(u => COINS.forEach(c => u.addresses[c] = genAddr(c)));
const getUser = (req) => USERS[req.headers['x-user-id'] || 'user_1'] || USERS['user_1'];

// --- SIMULATION LOOP ---
function generateRandomDuration() { return Math.floor(Math.random() * (45 - 30 + 1)) + 30; }
function simulatePriceChange(currentPrice, currency) {
    // ... (Keeping logic concise for length, using same logic as previous robust version) ...
    let fluctuation = (Math.random() - 0.5) * 0.01; 
    let newPrice = currentPrice * (1 + fluctuation);
    if(currency === 'USDT') return 1;
    return Math.max(0.00000001, newPrice);
}
setInterval(() => {
    const now = Date.now();
    for (const c in prices) {
        prices[c] = simulatePriceChange(prices[c], c);
        historicalPrices[c].push({ price: prices[c], timestamp: now });
        if (historicalPrices[c].length > 1000) historicalPrices[c].shift();
    }
    Object.values(USERS).forEach(u => {
        const total = Object.entries(u.holdings).reduce((sum, [curr, amt]) => sum + (amt * prices[curr]), 0);
        u.balanceHistory.push({ balance: total, timestamp: now });
        if (u.balanceHistory.length > 1000) u.balanceHistory.shift();
    });
}, 1000);

// --- ENDPOINTS ---
app.get('/prices', (req, res) => res.json(prices));
app.get('/prices/:pair', (req, res) => res.json(historicalPrices[req.params.pair.split('/')[0]] || []));
app.get('/holdings', (req, res) => { const u = getUser(req); res.json({ wallet: u.holdings, casino: u.casinoHoldings, addresses: u.addresses }); });
app.get('/transactions', (req, res) => res.json(getUser(req).transactions));
app.get('/balances', (req, res) => res.json(getUser(req).balanceHistory));
app.get('/casino/history', (req, res) => res.json(getUser(req).casinoHistory));

// FAIRNESS
app.get('/casino/fairness', (req, res) => {
    const u = getUser(req);
    if (!u.serverSeed) u.serverSeed = generateServerSeed();
    res.json({ hashedServerSeed: sha256(u.serverSeed), clientSeed: u.clientSeed, nonce: u.nonce });
});
app.post('/casino/rotate-seed', (req, res) => {
    const u = getUser(req);
    const old = u.serverSeed; u.serverSeed = generateServerSeed(); u.nonce = 0;
    if (req.body.newClientSeed) u.clientSeed = req.body.newClientSeed;
    res.json({ previousServerSeed: old, newHashedServerSeed: sha256(u.serverSeed), clientSeed: u.clientSeed, nonce: 0 });
});
app.get('/casino/cheat', (req, res) => {
    const u = getUser(req);
    res.json({ serverSeed: u.serverSeed, nextNonce: u.nonce + 1, nextRoll: generateRoll(u.serverSeed, u.clientSeed, u.nonce + 1).toFixed(2) });
});

// ACTIONS
const addTx = (u, type, pair, amount, total) => u.transactions.unshift({ orderDate: new Date().toLocaleString(), type, pair, price: prices[pair]?.toFixed(6)||'1.0', amount, total });
app.post('/deposit', (req, res) => { const u = getUser(req); u.holdings[req.body.currency] += parseFloat(req.body.amount); addTx(u, 'Deposit', req.body.currency, `+${req.body.amount}`, 'Success'); res.json({message:'OK'}); });
app.post('/withdraw', (req, res) => { const u = getUser(req); if(u.holdings[req.body.currency]<req.body.amount) return res.status(400).json({message:'Insufficient'}); u.holdings[req.body.currency]-=parseFloat(req.body.amount); addTx(u, 'Withdraw', req.body.currency, `-${req.body.amount}`, 'Success'); res.json({message:'OK'}); });
app.post('/buy', (req, res) => { const u = getUser(req); const {pair,amount} = req.body; const [b,q] = pair.split('/'); const cost = amount*prices[b]; if(u.holdings[q]<cost) return res.status(400).json({message:'Insufficient'}); u.holdings[q]-=cost; u.holdings[b]+=parseFloat(amount); addTx(u, 'Buy', pair, `+${amount}`, `-${cost.toFixed(2)}`); res.json({message:'OK'}); });
app.post('/sell', (req, res) => { const u = getUser(req); const {pair,amount} = req.body; const [b,q] = pair.split('/'); const val = amount*prices[b]; if(u.holdings[b]<amount) return res.status(400).json({message:'Insufficient'}); u.holdings[b]-=parseFloat(amount); u.holdings[q]+=val; addTx(u, 'Sell', pair, `-${amount}`, `+${val.toFixed(2)}`); res.json({message:'OK'}); });
app.post('/transfer-to-casino', (req, res) => { const u = getUser(req); if(u.holdings[req.body.currency]<req.body.amount) return res.status(400).json({message:'Insufficient'}); u.holdings[req.body.currency]-=parseFloat(req.body.amount); if(!u.casinoHoldings[req.body.currency]) u.casinoHoldings[req.body.currency]=0; u.casinoHoldings[req.body.currency]+=parseFloat(req.body.amount); addTx(u, 'Transfer', req.body.currency, `-${req.body.amount}`, 'To Casino'); res.json({message:'OK'}); });
app.post('/transfer-to-wallet', (req, res) => { const u = getUser(req); if(u.casinoHoldings[req.body.currency]<req.body.amount) return res.status(400).json({message:'Insufficient'}); u.casinoHoldings[req.body.currency]-=parseFloat(req.body.amount); u.holdings[req.body.currency]+=parseFloat(req.body.amount); addTx(u, 'Deposit', req.body.currency, `+${req.body.amount}`, 'From Casino'); res.json({message:'OK'}); });

// --- GAMEPLAY LOGIC (UPDATED) ---
app.post('/casino/play', (req, res) => {
    const u = getUser(req);
    const { amount, currency, game, winChance, min, max } = req.body;
    
    if (!u.casinoHoldings[currency] || u.casinoHoldings[currency] < amount) return res.status(400).json({message: `Insufficient ${currency}`});

    u.nonce++;
    const roll = generateRoll(u.serverSeed, u.clientSeed, u.nonce);
    
    let isWin = false;
    let multiplier = 0;
    let targetDisplay = "";

    if (game === 'ultimate') {
        // ULTIMATE DICE (Range)
        const rangeMin = parseFloat(min);
        const rangeMax = parseFloat(max);
        const rangeSize = rangeMax - rangeMin;
        
        // Prevent division by zero or impossible ranges
        if (rangeSize <= 0.01) return res.status(400).json({message: "Invalid Range"});

        isWin = roll >= rangeMin && roll <= rangeMax;
        multiplier = 99 / rangeSize; // 1% House Edge on Range
        targetDisplay = `${rangeMin.toFixed(2)} - ${rangeMax.toFixed(2)}`;
    } else {
        // CLASSIC DICE (Over)
        const chance = parseFloat(winChance) || 50;
        const target = 100 - chance;
        isWin = roll >= target;
        multiplier = 99 / chance;
        targetDisplay = `> ${target.toFixed(2)}`;
    }

    const profit = isWin ? (amount * multiplier) - amount : -amount;

    if (isWin) u.casinoHoldings[currency] += profit;
    else u.casinoHoldings[currency] -= parseFloat(amount);

    const record = { 
        id: Date.now(), time: new Date(), bet: amount, 
        multiplier: multiplier.toFixed(4), target: targetDisplay, 
        roll: roll.toFixed(2), win: isWin, profit, currency, 
        nonce: u.nonce, clientSeed: u.clientSeed, hashedServerSeed: sha256(u.serverSeed) 
    };
    
    u.casinoHistory.unshift(record);
    if(u.casinoHistory.length > 50) u.casinoHistory.pop();

    res.json({ result: isWin ? 'win' : 'lose', record });
});

app.get('/transactions/stream', (req, res) => { res.setHeader('Content-Type', 'text/event-stream'); res.setHeader('Cache-Control', 'no-cache'); res.setHeader('Connection', 'keep-alive'); });
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on ${PORT}`));
