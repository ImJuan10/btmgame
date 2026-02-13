import React, { useState, useEffect, useRef } from 'react'
import { 
  Dices, ArrowRightLeft, Wallet, History, Trophy, AlertCircle, Coins, ShieldCheck, RefreshCw, EyeOff, Lock, ChevronDown, Check, Target, Crosshair, ArrowLeft, LayoutGrid
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getHoldings, getPrices, transferToCasino, transferToWallet, casinoPlay, getCasinoHistory, getFairness, rotateSeed, getCheatData } from '../api'

const COINS = ['BTC', 'ETH', 'DOGE', 'SHIB', 'TON', 'TRX', 'LTC', 'LUNA', 'BC', 'USDT'];

// --- UTILS ---
function formatNumber(num, decimals = 2) {
  if (num == null || Number.isNaN(num)) return '0.00'
  return Number(num).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function formatTime(dateString) {
  try {
    return new Date(dateString).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch (e) {
    return "--:--"
  }
}

function floorAmount(amount, decimals = 6) {
  if (!amount) return '0'
  const factor = Math.pow(10, decimals)
  return (Math.floor(amount * factor) / factor).toString()
}

// --- MODAL ---
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-[#1e2329] border border-[#2b3139] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-[#2b3139]">
          <h3 className="text-lg font-bold text-[#eaecef] uppercase tracking-wide">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#2b3139] text-[#848e9c] transition-colors">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export default function CasinoTab() {
  const [holdings, setHoldings] = useState({ wallet: {}, casino: {} })
  const [prices, setPrices] = useState({})
  const [history, setHistory] = useState([]) 
  
  // NAV
  const [activeView, setActiveView] = useState('lobby')
  const [activeGame, setActiveGame] = useState(null)

  // GAME STATE
  const [activeCoin, setActiveCoin] = useState('BC') 
  const [isCoinListOpen, setIsCoinListOpen] = useState(false)
  const [betAmount, setBetAmount] = useState('10')
  const [isRolling, setIsRolling] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  
  // PARAMS
  const [winChance, setWinChance] = useState(50) 
  const [rangeMin, setRangeMin] = useState(2500)
  const [rangeMax, setRangeMax] = useState(7500)

  // FAIRNESS & HACKING
  const [fairness, setFairness] = useState({ hashedServerSeed: 'Loading...', clientSeed: '', nonce: 0 })
  const [fairnessModal, setFairnessModal] = useState(false)
  const [newClientSeed, setNewClientSeed] = useState('')
  const [hackData, setHackData] = useState(null)
  const clickCount = useRef(0)
  const clickTimer = useRef(null)

  const [transferModal, setTransferModal] = useState(null)
  const [transferForm, setTransferForm] = useState({ amount: '', direction: 'toCasino' })
  const [loading, setLoading] = useState(false) // Added missing loading state for transfer

  // --- DERIVED MATH ---
  const currentPrice = prices[activeCoin] || 0;
  // Safety checks to prevent crashes
  const casinoBalance = holdings.casino?.[activeCoin] ?? 0;
  const walletBalance = holdings.wallet?.[activeCoin] ?? 0;
  
  let multiplier, winProbability, rollTargetDisplay;
  
  if (activeGame === 'classic') {
      winProbability = winChance;
      multiplier = (99 / winChance).toFixed(4);
      rollTargetDisplay = `> ${(100 - winChance).toFixed(2)}`;
  } else if (activeGame === 'ultimate') {
      const size = Math.max(1, rangeMax - rangeMin);
      winProbability = size / 100; 
      multiplier = (9900 / size).toFixed(4);
      rollTargetDisplay = `${rangeMin} - ${rangeMax}`;
  } else {
      multiplier = 0; winProbability = 0; rollTargetDisplay = '-';
  }
  
  const rollOverTarget = (100 - winChance).toFixed(0); 
  const potentialProfit = (parseFloat(betAmount || 0) * parseFloat(multiplier) - parseFloat(betAmount || 0))
  const casinoUsdValue = casinoBalance * currentPrice
  const profitUsdValue = potentialProfit * currentPrice

  const gameHistory = history.filter(h => h.game === activeGame);
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) { if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsCoinListOpen(false) }
    document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const refreshData = async () => { try { const [h, p] = await Promise.all([getHoldings(), getPrices()]); setHoldings(h); setPrices(p) } catch (e) {} }
  const refreshHistory = async () => { try { const d = await getCasinoHistory(); if(Array.isArray(d)) setHistory(d) } catch (e) {} }
  const refreshFairness = async () => { try { const f = await getFairness(); setFairness(f); setNewClientSeed(f.clientSeed) } catch (e) {} }

  const handleSecretClick = async () => {
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickCount.current += 1;
    clickTimer.current = setTimeout(() => { clickCount.current = 0; }, 1000);
    if (clickCount.current >= 3) {
        clickCount.current = 0;
        try { const data = await getCheatData(); setHackData(data); toast('BACKDOOR ACCESS GRANTED', { icon: '🔓', style: { background: '#000', color: '#0ecb81', border: '1px solid #0ecb81' } }); } catch (e) { toast.error("Access Denied"); }
    }
  }

  const updateHack = async () => { if (hackData) { try { const data = await getCheatData(); setHackData(data); } catch(e) {} } }

  useEffect(() => {
    refreshData(); refreshHistory(); refreshFairness();
    const interval = setInterval(() => { refreshData(); refreshHistory(); }, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleTransfer = async (e) => {
    e.preventDefault(); 
    setLoading(true); // Ensure loading is true
    const tid = toast.loading("Processing...");
    try {
      if (transferForm.direction === 'toCasino') await transferToCasino(transferForm.amount, activeCoin);
      else await transferToWallet(transferForm.amount, activeCoin);
      toast.success("Success", { id: tid }); 
      await refreshData(); 
      setTransferModal(null);
    } catch (err) { 
      toast.error(err.message, { id: tid }) 
    } finally {
      setLoading(false);
    }
  }

  const handlePlay = async () => {
    if (isRolling) return;
    const amount = parseFloat(betAmount);
    if (!amount || amount <= 0) return toast.error('Invalid bet');
    if (amount > casinoBalance) return toast.error(`Insufficient ${activeCoin}`);

    setIsRolling(true); setLastResult(null);

    setTimeout(async () => {
      try {
        const payload = { 
            amount, currency: activeCoin, game: activeGame, 
            winChance: activeGame === 'classic' ? winChance : undefined,
            min: activeGame === 'ultimate' ? rangeMin : undefined,
            max: activeGame === 'ultimate' ? rangeMax : undefined
        };

        const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/casino/play`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': localStorage.getItem('btm_user_id') || 'user_1' },
            body: JSON.stringify(payload)
        });
        const finalData = await res.json();

        setLastResult(finalData.record);
        await refreshHistory(); await refreshData(); await refreshFairness(); await updateHack();

        if (finalData.record.win) toast.success(`Won ${formatNumber(finalData.record.profit, 6)} ${activeCoin}`, { icon: '🏆', style: { background: '#1e2329', color: '#0ecb81' }});
        else toast.error(`Lost ${formatNumber(amount, 6)} ${activeCoin}`, { icon: '💸', style: { background: '#1e2329', color: '#f6465d' }});
      } catch (err) { toast.error(err.message) } finally { setIsRolling(false) }
    }, 500)
  }

  const handleRotateSeed = async () => {
    const tid = toast.loading("Rotating...");
    try { await rotateSeed(newClientSeed); await refreshFairness(); toast.success("Rotated", { id: tid }); setHackData(null); } 
    catch(e) { toast.error("Failed", { id: tid }) }
  }

  const adjustBet = (type) => {
    const current = parseFloat(betAmount) || 0;
    if (type === 'min') setBetAmount('0.0001'); 
    else if (type === 'half') setBetAmount(floorAmount(current / 2, 6));
    else if (type === 'double') setBetAmount(floorAmount(current * 2, 6)); 
    else if (type === 'max') setBetAmount(floorAmount(casinoBalance, 6)); 
  }

  // --- LOBBY VIEW ---
  if (activeView === 'lobby') {
      return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 pt-4">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-[#eaecef] flex items-center gap-3"><LayoutGrid className="text-[#f3ba2f]" size={32} /> Casino Lobby</h1>
                <div className="flex items-center gap-2">
                    <button onClick={() => setFairnessModal(true)} className="bg-[#1e2329] px-4 py-2 rounded-xl border border-[#2b3139] text-sm font-bold text-[#0ecb81] flex items-center gap-2 hover:bg-[#2b3139]/80 transition-colors">
                        <ShieldCheck size={16} /> Provably Fair
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div onClick={() => { setActiveGame('classic'); setActiveView('game'); }} className="bg-[#1e2329] border border-[#2b3139] rounded-2xl p-8 hover:border-[#f3ba2f] transition-all cursor-pointer group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500"><Dices size={120} className="text-[#f3ba2f]" /></div>
                    <div className="relative z-10"><div className="bg-[#f3ba2f]/10 w-fit p-3 rounded-xl mb-4"><Dices size={32} className="text-[#f3ba2f]" /></div><h2 className="text-2xl font-bold text-white mb-2">Classic Dice</h2><p className="text-[#848e9c]">Predict if the result will be Higher or Lower than your target.</p><div className="mt-6 flex items-center gap-2 text-sm font-bold text-[#f3ba2f]">Play Now →</div></div>
                </div>
                <div onClick={() => { setActiveGame('ultimate'); setActiveView('game'); }} className="bg-[#1e2329] border border-[#2b3139] rounded-2xl p-8 hover:border-[#0ecb81] transition-all cursor-pointer group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500"><Target size={120} className="text-[#0ecb81]" /></div>
                    <div className="relative z-10"><div className="bg-[#0ecb81]/10 w-fit p-3 rounded-xl mb-4"><Crosshair size={32} className="text-[#0ecb81]" /></div><h2 className="text-2xl font-bold text-white mb-2">Ultimate Dice</h2><p className="text-[#848e9c]">Predict the exact Range of the outcome for massive 9900x multipliers.</p><div className="mt-6 flex items-center gap-2 text-sm font-bold text-[#0ecb81]">Play Now →</div></div>
                </div>
            </div>
            {fairnessModal && ( <Modal title="Fairness Settings" onClose={() => { setFairnessModal(false); setHackData(null); }}>{/* Reusing Modal Content Logic Below */}</Modal> )}
        </div>
      )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 px-4">
      <style>{`input[type=range]::-webkit-slider-thumb { pointer-events: auto; z-index: 50; position: relative; } input[type=range]::-moz-range-thumb { pointer-events: auto; z-index: 50; position: relative; }`}</style>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <button onClick={() => setActiveView('lobby')} className="p-2 bg-[#2b3139] rounded-lg text-[#848e9c] hover:text-white transition-colors"><ArrowLeft size={20} /></button>
            <h1 className="text-2xl font-bold text-[#eaecef] flex items-center gap-3">
                {activeGame === 'classic' ? <Dices className="text-[#f3ba2f]" /> : <Crosshair className="text-[#0ecb81]" />} 
                {activeGame === 'classic' ? 'Classic Dice' : 'Ultimate Dice'}
            </h1>
        </div>
        <button onClick={() => setFairnessModal(true)} className="bg-[#1e2329] px-3 py-1 rounded-lg border border-[#2b3139] text-xs font-bold text-[#0ecb81] flex items-center gap-2 hover:bg-[#2b3139]/80 transition-colors">
          <ShieldCheck size={14} /> Provably Fair
        </button>
      </div>

      {fairnessModal && (
        <Modal title="Fairness Settings" onClose={() => { setFairnessModal(false); setHackData(null); }}>
            <div className="space-y-6">
                {hackData && (
                    <div className="bg-[#0b0e11] border border-[#0ecb81] p-4 rounded-xl shadow-[0_0_15px_rgba(14,203,129,0.2)] animate-in slide-in-from-top-4 duration-300">
                        <div className="flex justify-between items-center text-[#0ecb81] font-black mb-3 text-xs tracking-widest uppercase border-b border-[#0ecb81]/30 pb-2"><span className="flex items-center gap-2"><EyeOff size={16} /> ADMIN MODE ACTIVE</span><span className="animate-pulse">● LIVE</span></div>
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="bg-[#1e2329] rounded-lg p-2"><div className="text-[10px] text-[#848e9c] uppercase font-bold mb-1">Next Nonce</div><div className="text-xl font-mono text-[#eaecef]">{hackData.nextNonce}</div></div>
                            <div className="bg-[#1e2329] rounded-lg p-2 border border-[#0ecb81]/50"><div className="text-[10px] text-[#0ecb81] uppercase font-bold mb-1">Outcome</div><div className="text-3xl font-black font-mono text-[#0ecb81]">{hackData.nextRoll}</div></div>
                        </div>
                        <div className="mt-3"><div className="text-[10px] text-[#848e9c] uppercase font-bold mb-1">Raw Server Seed (Secret)</div><div className="bg-[#1e2329] p-2 rounded text-[10px] font-mono text-red-400 break-all border border-red-500/20">{hackData.serverSeed}</div></div>
                    </div>
                )}
                <div><div onClick={handleSecretClick} className="flex items-center gap-2 text-xs font-bold text-[#848e9c] uppercase mb-1 cursor-pointer hover:text-[#eaecef] select-none transition-colors w-fit"><Lock size={12} /> Server Seed (Hashed)</div><div className="bg-[#0b0e11] p-3 rounded-lg text-xs font-mono text-[#eaecef] break-all border border-[#2b3139] shadow-inner">{fairness.hashedServerSeed || "Syncing..."}</div></div>
                <div className="flex gap-4"><div className="flex-1"><label className="text-xs font-bold text-[#848e9c] uppercase mb-1 block">Client Seed</label><div className="flex gap-2"><input value={newClientSeed} onChange={e => setNewClientSeed(e.target.value)} className="w-full bg-[#0b0e11] border border-[#2b3139] rounded-lg p-2 text-white text-sm outline-none focus:border-[#f3ba2f]" /><button onClick={handleRotateSeed} className="bg-[#f3ba2f] text-black p-2 rounded-lg hover:bg-[#e0aa25] transition-colors"><RefreshCw size={16} /></button></div></div><div><label className="text-xs font-bold text-[#848e9c] uppercase mb-1 block">Nonce</label><div className="bg-[#0b0e11] p-2 rounded-lg text-sm font-mono text-[#eaecef] border border-[#2b3139] text-center w-20 shadow-inner">{fairness.nonce}</div></div></div>
            </div>
        </Modal>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded-2xl border border-[#2b3139] bg-[#161a1e] p-6 relative overflow-visible group z-30">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><Trophy size={100} className="text-[#f3ba2f]" /></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <p className="text-[#848e9c] text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Wallet size={14} /> Casino Balance</p>
            <div className="mt-4 mb-4">
              <div className="flex items-baseline gap-2 relative" ref={dropdownRef}>
                <span className="text-5xl font-black text-[#f3ba2f] font-mono tracking-tight tabular-nums">{formatNumber(casinoBalance, 6)}</span>
                <button onClick={() => setIsCoinListOpen(!isCoinListOpen)} className="text-xl text-[#eaecef] font-bold flex items-center gap-1 hover:text-white transition-colors outline-none">{activeCoin} <ChevronDown size={16} className={`transition-transform duration-200 ${isCoinListOpen ? 'rotate-180' : ''}`} /></button>
                {isCoinListOpen && (<div className="absolute top-full left-0 mt-2 w-48 bg-[#1e2329] border border-[#2b3139] rounded-xl shadow-2xl z-50 overflow-hidden max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150"><div className="p-1.5 grid gap-0.5">{COINS.map(c => (<button key={c} onClick={() => { setActiveCoin(c); setIsCoinListOpen(false); setBetAmount('0'); }} className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold flex items-center justify-between transition-colors ${activeCoin === c ? 'bg-[#2b3139] text-[#f3ba2f]' : 'text-[#848e9c] hover:bg-[#2b3139] hover:text-[#eaecef]'}`}>{c}{activeCoin === c && <Check size={14} />}</button>))}</div></div>)}
              </div>
              <div className="text-sm font-medium text-[#848e9c] mt-1 font-mono">≈ ${formatNumber(casinoUsdValue, 2)}</div>
            </div>
            <div><button onClick={() => { setTransferForm({direction: 'toCasino', amount: ''}); setTransferModal(true) }} className="px-5 py-2.5 bg-[#2b3139] hover:bg-[#363c45] text-[#eaecef] rounded-xl text-xs font-bold uppercase border border-[#474d57] transition-all active:scale-95 flex items-center gap-2"><ArrowRightLeft size={14} /> Deposit / Withdraw</button></div>
          </div>
        </div>
        <div className="rounded-2xl border border-[#2b3139] bg-[#161a1e] p-4 flex flex-col min-h-[140px]">
          <p className="text-[#848e9c] text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"><History size={14} /> Recent Rolls</p>
          <div className="flex-1 flex gap-2 overflow-x-auto items-center md:flex-wrap content-start scrollbar-hide">
            {gameHistory.length === 0 && <span className="text-[#848e9c] text-xs italic">No bets placed yet.</span>}
            {gameHistory.slice(0, 12).map((h, i) => (<div key={i} className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold font-mono text-[10px] border border-opacity-20 animate-in zoom-in duration-300 ${h.win ? 'bg-[#0ecb81]/10 border-[#0ecb81] text-[#0ecb81]' : 'bg-[#f6465d]/10 border-[#f6465d] text-[#f6465d]'}`}>{h.roll}</div>))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[#2b3139] bg-[#161a1e] overflow-hidden shadow-2xl relative">
        <div className="grid grid-cols-1 lg:grid-cols-4">
          <div className="lg:col-span-1 bg-[#1e2329] border-r border-[#2b3139] p-6 flex flex-col gap-6">
            <div>
              <div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-[#848e9c] uppercase">Bet Amount</label><span className="text-[10px] font-bold text-[#848e9c]">Max: {formatNumber(casinoBalance, 6)}</span></div>
              <div className="relative group"><input type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} className="w-full bg-[#0b0e11] border border-[#2b3139] rounded-xl py-3 pl-3 pr-10 text-white font-mono font-bold focus:border-[#f3ba2f] outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none" /><div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs font-bold text-[#f3ba2f]">{activeCoin}</div></div>
              <div className="grid grid-cols-4 gap-2 mt-2">{['Min', '1/2', '2x', 'Max'].map(label => (<button key={label} onClick={() => { if(label === 'Min') adjustBet('min'); if(label === '1/2') adjustBet('half'); if(label === '2x') adjustBet('double'); if(label === 'Max') adjustBet('max'); }} className="bg-[#2b3139] hover:bg-[#363c45] text-[#848e9c] hover:text-[#eaecef] py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors">{label}</button>))}</div>
            </div>

            {activeGame === 'ultimate' && (
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[10px] font-bold text-[#848e9c] uppercase mb-1 block">Min Range</label><input type="number" min="0" max="9999" value={rangeMin} onChange={(e) => setRangeMin(Math.min(Number(e.target.value), rangeMax - 1))} className="w-full bg-[#0b0e11] border border-[#2b3139] rounded-xl p-3 text-white font-mono focus:border-[#0ecb81] outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none" /></div>
                    <div><label className="text-[10px] font-bold text-[#848e9c] uppercase mb-1 block">Max Range</label><input type="number" min="1" max="10000" value={rangeMax} onChange={(e) => setRangeMax(Math.max(Number(e.target.value), rangeMin + 1))} className="w-full bg-[#0b0e11] border border-[#2b3139] rounded-xl p-3 text-white font-mono focus:border-[#0ecb81] outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none" /></div>
                </div>
            )}

            <div className="mt-auto bg-[#0b0e11] rounded-xl p-4 border border-[#2b3139]">
              <div className="flex justify-between text-xs text-[#848e9c] font-bold uppercase mb-1"><span>Profit on Win</span></div>
              <div className="flex items-center gap-2 text-[#0ecb81]"><span className="text-xl font-black font-mono">+{formatNumber(potentialProfit, 6)}</span><span className="text-xs font-bold">{activeCoin}</span></div>
              <div className="text-[10px] font-medium text-[#848e9c] mt-1 font-mono">≈ ${formatNumber(profitUsdValue, 2)}</div>
            </div>
            <button onClick={handlePlay} disabled={isRolling || !betAmount} className={`w-full py-4 rounded-xl font-black text-lg uppercase tracking-widest shadow-lg transition-all active:scale-95 ${isRolling ? 'bg-[#2b3139] text-[#848e9c] cursor-not-allowed' : 'bg-[#f3ba2f] text-[#0b0e11] hover:bg-[#e0aa25] shadow-[#f3ba2f]/20'}`}>{isRolling ? 'Rolling...' : 'Bet'}</button>
          </div>

          <div className="lg:col-span-3 p-8 flex flex-col relative min-h-[400px]">
            <div className="flex justify-between bg-[#0b0e11] rounded-2xl p-4 border border-[#2b3139] mb-12">
               <div className="text-center w-1/3 border-r border-[#2b3139]"><div className="text-xs font-bold text-[#848e9c] uppercase mb-1">Multiplier</div><div className="text-xl font-black text-[#eaecef] font-mono">{multiplier}x</div></div>
               <div className="text-center w-1/3 border-r border-[#2b3139]"><div className="text-xs font-bold text-[#848e9c] uppercase mb-1">Target</div><div className="text-xl font-black text-[#eaecef] font-mono">{rollTargetDisplay}</div></div>
               <div className="text-center w-1/3"><div className="text-xs font-bold text-[#848e9c] uppercase mb-1">Win Chance</div><div className="text-xl font-black text-[#0ecb81] font-mono">{Number(winProbability).toFixed(2)}%</div></div>
            </div>

            <div className="flex-1 flex flex-col justify-center select-none">
              <div className="relative h-12 w-full flex items-center">
                <div className="absolute left-0 right-0 h-4 bg-[#2b3139] rounded-full overflow-hidden pointer-events-none">
                  {activeGame === 'classic' ? (
                      <>
                        <div className="absolute left-0 top-0 bottom-0 bg-[#f6465d] transition-all duration-75" style={{ width: `${rollOverTarget}%` }}/>
                        <div className="absolute right-0 top-0 bottom-0 bg-[#0ecb81] transition-all duration-75" style={{ width: `${100 - rollOverTarget}%` }}/>
                      </>
                  ) : (
                      <>
                        <div className="absolute inset-0 bg-[#f6465d]" />
                        <div className="absolute top-0 bottom-0 bg-[#0ecb81] transition-all duration-75" style={{ left: `${rangeMin / 100}%`, width: `${(rangeMax - rangeMin) / 100}%` }}/>
                      </>
                  )}
                </div>

                {activeGame === 'classic' && (
                    <>
                        <input type="range" min="2" max="97" step="1" value={rollOverTarget} onChange={(e) => setWinChance(100 - Number(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 pointer-events-auto" />
                        <div className="absolute w-10 h-10 bg-[#eaecef] rounded-xl shadow-2xl border-4 border-[#161a1e] flex items-center justify-center pointer-events-none transition-all duration-75 z-10" style={{ left: `calc(${rollOverTarget}% - 20px)` }}><ArrowRightLeft size={16} className="text-[#161a1e]" /></div>
                    </>
                )}

                {activeGame === 'ultimate' && (
                    <>
                        <input type="range" min="0" max="9999" step="1" value={rangeMin} onChange={(e) => setRangeMin(Math.min(Number(e.target.value), rangeMax - 1))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 pointer-events-auto" style={{ zIndex: rangeMin > 9000 ? 30 : 20 }} />
                        <div className="absolute w-6 h-10 bg-[#eaecef] rounded-md shadow-2xl border-4 border-[#161a1e] flex items-center justify-center pointer-events-none transition-all duration-75 z-10" style={{ left: `calc(${rangeMin / 100}% - 12px)` }}></div>
                        <input type="range" min="1" max="10000" step="1" value={rangeMax} onChange={(e) => setRangeMax(Math.max(Number(e.target.value), rangeMin + 1))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 pointer-events-auto" />
                        <div className="absolute w-6 h-10 bg-[#eaecef] rounded-md shadow-2xl border-4 border-[#161a1e] flex items-center justify-center pointer-events-none transition-all duration-75 z-10" style={{ left: `calc(${rangeMax / 100}% - 12px)` }}></div>
                    </>
                )}

                {lastResult && !isRolling && (
                  <div className="absolute -top-16 z-30 transition-all duration-300 pointer-events-none" style={{ left: activeGame === 'ultimate' ? `calc(${lastResult.roll / 100}% - 30px)` : `calc(${lastResult.roll}% - 30px)` }}>
                    <div className={`px-4 py-2 rounded-lg font-black text-lg shadow-2xl border-2 flex flex-col items-center animate-in zoom-in ${lastResult.win ? 'bg-[#0ecb81] border-[#0ecb81] text-[#0b0e11]' : 'bg-[#1e2329] border-[#f6465d] text-[#f6465d]'}`}>
                      <span className="font-mono">{lastResult.roll}</span>
                      <div className={`w-2 h-2 rotate-45 absolute -bottom-1 ${lastResult.win ? 'bg-[#0ecb81]' : 'bg-[#f6465d]'}`} />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-between mt-2 text-xs font-bold text-[#848e9c]"><span>{activeGame==='ultimate'?'0':'0'}</span><span>{activeGame==='ultimate'?'5000':'50'}</span><span>{activeGame==='ultimate'?'10000':'100'}</span></div>
            </div>
            
            <div className="mt-auto text-center pt-8"><p className="text-xs text-[#848e9c] flex items-center justify-center gap-2"><AlertCircle size={12} /> {activeGame === 'classic' ? 'Drag slider to adjust risk.' : 'Drag handles or use inputs.'} Rolling in the Green wins.</p></div>
          </div>
        </div>
      </div>

      <div className="bg-[#161a1e] rounded-2xl border border-[#2b3139] overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-[#2b3139] flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#0ecb81] animate-pulse"/><h2 className="text-sm font-bold text-[#eaecef] uppercase tracking-wider">Latest {activeGame === 'classic' ? 'Classic' : 'Ultimate'} Bets</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-[#848e9c] uppercase font-bold border-b border-[#2b3139]">
                <th className="py-4 px-6">Time</th><th className="py-4 px-6 text-right">Bet</th><th className="py-4 px-6 text-right">Multiplier</th><th className="py-4 px-6 text-right">Target</th><th className="py-4 px-6 text-right">Outcome</th><th className="py-4 px-6 text-right">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2b3139]/30">
              {gameHistory.length === 0 ? (<tr><td colSpan={6} className="py-8 text-center text-[#848e9c] text-sm italic">No bets placed yet.</td></tr>) : (gameHistory.map((row) => (
                  <tr key={row.id} className="hover:bg-[#1e2329] transition-colors">
                    <td className="py-4 px-6 text-[#848e9c] font-mono tabular-nums text-xs font-medium">{formatTime(row.time)}</td>
                    <td className="py-4 px-6 text-right font-mono tabular-nums text-xs font-medium text-[#eaecef]">{formatNumber(row.bet, 4)} <span className="text-[10px] text-[#848e9c] font-sans">{row.currency}</span></td>
                    <td className="py-4 px-6 text-right font-mono tabular-nums text-xs font-medium text-[#eaecef]">{row.multiplier}x</td>
                    <td className="py-4 px-6 text-right font-mono tabular-nums text-xs font-medium text-[#848e9c]">{gameMode === 'ultimate' && row.target.includes('-') ? row.target : (parseFloat(row.target) ? `> ${parseFloat(row.target).toFixed(2)}` : row.target)}</td>
                    <td className={`py-4 px-6 text-right font-mono tabular-nums text-xs font-medium ${row.win ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>{row.roll}</td>
                    <td className={`py-4 px-6 text-right font-mono tabular-nums text-xs font-medium ${row.win ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>{row.win ? '+' : ''}{formatNumber(row.profit, 4)}</td>
                  </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {transferModal && (<Modal title="Wallet Transfer" onClose={() => setTransferModal(null)}>
        <form onSubmit={handleTransfer} className="space-y-6">
            <div className="bg-[#0b0e11] p-1 rounded-xl flex text-xs font-bold uppercase"><button type="button" onClick={() => setTransferForm({ ...transferForm, direction: 'toCasino' })} className={`flex-1 py-3 rounded-lg transition-colors ${transferForm.direction === 'toCasino' ? 'bg-[#2b3139] text-[#eaecef]' : 'text-[#848e9c] hover:text-[#eaecef]'}`}>Deposit to Casino</button><button type="button" onClick={() => setTransferForm({ ...transferForm, direction: 'toWallet' })} className={`flex-1 py-3 rounded-lg transition-colors ${transferForm.direction === 'toWallet' ? 'bg-[#2b3139] text-[#eaecef]' : 'text-[#848e9c] hover:text-[#eaecef]'}`}>Withdraw to Wallet</button></div>
            <div className="text-center py-4"><span className="text-[#848e9c] text-xs font-bold uppercase">Available Balance</span><div className="text-2xl font-black text-[#eaecef]">{transferForm.direction === 'toCasino' ? formatNumber(walletBalance, 6) : formatNumber(casinoBalance, 6)} <span className="text-sm ml-1 text-[#f3ba2f]">{activeCoin}</span></div></div>
            <div className="relative"><label className="block text-[10px] font-bold text-[#848e9c] uppercase mb-2">Amount</label><input type="number" step="any" value={transferForm.amount} onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })} className="w-full bg-[#0b0e11] border border-[#2b3139] rounded-xl p-3 text-white font-mono focus:border-[#f3ba2f] outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="0.00" /></div>
            <button type="submit" disabled={loading || !transferForm.amount} className="w-full py-4 bg-[#f3ba2f] text-[#0b0e11] font-black rounded-xl uppercase tracking-widest hover:bg-[#e0aa25] disabled:opacity-50">{loading ? 'Processing...' : 'Confirm Transfer'}</button>
        </form>
      </Modal>)}
    </div>
  )
}
