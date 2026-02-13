import React, { useState, useEffect } from 'react';
import { Wallet, TrendingUp, Gamepad2, History, UserCircle, LogOut } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { switchUser, getCurrentUser } from './api'; 

import MarketTab from './components/MarketTab';
import WalletTab from './components/WalletTab';
import CasinoTab from './components/CasinoTab';
import TransactionsTab from './components/TransactionsTab';

export default function App() {
  // FIX: Initialize state from LocalStorage, default to 'market' if empty
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('btm_active_tab') || 'market';
  });

  const currentUser = getCurrentUser(); 

  // FIX: Save to LocalStorage whenever activeTab changes
  useEffect(() => {
    localStorage.setItem('btm_active_tab', activeTab);
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-[#0b0e11] text-[#eaecef] font-sans flex flex-col md:flex-row">
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1e2329',
            color: '#eaecef',
            border: '1px solid #2b3139',
            padding: '16px',
            borderRadius: '12px',
          },
          success: { iconTheme: { primary: '#0ecb81', secondary: '#0b0e11' } },
          error: { iconTheme: { primary: '#f6465d', secondary: '#0b0e11' } },
        }}
      />

      {/* SIDEBAR */}
      <nav className="fixed bottom-0 w-full bg-[#161a1e] border-t border-[#2b3139] flex justify-between md:justify-start p-2 md:static md:w-20 md:h-screen md:flex-col md:border-t-0 md:border-r z-50">
        
        {/* Logo */}
        <div className="hidden md:flex justify-center p-6 mb-4">
          <div className="w-8 h-8 bg-[#f3ba2f] rounded-lg animate-pulse" />
        </div>
        
        {/* Tabs */}
        <div className="flex md:flex-col gap-2 w-full md:w-auto justify-around md:justify-start">
          <NavItem active={activeTab === 'market'} onClick={() => setActiveTab('market')} icon={<TrendingUp size={24} />} label="Market" />
          <NavItem active={activeTab === 'wallet'} onClick={() => setActiveTab('wallet')} icon={<Wallet size={24} />} label="Wallet" />
          <NavItem active={activeTab === 'casino'} onClick={() => setActiveTab('casino')} icon={<Gamepad2 size={24} />} label="Casino" />
          <NavItem active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} icon={<History size={24} />} label="History" />
        </div>

        {/* USER SWITCHER (Bottom of sidebar) */}
        <div className="hidden md:flex flex-col gap-2 mt-auto pb-6 border-t border-[#2b3139] pt-4 items-center">
          <button 
            onClick={() => switchUser(currentUser === 'user_1' ? 'user_2' : 'user_1')}
            className="p-3 rounded-xl bg-[#2b3139] text-[#f3ba2f] hover:bg-[#3e4752] transition-colors relative group"
          >
            <UserCircle size={24} />
            <span className="absolute left-16 bg-[#161a1e] border border-[#2b3139] px-3 py-1 rounded text-xs font-bold whitespace-nowrap hidden group-hover:block z-50">
              Switch to {currentUser === 'user_1' ? 'User 2' : 'User 1'}
            </span>
          </button>
          <div className="text-[10px] font-bold text-[#848e9c] uppercase tracking-wider">
            {currentUser === 'user_1' ? 'U1' : 'U2'}
          </div>
        </div>
      </nav>

      {/* MOBILE USER SWITCHER (Top Right) */}
      <div className="md:hidden absolute top-4 right-4 z-50">
        <button 
          onClick={() => switchUser(currentUser === 'user_1' ? 'user_2' : 'user_1')}
          className="flex items-center gap-2 px-3 py-2 bg-[#1e2329] rounded-full border border-[#2b3139] text-xs font-bold text-[#f3ba2f]"
        >
          <UserCircle size={16} />
          {currentUser === 'user_1' ? 'User 1' : 'User 2'}
        </button>
      </div>

      <main className="flex-1 overflow-y-auto h-screen p-4 md:p-8 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'market' && <MarketTab />}
          {activeTab === 'wallet' && <WalletTab />}
          {activeTab === 'casino' && <CasinoTab />}
          {activeTab === 'transactions' && <TransactionsTab />}
        </div>
      </main>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }) {
  return (
    <button 
      onClick={onClick}
      className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all duration-200 group ${
        active ? 'bg-[#2b3139] text-[#f3ba2f]' : 'text-[#848e9c] hover:bg-[#1e2329] hover:text-[#eaecef]'
      }`}
    >
      {icon}
      <span className="text-[10px] font-bold md:hidden">{label}</span>
      {/* Tooltip for Desktop */}
      <span className="hidden md:group-hover:block absolute left-16 bg-[#2b3139] px-2 py-1 rounded text-xs font-bold whitespace-nowrap z-50 border border-[#474d57]">
        {label}
      </span>
    </button>
  );
}
