const express = require('express');
const cors = require('cors');
const events = require('events');
const crypto = require('crypto');
const app = express();

app.use(cors());
app.use(express.json());

// ==========================================
// 1. ORIGINAL & COMPLEX SIMULATION LOGIC (RESTORED)
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

// Global History to prevent "Snaking"/Resets
const historicalPrices = {};
Object.keys(prices).forEach(c => historicalPrices[c] = []);

// --- ORIGINAL STATE VARIABLES ---
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
    return Math.floor(Math.random() * (45 - 30 + 1)) + 30; // Between 30 and 45 seconds
}

// --- THE ORIGINAL FUNCTION (VERBATIM) ---
function simulatePriceChange(currentPrice, currency) {
    // Configuration for trends
    let trendDirection = Math.random() < 0.55 ? 1 : -1; // 1 for upward, -1 for downward
    let trendLength = Math.floor(Math.random() * 10) + 5; // 5 to 15 iterations
    let trendStrength = Math.random() * 0.02 + 0.01; // 1% to 3% per step

    // Update dynamic probability logic
    const currentTime = Date.now();
    const elapsedSinceLastUpdate = (currentTime - probabilityState.startTime) / 1000; // in seconds

    if (!probabilityState.transitioning) {
        // If not transitioning, check if it's time to start a transition or update static phase
        if (elapsedSinceLastUpdate >= probabilityState.duration) {
            probabilityState.startTime = currentTime; // Reset start time for the new phase
            probabilityState.transitioning = true;
            probabilityState.startTransitionProb = currentDynamicProbability;

            if (probabilityState.targetProb === 0.58) {
                probabilityState.targetProb = 0.46;
                probabilityState.endTransitionProb = 0.46;
            } else {
                probabilityState.targetProb = 0.58;
                probabilityState.endTransitionProb = 0.58;
            }
            probabilityState.transitionDuration = Math.floor(Math.random() * (45 - 30 + 1)) + 30; // New random duration for the next phase
            probabilityState.transitionElapsedTime = 0;
        } else {
            // Still in a static phase, maintain the target probability
            currentDynamicProbability = probabilityState.targetProb * marketHackMultiplier;
        }
    } else {
        // Currently transitioning
        probabilityState.transitionElapsedTime += (currentTime - probabilityState.startTime) / 1000;
        probabilityState.startTime = currentTime; // Reset for next tick

        if (probabilityState.transitionElapsedTime >= probabilityState.transitionDuration) {
            // Transition finished, set to target and reset for next static phase
            currentDynamicProbability = probabilityState.endTransitionProb * marketHackMultiplier;
            probabilityState.transitioning = false;
            probabilityState.duration = generateRandomDuration(); // Set duration for the new static phase
            probabilityState.remainingTime = probabilityState.duration; // Reset remaining time
        } else {
            // Calculate interpolated probability
            const progress = probabilityState.transitionElapsedTime / probabilityState.transitionDuration;
            currentDynamicProbability = (probabilityState.startTransitionProb + (probabilityState.endTransitionProb - probabilityState.startTransitionProb) * progress) * marketHackMultiplier;
        }
    }

    // Minor fluctuations outside of trends
    let fluctuationStrength = Math.random() * 0.005 * (Math.random() < currentDynamicProbability ? -1 : 1);

    // Spike/Dip Probability
    const spikeProbability = 0.005;
    const spikeMagnitude = Math.random() * 0.1 + 0.05; // 5% to 15%

    // Track trend state (Global state attached to function to keep trends connected)
    if (!simulatePriceChange.trendState) {
        simulatePriceChange.trendState = {
            remaining: trendLength,
            direction: trendDirection,
        };
    }

    let changePercentage;

    // Apply trend if active
    if (simulatePriceChange.trendState.remaining > 0) {
        changePercentage = simulatePriceChange.trendState.direction * trendStrength;
        simulatePriceChange.trendState.remaining--;
    } else {
        // Reset trend when it ends
        simulatePriceChange.trendState = {
            remaining: Math.floor(Math.random() * 10) + 5, // New trend length
            direction: Math.random() < currentDynamicProbability ? 1 : -1, // Random direction based on currentDynamicProbability
        };
        changePercentage = fluctuationStrength;
    }

    // Apply spike/dip randomly
    if (Math.random() < spikeProbability) {
        changePercentage += spikeMagnitude * (Math.random() < currentDynamicProbability ? -1 : 1);
    }

    // Calculate new price
    let newPrice = currentPrice * (1 + changePercentage);

    // Define multipliers
    const slowIncreaseMultiplier = 0.999; // Slow down price growth

    // Apply multipliers based on price range (YOUR SPECIFIC LOGIC)
    if (newPrice >= 3857 && currency === 'ETH') newPrice *= slowIncreaseMultiplier;
    if (newPrice >= 5.75 && currency === 'DOGE') newPrice *= slowIncreaseMultiplier;
    if (newPrice >= 0.075 && currency === 'SHIB') newPrice *= slowIncreaseMultiplier;
    if (newPrice >= 15.12 && currency === 'TON') newPrice *= slowIncreaseMultiplier;
    if (newPrice >= 315.12 && (currency === 'TRX' || currency === 'LTC' || currency === 'LUNA')) newPrice *= slowIncreaseMultiplier;
    if (newPrice >= 100000 && (currency === 'BTC' || currency === 'BC')) newPrice *= slowIncreaseMultiplier;

    // Ensure stability for USDT or similar stablecoins
    if (currency === 'USDT') {
        return Math.random() * (1.001 - 0.999) + 0.999; // Tiny fluctuation around 1.00
    }

    // Format price for low-value assets
    return Math.max(newPrice, 0.0000000000001); // Ensure no negative or near-zero prices
}

