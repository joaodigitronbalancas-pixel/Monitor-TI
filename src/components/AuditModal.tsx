import React, { useState, useEffect } from 'react';
import { ClipboardList, Shield, Clock, Network, User, X, Filter } from 'lucide-react';
import { AuditLog } from '../types';
import { api } from '../services/api';

interface AuditModalProps {
  onClose: () => void;
}

export const AuditModal: React.FC<AuditModalProps> = ({ onClose }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getAuditLogs();
      setLogs(res.audit_logs);
    } catch (err: any) {
      alert(`Erro ao buscar trilha de auditoria: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(
    (l) =>
      l.user.toLowerCase().includes(filterText.toLowerCase()) ||
      l.action.toLowerCase().includes(filterText.toLowerCase()) ||
      l.details.toLowerCase().includes(filterText.toLowerCase()) ||
      l.ip_address.includes(filterText)
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-4xl w-full my-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/70">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-200">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Trilha de Auditoria & Conformidade</h3>
              <p className="text-xs text-stone-400">Registro imutável de todas as ações administrativas e eventos do sistema</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-3 border-b border-stone-800 bg-stone-950/40">
          <input
            type="text"
            placeholder="Filtrar por usuário, ação, IP ou detalhe..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-red-500"
          />
        </div>

        {/* Logs Table */}
        <div className="p-6 overflow-y-auto flex-1 text-xs">
          {loading ? (
            <div className="text-center py-8 text-stone-500">Carregando registros de auditoria...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-stone-500">Nenhum registro encontrado.</div>
          ) : (
            <div className="divide-y divide-stone-800/80">
              {filteredLogs.map((log) => (
                <div key={log.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white font-mono">{log.action}</span>
                      <span className="px-2 py-0.2 rounded bg-stone-800 text-stone-400 text-[10px] uppercase font-semibold">
                        {log.resource_type}
                      </span>
                      <span className="text-stone-400 text-[11px] flex items-center gap-1">
                        <User className="w-3 h-3" /> {log.user}
                      </span>
                    </div>
                    <p className="text-stone-300 text-xs">{log.details}</p>
                    <div className="flex items-center space-x-3 text-[10px] text-stone-500 font-mono">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                      <span className="flex items-center gap-1"><Network className="w-3 h-3" /> IP: {log.ip_address}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-800 bg-stone-950/70 flex justify-end">
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
