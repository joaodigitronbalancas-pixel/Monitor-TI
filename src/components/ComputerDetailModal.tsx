import React, { useState, useEffect } from 'react';
import { 
  X, 
  Laptop, 
  Cpu, 
  Layers, 
  HardDrive, 
  Clock, 
  Network, 
  ShieldAlert, 
  Edit3, 
  Trash2, 
  Save, 
  CheckCircle, 
  User, 
  Calendar,
  Activity
} from 'lucide-react';
import { Computer, Alert, MetricPoint } from '../types';
import { api } from '../services/api';
import { formatUptime, formatRelativeTime, getUsageColor } from '../utils/formatters';

interface ComputerDetailModalProps {
  computerId: string;
  onClose: () => void;
  onComputerUpdated: () => void;
  isAdmin: boolean;
}

const SECTORS = [
  'TI & Infraestrutura',
  'Produção & Montagem',
  'Calibração & Qualidade',
  'Engenharia & P&D',
  'Vendas & Comercial',
  'Faturamento & Fiscal',
  'Diretoria & Adm',
  'Almoxarifado & Estoque'
];

export const ComputerDetailModal: React.FC<ComputerDetailModalProps> = ({
  computerId,
  onClose,
  onComputerUpdated,
  isAdmin,
}) => {
  const [computer, setComputer] = useState<Computer | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSector, setSelectedSector] = useState('');
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await api.getComputer(computerId);
        setComputer(res.computer);
        setAlerts(res.alerts);
        setSelectedSector(res.computer.sector);
        setNotes(res.computer.notes || '');
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar dados do computador.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [computerId]);

  const handleUpdateSector = async (newSector: string) => {
    if (!computer) return;
    try {
      setSelectedSector(newSector);
      await api.updateSector(computer.id, newSector);
      setComputer({ ...computer, sector: newSector });
      onComputerUpdated();
    } catch (err: any) {
      alert(`Falha ao alterar setor: ${err.message}`);
    }
  };

  const handleSaveNotes = async () => {
    if (!computer) return;
    try {
      setSavingNotes(true);
      await api.updateNotes(computer.id, notes);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      onComputerUpdated();
    } catch (err: any) {
      alert(`Falha ao salvar anotações: ${err.message}`);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDelete = async () => {
    if (!computer) return;
    if (confirm(`Tem certeza que deseja descadastrar a máquina "${computer.hostname}" do inventário?`)) {
      try {
        await api.deleteComputer(computer.id);
        onComputerUpdated();
        onClose();
      } catch (err: any) {
        alert(`Erro ao remover: ${err.message}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-8 max-w-md w-full text-center">
          <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone-300 font-medium text-sm">Carregando telemetria da estação...</p>
        </div>
      </div>
    );
  }

  if (error || !computer) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 max-w-md w-full text-center">
          <p className="text-red-400 font-semibold mb-4">{error || 'Computador não encontrado.'}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-lg text-xs font-semibold"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const isOnline = computer.status === 'online';
  const cpuColor = getUsageColor(computer.cpu_usage_pct);
  const ramColor = getUsageColor(computer.ram_usage_pct);
  const diskColor = getUsageColor(computer.disk_usage_pct);
  const history = computer.metrics_history || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-4xl w-full my-6 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/70">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl border ${
              isOnline ? 'bg-stone-800 border-stone-700 text-stone-200' : 'bg-red-950/40 border-red-900/60 text-red-400'
            }`}>
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-bold text-white">{computer.hostname}</h3>
                <span
                  className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    isOnline
                      ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/50'
                      : 'bg-red-950/70 text-red-400 border border-red-800/50'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
                  <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                </span>
              </div>
              <p className="text-xs text-stone-400 font-mono mt-0.5">
                ID da Máquina: {computer.id} • Agente v{computer.agent_version}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Top Telemetry KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* CPU Card */}
            <div className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-stone-400 flex items-center gap-1 font-medium">
                  <Cpu className="w-4 h-4 text-stone-400" /> Processador (CPU)
                </span>
                <span className={`text-base ${cpuColor.text}`}>{computer.cpu_usage_pct.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${cpuColor.bar}`}
                  style={{ width: `${Math.min(100, Math.max(3, computer.cpu_usage_pct))}%` }}
                />
              </div>
              <p className="text-[11px] text-stone-400 truncate">
                {computer.cpu_model || 'CPU x86/x64'} ({computer.cpu_cores || 4} núcleos)
              </p>
            </div>

            {/* RAM Card */}
            <div className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-stone-400 flex items-center gap-1 font-medium">
                  <Layers className="w-4 h-4 text-stone-400" /> Memória RAM
                </span>
                <span className={`text-base ${ramColor.text}`}>{computer.ram_usage_pct.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${ramColor.bar}`}
                  style={{ width: `${Math.min(100, Math.max(3, computer.ram_usage_pct))}%` }}
                />
              </div>
              <p className="text-[11px] text-stone-400">
                {computer.ram_used_gb} GB em uso de {computer.ram_total_gb} GB instalados
              </p>
            </div>

            {/* Disk Card */}
            <div className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-stone-400 flex items-center gap-1 font-medium">
                  <HardDrive className="w-4 h-4 text-stone-400" /> Armazenamento (C:)
                </span>
                <span className={`text-base ${diskColor.text}`}>{computer.disk_usage_pct.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${diskColor.bar}`}
                  style={{ width: `${Math.min(100, Math.max(3, computer.disk_usage_pct))}%` }}
                />
              </div>
              <p className="text-[11px] text-stone-400">
                {computer.disk_used_gb} GB ocupados de {computer.disk_total_gb} GB
              </p>
            </div>

          </div>

          {/* Historical Telemetry Sparkline (SVG Chart) */}
          <div className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-red-500" />
                <h4 className="text-xs uppercase tracking-wider font-bold text-stone-300">
                  Histórico Recente de Consumo (Últimos Heartbeats)
                </h4>
              </div>
              <div className="flex items-center space-x-3 text-[11px]">
                <span className="flex items-center gap-1 text-red-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span> CPU %
                </span>
                <span className="flex items-center gap-1 text-stone-300 font-medium">
                  <span className="w-2 h-2 rounded-full bg-stone-400"></span> RAM %
                </span>
              </div>
            </div>

            {history.length > 1 ? (
              <div className="h-28 w-full relative">
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                  {/* Grid Lines */}
                  <line x1="0" y1="25" x2="100" y2="25" stroke="#27272a" strokeDasharray="2" strokeWidth="0.5" />
                  <line x1="0" y1="50" x2="100" y2="50" stroke="#27272a" strokeDasharray="2" strokeWidth="0.5" />
                  <line x1="0" y1="75" x2="100" y2="75" stroke="#27272a" strokeDasharray="2" strokeWidth="0.5" />
                  
                  {/* RAM Line */}
                  <polyline
                    fill="none"
                    stroke="#a1a1aa"
                    strokeWidth="1.5"
                    points={history
                      .map((pt, idx) => {
                        const x = (idx / (history.length - 1)) * 100;
                        const y = 100 - pt.ram_usage_pct;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />

                  {/* CPU Line */}
                  <polyline
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth="2"
                    points={history
                      .map((pt, idx) => {
                        const x = (idx / (history.length - 1)) * 100;
                        const y = 100 - pt.cpu_usage_pct;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />
                </svg>
              </div>
            ) : (
              <div className="h-20 flex items-center justify-center text-xs text-stone-500">
                Aguardando coleta de novos heartbeats para traçar o gráfico de tendência...
              </div>
            )}
          </div>

          {/* System & Network Specifications Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* System Info */}
            <div className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-4 space-y-2.5 text-xs">
              <h4 className="text-xs uppercase tracking-wider font-bold text-stone-300 pb-1 border-b border-stone-800">
                Especificações de Sistema & Hardware
              </h4>
              
              <div className="flex justify-between py-1 border-b border-stone-800/50">
                <span className="text-stone-400">Sistema Operacional:</span>
                <span className="text-stone-200 font-semibold">{computer.os_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-800/50">
                <span className="text-stone-400">Compilação (Build):</span>
                <span className="text-stone-300 font-mono">{computer.os_build || 'N/D'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-800/50">
                <span className="text-stone-400">Usuário Conectado:</span>
                <span className="text-stone-200 font-semibold">{computer.logged_user}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-800/50">
                <span className="text-stone-400">Tempo Ativo (Uptime):</span>
                <span className="text-stone-300 font-mono">{formatUptime(computer.uptime_seconds)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-stone-400">Primeira Matrícula:</span>
                <span className="text-stone-300">{new Date(computer.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>

            {/* Network & Agent Info */}
            <div className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-4 space-y-2.5 text-xs">
              <h4 className="text-xs uppercase tracking-wider font-bold text-stone-300 pb-1 border-b border-stone-800">
                Rede & Configuração do Agente
              </h4>

              <div className="flex justify-between py-1 border-b border-stone-800/50">
                <span className="text-stone-400">Endereço IPv4:</span>
                <span className="text-stone-200 font-mono font-bold">{computer.ip_address}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-800/50">
                <span className="text-stone-400">Endereço Físico (MAC):</span>
                <span className="text-stone-300 font-mono">{computer.mac_address || '00:00:00:00:00:00'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-800/50">
                <span className="text-stone-400">Versão do Agente:</span>
                <span className="text-stone-200 font-semibold">v{computer.agent_version}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-800/50">
                <span className="text-stone-400">Estado do Serviço:</span>
                <span className="text-emerald-400 font-semibold uppercase">{computer.agent_status}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-stone-400">Última Comunicação:</span>
                <span className="text-stone-300">{formatRelativeTime(computer.last_heartbeat)}</span>
              </div>
            </div>

          </div>

          {/* Sector and Technical Notes Form */}
          <div className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-4 space-y-4">
            <h4 className="text-xs uppercase tracking-wider font-bold text-stone-300">
              Administração & Localização
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  Setor / Departamento da Máquina
                </label>
                <select
                  value={selectedSector}
                  onChange={(e) => handleUpdateSector(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                >
                  {SECTORS.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-stone-300">
                    Anotações Técnicas da Equipe de TI
                  </label>
                  {saveSuccess && (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Salvo com sucesso!
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Ponto de calibração de balanças industriais, responsável: Carlos"
                    className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-red-500"
                  />
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="px-3 py-2 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Machine Specific Alerts */}
          {alerts.length > 0 && (
            <div className="bg-stone-950/60 border border-red-900/40 rounded-xl p-4">
              <h4 className="text-xs uppercase tracking-wider font-bold text-red-400 flex items-center gap-1.5 mb-3">
                <ShieldAlert className="w-4 h-4" /> Alertas Registrados nesta Máquina
              </h4>
              <div className="space-y-2">
                {alerts.map((alt) => (
                  <div
                    key={alt.id}
                    className="p-2.5 rounded-lg bg-stone-900/80 border border-stone-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-stone-200">{alt.message}</span>
                      <span className="block text-[10px] text-stone-500">
                        {new Date(alt.created_at).toLocaleString('pt-BR')} • {alt.severity.toUpperCase()}
                      </span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      alt.acknowledged ? 'bg-stone-800 text-stone-400' : 'bg-red-950 text-red-400 border border-red-800'
                    }`}>
                      {alt.acknowledged ? 'Reconhecido' : 'Pendente'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-stone-800 bg-stone-950/70 flex items-center justify-between">
          {isAdmin ? (
            <button
              onClick={handleDelete}
              className="px-3 py-2 rounded-lg bg-red-950/60 hover:bg-red-900/80 border border-red-800/60 text-red-400 hover:text-red-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Descadastrar Máquina</span>
            </button>
          ) : <div />}

          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Fechar Janela
          </button>
        </div>

      </div>
    </div>
  );
};
