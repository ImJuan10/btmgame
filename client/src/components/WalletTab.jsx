import React, { useState, useEffect, useMemo, useRef } from 'react'
import { 
  ArrowDownToLine, ArrowUpFromLine, X, TrendingUp, ArrowUpRight, ArrowDownRight, Wallet, ArrowRightLeft, RefreshCw, ChevronDown, Check
} from 'lucide-react'
import { AreaChart, Area, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'
import { getHoldings, getPrices, getBalances, deposit, withdraw, swap } from '../api'

const COINS = ['BTC', 'ETH', 'DOGE', 'SHIB', 'TON', 'TRX', 'LTC', 'LUNA', 'BC', 'USDT']

const CHART_RANGES_MS = {
  '1H': 60 * 60 * 1000,
  '1D': 24 * 60 * 60 * 1000,
  '1M': 30 * 24 * 60 * 60 * 1000,
  'All': null,
}

function formatNumber(num, decimals = 2) {
  if (num == null || Number.isNaN(num)) return '—'
  return Number(num).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="bg-[#1e2329] border border-[#2b3139] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[#2b3139]">
          <h3 className="text-lg font-bold text-[#eaecef]">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#2b3139] text-[#848e9c]">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export default function WalletTab() {
  const [holdings, setHoldings] = useState({ wallet: {}, casino: {} })
  const [prices, setPrices] = useState({})
  const [balanceHistory, setBalanceHistory] = useState([])
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(false)
  const [portfolioChartRange, setPortfolioChartRange] = useState('1H')
  
  // Form State
  const [form, setForm] = useState({ amount: '', currency: 'USDT', toCurrency: 'BTC', address: '' })

  // Dropdown States for Swap
  const [swapFromOpen, setSwapFromOpen] = useState(false)
  const [swapToOpen, setSwapToOpen] = useState(false)
  const swapFromRef = useRef(null)
  const swapToRef = useRef(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (swapFromRef.current && !swapFromRef.current.contains(event.target)) setSwapFromOpen(false)
      if (swapToRef.current && !swapToRef.current.contains(event.target)) setSwapToOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const refresh = async () => {
    try {
      const [h, p, b] = await Promise.all([getHoldings(), getPrices(), getBalances()])
      setHoldings(h)
      setPrices(p)
      setBalanceHistory(Array.isArray(b) ? b : [])
      setError(null)
    } catch (e) {}
  }

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 2000)
    return () => clearInterval(interval)
  }, [])

  // --- CHART MATH ---
  const stats = useMemo(() => {
    if (balanceHistory.length < 2) return { current: 0, diff: 0, percent: 0, data: [], domain: [0, 100] }
    const now = Date.now()
    const cutoff = CHART_RANGES_MS[portfolioChartRange] ? now - CHART_RANGES_MS[portfolioChartRange] : 0
    const filtered = balanceHistory.filter(d => d.timestamp >= cutoff)

    if (filtered.length === 0) return { current: 0, diff: 0, percent: 0, data: [], domain: [0, 100] }

    const first = filtered[0].balance
    const last = filtered[filtered.length - 1].balance
    const diff = last - first
    const percent = first !== 0 ? (diff / first) * 100 : 0
    const pricesOnly = filtered.map(d => d.balance)
    const min = Math.min(...pricesOnly)
    const max = Math.max(...pricesOnly)
    const spread = max - min
    const padding = spread * 0.2 || max * 0.05
    
    return { current: last, diff, percent, data: filtered, domain: [min - padding, max + padding] }
  }, [balanceHistory, portfolioChartRange])

  // --- HANDLERS ---
  const handleDeposit = async (e) => {
    e.preventDefault(); setLoading(true); const tid = toast.loading("Processing deposit...")
    try { await deposit(form.amount, form.currency); await refresh(); setModal(null); toast.success(`Deposited ${form.amount} ${form.currency}`, { id: tid }); setForm({ ...form, amount: '' }) } 
    catch (err) { toast.error(err.message, { id: tid }) } finally { setLoading(false) }
  }

  const handleWithdraw = async (e) => {
    e.preventDefault(); setLoading(true); const tid = toast.loading("Processing withdrawal...")
    try { await withdraw(form.amount, form.currency, form.address); await refresh(); setModal(null); toast.success(`Withdrew ${form.amount} ${form.currency}`, { id: tid }); setForm({ ...form, amount: '', address: '' }) } 
    catch (err) { toast.error(err.message, { id: tid }) } finally { setLoading(false) }
  }

  const handleSwap = async (e) => {
    e.preventDefault(); setLoading(true); const tid = toast.loading("Swapping...")
    try { 
        await swap(form.currency, form.toCurrency, form.amount); 
        await refresh(); 
        setModal(null); 
        toast.success(`Swapped ${form.amount} ${form.currency} to ${form.toCurrency}`, { id: tid }); 
        setForm({ ...form, amount: '' });
    } catch (err) { toast.error(err.message, { id: tid }) } 
    finally { setLoading(false) }
  }

  const isPositive = stats.diff >= 0
  
  const swapEstimate = form.amount && prices[form.currency] && prices[form.toCurrency] 
    ? (parseFloat(form.amount) * prices[form.currency] / prices[form.toCurrency]) 
    : 0;

  // Get balance for Swap UI
  const swapBalance = holdings.wallet?.[form.currency] || 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 px-4">
      {/* CSS to hide arrows */}
      <style>{`
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#eaecef] flex items-center gap-2">
          <Wallet className="text-[#f3ba2f]" /> Wallet
        </h1>
        <div className="flex bg-[#1e2329] rounded-lg p-1 border border-[#2b3139]">
          {['1H', '1D', '1M', 'All'].map((r) => (
            <button
              key={r}
              onClick={() => setPortfolioChartRange(r)}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                portfolioChartRange === r ? 'bg-[#2b3139] text-[#eaecef]' : 'text-[#848e9c] hover:text-[#eaecef]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* HERO CARD */}
      <div className="relative overflow-hidden rounded-3xl border border-[#2b3139] bg-[#161a1e] group h-[400px]">
        <div className="relative z-20 p-8 h-full flex flex-col justify-between pointer-events-none">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="space-y-1 pointer-events-auto">
              <p className="text-[#848e9c] text-sm font-medium flex items-center gap-2"><TrendingUp size={14} /> Estimated Total Balance</p>
              <div className="flex items-baseline gap-2"><span className="text-5xl font-extrabold text-[#eaecef] tracking-tight">${formatNumber(stats.current)}</span><span className="text-[#848e9c] text-xl font-medium">USDT</span></div>
              <div className={`flex items-center mt-3 text-sm font-bold px-3 py-1 rounded-full w-fit ${isPositive ? 'bg-[#0ecb81]/10 text-[#0ecb81]' : 'bg-[#f6465d]/10 text-[#f6465d]'}`}>{isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}{isPositive ? '+' : ''}{formatNumber(stats.diff)} ({formatNumber(stats.percent)}%)<span className="ml-2 text-[#848e9c] font-normal opacity-70">past {portfolioChartRange}</span></div>
            </div>
            
            <div className="flex gap-3 w-full md:w-auto pointer-events-auto">
              <button onClick={() => setModal('deposit')} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#0ecb81] text-[#0b0e11] hover:bg-[#0ecb81]/90 font-bold transition-transform active:scale-95 shadow-lg shadow-[#0ecb81]/10"><ArrowDownToLine size={20} /> Deposit</button>
              <button onClick={() => setModal('withdraw')} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#2b3139] text-[#eaecef] hover:bg-[#323942] font-bold border border-[#474d57] transition-transform active:scale-95"><ArrowUpFromLine size={20} /> Withdraw</button>
              <button onClick={() => setModal('swap')} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#f3ba2f] text-[#0b0e11] hover:bg-[#e0aa25] font-bold transition-transform active:scale-95 shadow-lg shadow-[#f3ba2f]/10"><RefreshCw size={20} /> Swap</button>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 z-10">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={stats.data} margin={{ top: 120, right: 0, left: 0, bottom: 0 }}>
              <defs><linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={isPositive ? "#0ecb81" : "#f6465d"} stopOpacity={0.4}/><stop offset="95%" stopColor={isPositive ? "#0ecb81" : "#f6465d"} stopOpacity={0}/></linearGradient></defs>
              <YAxis domain={stats.domain} hide={true} />
              <Tooltip cursor={{ stroke: '#848e9c', strokeWidth: 1, strokeDasharray: '4 4' }} content={({ active, payload }) => { if (active && payload?.length) { return (<div className="bg-[#1e2329] border border-[#2b3139] p-3 rounded-xl shadow-2xl text-xs pointer-events-none"><p className="text-[#848e9c] mb-1">{new Date(payload[0].payload.timestamp).toLocaleString()}</p><p className="font-bold text-[#eaecef] text-lg">${formatNumber(payload[0].value)}</p></div>) } return null }} />
              <Area type="monotone" dataKey="balance" stroke={isPositive ? "#0ecb81" : "#f6465d"} fill="url(#balanceGradient)" strokeWidth={3} isAnimationActive={false} activeDot={{ r: 6, fill: '#ffffff', stroke: isPositive ? '#0ecb81' : '#f6465d', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ASSETS TABLE */}
      <div className="bg-[#161a1e] rounded-2xl border border-[#2b3139] overflow-hidden">
        <div className="px-6 py-5 border-b border-[#2b3139] flex justify-between items-center bg-[#1e2329]/50"><h2 className="text-lg font-bold text-[#eaecef]">My Assets</h2><div className="text-xs text-[#848e9c] uppercase font-bold tracking-widest">Simulation Account</div></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="text-xs text-[#848e9c] uppercase border-b border-[#2b3139]"><th className="py-4 px-6 font-bold">Asset</th><th className="py-4 px-6 font-bold text-right">Balance</th><th className="py-4 px-6 font-bold text-right">Market Price</th><th className="py-4 px-6 font-bold text-right">Total Value</th></tr></thead>
            <tbody className="divide-y divide-[#2b3139]/30">
              {COINS.map(coin => {
                const balance = holdings.wallet[coin] || 0; const price = prices[coin] || 0; if (balance === 0 && coin !== 'USDT') return null;
                return (
                  <tr key={coin} className="hover:bg-[#1e2329] transition-colors group">
                    <td className="py-5 px-6"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#2b3139] border border-[#363c45] flex items-center justify-center font-black text-[#eaecef] group-hover:border-[#f3ba2f] transition-colors text-xs">{coin.substring(0, 2)}</div><div><p className="font-bold text-[#eaecef]">{coin}</p><p className="text-xs text-[#848e9c]">Digital Asset</p></div></div></td>
                    <td className="py-5 px-6 text-right font-mono text-[#eaecef]">{formatNumber(balance, coin === 'BTC' || coin === 'ETH' ? 6 : 2)}</td>
                    <td className="py-5 px-6 text-right font-mono text-[#848e9c]">${price < 0.01 ? price.toFixed(6) : formatNumber(price)}</td>
                    <td className="py-5 px-6 text-right font-mono font-bold text-[#eaecef]">${formatNumber(balance * price)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'deposit' && ( <Modal title="Deposit Funds" onClose={() => setModal(null)}>
          <form onSubmit={handleDeposit} className="space-y-5">
            <div><label className="block text-xs font-black text-[#848e9c] uppercase mb-2">Select Currency</label><select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-full rounded-xl bg-[#0b0e11] border border-[#2b3139] p-3 text-[#eaecef] focus:border-[#0ecb81] outline-none">{COINS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="block text-xs font-black text-[#848e9c] uppercase mb-2">Deposit Amount</label><input type="number" step="any" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full rounded-xl bg-[#0b0e11] border border-[#2b3139] p-3 text-[#eaecef] focus:border-[#0ecb81] outline-none" placeholder="0.00" /></div>
            <button type="submit" disabled={loading || !form.amount} className="w-full py-4 rounded-xl bg-[#0ecb81] text-[#0b0e11] font-black uppercase tracking-widest hover:bg-[#0ecb81]/90 disabled:opacity-50 transition-all">{loading ? 'Processing...' : 'Confirm Deposit'}</button>
          </form>
      </Modal>)}

      {modal === 'withdraw' && ( <Modal title="Withdraw Funds" onClose={() => setModal(null)}>
          <form onSubmit={handleWithdraw} className="space-y-5">
            <div><label className="block text-xs font-black text-[#848e9c] uppercase mb-2">Select Currency</label><select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-full rounded-xl bg-[#0b0e11] border border-[#2b3139] p-3 text-[#eaecef] focus:border-[#f6465d] outline-none">{COINS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="block text-xs font-black text-[#848e9c] uppercase mb-2">Destination Address</label><input type="text" required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full rounded-xl bg-[#0b0e11] border border-[#2b3139] p-3 text-[#eaecef] focus:border-[#f6465d] outline-none" placeholder="0x..." /></div>
            <div><label className="block text-xs font-black text-[#848e9c] uppercase mb-2">Withdraw Amount</label><input type="number" step="any" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full rounded-xl bg-[#0b0e11] border border-[#2b3139] p-3 text-[#eaecef] focus:border-[#f6465d] outline-none" placeholder="0.00" /><p className="text-[10px] text-[#848e9c] mt-2">Available: {formatNumber(holdings.wallet[form.currency] || 0, 4)} {form.currency}</p></div>
            <button type="submit" disabled={loading || !form.amount || !form.address} className="w-full py-4 rounded-xl bg-[#f6465d] text-white font-black uppercase tracking-widest hover:bg-[#f6465d]/90 disabled:opacity-50 transition-all">{loading ? 'Processing...' : 'Request Withdrawal'}</button>
          </form>
      </Modal>)}

      {/* --- SWAP MODAL (IMPROVED) --- */}
      {modal === 'swap' && ( <Modal title="Swap Coins" onClose={() => setModal(null)}>
          <form onSubmit={handleSwap} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                {/* FROM DROPDOWN */}
                <div className="relative" ref={swapFromRef}>
                    <label className="block text-xs font-black text-[#848e9c] uppercase mb-2">From</label>
                    <button type="button" onClick={() => setSwapFromOpen(!swapFromOpen)} className="w-full bg-[#0b0e11] border border-[#2b3139] rounded-xl p-3 text-[#eaecef] flex justify-between items-center text-sm font-bold hover:border-[#f3ba2f] transition-colors">
                        {form.currency} <ChevronDown size={14} />
                    </button>
                    {swapFromOpen && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-[#1e2329] border border-[#2b3139] rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                            {COINS.map(c => (
                                <div key={c} onClick={() => { setForm({...form, currency: c}); setSwapFromOpen(false)}} className={`px-4 py-2 text-sm font-bold cursor-pointer flex justify-between hover:bg-[#2b3139] ${form.currency === c ? 'text-[#f3ba2f]' : 'text-[#848e9c]'}`}>
                                    {c} {form.currency === c && <Check size={14}/>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* TO DROPDOWN */}
                <div className="relative" ref={swapToRef}>
                    <label className="block text-xs font-black text-[#848e9c] uppercase mb-2">To</label>
                    <button type="button" onClick={() => setSwapToOpen(!swapToOpen)} className="w-full bg-[#0b0e11] border border-[#2b3139] rounded-xl p-3 text-[#eaecef] flex justify-between items-center text-sm font-bold hover:border-[#f3ba2f] transition-colors">
                        {form.toCurrency} <ChevronDown size={14} />
                    </button>
                    {swapToOpen && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-[#1e2329] border border-[#2b3139] rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                            {COINS.filter(c => c !== form.currency).map(c => (
                                <div key={c} onClick={() => { setForm({...form, toCurrency: c}); setSwapToOpen(false)}} className={`px-4 py-2 text-sm font-bold cursor-pointer flex justify-between hover:bg-[#2b3139] ${form.toCurrency === c ? 'text-[#f3ba2f]' : 'text-[#848e9c]'}`}>
                                    {c} {form.toCurrency === c && <Check size={14}/>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="relative">
                <div className="flex justify-between mb-2">
                    <label className="block text-xs font-black text-[#848e9c] uppercase">Amount to Swap</label>
                    <span className="text-[10px] font-bold text-[#848e9c] cursor-pointer hover:text-[#eaecef]" onClick={() => setForm({...form, amount: swapBalance})}>
                        Avail: {formatNumber(swapBalance, 6)}
                    </span>
                </div>
                <input 
                    type="number" 
                    step="any" 
                    required 
                    value={form.amount} 
                    onChange={(e) => setForm({ ...form, amount: e.target.value })} 
                    className="w-full bg-[#0b0e11] border border-[#2b3139] rounded-xl p-3 text-white font-mono focus:border-[#f3ba2f] outline-none" 
                    placeholder="0.00" 
                />
                <button type="button" onClick={() => setForm({...form, amount: swapBalance})} className="absolute right-3 top-9 text-[10px] bg-[#2b3139] px-2 py-1 rounded text-[#f3ba2f] hover:bg-[#363c45] font-bold">MAX</button>
            </div>
            
            <div className="bg-[#2b3139]/30 p-3 rounded-xl border border-[#2b3139] flex justify-between items-center">
                <span className="text-xs font-bold text-[#848e9c]">You Receive:</span>
                <span className="text-sm font-mono font-bold text-[#0ecb81]">≈ {formatNumber(swapEstimate, 6)} {form.toCurrency}</span>
            </div>

            <button type="submit" disabled={loading || !form.amount} className="w-full py-4 rounded-xl bg-[#f3ba2f] text-[#0b0e11] font-black uppercase tracking-widest hover:bg-[#e0aa25] disabled:opacity-50 transition-all">{loading ? 'Swapping...' : 'Confirm Swap'}</button>
          </form>
      </Modal>)}

    </div>
  )
}