// === MAIN LOOP ===
setInterval(() => {
    const now = Date.now();
    for (const currency in prices) {
        prices[currency] = simulatePriceChange(prices[currency], currency);
        
        // Push to history
        historicalPrices[currency].push({ price: prices[currency], timestamp: now });
        if (historicalPrices[currency].length > 1000) historicalPrices[currency].shift();
    }
    
    // Update User Balance History
    Object.values(USERS).forEach(u => {
        const total = Object.entries(u.holdings).reduce((sum, [curr, amt]) => sum + (amt * prices[curr]), 0);
        u.balanceHistory.push({ balance: total, timestamp: now });
        if (u.balanceHistory.length > 1000) u.balanceHistory.shift();
    });
}, 1000);


// ==========================================
// 2. USER SYSTEM & CASINO (Kept the new features)
// ==========================================

const genAddr = (coin) => (coin==='BTC'?'bc1q':coin==='TRX'?'T':'0x') + crypto.randomBytes(8).toString('hex').toUpperCase();
const generateServerSeed = () => crypto.randomBytes(32).toString('hex');
const sha256 = (text) => {
    try { return crypto.createHash('sha256').update(String(text)).digest('hex'); } catch (e) { return ""; }
};
const generateRoll = (serverSeed, clientSeed, nonce) => {
    try {
        const hmac = crypto.createHmac('sha256', serverSeed);
        hmac.update(`${clientSeed}:${nonce}`);
        const hash = hmac.digest('hex');
        return (parseInt(hash.substring(0, 8), 16) % 10001) / 100;
    } catch(e) { return 0; }
};

const USERS = {
    'user_1': {
        name: "Whale Trader",
        // Init all coins
        holdings: { ...Object.fromEntries(Object.keys(prices).map(c => [c, c==='USDT'?50000:c==='BC'?1000:0])) },
        casinoHoldings: { ...Object.fromEntries(Object.keys(prices).map(c => [c, c==='BC'?500:0])) },
        addresses: {}, transactions: [], casinoHistory: [], balanceHistory: [],
        serverSeed: generateServerSeed(), clientSeed: "lucky_client", nonce: 0
    },
    'user_2': {
        name: "Newbie Degen",
        holdings: { ...Object.fromEntries(Object.keys(prices).map(c => [c, c==='USDT'?100:c==='BC'?10:0])) },
        casinoHoldings: { ...Object.fromEntries(Object.keys(prices).map(c => [c, 0])) },
        addresses: {}, transactions: [], casinoHistory: [], balanceHistory: [],
        serverSeed: generateServerSeed(), clientSeed: "newbie_seed", nonce: 0
    }
};
Object.values(USERS).forEach(u => Object.keys(prices).forEach(c => u.addresses[c] = genAddr(c)));

const getUser = (req) => { const uid = req.headers['x-user-id'] || 'user_1'; return USERS[uid] || USERS['user_1']; };

// ==========================================
// 3. API ENDPOINTS
// ==========================================

app.get('/prices', (req, res) => res.json(prices));
app.get('/prices/:pair', (req, res) => res.json(historicalPrices[req.params.pair.split('/')[0]] || []));

app.get('/holdings', (req, res) => { const u = getUser(req); res.json({ wallet: u.holdings, casino: u.casinoHoldings, addresses: u.addresses }); });
app.get('/transactions', (req, res) => res.json(getUser(req).transactions));
app.get('/balances', (req, res) => res.json(getUser(req).balanceHistory));

// CASINO
app.get('/casino/history', (req, res) => res.json(getUser(req).casinoHistory));
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

