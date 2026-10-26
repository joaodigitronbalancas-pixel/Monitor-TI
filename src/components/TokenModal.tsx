import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Plus, 
  Copy, 
  Check, 
  Terminal, 
  Download, 
  Trash2, 
  X, 
  ShieldCheck, 
  FileCode,
  Info
} from 'lucide-react';
import { EnrollmentToken } from '../types';
import { api } from '../services/api';

interface TokenModalProps {
  onClose: () => void;
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

export const TokenModal: React.FC<TokenModalProps> = ({ onClose, isAdmin }) => {
  const [tokens, setTokens] = useState<EnrollmentToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  // New token form state
  const [sector, setSector] = useState(SECTORS[0]);
  const [description, setDescription] = useState('');
  const [daysValid, setDaysValid] = useState(30);
  const [maxUses, setMaxUses] = useState(50);
  const [creating, setCreating] = useState(false);

  // Server address for command generator
  const currentHost = window.location.origin;

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      setLoading(true);
      const res = await api.getTokens();
      setTokens(res.tokens);
    } catch (err: any) {
      alert(`Erro ao buscar tokens: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      await api.createToken({
        sector,
        description,
        days_valid: Number(daysValid),
        max_uses: Number(maxUses),
      });
      setDescription('');
      loadTokens();
    } catch (err: any) {
      alert(`Falha ao criar token: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (tokenStr: string) => {
    if (confirm(`Tem certeza que deseja revogar o token "${tokenStr}"?`)) {
      try {
        await api.revokeToken(tokenStr);
        loadTokens();
      } catch (err: any) {
        alert(`Erro ao revogar token: ${err.message}`);
      }
    }
  };

  const copyToClipboard = (text: string, type: 'token' | 'script', keyId: string) => {
    navigator.clipboard.writeText(text);
    if (type === 'token') {
      setCopiedToken(keyId);
      setTimeout(() => setCopiedToken(null), 2000);
    } else {
      setCopiedScript(keyId);
      setTimeout(() => setCopiedScript(null), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-4xl w-full my-6 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/70">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-red-950/50 border border-red-900/60 text-red-500">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Central de Instalação & Matrícula de Agentes</h3>
              <p className="text-xs text-stone-400">Tokens criptográficos de implantação autorizada para computadores Windows</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Instructions Banner */}
          <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 text-xs space-y-2">
            <div className="flex items-center space-x-2 text-stone-200 font-bold">
              <Terminal className="w-4 h-4 text-red-500" />
              <span>Como Instalar o Agente em um Computador Autorizado (Windows 10 / 11)</span>
            </div>
            <p className="text-stone-400 leading-relaxed">
              1. Copie o comando PowerShell de um dos tokens ativos abaixo.<br />
              2. Abra o <strong>PowerShell como Administrador</strong> na máquina que será monitorada.<br />
              3. Cole e execute o comando. O agente será configurado como serviço do Windows em segundo plano e transmitirá os dados imediatamente.
            </p>
          </div>

          {/* Create Token Form (Admin only) */}
          {isAdmin && (
            <div className="bg-stone-950/50 border border-stone-800 rounded-xl p-4">
              <h4 className="text-xs uppercase tracking-wider font-bold text-stone-300 mb-3 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-red-500" /> Gerar Novo Token de Matrícula
              </h4>
              <form onSubmit={handleCreateToken} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-stone-400 mb-1 font-semibold">Setor Padrão</label>
                  <select
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-red-500"
                  >
                    {SECTORS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-400 mb-1 font-semibold">Validade (Dias)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={daysValid}
                    onChange={(e) => setDaysValid(Number(e.target.value))}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-stone-400 mb-1 font-semibold">Máx. Computadores</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={maxUses}
                    onChange={(e) => setMaxUses(Number(e.target.value))}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-stone-400 mb-1 font-semibold">Descrição / Motivo</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ex: Lote de notebooks Qualidade"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-red-500"
                    />
                    <button
                      type="submit"
                      disabled={creating}
                      className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shrink-0 transition-colors"
                    >
                      {creating ? '...' : 'Gerar'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Tokens List */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-wider font-bold text-stone-300">
              Tokens Ativos & Comandos de Instalação
            </h4>

            {loading ? (
              <div className="text-center py-8 text-stone-500 text-xs">Carregando tokens...</div>
            ) : tokens.length === 0 ? (
              <div className="text-center py-8 text-stone-500 text-xs">Nenhum token ativo. Gere um acima.</div>
            ) : (
              tokens.map((t) => {
                const psCommand = `powershell -ExecutionPolicy Bypass -Command ".\\install-agent.ps1 -ServerUrl '${currentHost}' -EnrollmentToken '${t.token}'"`;
                const isExpired = new Date(t.expires_at).getTime() < Date.now();
                const isDepleted = t.max_uses > 0 && t.current_uses >= t.max_uses;

                return (
                  <div
                    key={t.token}
                    className={`p-4 rounded-xl border space-y-3 ${
                      !t.active || isExpired || isDepleted
                        ? 'bg-stone-950/40 border-stone-800 opacity-60'
                        : 'bg-stone-950/70 border-stone-800/80 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-sm text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-900/50">
                          {t.token}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-stone-800 text-stone-300 text-[10px] font-semibold">
                          Setor: {t.assigned_sector}
                        </span>
                        {t.description && (
                          <span className="text-xs text-stone-400 italic">"{t.description}"</span>
                        )}
                      </div>

                      <div className="flex items-center space-x-3 text-xs text-stone-400">
                        <span>Usos: <strong className="text-white">{t.current_uses}</strong> / {t.max_uses}</span>
                        <span>Expira: {new Date(t.expires_at).toLocaleDateString('pt-BR')}</span>
                        {isAdmin && t.active && (
                          <button
                            onClick={() => handleRevoke(t.token)}
                            className="p-1 text-stone-500 hover:text-red-400 transition-colors"
                            title="Revogar Token"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Quick Copy Script Line */}
                    <div className="flex items-center gap-2 bg-stone-900 p-2 rounded-lg border border-stone-800 text-[11px] font-mono text-stone-300">
                      <span className="text-red-500 select-none">PS&gt;</span>
                      <span className="truncate flex-1 select-all">{psCommand}</span>
                      <button
                        onClick={() => copyToClipboard(psCommand, 'script', t.token)}
                        className="p-1 px-2.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs flex items-center gap-1 transition-colors shrink-0"
                      >
                        {copiedScript === t.token ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar Comando</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

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
