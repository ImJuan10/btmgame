import { useState, useEffect, useRef } from 'react'
import { History, ArrowDownToLine, RefreshCw, TrendingUp } from 'lucide-react'
import { getTransactions, subscribeTransactions } from '../api'

// FIX: Define clear styles with background opacity built-in logic
const TYPE_CONFIG = {
  Buy: { color: 'text-[#0ecb81]', bg: 'bg-[#0ecb81]/10', border: 'border-[#0ecb81]/20' },
  Sell: { color: 'text-[#f6465d]', bg: 'bg-[#f6465d]/10', border: 'border-[#f6465d]/20' },
  Deposit: { color: 'text-[#0ecb81]', bg: 'bg-[#0ecb81]/10', border: 'border-[#0ecb81]/20' },
  Withdraw: { color: 'text-[#f6465d]', bg: 'bg-[#f6465d]/10', border: 'border-[#f6465d]/20' },
  'Transfer Out': { color: 'text-[#f6465d]', bg: 'bg-[#f6465d]/10', border: 'border-[#f6465d]/20' },
}

const FUNDING_TYPES = ['Deposit', 'Withdraw', 'Transfer Out']
const TRADE_TYPES = ['Buy', 'Sell']

const VIEWS = [
  { id: 'all', label: 'All Transactions' },
  { id: 'funding', label: 'Funding' },
  { id: 'trades', label: 'Trading' },
]

function filterByView(transactions, viewId) {
  if (viewId === 'all') return transactions
  if (viewId === 'funding') return transactions.filter((tx) => FUNDING_TYPES.includes(tx.type))
  if (viewId === 'trades') return transactions.filter((tx) => TRADE_TYPES.includes(tx.type))
  return transactions
}

