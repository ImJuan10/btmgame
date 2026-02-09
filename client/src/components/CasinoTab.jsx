import React, { useState, useEffect } from 'react'
import { 
  Dices, 
  ArrowRightLeft, 
  Wallet, 
  History, 
  Trophy, 
  AlertCircle,
  Coins 
} from 'lucide-react'
import toast from 'react-hot-toast'
// Import api functions
import { getHoldings, getPrices, transferToCasino, transferToWallet, casinoPlay, getCasinoHistory } from '../api'

// --- UTILS ---
function formatNumber(num, decimals = 2) {
  if (num == null || Number.isNaN(num)) return '0.00'
  return Number(num).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function formatTime(dateString) {
  try {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
  } catch (e) {
    return "--:--"
  }
}

// --- MODAL ---
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#1e2329] border border-[#2b3139] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
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
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([]) 
  
  // Game State
  const [betAmount, setBetAmount] = useState('10')
  const [winChance, setWinChance] = useState(50) 
  const [isRolling, setIsRolling] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  
  // Transfer Form
  const [transferModal, setTransferModal] = useState(null)
  const [transferForm, setTransferForm] = useState({ amount: '', direction: 'toCasino' })

  // Math
  const rollOverTarget = (100 - winChance).toFixed(0)
  const multiplier = (99 / winChance).toFixed(4) 
  const potentialProfit = (parseFloat(betAmount || 0) * parseFloat(multiplier) - parseFloat(betAmount || 0))

  // Variables
  const bcPrice = prices['BC'] || 0
  const casinoBcBalance = holdings.casino?.BC ?? 0
  const walletBC = holdings.wallet?.BC ?? 0
  const casinoUsdValue = casinoBcBalance * bcPrice
  const profitUsdValue = potentialProfit * bcPrice

  // --- DATA FETCHING ---
  const refreshData = async () => {
    try {
      const [h, p] = await Promise.all([getHoldings(), getPrices()])
      setHoldings(h)
      setPrices(p)
    } catch (e) { console.error("Data error:", e) }
  }

  const refreshHistory = async () => {
    try {
      const histData = await getCasinoHistory()
      if (Array.isArray(histData)) setHistory(histData)
    } catch (e) { console.error("History error:", e) }
  }

  useEffect(() => {
    refreshData()
    refreshHistory()
    const interval = setInterval(() => {
      refreshData()
      refreshHistory()
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  // --- ACTIONS ---
  const handleTransfer = async (e) => {
    e.preventDefault()
    setLoading(true)
    const tid = toast.loading("Moving funds...")
    try {
      if (transferForm.direction === 'toCasino') {
        await transferToCasino(transferForm.amount, 'BC')
        toast.success(`Deposited ${transferForm.amount} BC to Casino`, { id: tid })
      } else {
        await transferToWallet(transferForm.amount, 'BC')
        toast.success(`Withdrew ${transferForm.amount} BC to Wallet`, { id: tid })
      }
      await refreshData()
      setTransferModal(null)
      setTransferForm({ ...transferForm, amount: '' })
    } catch (err) { 
      toast.error(err.message, { id: tid })
    } 
    finally { setLoading(false) }
  }

  const handlePlay = async () => {
    if (isRolling) return
    const amount = parseFloat(betAmount)
    if (!amount || amount <= 0) return toast.error('Invalid bet amount')
    if (amount > casinoBcBalance) return toast.error('Insufficient Casino Balance')

    setIsRolling(true)
    setLastResult(null)

    setTimeout(async () => {
      try {
        // --- FIX: USE API FUNCTION INSTEAD OF FETCH ---
        const data = await casinoPlay(amount, 'BC', 'dice', winChance)
        // ----------------------------------------------
        
        setLastResult(data.record)
        await refreshHistory()
        await refreshData()
        
        if (data.record.win) {
            toast.success(`You Won ${formatNumber(data.record.profit)} BC!`, { 
                icon: '🏆', 
                style: { background: '#1e2329', color: '#0ecb81', border: '1px solid #2b3139' }
            })
        } else {
            toast.error(`Lost ${formatNumber(amount)} BC`, {
                icon: '💸',
                style: { background: '#1e2329', color: '#f6465d', border: '1px solid #2b3139' }
            })
        }
      } catch (err) {
        toast.error("Game Error: " + err.message)
      } finally {
        setIsRolling(false)
      }
    }, 500)
  }

  const adjustBet = (type) => {
    const current = parseFloat(betAmount) || 0
    if (type === 'min') setBetAmount('1')
    if (type === 'half') setBetAmount((current / 2).toFixed(2))
    if (type === 'double') setBetAmount((current * 2).toFixed(2))
    if (type === 'max') setBetAmount(casinoBcBalance.toFixed(2))
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 px-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#eaecef] flex items-center gap-3">
          <Dices className="text-[#f3ba2f]" /> Casino
        </h1>
        <div className="bg-[#1e2329] px-3 py-1 rounded-lg border border-[#2b3139] text-xs font-bold text-[#0ecb81] flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#0ecb81] animate-pulse"/> Provably Fair
        </div>
      </div>

      {/* BANKROLL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded-2xl border border-[#2b3139] bg-[#161a1e] p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
            <Trophy size={100} className="text-[#f3ba2f]" />
          </div>
          <div className="relative z-10">
            <p className="text-[#848e9c] text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
              <Wallet size={14} /> Casino Balance
            </p>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-[#f3ba2f] font-mono tracking-tight tabular-nums">
                  {formatNumber(casinoBcBalance, 4)}
                </span>
                <span className="text-[#eaecef] font-bold">BC</span>
              </div>
              <div className="text-sm font-medium text-[#848e9c] mt-1 font-mono">
                ≈ ${formatNumber(casinoUsdValue, 2)}
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={() => { setTransferForm({direction: 'toCasino', amount: ''}); setTransferModal(true) }} className="px-4 py-2 bg-[#2b3139] hover:bg-[#363c45] text-[#eaecef] rounded-lg text-xs font-bold uppercase border border-[#474d57] transition-all active:scale-95 flex items-center gap-2">
                <ArrowRightLeft size={14} /> Deposit to Casino
              </button>
            </div>
          </div>
        </div>

        {/* MINI HISTORY */}
        <div className="rounded-2xl border border-[#2b3139] bg-[#161a1e] p-4 flex flex-col min-h-[140px]">
          <p className="text-[#848e9c] text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
            <History size={14} /> Recent Rolls
          </p>
          <div className="flex-1 flex gap-2 overflow-x-auto items-center md:flex-wrap content-start scrollbar-hide">
            {history.length === 0 && <span className="text-[#848e9c] text-xs italic">No bets placed yet.</span>}
            {history.slice(0, 12).map((h, i) => (
              <div key={i} className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold font-mono text-[10px] border border-opacity-20 animate-in zoom-in duration-300 ${h.win ? 'bg-[#0ecb81]/10 border-[#0ecb81] text-[#0ecb81]' : 'bg-[#f6465d]/10 border-[#f6465d] text-[#f6465d]'}`}>
                {h.roll}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* GAME BOARD */}
      <div className="rounded-3xl border border-[#2b3139] bg-[#161a1e] overflow-hidden shadow-2xl relative">
        <div className="grid grid-cols-1 lg:grid-cols-4">
          
          {/* CONTROLS */}
          <div className="lg:col-span-1 bg-[#1e2329] border-r border-[#2b3139] p-6 flex flex-col gap-6">
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-[10px] font-bold text-[#848e9c] uppercase">Bet Amount</label>
                <span className="text-[10px] font-bold text-[#848e9c]">Max: {formatNumber(casinoBcBalance, 2)}</span>
              </div>
              <div className="relative group">
                <input type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} className="w-full bg-[#0b0e11] border border-[#2b3139] rounded-xl py-3 pl-3 pr-10 text-white font-mono font-bold focus:border-[#f3ba2f] outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                <div className="absolute right-3 top-3.5 pointer-events-none"><Coins size={16} className="text-[#f3ba2f]" /></div>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {['Min', '1/2', '2x', 'Max'].map(label => (
                  <button key={label} onClick={() => { if(label === 'Min') adjustBet('min'); if(label === '1/2') adjustBet('half'); if(label === '2x') adjustBet('double'); if(label === 'Max') adjustBet('max'); }} className="bg-[#2b3139] hover:bg-[#363c45] text-[#848e9c] hover:text-[#eaecef] py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors">{label}</button>
                ))}
              </div>
            </div>
            
            {/* PROFIT BOX WITH USD */}
            <div className="mt-auto bg-[#0b0e11] rounded-xl p-4 border border-[#2b3139]">
              <div className="flex justify-between text-xs text-[#848e9c] font-bold uppercase mb-1"><span>Profit on Win</span></div>
              <div className="flex items-center gap-2 text-[#0ecb81]">
                <span className="text-xl font-black font-mono">+{formatNumber(potentialProfit)}</span>
                <span className="text-xs font-bold">BC</span>
              </div>
              <div className="text-[10px] font-medium text-[#848e9c] mt-1 font-mono">
                ≈ ${formatNumber(profitUsdValue, 2)}
              </div>
            </div>
            
            <button onClick={handlePlay} disabled={isRolling || !betAmount} className={`w-full py-4 rounded-xl font-black text-lg uppercase tracking-widest shadow-lg transition-all active:scale-95 ${isRolling ? 'bg-[#2b3139] text-[#848e9c] cursor-not-allowed' : 'bg-[#f3ba2f] text-[#0b0e11] hover:bg-[#e0aa25] shadow-[#f3ba2f]/20'}`}>
              {isRolling ? 'Rolling...' : 'Bet'}
            </button>
          </div>

          {/* VISUALIZER */}
          <div className="lg:col-span-3 p-8 flex flex-col relative min-h-[400px]">
            <div className="flex justify-between bg-[#0b0e11] rounded-2xl p-4 border border-[#2b3139] mb-12">
               <div className="text-center w-1/3 border-r border-[#2b3139]"><div className="text-xs font-bold text-[#848e9c] uppercase mb-1">Multiplier</div><div className="text-xl font-black text-[#eaecef] font-mono">{multiplier}x</div></div>
               <div className="text-center w-1/3 border-r border-[#2b3139]"><div className="text-xs font-bold text-[#848e9c] uppercase mb-1">Roll Over</div><div className="text-xl font-black text-[#eaecef] font-mono">{rollOverTarget}</div></div>
               <div className="text-center w-1/3"><div className="text-xs font-bold text-[#848e9c] uppercase mb-1">Win Chance</div><div className="text-xl font-black text-[#0ecb81] font-mono">{winChance}%</div></div>
            </div>

            <div className="flex-1 flex flex-col justify-center select-none">
              <div className="relative h-12 w-full flex items-center">
                <div className="absolute left-0 right-0 h-4 bg-[#2b3139] rounded-full overflow-hidden pointer-events-none">
                  <div className="absolute left-0 top-0 bottom-0 bg-[#f6465d] transition-all duration-75" style={{ width: `${rollOverTarget}%` }}/>
                  <div className="absolute right-0 top-0 bottom-0 bg-[#0ecb81] transition-all duration-75" style={{ width: `${100 - rollOverTarget}%` }}/>
                </div>
                <input type="range" min="2" max="97" step="1" value={rollOverTarget} onChange={(e) => setWinChance(100 - Number(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                <div className="absolute w-10 h-10 bg-[#eaecef] rounded-xl shadow-2xl border-4 border-[#161a1e] flex items-center justify-center pointer-events-none transition-all duration-75 z-10" style={{ left: `calc(${rollOverTarget}% - 20px)` }}><ArrowRightLeft size={16} className="text-[#161a1e]" /></div>
                {lastResult && !isRolling && (
                  <div className="absolute -top-16 z-30 transition-all duration-300 pointer-events-none" style={{ left: `calc(${lastResult.roll}% - 30px)` }}>
                    <div className={`px-4 py-2 rounded-lg font-black text-lg shadow-2xl border-2 flex flex-col items-center animate-in zoom-in ${lastResult.win ? 'bg-[#0ecb81] border-[#0ecb81] text-[#0b0e11]' : 'bg-[#1e2329] border-[#f6465d] text-[#f6465d]'}`}>
                      <span className="font-mono">{lastResult.roll}</span>
                      <div className={`w-2 h-2 rotate-45 absolute -bottom-1 ${lastResult.win ? 'bg-[#0ecb81]' : 'bg-[#f6465d]'}`} />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-between mt-2 text-xs font-bold text-[#848e9c]"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
            </div>
            <div className="mt-auto text-center pt-8">
              <p className="text-xs text-[#848e9c] flex items-center justify-center gap-2"><AlertCircle size={12} /> Drag slider to adjust risk. Rolling in the Green wins.</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- LIVE BETS TABLE --- */}
      <div className="bg-[#161a1e] rounded-2xl border border-[#2b3139] overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-[#2b3139] flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#0ecb81] animate-pulse"/>
          <h2 className="text-sm font-bold text-[#eaecef] uppercase tracking-wider">Latest Bets</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-[#848e9c] uppercase font-bold border-b border-[#2b3139]">
                <th className="py-4 px-6">Time</th>
                <th className="py-4 px-6 text-right">Bet</th>
                <th className="py-4 px-6 text-right">Multiplier</th>
                <th className="py-4 px-6 text-right">Target</th>
                <th className="py-4 px-6 text-right">Outcome</th>
                <th className="py-4 px-6 text-right">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2b3139]/30">
              {history.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-[#848e9c] text-sm italic">No bets placed yet.</td></tr>
              ) : (
                history.map((row) => (
                  <tr key={row.id} className="hover:bg-[#1e2329] transition-colors">
                    <td className="py-4 px-6 text-[#848e9c] font-mono tabular-nums text-xs font-medium">
                      {formatTime(row.time)}
                    </td>
                    <td className="py-4 px-6 text-right font-mono tabular-nums text-xs font-medium text-[#eaecef]">
                      {formatNumber(row.bet)} <span className="text-[10px] text-[#848e9c] font-sans">BC</span>
                    </td>
                    <td className="py-4 px-6 text-right font-mono tabular-nums text-xs font-medium text-[#eaecef]">
                      {row.multiplier}x
                    </td>
                    <td className="py-4 px-6 text-right font-mono tabular-nums text-xs font-medium text-[#848e9c]">
                      {'>'} {parseFloat(row.target).toFixed(0)}
                    </td>
                    <td className={`py-4 px-6 text-right font-mono tabular-nums text-xs font-medium ${row.win ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                      {row.roll}
                    </td>
                    <td className={`py-4 px-6 text-right font-mono tabular-nums text-xs font-medium ${row.win ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                      {row.win ? '+' : ''}{formatNumber(row.profit)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {transferModal && (
        <Modal title="Wallet Transfer" onClose={() => setTransferModal(null)}>
          <form onSubmit={handleTransfer} className="space-y-6">
            <div className="bg-[#0b0e11] p-1 rounded-xl flex text-xs font-bold uppercase">
              <button type="button" onClick={() => setTransferForm({ ...transferForm, direction: 'toCasino' })} className={`flex-1 py-3 rounded-lg transition-colors ${transferForm.direction === 'toCasino' ? 'bg-[#2b3139] text-[#eaecef]' : 'text-[#848e9c] hover:text-[#eaecef]'}`}>Deposit to Casino</button>
              <button type="button" onClick={() => setTransferForm({ ...transferForm, direction: 'toWallet' })} className={`flex-1 py-3 rounded-lg transition-colors ${transferForm.direction === 'toWallet' ? 'bg-[#2b3139] text-[#eaecef]' : 'text-[#848e9c] hover:text-[#eaecef]'}`}>Withdraw to Wallet</button>
            </div>
            <div className="text-center py-4">
               <span className="text-[#848e9c] text-xs font-bold uppercase">Available Balance</span>
               <div className="text-2xl font-black text-[#eaecef]">{transferForm.direction === 'toCasino' ? formatNumber(walletBC, 4) : formatNumber(casinoBcBalance, 4)} <span className="text-sm ml-1 text-[#f3ba2f]">BC</span></div>
            </div>
            <div className="relative">
              <label className="block text-[10px] font-bold text-[#848e9c] uppercase mb-2">Amount</label>
              <input type="number" step="any" value={transferForm.amount} onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })} className="w-full bg-[#0b0e11] border border-[#2b3139] rounded-xl p-3 text-white font-mono focus:border-[#f3ba2f] outline-none" placeholder="0.00" />
            </div>
            <button type="submit" disabled={loading || !transferForm.amount} className="w-full py-4 bg-[#f3ba2f] text-[#0b0e11] font-black rounded-xl uppercase tracking-widest hover:bg-[#e0aa25] disabled:opacity-50">{loading ? 'Processing...' : 'Confirm Transfer'}</button>
          </form>
        </Modal>
      )}
    </div>
  )
}
