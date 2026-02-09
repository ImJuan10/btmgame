const express = require('express');
const cors = require('cors');
const events = require('events');
const crypto = require('crypto');
const app = express();

app.use(cors());
app.use(express.json());

// ==========================================
// 1. ORIGINAL SIMULATION LOGIC (RESTORED)
// ==========================================

let prices = {
    BTC: 0.00089,
    ETH: 0.32,
    DOGE: 0.0000869,
    SHIB: 0.000007,
    TON: 0.39,
    TRX: 0.08,
    LTC: 1.1,
    LUNA: 1.35,
    BC: 0.0001,
    USDT: 1,
};

let marketHackMultiplier = 1;
let currentDynamicProbability = 0;

let probabilityState = {
    targetProb: 0.58,
    duration: 0,
    remainingTime: 0,
    startTime: Date.now(),
    transitioning: false,
    startTransitionProb: 0,
    endTransitionProb: 0,
    transitionDuration: 0,
    transitionElapsedTime: 0
};

function generateRandomDuration() {
    return Math.floor(Math.random() * (45 - 30 + 1)) + 30;
}

function simulatePriceChange(currentPrice, currency) {
    // Configuration for trends
    let trendDirection = Math.random() < 0.55 ? 1 : -1;
    let trendLength = Math.floor(Math.random() * 10) + 5;
    let trendStrength = Math.random() * 0.02 + 0.01;

    // Update dynamic probability logic
    const currentTime = Date.now();
    const elapsedSinceLastUpdate = (currentTime - probabilityState.startTime) / 1000;

    if (!probabilityState.transitioning) {
        if (elapsedSinceLastUpdate >= probabilityState.duration) {
            probabilityState.startTime = currentTime;
            probabilityState.transitioning = true;
            probabilityState.startTransitionProb = currentDynamicProbability;

            if (probabilityState.targetProb === 0.58) {
                probabilityState.targetProb = 0.46;
                probabilityState.endTransitionProb = 0.46;
            } else {
                probabilityState.targetProb = 0.58;
                probabilityState.endTransitionProb = 0.58;
            }
            probabilityState.transitionDuration = Math.floor(Math.random() * (45 - 30 + 1)) + 30;
            probabilityState.transitionElapsedTime = 0;
        } else {
            currentDynamicProbability = probabilityState.targetProb * marketHackMultiplier;
        }
    } else {
        probabilityState.transitionElapsedTime += (currentTime - probabilityState.startTime) / 1000;
        probabilityState.startTime = currentTime;

        if (probabilityState.transitionElapsedTime >= probabilityState.transitionDuration) {
            currentDynamicProbability = probabilityState.endTransitionProb * marketHackMultiplier;
            probabilityState.transitioning = false;
            probabilityState.duration = generateRandomDuration();
        } else {
            const progress = probabilityState.transitionElapsedTime / probabilityState.transitionDuration;
            currentDynamicProbability = (probabilityState.startTransitionProb + (probabilityState.endTransitionProb - probabilityState.startTransitionProb) * progress) * marketHackMultiplier;
        }
    }

    let fluctuationStrength = Math.random() * 0.005 * (Math.random() < currentDynamicProbability ? -1 : 1);
    const spikeProbability = 0.005;
    const spikeMagnitude = Math.random() * 0.1 + 0.05;

    // Static property for trend state (simulated per function call scope if needed, simplified here)
    if (!simulatePriceChange.trendState) {
        simulatePriceChange.trendState = { remaining: 0, direction: 1 };
    }

    let changePercentage;

    if (simulatePriceChange.trendState.remaining > 0) {
        changePercentage = simulatePriceChange.trendState.direction * trendStrength;
        simulatePriceChange.trendState.remaining--;
    } else {
        simulatePriceChange.trendState = {
            remaining: Math.floor(Math.random() * 10) + 5,
            direction: Math.random() < currentDynamicProbability ? 1 : -1,
        };
        changePercentage = fluctuationStrength;
    }

    if (Math.random() < spikeProbability) {
        changePercentage += spikeMagnitude * (Math.random() < currentDynamicProbability ? -1 : 1);
    }

    let newPrice = currentPrice * (1 + changePercentage);

    // Stabilizers
    const slowIncreaseMultiplier = 0.999;
    if (newPrice >= 3857 && currency === 'ETH') newPrice *= slowIncreaseMultiplier;
    if (newPrice >= 5.75 && currency === 'DOGE') newPrice *= slowIncreaseMultiplier;
    if (newPrice >= 0.075 && currency === 'SHIB') newPrice *= slowIncreaseMultiplier;
    if (newPrice >= 15.12 && currency === 'TON') newPrice *= slowIncreaseMultiplier;
    if (newPrice >= 315.12 && (currency === 'TRX' || currency === 'LTC' || currency === 'LUNA')) newPrice *= slowIncreaseMultiplier;
    if (newPrice >= 100000 && (currency === 'BTC' || currency === 'BC')) newPrice *= slowIncreaseMultiplier;

    if (currency === 'USDT') return Math.random() * (1.001 - 0.999) + 0.999;
    return Math.max(newPrice, 0.0000000000001);
}