// GAMEPLAY
app.post('/casino/play', (req, res) => {
    const u = getUser(req);
    const { amount, currency, game, winChance, min, max } = req.body;
    
    // Ensure casino holding exists
    if (!u.casinoHoldings[currency]) u.casinoHoldings[currency] = 0;
    
    if (u.casinoHoldings[currency] < amount) return res.status(400).json({message: `Insufficient ${currency}`});

    u.nonce++; 
    const roll = generateRoll(u.serverSeed, u.clientSeed, u.nonce);
    
    let isWin = false;
    let multiplier = 0;
    let targetDisplay = "";

    if (game === 'ultimate') {
        const rangeMin = parseFloat(min);
        const rangeMax = parseFloat(max);
        const rangeSize = rangeMax - rangeMin;
        if (rangeSize <= 0.01) return res.status(400).json({message: "Invalid Range"});
        
        // Scale roll to 0-10000 for comparison
        const scaledRoll = roll * 100;
        
        isWin = scaledRoll >= rangeMin && scaledRoll <= rangeMax;
        multiplier = 9900 / rangeSize;
        targetDisplay = `${rangeMin.toFixed(0)} - ${rangeMax.toFixed(0)}`;
    } else {
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
        id: Date.now(), 
        time: new Date(), 
        bet: amount, 
        multiplier: multiplier.toFixed(4), 
        target: targetDisplay, 
        roll: game === 'ultimate' ? (roll * 100).toFixed(0) : roll.toFixed(2), 
        win: isWin, 
        profit, 
        currency, 
        game: game, 
        nonce: u.nonce, 
        clientSeed: u.clientSeed, 
        hashedServerSeed: sha256(u.serverSeed) 
    };
    
    u.casinoHistory.unshift(record);
    if(u.casinoHistory.length > 50) u.casinoHistory.pop();

    res.json({ result: isWin ? 'win' : 'lose', record });
});

// ACTIONS
const addTx = (u, type, pair, amount, total) => {
    u.transactions.unshift({ orderDate: new Date().toLocaleString(), type, pair, price: prices[pair]?.toFixed(6) || '1.00', amount, total });
};
app.post('/deposit', (req, res) => { const u = getUser(req); u.holdings[req.body.currency] += parseFloat(req.body.amount); addTx(u, 'Deposit', req.body.currency, `+${req.body.amount}`, 'Success'); res.json({ message: 'Success' }); });
app.post('/withdraw', (req, res) => { const u = getUser(req); if (u.holdings[req.body.currency] < req.body.amount) return res.status(400).json({message: 'Insufficient'}); u.holdings[req.body.currency] -= parseFloat(req.body.amount); addTx(u, 'Withdraw', req.body.currency, `-${req.body.amount}`, 'Success'); res.json({ message: 'Success' }); });
app.post('/buy', (req, res) => { const u = getUser(req); const { pair, amount } = req.body; const [b, q] = pair.split('/'); const cost = parseFloat(amount) * prices[b]; if (u.holdings[q] < cost) return res.status(400).json({message: 'Insufficient USDT'}); u.holdings[q] -= cost; u.holdings[b] += parseFloat(amount); addTx(u, 'Buy', pair, `+${amount}`, `-${cost.toFixed(2)} USDT`); res.json({ message: 'OK' }); });
app.post('/sell', (req, res) => { const u = getUser(req); const { pair, amount } = req.body; const [b, q] = pair.split('/'); const val = parseFloat(amount) * prices[b]; if (u.holdings[b] < amount) return res.status(400).json({message: `Insufficient ${b}`}); u.holdings[b] -= parseFloat(amount); u.holdings[q] += val; addTx(u, 'Sell', pair, `-${amount}`, `+${val.toFixed(2)} USDT`); res.json({ message: 'OK' }); });
app.post('/transfer-to-casino', (req, res) => { const u = getUser(req); if (u.holdings[req.body.currency] < req.body.amount) return res.status(400).json({message: 'Insufficient'}); u.holdings[req.body.currency] -= parseFloat(req.body.amount); if(!u.casinoHoldings[req.body.currency]) u.casinoHoldings[req.body.currency]=0; u.casinoHoldings[req.body.currency] += parseFloat(req.body.amount); addTx(u, 'Transfer', req.body.currency, `-${req.body.amount}`, 'To Casino'); res.json({ message: 'OK' }); });
app.post('/transfer-to-wallet', (req, res) => { const u = getUser(req); if (u.casinoHoldings[req.body.currency] < req.body.amount) return res.status(400).json({message: 'Insufficient'}); u.casinoHoldings[req.body.currency] -= parseFloat(req.body.amount); u.holdings[req.body.currency] += parseFloat(req.body.amount); addTx(u, 'Deposit', req.body.currency, `+${req.body.amount}`, 'From Casino'); res.json({ message: 'OK' }); });
app.post('/market-hack', (req, res) => { const { direction } = req.body; marketHackMultiplier = direction === 'up' ? 1.5 : 0.7; setTimeout(() => marketHackMultiplier = 1, 60000); res.json({ message: 'Hack' }); });
app.get('/transactions/stream', (req, res) => { res.setHeader('Content-Type', 'text/event-stream'); res.setHeader('Cache-Control', 'no-cache'); res.setHeader('Connection', 'keep-alive'); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on ${PORT}`));
