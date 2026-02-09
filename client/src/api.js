// --- CONFIGURATION ---
// If VITE_API_URL is missing, it defaults to localhost (which fails in production)
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

// DEBUGGING: This will print in your browser's Console (F12)
console.log("🔗 Connecting to Backend at:", API_BASE);

// --- USER SESSION ---
let currentUserId = localStorage.getItem('btm_user_id') || 'user_1';

export const switchUser = (userId) => {
    currentUserId = userId;
    localStorage.setItem('btm_user_id', userId);
    window.location.reload();
};
export const getCurrentUser = () => currentUserId;

const headers = () => ({
    'Content-Type': 'application/json',
    'x-user-id': currentUserId
});

// --- HELPER ---
const handleResponse = async (res) => {
    if (!res.ok) {
        const text = await res.text();
        console.error(`API Error [${res.url}]:`, res.status, text);
        throw new Error(`Request failed: ${res.status}`);
    }
    return res.json();
};

// --- MARKET & WALLET API ---
export const getPrices = () => fetch(`${API_BASE}/prices`).then(handleResponse);
export const getPricesHistory = (pair) => fetch(`${API_BASE}/prices/${pair.replace('/', '%2F')}`).then(handleResponse);
export const getHoldings = () => fetch(`${API_BASE}/holdings`, { headers: headers() }).then(handleResponse);
export const getBalances = () => fetch(`${API_BASE}/balances`, { headers: headers() }).then(handleResponse);
export const getTransactions = () => fetch(`${API_BASE}/transactions`, { headers: headers() }).then(handleResponse);

// --- ACTIONS ---
export const deposit = (amount, currency) => fetch(`${API_BASE}/deposit`, { method: 'POST', headers: headers(), body: JSON.stringify({ amount, currency }) }).then(handleResponse);
export const withdraw = (amount, currency, address) => fetch(`${API_BASE}/withdraw`, { method: 'POST', headers: headers(), body: JSON.stringify({ amount, currency, address }) }).then(handleResponse);
export const buy = (pair, amount) => fetch(`${API_BASE}/buy`, { method: 'POST', headers: headers(), body: JSON.stringify({ pair, amount }) }).then(handleResponse);
export const sell = (pair, amount) => fetch(`${API_BASE}/sell`, { method: 'POST', headers: headers(), body: JSON.stringify({ pair, amount }) }).then(handleResponse);
export const transferToCasino = (amount, currency) => fetch(`${API_BASE}/transfer-to-casino`, { method: 'POST', headers: headers(), body: JSON.stringify({ amount, currency }) }).then(handleResponse);
export const transferToWallet = (amount, currency) => fetch(`${API_BASE}/transfer-to-wallet`, { method: 'POST', headers: headers(), body: JSON.stringify({ amount, currency }) }).then(handleResponse);
export const marketHack = (direction) => fetch(`${API_BASE}/market-hack`, { method: 'POST', headers: headers(), body: JSON.stringify({ direction }) }).then(handleResponse);

// --- CASINO ---
export const getCasinoHistory = () => fetch(`${API_BASE}/casino/history`, { headers: headers() }).then(handleResponse);
export const casinoPlay = (amount, currency, game, winChance) => fetch(`${API_BASE}/casino/play`, { method: 'POST', headers: headers(), body: JSON.stringify({ amount, currency, game, winChance }) }).then(handleResponse);
export const getFairness = () => fetch(`${API_BASE}/casino/fairness`, { headers: headers() }).then(handleResponse);
export const rotateSeed = (newClientSeed) => fetch(`${API_BASE}/casino/rotate-seed`, { method: 'POST', headers: headers(), body: JSON.stringify({ newClientSeed }) }).then(handleResponse);
export const getCheatData = () => fetch(`${API_BASE}/casino/cheat`, { headers: headers() }).then(handleResponse);

export const subscribeTransactions = (callback) => {
    const eventSource = new EventSource(`${API_BASE}/transactions/stream`);
    eventSource.onmessage = (event) => callback(JSON.parse(event.data));
    return () => eventSource.close();
};
