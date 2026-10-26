import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  LayoutGrid, 
  List, 
  Laptop, 
  Cpu, 
  Layers, 
  HardDrive, 
  Radio, 
  Key, 
  ShieldAlert, 
  CheckCircle,
  Plus,
  RefreshCw,
  Server,
  AlertTriangle
} from 'lucide-react';
import { Computer, User, Alert } from './types';
import { api, clearToken } from './services/api';
import { Navbar } from './components/Navbar';
import { ComputerTable } from './components/ComputerTable';
import { ComputerCard } from './components/ComputerCard';
import { ComputerDetailModal } from './components/ComputerDetailModal';
import { AlertsModal } from './components/AlertsModal';
import { TokenModal } from './components/TokenModal';
import { SimulatorModal } from './components/SimulatorModal';
import { AuditModal } from './components/AuditModal';
import { SettingsModal } from './components/SettingsModal';
import { LoginView } from './components/LoginView';

const SECTORS = [
  'Todos',
  'TI & Infraestrutura',
  'Produção & Montagem',
  'Calibração & Qualidade',
  'Engenharia & P&D',
  'Vendas & Comercial',
  'Faturamento & Fiscal',
  'Diretoria & Adm',
  'Almoxarifado & Estoque'
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Core Data
  const [computers, setComputers] = useState<Computer[]>([]);
  const [stats, setStats] = useState({ total: 0, online: 0, offline: 0, heartbeat_timeout_seconds: 90 });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & Display
  const [search, setSearch] = useState('');
  const [selectedSector, setSelectedSector] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Modals & Navigation
  const [activeTab, setActiveTab] = useState<'computers' | 'tokens' | 'simulator' | 'alerts' | 'audit' | 'settings'>('computers');
  const [selectedComputerId, setSelectedComputerId] = useState<string | null>(null);

  // Check initial session
  useEffect(() => {
    async function checkAuth() {
      try {
        const me = await api.getMe();
        setUser(me);
      } catch (e) {
        setUser(null);
      } finally {
        setAuthChecked(true);
      }
    }
    checkAuth();

    const handleExpired = () => setUser(null);
    window.addEventListener('digitron_auth_expired', handleExpired);
    return () => window.removeEventListener('digitron_auth_expired', handleExpired);
  }, []);

  // Fetch computers and alerts
  const fetchData = useCallback(async (showIndicator = false) => {
    if (!user) return;
    if (showIndicator) setIsRefreshing(true);

    try {
      const [compRes, alertRes] = await Promise.all([
        api.getComputers({
          search: search || undefined,
          sector: selectedSector !== 'Todos' ? selectedSector : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        }),
        api.getAlerts(false), // pending alerts
      ]);

      setComputers(compRes.computers);
      setStats(compRes.stats);
      setAlerts(alertRes.alerts);
    } catch (err) {
      console.error('[DIGI-TRON] Erro ao carregar dados:', err);
    } finally {
      if (showIndicator) setIsRefreshing(false);
    }
  }, [user, search, selectedSector, statusFilter]);

  // Periodic polling every 6 seconds to reflect heartbeats in real-time
  useEffect(() => {
    if (!user) return;
    fetchData();
    const interval = setInterval(() => {
      fetchData(false);
    }, 6000);
    return () => clearInterval(interval);
  }, [user, fetchData]);

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginView onLoginSuccess={(u) => setUser(u)} />;
  }

  const unreadAlertsCount = alerts.filter((a) => !a.acknowledged).length;
  const isAdmin = user.role === 'admin';

  // Calculate fleet average resources
  const avgCpu = computers.length > 0
    ? (computers.reduce((acc, c) => acc + c.cpu_usage_pct, 0) / computers.length).toFixed(1)
    : '0';
  const avgRam = computers.length > 0
    ? (computers.reduce((acc, c) => acc + c.ram_usage_pct, 0) / computers.length).toFixed(0)
    : '0';
  const avgDisk = computers.length > 0
    ? (computers.reduce((acc, c) => acc + c.disk_usage_pct, 0) / computers.length).toFixed(0)
    : '0';

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      
      {/* Top Navbar */}
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefresh={() => fetchData(true)}
        isRefreshing={isRefreshing}
        onLogout={handleLogout}
        unreadAlertsCount={unreadAlertsCount}
        stats={stats}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* KPI Fleet Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-4 flex items-center space-x-3 shadow-sm">
            <div className="p-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-200">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-stone-400">Total Cadastrado</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-extrabold text-white">{stats.total}</span>
                <span className="text-xs text-stone-400 font-medium">máquinas</span>
              </div>
            </div>
          </div>

          <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-4 flex items-center space-x-3 shadow-sm">
            <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-900/60 text-emerald-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-stone-400">Máquinas Online</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-extrabold text-emerald-400">{stats.online}</span>
                <span className="text-xs text-stone-400 font-medium">ativas agora</span>
              </div>
            </div>
          </div>

          <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-4 flex items-center space-x-3 shadow-sm">
            <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-900/60 text-red-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-stone-400">Máquinas Offline</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-extrabold text-red-400">{stats.offline}</span>
                <span className="text-xs text-stone-400 font-medium">&gt; {stats.heartbeat_timeout_seconds}s sem dados</span>
              </div>
            </div>
          </div>

          <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-4 flex items-center space-x-3 shadow-sm">
            <div className="p-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-200">
              <Cpu className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-stone-400">Média da Rede</span>
              <div className="flex items-center space-x-2 text-xs font-mono font-bold mt-1">
                <span className="text-stone-300">CPU: {avgCpu}%</span>
                <span className="text-stone-500">•</span>
                <span className="text-stone-300">RAM: {avgRam}%</span>
              </div>
            </div>
          </div>

        </div>

        {/* Action, Search and Filter Controls */}
        <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por hostname, usuário, IP, setor ou notas..."
                className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>

            {/* Filter Dropdowns & Status */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Sector Dropdown */}
              <div className="flex items-center space-x-1.5 bg-stone-950 border border-stone-800 rounded-xl px-3 py-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 text-stone-500" />
                <span className="text-stone-400">Setor:</span>
                <select
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  className="bg-transparent text-white focus:outline-none cursor-pointer"
                >
                  {SECTORS.map((s) => (
                    <option key={s} value={s} className="bg-stone-900 text-white">
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Radio Buttons */}
              <div className="flex items-center space-x-1 bg-stone-950 border border-stone-800 rounded-xl p-1 text-xs">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    statusFilter === 'all' ? 'bg-stone-800 text-white' : 'text-stone-400 hover:text-white'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setStatusFilter('online')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    statusFilter === 'online' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'text-stone-400 hover:text-white'
                  }`}
                >
                  Online
                </button>
                <button
                  onClick={() => setStatusFilter('offline')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    statusFilter === 'offline' ? 'bg-red-950 text-red-400 border border-red-800' : 'text-stone-400 hover:text-white'
                  }`}
                >
                  Offline
                </button>
              </div>

              {/* View Toggle (Table / Grid) */}
              <div className="flex items-center space-x-1 bg-stone-950 border border-stone-800 rounded-xl p-1 text-xs">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'table' ? 'bg-stone-800 text-white' : 'text-stone-500 hover:text-white'
                  }`}
                  title="Visualização em Tabela"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'grid' ? 'bg-stone-800 text-white' : 'text-stone-500 hover:text-white'
                  }`}
                  title="Visualização em Grade de Cards"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>

              {/* Install Agent Shortcut Button */}
              <button
                onClick={() => setActiveTab('tokens')}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm shadow-red-600/30 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Instalar Agente</span>
              </button>

            </div>
          </div>
        </div>

        {/* Computers View (Table or Grid) */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-300">
              Inventário de Estações de Trabalho ({computers.length})
            </h2>
            <span className="text-xs text-stone-400">
              Timeout configurado: <strong>{stats.heartbeat_timeout_seconds} segundos</strong>
            </span>
          </div>

          {viewMode === 'table' ? (
            <ComputerTable
              computers={computers}
              onSelectComputer={(comp) => setSelectedComputerId(comp.id)}
              timeoutSeconds={stats.heartbeat_timeout_seconds}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {computers.map((comp) => (
                <ComputerCard
                  key={comp.id}
                  computer={comp}
                  onSelect={(c) => setSelectedComputerId(c.id)}
                />
              ))}
            </div>
          )}
        </div>

      </main>

      {/* Modals */}
      {selectedComputerId && (
        <ComputerDetailModal
          computerId={selectedComputerId}
          onClose={() => setSelectedComputerId(null)}
          onComputerUpdated={() => fetchData(false)}
          isAdmin={isAdmin}
        />
      )}

      {activeTab === 'alerts' && (
        <AlertsModal
          alerts={alerts}
          onClose={() => setActiveTab('computers')}
          onRefresh={() => fetchData(false)}
        />
      )}

      {activeTab === 'tokens' && (
        <TokenModal
          onClose={() => setActiveTab('computers')}
          isAdmin={isAdmin}
        />
      )}

      {activeTab === 'simulator' && (
        <SimulatorModal
          onClose={() => setActiveTab('computers')}
          onRefreshComputers={() => fetchData(false)}
          timeoutSeconds={stats.heartbeat_timeout_seconds}
        />
      )}

      {activeTab === 'audit' && (
        <AuditModal onClose={() => setActiveTab('computers')} />
      )}

      {activeTab === 'settings' && (
        <SettingsModal
          onClose={() => setActiveTab('computers')}
          onSettingsSaved={() => fetchData(false)}
          isAdmin={isAdmin}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-stone-800 bg-stone-950 py-4 text-center text-xs text-stone-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>DIGI-TRON Monitor v1.2.0 • Sistema Corporativo de Monitoramento de Rede</span>
          <span className="text-stone-400 font-mono">Status: Servidor Operacional • Heartbeat a cada 60s</span>
        </div>
      </footer>

    </div>
  );
}
