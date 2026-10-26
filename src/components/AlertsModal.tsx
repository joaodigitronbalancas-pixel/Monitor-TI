import React, { useState } from 'react';
import { ShieldAlert, CheckCircle, Clock, AlertTriangle, AlertCircle, X, Check } from 'lucide-react';
import { Alert } from '../types';
import { api } from '../services/api';

interface AlertsModalProps {
  alerts: Alert[];
  onClose: () => void;
  onRefresh: () => void;
}

export const AlertsModal: React.FC<AlertsModalProps> = ({ alerts, onClose, onRefresh }) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'ack'>('pending');
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const handleAcknowledge = async (id: string) => {
    try {
      setAcknowledgingId(id);
      await api.acknowledgeAlert(id);
      onRefresh();
    } catch (err: any) {
      alert(`Falha ao reconhecer alerta: ${err.message}`);
    } finally {
      setAcknowledgingId(null);
    }
  };

  const filtered = alerts.filter((a) => {
    if (filter === 'pending') return !a.acknowledged;
    if (filter === 'ack') return a.acknowledged;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-3xl w-full my-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/70">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-red-950/50 border border-red-900/60 text-red-500">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Central de Alertas & Incidentes</h3>
              <p className="text-xs text-stone-400">Notificações operacionais de recursos críticos e máquinas offline</p>
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
        <div className="px-6 py-3 border-b border-stone-800 bg-stone-950/40 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs">
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filter === 'pending'
                  ? 'bg-red-600 text-white'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800'
              }`}
            >
              Pendentes ({alerts.filter((a) => !a.acknowledged).length})
            </button>
            <button
              onClick={() => setFilter('ack')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filter === 'ack'
                  ? 'bg-stone-800 text-white border border-stone-700'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800'
              }`}
            >
              Reconhecidos ({alerts.filter((a) => a.acknowledged).length})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-stone-800 text-white border border-stone-700'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800'
              }`}
            >
              Todos ({alerts.length})
            </button>
          </div>
        </div>

        {/* Alerts List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-stone-500">
              <CheckCircle className="w-10 h-10 text-emerald-500/50 mx-auto mb-2" />
              <p className="text-sm font-semibold text-stone-300">Nenhum alerta pendente no momento</p>
              <p className="text-xs text-stone-500 mt-1">Todos os computadores da rede estão operando normalmente.</p>
            </div>
          ) : (
            filtered.map((alert) => {
              const isCrit = alert.severity === 'critical';
              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                    alert.acknowledged
                      ? 'bg-stone-950/40 border-stone-800 text-stone-400'
                      : isCrit
                      ? 'bg-red-950/30 border-red-900/60 text-stone-200'
                      : 'bg-amber-950/20 border-amber-900/50 text-stone-200'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg mt-0.5 ${
                      isCrit ? 'bg-red-950 text-red-400' : 'bg-amber-950 text-amber-400'
                    }`}>
                      {isCrit ? <AlertCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <strong className="text-sm font-bold text-white">{alert.computer_name}</strong>
                        <span className={`text-[10px] font-bold px-2 py-0.2 rounded uppercase ${
                          isCrit ? 'bg-red-900/60 text-red-300' : 'bg-amber-900/60 text-amber-300'
                        }`}>
                          {alert.type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-stone-300 mt-1">{alert.message}</p>
                      <span className="text-[10px] text-stone-500 flex items-center gap-1 mt-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {new Date(alert.created_at).toLocaleString('pt-BR')}
                        {alert.acknowledged_by && ` • Reconhecido por ${alert.acknowledged_by}`}
                      </span>
                    </div>
                  </div>

                  {!alert.acknowledged && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      disabled={acknowledgingId === alert.id}
                      className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
                      title="Marcar alerta como ciente"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Reconhecer</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-800 bg-stone-950/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