// Run the simulation loop
setInterval(() => {
    for (const currency in prices) {
        prices[currency] = simulatePriceChange(prices[currency], currency);
    }
}, 1000);


// ==========================================
// 2. MULTI-USER & CASINO LOGIC
// ==========================================

// Helper: Generate fake address
const genAddr = (coin) => {
    const prefix = coin === 'BTC' ? 'bc1q' : coin === 'ETH' || coin === 'USDT' ? '0x' : 'T';
    return prefix + crypto.randomBytes(8).toString('hex');
};

const COINS = Object.keys(prices);

// Initialize Users
const generateServerSeed = () => crypto.randomBytes(32).toString('hex');
const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');

const USERS = {
    'user_1': {
        name: "Whale Trader",
        holdings: { ...Object.fromEntries(COINS.map(c => [c, 0])), USDT: 50000, BC: 1000 },
        casinoHoldings: { USDT: 0, BC: 500 },
        addresses: {},
        transactions: [],
        casinoHistory: [],
        serverSeed: generateServerSeed(),
        clientSeed: "lucky_client",
        nonce: 0
    },
    'user_2': {
        name: "Newbie Degen",
        holdings: { ...Object.fromEntries(COINS.map(c => [c, 0])), USDT: 100, BC: 10 },
        casinoHoldings: { USDT: 0, BC: 0 },
        addresses: {},
        transactions: [],
        casinoHistory: [],
        serverSeed: generateServerSeed(),
        clientSeed: "newbie_seed",
        nonce: 0
    }
};

// Assign addresses
Object.values(USERS).forEach(u => COINS.forEach(c => u.addresses[c] = genAddr(c)));

// Middleware to get current user
const getUser = (req) => {
    const uid = req.headers['x-user-id'] || 'user_1';
    return USERS[uid] || USERS['user_1'];
};

// Casino Math
const generateRoll = (serverSeed, clientSeed, nonce) => {
    const hmac = crypto.createHmac('sha256', serverSeed);
    hmac.update(`${clientSeed}:${nonce}`);
    const hash = hmac.digest('hex');
    const subHash = hash.substring(0, 8);
    const decimal = parseInt(subHash, 16);
    return (decimal % 10001) / 100;
};

// ==========================================
// 3. API ENDPOINTS
// ==========================================

// --- MARKET ---
app.get('/prices', (req, res) => res.json(prices));

app.get('/prices/:pair', (req, res) => {
    const base = req.params.pair.split('/')[0];
    const current = prices[base] || 0;
    // Mock history based on current price to allow chart rendering
    const history = Array.from({length: 50}, (_, i) => ({
        price: current * (1 + (Math.random() - 0.5) * 0.05),
        timestamp: Date.now() - (i * 60000)
    })).reverse();
    res.json(history);
});

app.post('/market-hack', (req, res) => {
    const { direction } = req.body;
    marketHackMultiplier = direction === 'up' ? 1.5 : 0.7;
    setTimeout(() => { marketHackMultiplier = 1; }, 60000);
    res.json({ message: `Market set to ${direction}` });
});

// --- USER DATA ---
app.get('/holdings', (req, res) => {
    const u = getUser(req);
    res.json({ wallet: u.holdings, casino: u.casinoHoldings, addresses: u.addresses });
});

app.get('/transactions', (req, res) => res.json(getUser(req).transactions));
app.get('/balances', (req, res) => res.json([])); // Placeholder

// --- CASINO & FAIRNESS ---
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
    const nextRoll = generateRoll(u.serverSeed, u.clientSeed, u.nonce + 1);
    res.json({ 
        serverSeed: u.serverSeed, 
        nextNonce: u.nonce + 1,
        nextRoll: nextRoll.toFixed(2)
    });
});