// Helper to render the badge safely
const TypeBadge = ({ type }) => {
  const style = TYPE_CONFIG[type] || { color: 'text-gray-400', bg: 'bg-gray-800', border: 'border-gray-700' }
  
  return (
    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-[4px] border ${style.bg} ${style.color} ${style.border}`}>
      {type}
    </span>
  )
}

function TransactionsTableFunding({ transactions }) {
  const filtered = transactions.filter((tx) => FUNDING_TYPES.includes(tx.type))
  if (filtered.length === 0) return null
  return (
    <div className="rounded-2xl border border-[#2b3139] bg-[#161a1e] overflow-hidden shadow-xl">
      <div className="px-6 py-4 border-b border-[#2b3139] flex items-center gap-2 bg-[#1e2329]/50">
        <ArrowDownToLine size={16} className="text-[#f3ba2f]" />
        <span className="text-sm font-bold text-[#eaecef] uppercase tracking-wider">Deposit & Withdrawals</span>
      </div>
      <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
        <table className="w-full min-w-[600px] text-left">
          <thead className="sticky top-0 bg-[#161a1e] z-10 shadow-sm">
            <tr className="text-xs text-[#848e9c] uppercase font-bold border-b border-[#2b3139]">
              <th className="py-4 px-6">Date</th>
              <th className="py-4 px-6">Type</th>
              <th className="py-4 px-6">Asset</th>
              <th className="py-4 px-6 text-right">Amount</th>
              <th className="py-4 px-6 text-right">Info</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2b3139]/30">
            {filtered.map((tx, i) => (
              <tr key={`funding-${i}`} className="hover:bg-[#1e2329] transition-colors group">
                <td className="py-4 px-6 text-xs text-[#848e9c] font-mono tabular-nums">
                  {tx.orderDate}
                </td>
                <td className="py-4 px-6">
                  <TypeBadge type={tx.type} />
                </td>
                <td className="py-4 px-6 text-[#eaecef] font-bold text-sm">
                  {tx.pair}
                </td>
                <td className="py-4 px-6 text-right font-mono tabular-nums font-bold text-[#eaecef]">
                  {tx.amount}
                </td>
                <td className="py-4 px-6 text-right text-xs text-[#848e9c] font-mono">
                  {tx.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TransactionsTableTrades({ transactions }) {
  const filtered = transactions.filter((tx) => TRADE_TYPES.includes(tx.type))
  if (filtered.length === 0) return null
  return (
    <div className="rounded-2xl border border-[#2b3139] bg-[#161a1e] overflow-hidden shadow-xl">
      <div className="px-6 py-4 border-b border-[#2b3139] flex items-center gap-2 bg-[#1e2329]/50">
        <TrendingUp size={16} className="text-[#0ecb81]" />
        <span className="text-sm font-bold text-[#eaecef] uppercase tracking-wider">Spot Trades</span>
      </div>
      <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
        <table className="w-full min-w-[700px] text-left">
          <thead className="sticky top-0 bg-[#161a1e] z-10 shadow-sm">
            <tr className="text-xs text-[#848e9c] uppercase font-bold border-b border-[#2b3139]">
              <th className="py-4 px-6">Date</th>
              <th className="py-4 px-6">Side</th>
              <th className="py-4 px-6">Pair</th>
              <th className="py-4 px-6 text-right">Avg. Price</th>
              <th className="py-4 px-6 text-right">Executed</th>
              <th className="py-4 px-6 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2b3139]/30">
            {filtered.map((tx, i) => (
              <tr key={`trades-${i}`} className="hover:bg-[#1e2329] transition-colors group">
                <td className="py-4 px-6 text-xs text-[#848e9c] font-mono tabular-nums">
                  {tx.orderDate}
                </td>
                <td className="py-4 px-6">
                  <TypeBadge type={tx.type} />
                </td>
                <td className="py-4 px-6 text-[#eaecef] font-bold text-sm">
                  {tx.pair}
                </td>
                <td className="py-4 px-6 text-right font-mono tabular-nums text-[#848e9c]">
                  {tx.price}
                </td>
                <td className="py-4 px-6 text-right font-mono tabular-nums text-[#eaecef]">
                  {tx.amount}
                </td>
                <td className="py-4 px-6 text-right font-mono tabular-nums font-bold text-[#eaecef]">
                  {tx.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function TransactionsTab() {
  const [transactions, setTransactions] = useState([])
  const [view, setView] = useState('all')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const unsubRef = useRef(null)

  const fetchTx = async () => {
    setLoading(true)
    try {
      const data = await getTransactions()
      setTransactions(data)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTx()
    unsubRef.current = subscribeTransactions((newTx) => {
      setTransactions((prev) => [newTx, ...prev])
    })
    return () => {
      if (unsubRef.current) unsubRef.current()
    }
  }, [])

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 px-4">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#eaecef] flex items-center gap-3">
          <History className="text-[#f3ba2f]" /> Transaction History
        </h1>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-[#1e2329] rounded-lg p-1 border border-[#2b3139]">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                  view === v.id
                    ? 'bg-[#2b3139] text-[#eaecef] shadow-sm'
                    : 'text-[#848e9c] hover:text-[#eaecef]'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          
          <button
            onClick={fetchTx}
            disabled={loading}
            className="p-2 rounded-lg bg-[#2b3139] text-[#848e9c] hover:text-[#eaecef] hover:bg-[#3e4752] border border-[#474d57] transition-all active:scale-95"
            title="Refresh Data"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-[#f6465d]/10 border border-[#f6465d]/30 text-[#f6465d] px-4 py-3 text-sm font-bold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#f6465d]" /> {error}
        </div>
      )}

      {/* TABLES */}
      {view === 'all' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <TransactionsTableFunding transactions={transactions} />
          <TransactionsTableTrades transactions={transactions} />
          {transactions.length === 0 && !loading && (
            <div className="rounded-2xl border border-[#2b3139] bg-[#161a1e] py-16 text-center text-[#848e9c]">
              <History size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-sm font-bold uppercase tracking-wider">No transaction history found</p>
            </div>
          )}
        </div>
      )}

      {view === 'funding' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <TransactionsTableFunding transactions={transactions} />
        </div>
      )}

      {view === 'trades' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <TransactionsTableTrades transactions={transactions} />
        </div>
      )}
    </div>
  )
}