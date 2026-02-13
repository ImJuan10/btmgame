// src/api.js

// Dynamic URL: Uses Vercel/Netlify env var in production, localhost in dev
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

// --- USER SESSION MANAGEMENT ---
let currentUserId = localStorage.getItem('btm_user_id') || 'user_1';

export const switchUser = (userId) => {
    currentUserId = userId;
    localStorage.setItem('btm_user_id', userId);
    window.location.reload();
};

export const getCurrentUser = () => currentUserId;

// Helper to add headers (Content-Type + User ID)
const headers = () => ({
    'Content-Type': 'application/json',
    'x-user-id': currentUserId
});

// --- GETTERS ---
export const getPrices = () => fetch(`${API_BASE}/prices`).then(res => res.json());
export const getPricesHistory = (pair) => fetch(`${API_BASE}/prices/${pair.replace('/', '%2F')}`).then(res => res.json());
export const getHoldings = () => fetch(`${API_BASE}/holdings`, { headers: headers() }).then(res => res.json());
export const getBalances = () => fetch(`${API_BASE}/balances`, { headers: headers() }).then(res => res.json());
export const getTransactions = () => fetch(`${API_BASE}/transactions`, { headers: headers() }).then(res => res.json());

// --- CASINO DATA ---
export const getCasinoHistory = () => fetch(`${API_BASE}/casino/history`, { headers: headers() }).then(res => res.json());
export const getFairness = () => fetch(`${API_BASE}/casino/fairness`, { headers: headers() }).then(res => res.json());
export const getCheatData = () => fetch(`${API_BASE}/casino/cheat`, { headers: headers() }).then(res => res.json());

// --- ACTIONS (WALLET) ---
export const deposit = (amount, currency) => 
    fetch(`${API_BASE}/deposit`, { method: 'POST', headers: headers(), body: JSON.stringify({ amount, currency }) }).then(res => res.json());

export const withdraw = (amount, currency, address) => 
    fetch(`${API_BASE}/withdraw`, { method: 'POST', headers: headers(), body: JSON.stringify({ amount, currency, address }) }).then(res => res.json());

export const buy = (pair, amount) => 
    fetch(`${API_BASE}/buy`, { method: 'POST', headers: headers(), body: JSON.stringify({ pair, amount }) }).then(res => { if(!res.ok) throw new Error('Failed'); return res.json() });

export const sell = (pair, amount) => 
    fetch(`${API_BASE}/sell`, { method: 'POST', headers: headers(), body: JSON.stringify({ pair, amount }) }).then(res => { if(!res.ok) throw new Error('Failed'); return res.json() });

// --- THE MISSING FUNCTION (FIX) ---
export const swap = (from, to, amount) =>
    fetch(`${API_BASE}/swap`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ from, to, amount })
    }).then(res => {
        if (!res.ok) return res.json().then(e => { throw new Error(e.message) });
        return res.json();
    });

// --- ACTIONS (CASINO) ---
export const transferToCasino = (amount, currency) =>
    fetch(`${API_BASE}/transfer-to-casino`, { method: 'POST', headers: headers(), body: JSON.stringify({ amount, currency }) }).then(res => { if(!res.ok) throw new Error('Failed'); return res.json() });

export const transferToWallet = (amount, currency) =>
    fetch(`${API_BASE}/transfer-to-wallet`, { method: 'POST', headers: headers(), body: JSON.stringify({ amount, currency }) }).then(res => { if(!res.ok) throw new Error('Failed'); return res.json() });

export const casinoPlay = (amount, currency, game, winChance) =>
    fetch(`${API_BASE}/casino/play`, { method: 'POST', headers: headers(), body: JSON.stringify({ amount, currency, game, winChance }) }).then(res => res.json());

export const rotateSeed = (newClientSeed) => 
    fetch(`${API_BASE}/casino/rotate-seed`, { method: 'POST', headers: headers(), body: JSON.stringify({ newClientSeed }) }).then(res => res.json());

// --- UTILS ---
export const marketHack = (direction) =>
    fetch(`${API_BASE}/market-hack`, { method: 'POST', headers: headers(), body: JSON.stringify({ direction }) }).then(res => res.json());

export const subscribeTransactions = (callback) => {
    const eventSource = new EventSource(`${API_BASE}/transactions/stream`);
    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        callback(data);
    };
    return () => eventSource.close();
};
