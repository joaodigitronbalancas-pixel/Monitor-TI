import React from 'react';
import { 
  Server, 
  ShieldAlert, 
  Key, 
  Activity, 
  ClipboardList, 
  Settings, 
  LogOut, 
  RefreshCw,
  Radio,
  Cpu
} from 'lucide-react';
import { User, Alert } from '../types';

interface NavbarProps {
  user: User | null;
  activeTab: 'computers' | 'tokens' | 'simulator' | 'alerts' | 'audit' | 'settings';
  setActiveTab: (tab: 'computers' | 'tokens' | 'simulator' | 'alerts' | 'audit' | 'settings') => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onLogout: () => void;
  unreadAlertsCount: number;
  stats: { total: number; online: number; offline: number };
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  setActiveTab,
  onRefresh,
  isRefreshing,
  onLogout,
  unreadAlertsCount,
  stats
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-stone-800 bg-stone-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/20 ring-1 ring-red-500/40">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-extrabold tracking-wider text-white">DIGI-TRON</span>
                <span className="text-xs uppercase tracking-widest font-bold bg-stone-800 text-red-400 px-2 py-0.5 rounded border border-stone-700">
                  Monitor
                </span>
              </div>
              <p className="text-[10px] text-stone-400 font-medium">Balanças & Automação Corporativa</p>
            </div>
          </div>

          {/* Real-time Status Badges */}
          <div className="hidden md:flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-stone-900 border border-stone-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-stone-300 font-medium">Online: <strong className="text-white">{stats.online}</strong></span>
            </div>

            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-stone-900 border border-stone-800">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span className="text-stone-300 font-medium">Offline: <strong className="text-white">{stats.offline}</strong></span>
            </div>

            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-stone-900 border border-stone-800">
              <span className="text-stone-400">Total:</span>
              <strong className="text-white font-semibold">{stats.total}</strong>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('computers')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'computers'
                  ? 'bg-red-600 text-white shadow-sm shadow-red-600/30'
                  : 'text-stone-300 hover:text-white hover:bg-stone-900'
              }`}
            >
              <Server className="w-4 h-4" />
              <span>Computadores</span>
            </button>

            <button
              onClick={() => setActiveTab('alerts')}
              className={`relative flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'alerts'
                  ? 'bg-red-600 text-white shadow-sm shadow-red-600/30'
                  : 'text-stone-300 hover:text-white hover:bg-stone-900'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Alertas</span>
              {unreadAlertsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-red-500 text-white font-extrabold animate-pulse">
                  {unreadAlertsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('tokens')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'tokens'
                  ? 'bg-red-600 text-white shadow-sm shadow-red-600/30'
                  : 'text-stone-300 hover:text-white hover:bg-stone-900'
              }`}
            >
              <Key className="w-4 h-4" />
              <span>Instalação & Agente</span>
            </button>

            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'simulator'
                  ? 'bg-stone-800 text-red-400 border border-red-500/30'
                  : 'text-stone-300 hover:text-white hover:bg-stone-900'
              }`}
              title="Testador interativo de agentes e simulação de quedas de rede"
            >
              <Radio className="w-4 h-4" />
              <span>Testador de Rede</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'audit'
                  ? 'bg-red-600 text-white shadow-sm shadow-red-600/30'
                  : 'text-stone-300 hover:text-white hover:bg-stone-900'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Auditoria</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`p-1.5 rounded-md text-stone-300 hover:text-white hover:bg-stone-900 transition-all ${
                activeTab === 'settings' ? 'text-red-400 bg-stone-900' : ''
              }`}
              title="Configurações do Servidor"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-md text-stone-300 hover:text-white hover:bg-stone-900 transition-all"
              title="Atualizar dados agora"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-red-500' : ''}`} />
            </button>

            {/* User profile & logout */}
            <div className="pl-2 border-l border-stone-800 flex items-center space-x-2">
              <div className="hidden sm:block text-right">
                <span className="block text-xs font-bold text-stone-200">{user?.username}</span>
                <span className="block text-[10px] uppercase font-semibold text-stone-500">{user?.role}</span>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 rounded-md text-stone-400 hover:text-red-400 hover:bg-stone-900 transition-all"
                title="Sair do painel"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </nav>
        </div>
      </div>
    </header>
  );
};
