import React from 'react';
import { Laptop, User, Network, Clock, HardDrive, Cpu, Layers } from 'lucide-react';
import { Computer } from '../types';
import { formatUptime, formatRelativeTime, getUsageColor } from '../utils/formatters';

interface ComputerCardProps {
  computer: Computer;
  onSelect: (comp: Computer) => void;
}

export const ComputerCard: React.FC<ComputerCardProps> = ({ computer, onSelect }) => {
  const isOnline = computer.status === 'online';
  const cpuColor = getUsageColor(computer.cpu_usage_pct);
  const ramColor = getUsageColor(computer.ram_usage_pct);
  const diskColor = getUsageColor(computer.disk_usage_pct);

  return (
    <div
      onClick={() => onSelect(computer)}
      className="bg-stone-900/60 border border-stone-800 rounded-xl p-4 hover:border-red-600/50 hover:bg-stone-900 transition-all cursor-pointer shadow-sm relative group flex flex-col justify-between"
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2.5">
            <div className={`p-2 rounded-lg border ${
              isOnline 
                ? 'bg-stone-800 border-stone-700 text-stone-200' 
                : 'bg-red-950/40 border-red-900/50 text-red-400'
            }`}>
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-stone-100 group-hover:text-white transition-colors truncate max-w-[150px]">
                {computer.hostname}
              </h4>
              <span className="text-[11px] text-stone-400 block">{computer.sector}</span>
            </div>
          </div>

          <span
            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isOnline
                ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/50'
                : 'bg-red-950/70 text-red-400 border border-red-800/50'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
            <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </span>
        </div>

        {/* User and Network */}
        <div className="mt-3.5 space-y-1 text-xs text-stone-400 font-mono bg-stone-950/50 p-2.5 rounded-lg border border-stone-800/60">
          <div className="flex items-center justify-between">
            <span className="text-stone-500 flex items-center gap-1 font-sans"><User className="w-3 h-3" /> Usuário:</span>
            <span className="text-stone-200 font-sans truncate max-w-[130px]">{computer.logged_user || 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-500 flex items-center gap-1 font-sans"><Network className="w-3 h-3" /> IP:</span>
            <span className="text-stone-300">{computer.ip_address}</span>
          </div>
        </div>

        {/* Gauges */}
        <div className="mt-3.5 space-y-2.5">
          {/* CPU */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-stone-400 flex items-center gap-1"><Cpu className="w-3 h-3 text-stone-500" /> CPU</span>
              <span className={cpuColor.text}>{computer.cpu_usage_pct.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-stone-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${cpuColor.bar}`}
                style={{ width: `${Math.min(100, Math.max(3, computer.cpu_usage_pct))}%` }}
              />
            </div>
          </div>

          {/* RAM */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-stone-400 flex items-center gap-1"><Layers className="w-3 h-3 text-stone-500" /> RAM ({computer.ram_used_gb}/{computer.ram_total_gb} GB)</span>
              <span className={ramColor.text}>{computer.ram_usage_pct.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-stone-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${ramColor.bar}`}
                style={{ width: `${Math.min(100, Math.max(3, computer.ram_usage_pct))}%` }}
              />
            </div>
          </div>

          {/* Disk */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-stone-400 flex items-center gap-1"><HardDrive className="w-3 h-3 text-stone-500" /> Disco ({computer.disk_used_gb}/{computer.disk_total_gb} GB)</span>
              <span className={diskColor.text}>{computer.disk_usage_pct.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-stone-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${diskColor.bar}`}
                style={{ width: `${Math.min(100, Math.max(3, computer.disk_usage_pct))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-stone-800/80 flex items-center justify-between text-[11px] text-stone-400">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" /> Uptime: {formatUptime(computer.uptime_seconds)}
        </span>
        <span className={isOnline ? 'text-stone-400' : 'text-red-400 font-semibold'}>
          {formatRelativeTime(computer.last_heartbeat)}
        </span>
      </div>
    </div>
  );
};
