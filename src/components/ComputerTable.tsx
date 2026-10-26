import React from 'react';
import { 
  Laptop, 
  User, 
  Network, 
  HardDrive, 
  Clock, 
  ExternalLink,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { Computer } from '../types';
import { formatUptime, formatRelativeTime, getUsageColor } from '../utils/formatters';

interface ComputerTableProps {
  computers: Computer[];
  onSelectComputer: (comp: Computer) => void;
  timeoutSeconds: number;
}

export const ComputerTable: React.FC<ComputerTableProps> = ({
  computers,
  onSelectComputer,
  timeoutSeconds
}) => {
  if (computers.length === 0) {
    return (
      <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-12 text-center">
        <Laptop className="w-12 h-12 text-stone-600 mx-auto mb-4" />
        <h3 className="text-base font-semibold text-stone-200">Nenhum computador encontrado</h3>
        <p className="text-sm text-stone-400 mt-1 max-w-md mx-auto">
          Não há computadores que correspondam aos filtros selecionados ou nenhum agente foi instalado ainda.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-800 bg-stone-900/40 shadow-sm">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-stone-800 bg-stone-900/80 text-stone-400 uppercase tracking-wider font-semibold text-[11px]">
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4">Computador</th>
            <th className="py-3 px-4">Usuário / IP</th>
            <th className="py-3 px-4">Setor</th>
            <th className="py-3 px-4">Sistema Operacional</th>
            <th className="py-3 px-4 w-32">CPU</th>
            <th className="py-3 px-4 w-36">Memória RAM</th>
            <th className="py-3 px-4 w-36">Disco (C:)</th>
            <th className="py-3 px-4">Tempo Ligado</th>
            <th className="py-3 px-4">Último Heartbeat</th>
            <th className="py-3 px-4 text-center">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-800/60 font-medium">
          {computers.map((comp) => {
            const isOnline = comp.status === 'online';
            const cpuColor = getUsageColor(comp.cpu_usage_pct);
            const ramColor = getUsageColor(comp.ram_usage_pct);
            const diskColor = getUsageColor(comp.disk_usage_pct);

            return (
              <tr
                key={comp.id}
                onClick={() => onSelectComputer(comp)}
                className="hover:bg-stone-800/40 transition-colors cursor-pointer group"
              >
                {/* Status Column */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      isOnline
                        ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/50'
                        : 'bg-red-950/70 text-red-400 border border-red-800/50'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'
                      }`}
                    ></span>
                    <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                  </span>
                </td>

                {/* Hostname Column */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center space-x-2">
                    <Laptop className="w-4 h-4 text-stone-400 group-hover:text-red-400 transition-colors" />
                    <div>
                      <span className="font-bold text-stone-100 group-hover:text-white transition-colors">
                        {comp.hostname}
                      </span>
                      <span className="block text-[10px] text-stone-400 font-mono">
                        v{comp.agent_version} • {comp.agent_status}
                      </span>
                    </div>
                  </div>
                </td>

                {/* User & IP */}
                <td className="py-3.5 px-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-1 text-stone-300">
                      <User className="w-3 h-3 text-stone-400" />
                      <span className="truncate max-w-[120px]">{comp.logged_user || 'N/A'}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-stone-400 font-mono text-[10px]">
                      <Network className="w-3 h-3 text-stone-400" />
                      <span>{comp.ip_address}</span>
                    </div>
                  </div>
                </td>

                {/* Sector */}
                <td className="py-3.5 px-4">
                  <span className="px-2 py-0.5 rounded bg-stone-800/80 text-stone-300 border border-stone-700/60 text-[11px]">
                    {comp.sector}
                  </span>
                </td>

                {/* OS */}
                <td className="py-3.5 px-4">
                  <span className="text-stone-300 block truncate max-w-[140px] text-[11px]">
                    {comp.os_name}
                  </span>
                  {comp.os_build && (
                    <span className="text-[10px] text-stone-400 font-mono block">
                      Build {comp.os_build}
                    </span>
                  )}
                </td>

                {/* CPU */}
                <td className="py-3.5 px-4">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-stone-400">Uso</span>
                      <span className={cpuColor.text}>{comp.cpu_usage_pct.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-stone-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${cpuColor.bar}`}
                        style={{ width: `${Math.min(100, Math.max(3, comp.cpu_usage_pct))}%` }}
                      ></div>
                    </div>
                  </div>
                </td>

                {/* RAM */}
                <td className="py-3.5 px-4">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-stone-400">{comp.ram_used_gb} / {comp.ram_total_gb} GB</span>
                      <span className={ramColor.text}>{comp.ram_usage_pct.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-stone-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${ramColor.bar}`}
                        style={{ width: `${Math.min(100, Math.max(3, comp.ram_usage_pct))}%` }}
                      ></div>
                    </div>
                  </div>
                </td>

                {/* Disk */}
                <td className="py-3.5 px-4">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-stone-400">{comp.disk_used_gb} / {comp.disk_total_gb} GB</span>
                      <span className={diskColor.text}>{comp.disk_usage_pct.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-stone-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${diskColor.bar}`}
                        style={{ width: `${Math.min(100, Math.max(3, comp.disk_usage_pct))}%` }}
                      ></div>
                    </div>
                  </div>
                </td>

                {/* Uptime */}
                <td className="py-3.5 px-4 whitespace-nowrap text-stone-300 font-mono text-[11px]">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-stone-400" />
                    <span>{formatUptime(comp.uptime_seconds)}</span>
                  </div>
                </td>

                {/* Last Heartbeat */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <span className={`text-[11px] font-medium ${isOnline ? 'text-stone-300' : 'text-red-400'}`}>
                    {formatRelativeTime(comp.last_heartbeat)}
                  </span>
                </td>

                {/* Actions */}
                <td className="py-3.5 px-4 text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectComputer(comp);
                    }}
                    className="p-1 rounded text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
                    title="Ver Detalhes do Computador"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