// --- ACTIONS ---
function addTx(u, type, pair, amount, total) {
    u.transactions.unshift({ 
        orderDate: new Date().toLocaleString(), 
        type, pair, price: prices[pair]?.toFixed(6) || '1.00', 
        amount, total 
    });
}

app.post('/deposit', (req, res) => {
    const u = getUser(req);
    const { amount, currency } = req.body;
    u.holdings[currency] += parseFloat(amount);
    addTx(u, 'Deposit', currency, `+${amount}`, 'Success');
    res.json({ message: 'Success' });
});

app.post('/withdraw', (req, res) => {
    const u = getUser(req);
    const { amount, currency, address } = req.body;
    if (u.holdings[currency] < amount) return res.status(400).json({message: 'Insufficient'});
    u.holdings[currency] -= parseFloat(amount);
    addTx(u, 'Withdraw', currency, `-${amount}`, `To: ${address.slice(0,6)}...`);
    res.json({ message: 'Success' });
});

app.post('/buy', (req, res) => {
    const u = getUser(req);
    const { pair, amount } = req.body;
    const [b, q] = pair.split('/');
    const cost = parseFloat(amount) * prices[b];
    if (u.holdings[q] < cost) return res.status(400).json({message: 'Insufficient USDT'});
    u.holdings[q] -= cost; u.holdings[b] += parseFloat(amount);
    addTx(u, 'Buy', pair, `+${amount}`, `-${cost.toFixed(2)} USDT`);
    res.json({ message: 'OK' });
});

app.post('/sell', (req, res) => {
    const u = getUser(req);
    const { pair, amount } = req.body;
    const [b, q] = pair.split('/');
    const val = parseFloat(amount) * prices[b];
    if (u.holdings[b] < amount) return res.status(400).json({message: `Insufficient ${b}`});
    u.holdings[b] -= parseFloat(amount); u.holdings[q] += val;
    addTx(u, 'Sell', pair, `-${amount}`, `+${val.toFixed(2)} USDT`);
    res.json({ message: 'OK' });
});

app.post('/transfer-to-casino', (req, res) => {
    const u = getUser(req);
    const { amount, currency } = req.body;
    if (u.holdings[currency] < amount) return res.status(400).json({message: 'Insufficient'});
    u.holdings[currency] -= parseFloat(amount);
    u.casinoHoldings[currency] += parseFloat(amount);
    addTx(u, 'Transfer Out', currency, `-${amount}`, 'To Casino');
    res.json({ message: 'OK' });
});

app.post('/transfer-to-wallet', (req, res) => {
    const u = getUser(req);
    const { amount, currency } = req.body;
    if (u.casinoHoldings[currency] < amount) return res.status(400).json({message: 'Insufficient'});
    u.casinoHoldings[currency] -= parseFloat(amount);
    u.holdings[currency] += parseFloat(amount);
    addTx(u, 'Deposit', currency, `+${amount}`, 'From Casino');
    res.json({ message: 'OK' });
});

app.post('/casino/play', (req, res) => {
    const u = getUser(req);
    const { amount, currency, winChance } = req.body;
    
    if (u.casinoHoldings[currency] < amount) return res.status(400).json({message: 'Insufficient Casino Funds'});

    u.nonce++; 
    const roll = generateRoll(u.serverSeed, u.clientSeed, u.nonce);
    const chance = parseFloat(winChance) || 50;
    const target = 100 - chance;
    const multiplier = 99 / chance;
    
    const isWin = roll >= target;
    const profit = isWin ? (amount * multiplier) - amount : -amount;

    if (isWin) u.casinoHoldings[currency] += profit;
    else u.casinoHoldings[currency] -= parseFloat(amount);

    const record = { 
        id: Date.now(), time: new Date(), bet: amount, 
        multiplier: multiplier.toFixed(4), target: target.toFixed(2), 
        roll: roll.toFixed(2), win: isWin, profit, 
        nonce: u.nonce, clientSeed: u.clientSeed, hashedServerSeed: sha256(u.serverSeed) 
    };
    
    u.casinoHistory.unshift(record);
    if(u.casinoHistory.length > 50) u.casinoHistory.pop();

    res.json({ result: isWin ? 'win' : 'lose', record });
});

app.get('/transactions/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on ${PORT}`));
