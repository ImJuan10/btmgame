import React, { useState, useEffect, useMemo, Fragment } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, YAxis, Tooltip, XAxis,
} from 'recharts'
import { ChevronUp, ChevronDown, X, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { getPrices, getPricesHistory, getHoldings, buy, sell, marketHack } from '../api'

const TRADING_COINS = ['BTC', 'ETH', 'DOGE', 'SHIB', 'TON', 'TRX', 'LTC', 'LUNA', 'BC'].filter(c => c !== 'USDT')
const MAJORS = ['BTC', 'ETH', 'LTC']
const ALTS = TRADING_COINS.filter(c => !MAJORS.includes(c))
const FILTERS = [{ id: 'all', label: 'All', coins: TRADING_COINS }, { id: 'majors', label: 'Majors', coins: MAJORS }, { id: 'alts', label: 'Alts', coins: ALTS }]
const CHART_RANGES_MS = { '1H': 60 * 60 * 1000, '1D': 24 * 60 * 60 * 1000, '1M': 30 * 24 * 60 * 60 * 1000, All: null }

function formatChartLabel(timestamp, range) {
  const d = new Date(timestamp)
  if (range === '1H' || range === '1D') return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function formatNumber(num, decimals = 2) {
  if (num == null || Number.isNaN(num)) return '—'
  return Number(num).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function SparklineCell({ data, symbol }) {
  const chartData = useMemo(() => {
    const raw = (data || []).slice(-30)
    if (raw.length < 2) return []
    return raw.map((d, i) => ({ i, value: d.price }))
  }, [data])

  if (chartData.length < 2) return <span className="text-[#848e9c] text-xs">—</span>
  const isUp = chartData[chartData.length - 1].value >= chartData[0].value
  const prices = chartData.map(d => d.value)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const padding = (max - min) * 0.3 || max * 0.1 

  return (
    <div className="h-10 w-full min-w-[100px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <YAxis domain={[min - padding, max + padding]} hide />
          <Area type="monotone" dataKey="value" stroke={isUp ? '#0ecb81' : '#f6465d'} strokeWidth={1.5} fill={isUp ? '#0ecb81' : '#f6465d'} fillOpacity={0.1} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function ExpandedChart({ symbol, data, onClose, prices, holdings, refresh }) {
  const [range, setRange] = useState('1H')
  const [buyAmount, setBuyAmount] = useState('')
  const [sellAmount, setSellAmount] = useState('')
  const [buyLoading, setBuyLoading] = useState(false)
  const [sellLoading, setSellLoading] = useState(false)
  const [tradeError, setTradeError] = useState(null)

  const price = prices?.[symbol] ?? 0
  const balance = holdings?.wallet?.[symbol] ?? 0
  const usdtBalance = holdings?.wallet?.USDT ?? 0
  const pair = `${symbol}/USDT`

  const stats = useMemo(() => {
    const now = Date.now()
    const cutoff = CHART_RANGES_MS[range] == null ? 0 : now - CHART_RANGES_MS[range]
    const filtered = (data || []).filter((d) => d.timestamp >= cutoff)
    if (filtered.length < 2) return { chartData: [], domain: ['auto', 'auto'], isUp: true }
    const first = filtered[0].price
    const last = filtered[filtered.length - 1].price
    const isUp = last >= first
    const pArray = filtered.map(d => d.price)
    const min = Math.min(...pArray)
    const max = Math.max(...pArray)
    const padding = (max - min) * 0.4 || last * 0.05 
    const chartData = filtered.map((d) => ({ ...d, value: d.price, label: formatChartLabel(d.timestamp, range) }))
    return { chartData, domain: [min - padding, max + padding], isUp }
  }, [data, range])

  const handleBuy = async (e) => {
    e.preventDefault(); setTradeError(null); setBuyLoading(true)
    try { await buy(pair, buyAmount); toast.success(`Bought ${buyAmount} ${symbol}`, { style: { background: '#1e2329', color: '#0ecb81', border: '1px solid #2b3139' } }); setBuyAmount(''); await refresh() } 
    catch (err) { setTradeError(err.message); toast.error(err.message, { style: { background: '#1e2329', color: '#f6465d', border: '1px solid #2b3139' } }) } 
    finally { setBuyLoading(false) }
  }

  const handleSell = async (e) => {
    e.preventDefault(); setTradeError(null); setSellLoading(true)
    try { await sell(pair, sellAmount); toast.success(`Sold ${sellAmount} ${symbol}`, { icon: '📉', style: { background: '#1e2329', color: '#f6465d', border: '1px solid #2b3139' }}); setSellAmount(''); await refresh() } 
    catch (err) { setTradeError(err.message); toast.error(err.message, { style: { background: '#1e2329', color: '#f6465d', border: '1px solid #2b3139' } }) } 
    finally { setSellLoading(false) }
  }

  const setMaxBuy = () => { if (price > 0) setBuyAmount((usdtBalance / price).toFixed(6)); }
  const setMaxSell = () => setSellAmount(balance.toFixed(6)); 
  
  return (
    <tr className="bg-[#1e2329]">
      <td colSpan={4} className="p-0">
        <div className="p-6 border-t border-[#2b3139] animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-6 font-sans">
            <div className="flex items-center gap-4">
              <span className="text-xl font-bold text-[#eaecef]">{symbol}/USDT</span>
              <span className={`text-sm font-bold font-mono ${stats.isUp ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                {price < 1 ? price.toFixed(6) : formatNumber(price)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex bg-[#0b0e11] rounded-lg p-1 border border-[#2b3139]">{Object.keys(CHART_RANGES_MS).map((r) => (<button key={r} onClick={() => setRange(r)} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${range === r ? 'bg-[#2b3139] text-[#eaecef]' : 'text-[#848e9c] hover:text-[#eaecef]'}`}>{r}</button>))}</div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#2b3139] text-[#848e9c] transition-colors"><X size={20} /></button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 font-sans">
            <div className="lg:col-span-3 h-[350px] bg-[#161a1e] rounded-2xl border border-[#2b3139] p-4 relative overflow-hidden">
              {stats.chartData.length >= 2 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.chartData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                    <defs><linearGradient id={`grad-${symbol}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={stats.isUp ? '#0ecb81' : '#f6465d'} stopOpacity={0.3} /><stop offset="95%" stopColor={stats.isUp ? '#0ecb81' : '#f6465d'} stopOpacity={0} /></linearGradient></defs>
                    <YAxis domain={stats.domain} hide />
                    <Tooltip isAnimationActive={false} cursor={{ stroke: '#848e9c', strokeWidth: 1, strokeDasharray: '4 4' }} content={({ active, payload }) => { if (active && payload?.length) { return (<div className="bg-[#1e2329] border border-[#2b3139] p-3 rounded-xl shadow-2xl pointer-events-none"><p className="text-[#848e9c] text-[10px] uppercase font-bold mb-1">{new Date(payload[0].payload.timestamp).toLocaleString()}</p><p className="font-bold text-[#eaecef] text-lg font-mono">${payload[0].value < 1 ? payload[0].value.toFixed(6) : formatNumber(payload[0].value)}</p></div>) } return null }} />
                    <Area type="monotone" dataKey="value" stroke={stats.isUp ? '#0ecb81' : '#f6465d'} strokeWidth={3} fill={`url(#grad-${symbol})`} isAnimationActive={false} activeDot={{ r: 6, fill: '#ffffff', stroke: stats.isUp ? '#0ecb81' : '#f6465d', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : ( <div className="h-full flex items-center justify-center text-[#848e9c] animate-pulse">Syncing market data...</div> )}
            </div>

            <div className="bg-[#161a1e] rounded-2xl border border-[#2b3139] p-5 space-y-6 flex flex-col justify-center">
              <div>
                <h3 className="text-xs font-black text-[#848e9c] uppercase tracking-widest mb-4">Spot Trading</h3>
                {tradeError && <div className="text-xs text-[#f6465d] bg-[#f6465d]/10 p-2 rounded-lg mb-4">{tradeError}</div>}
                
                <form onSubmit={handleBuy} className="space-y-3">
                  <div className="flex justify-between text-[10px] font-bold uppercase text-[#848e9c]"><span>Buy {symbol}</span><span className="font-mono">Avail: {formatNumber(usdtBalance)} USDT</span></div>
                  <div className="relative">
                    <input type="number" step="any" value={buyAmount} onChange={(e) => setBuyAmount(e.target.value)} placeholder="Amount" className="w-full bg-[#0b0e11] border border-[#2b3139] rounded-xl p-3 text-sm text-white font-mono font-bold focus:border-[#0ecb81] outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                    <button type="button" onClick={setMaxBuy} className="absolute right-12 top-1/2 -translate-y-1/2 text-[10px] bg-[#2b3139] px-2 py-1 rounded text-[#0ecb81] hover:bg-[#363c45] font-bold transition-colors">MAX</button>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#848e9c] text-xs font-bold uppercase pointer-events-none">{symbol}</span>
                  </div>
                  <div className="text-[10px] text-[#848e9c] flex justify-between px-1"><span>Est. Cost:</span><span className="text-[#eaecef] font-mono">≈ ${buyAmount ? formatNumber(parseFloat(buyAmount) * price) : '0.00'} USDT</span></div>
                  <button type="submit" disabled={buyLoading || !buyAmount} className="w-full py-3 bg-[#0ecb81] text-[#0b0e11] font-black rounded-xl uppercase hover:bg-[#0ecb81]/90 disabled:opacity-50">Buy</button>
                </form>
              </div>

              <div className="pt-4 border-t border-[#2b3139]">
                <form onSubmit={handleSell} className="space-y-3">
                  <div className="flex justify-between text-[10px] font-bold uppercase text-[#848e9c]"><span>Sell {symbol}</span><span className="font-mono">Avail: {formatNumber(balance, 4)} {symbol}</span></div>
                  <div className="relative">
                    <input type="number" step="any" value={sellAmount} onChange={(e) => setSellAmount(e.target.value)} placeholder="Amount" className="w-full bg-[#0b0e11] border border-[#2b3139] rounded-xl p-3 text-sm text-white font-mono font-bold focus:border-[#f6465d] outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                    <button type="button" onClick={setMaxSell} className="absolute right-12 top-1/2 -translate-y-1/2 text-[10px] bg-[#2b3139] px-2 py-1 rounded text-[#f6465d] hover:bg-[#363c45] font-bold transition-colors">MAX</button>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#848e9c] text-xs font-bold uppercase pointer-events-none">{symbol}</span>
                  </div>
                  <div className="text-[10px] text-[#848e9c] flex justify-between px-1"><span>Est. Value:</span><span className="text-[#eaecef] font-mono">≈ ${sellAmount ? formatNumber(parseFloat(sellAmount) * price) : '0.00'} USDT</span></div>
                  <button type="submit" disabled={sellLoading || !sellAmount} className="w-full py-3 bg-[#f6465d] text-white font-black rounded-xl uppercase hover:bg-[#f6465d]/90 disabled:opacity-50">Sell</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  )
}

function AdminHackButtons() {
  const handle = async (dir) => { try { await marketHack(dir) } catch (e) {} }
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 opacity-10 hover:opacity-100 transition-opacity z-50">
      <button onClick={() => handle('up')} className="p-3 bg-[#0ecb81] text-black rounded-full shadow-xl"><ChevronUp size={24} /></button>
      <button onClick={() => handle('down')} className="p-3 bg-[#f6465d] text-white rounded-full shadow-xl"><ChevronDown size={24} /></button>
    </div>
  )
}

export default function MarketTab() {
  const [prices, setPrices] = useState({})
  const [holdings, setHoldings] = useState({ wallet: {}, casino: {} })
  const [history, setHistory] = useState({})
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [expandedSymbol, setExpandedSymbol] = useState(null)

  const refresh = async () => { try { const [p, h] = await Promise.all([getPrices(), getHoldings()]); setPrices(p); setHoldings(h); setError(null) } catch (e) { setError("Server Connection Lost") } }
  useEffect(() => { refresh(); const i1 = setInterval(refresh, 2000); const i2 = setInterval(async () => { for (const coin of TRADING_COINS) { getPricesHistory(`${coin}/USDT`).then(data => setHistory(h => ({ ...h, [coin]: data }))).catch(() => {}) } }, 3000); return () => { clearInterval(i1); clearInterval(i2); } }, [])
  const currentFilter = FILTERS.find((f) => f.id === filter) || FILTERS[0]
  const displayCoins = currentFilter.coins

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 px-4 font-sans">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#eaecef]">Market Crypto</h1>
        <div className="flex bg-[#1e2329] rounded-lg p-1 border border-[#2b3139]">{FILTERS.map((f) => (<button key={f.id} onClick={() => setFilter(f.id)} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${filter === f.id ? 'bg-[#2b3139] text-[#eaecef]' : 'text-[#848e9c] hover:text-[#eaecef]'}`}>{f.label}</button>))}</div>
      </div>
      <div className="bg-[#161a1e] rounded-2xl border border-[#2b3139] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead><tr className="text-xs text-[#848e9c] uppercase font-bold border-b border-[#2b3139]"><th className="py-4 px-6">Pair</th><th className="py-4 px-6 text-right">Last Price</th><th className="py-4 px-6 text-right">24h Change</th><th className="py-4 px-6 text-right w-40">Market Trend</th></tr></thead>
            <tbody className="divide-y divide-[#2b3139]/30">
              {displayCoins.map((symbol) => {
                const price = prices[symbol]; const hist = history[symbol] || []; const first = hist[0]?.price || price; const diff = price - first; const pct = first ? (diff / first) * 100 : 0; const isUp = diff >= 0;
                return (
                  <Fragment key={symbol}>
                    <tr onClick={() => setExpandedSymbol(expandedSymbol === symbol ? null : symbol)} className={`cursor-pointer transition-colors hover:bg-[#1e2329] ${expandedSymbol === symbol ? 'bg-[#1e2329]' : ''}`}>
                      <td className="py-5 px-6"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#2b3139] flex items-center justify-center font-black text-xs">{symbol.substring(0, 2)}</div><span className="font-bold text-[#eaecef]">{symbol}/USDT</span></div></td>
                      <td className="py-5 px-6 text-right font-mono font-bold text-[#eaecef]">{price < 1 ? price.toFixed(6) : formatNumber(price)}</td>
                      <td className={`py-5 px-6 text-right font-bold ${isUp ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>{isUp ? '+' : ''}{pct.toFixed(2)}%</td>
                      <td className="py-4 px-6"><SparklineCell data={hist} symbol={symbol} /></td>
                    </tr>
                    {expandedSymbol === symbol && (<ExpandedChart symbol={symbol} data={hist} onClose={() => setExpandedSymbol(null)} prices={prices} holdings={holdings} refresh={refresh} />)}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      <AdminHackButtons />
    </div>
  )
}
