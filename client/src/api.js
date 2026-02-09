// Check environment variable for production URL, otherwise localhost
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

// --- USER SESSION MANAGEMENT ---
let currentUserId = localStorage.getItem('btm_user_id') || 'user_1';

export const switchUser = (userId) => {
    currentUserId = userId;
    localStorage.setItem('btm_user_id', userId);
    window.location.reload();
};

export const getCurrentUser = () => currentUserId;

// Helper to add headers (Authentication)
const headers = () => ({
    'Content-Type': 'application/json',
    'x-user-id': currentUserId
});

// --- MARKET & WALLET API ---
export const getPrices = () => fetch(`${API_BASE}/prices`).then(res => res.json());
export const getPricesHistory = (pair) => fetch(`${API_BASE}/prices/${pair.replace('/', '%2F')}`).then(res => res.json());
export const getHoldings = () => fetch(`${API_BASE}/holdings`, { headers: headers() }).then(res => res.json());
export const getBalances = () => fetch(`${API_BASE}/balances`, { headers: headers() }).then(res => res.json());
export const getTransactions = () => fetch(`${API_BASE}/transactions`, { headers: headers() }).then(res => res.json());

// --- ACTIONS ---
export const deposit = (amount, currency) => 
    fetch(`${API_BASE}/deposit`, { method: 'POST', headers: headers(), body: JSON.stringify({ amount, currency }) }).then(res => res.json());

export const withdraw = (amount, currency, address) => 
    fetch(`${API_BASE}/withdraw`, { method: 'POST', headers: headers(), body: JSON.stringify({ amount, currency, address }) }).then(res => res.json());

export const buy = (pair, amount) => 
    fetch(`${API_BASE}/buy`, { method: 'POST', headers: headers(), body: JSON.stringify({ pair, amount }) }).then(res => { if(!res.ok) throw new Error('Failed'); return res.json() });

export const sell = (pair, amount) => 
    fetch(`${API_BASE}/sell`, { method: 'POST', headers: headers(), body: JSON.stringify({ pair, amount }) }).then(res => { if(!res.ok) throw new Error('Failed'); return res.json() });

export const transferToCasino = (amount, currency) =>
    fetch(`${API_BASE}/transfer-to-casino`, { method: 'POST', headers: headers(), body: JSON.stringify({ amount, currency }) }).then(res => { if(!res.ok) throw new Error('Failed'); return res.json() });

export const transferToWallet = (amount, currency) =>
    fetch(`${API_BASE}/transfer-to-wallet`, { method: 'POST', headers: headers(), body: JSON.stringify({ amount, currency }) }).then(res => { if(!res.ok) throw new Error('Failed'); return res.json() });

export const marketHack = (direction) =>
    fetch(`${API_BASE}/market-hack`, { method: 'POST', headers: headers(), body: JSON.stringify({ direction }) }).then(res => res.json());

// --- CASINO API ---
export const getCasinoHistory = () => fetch(`${API_BASE}/casino/history`, { headers: headers() }).then(res => res.json());

export const casinoPlay = (amount, currency, game, winChance) =>
    fetch(`${API_BASE}/casino/play`, { method: 'POST', headers: headers(), body: JSON.stringify({ amount, currency, game, winChance }) }).then(res => res.json());

// --- HACKER / FAIRNESS API (These were missing!) ---
export const getFairness = () => 
    fetch(`${API_BASE}/casino/fairness`, { headers: headers() }).then(res => res.json());

export const rotateSeed = (newClientSeed) => 
    fetch(`${API_BASE}/casino/rotate-seed`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ newClientSeed })
    }).then(res => res.json());

export const getCheatData = () => 
    fetch(`${API_BASE}/casino/cheat`, { headers: headers() }).then(res => res.json());

// --- SYSTEM ---
export const subscribeTransactions = (callback) => {
    const eventSource = new EventSource(`${API_BASE}/transactions/stream`);
    eventSource.onmessage = (event) => callback(JSON.parse(event.data));
    return () => eventSource.close();
};
