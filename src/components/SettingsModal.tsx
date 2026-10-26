import React, { useState, useEffect } from 'react';
import { Settings, Save, Lock, Server, ShieldCheck, X, CheckCircle, Info } from 'lucide-react';
import { SystemSettings } from '../types';
import { api } from '../services/api';

interface SettingsModalProps {
  onClose: () => void;
  onSettingsSaved: () => void;
  isAdmin: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  onSettingsSaved,
  isAdmin
}) => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await api.getSettings();
      setSettings(res.settings);
      setServerInfo(res.server_info);
    } catch (err: any) {
      alert(`Erro ao carregar configurações: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      setSaving(true);
      await api.updateSettings(settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
      onSettingsSaved();
    } catch (err: any) {
      alert(`Erro ao salvar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwdMsg({ text: 'A confirmação de senha não confere.', error: true });
      return;
    }
    if (newPassword.length < 8) {
      setPwdMsg({ text: 'A nova senha deve ter no mínimo 8 caracteres.', error: true });
      return;
    }

    try {
      setPwdLoading(true);
      await api.changePassword(currentPassword, newPassword);
      setPwdMsg({ text: 'Senha alterada com sucesso!', error: false });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwdMsg({ text: err.message || 'Erro ao alterar senha.', error: true });
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-3xl w-full my-6 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/70">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-200">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Configurações do Servidor Central</h3>
              <p className="text-xs text-stone-400">Regras de monitoramento, tolerâncias de timeout e segurança</p>
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
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          
          {loading || !settings ? (
            <div className="text-center py-8 text-stone-500">Carregando parâmetros...</div>
          ) : (
            <>
              {/* Monitoring Rules Form */}
              <form onSubmit={handleSaveSettings} className="bg-stone-950/60 border border-stone-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs uppercase tracking-wider font-bold text-stone-300">
                    Regras de Heartbeat & Tolerância de Conexão
                  </h4>
                  {success && (
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle className="w-4 h-4" /> Parâmetros atualizados!
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-stone-400 mb-1 font-semibold">
                      Timeout de Heartbeat (Segundos)
                    </label>
                    <input
                      type="number"
                      min="30"
                      max="600"
                      disabled={!isAdmin}
                      value={settings.heartbeat_timeout_seconds}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          heartbeat_timeout_seconds: Number(e.target.value),
                        })
                      }
                      className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-red-500 font-mono"
                    />
                    <span className="text-[10px] text-stone-400 block mt-1">
                      Tempo sem comunicação após o qual a máquina é classificada como <strong>OFFLINE</strong> (Padrão: 90s).
                    </span>
                  </div>

                  <div>
                    <label className="block text-stone-400 mb-1 font-semibold">
                      Alerta de CPU Crítica (%)
                    </label>
                    <input
                      type="number"
                      min="50"
                      max="99"
                      disabled={!isAdmin}
                      value={settings.alert_cpu_threshold_pct}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          alert_cpu_threshold_pct: Number(e.target.value),
                        })
                      }
                      className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-red-500 font-mono"
                    />
                    <span className="text-[10px] text-stone-400 block mt-1">
                      Dispara alerta quando uso de processador exceder esta porcentagem.
                    </span>
                  </div>

                  <div>
                    <label className="block text-stone-400 mb-1 font-semibold">
                      Alerta de Memória RAM Crítica (%)
                    </label>
                    <input
                      type="number"
                      min="50"
                      max="99"
                      disabled={!isAdmin}
                      value={settings.alert_ram_threshold_pct}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          alert_ram_threshold_pct: Number(e.target.value),
                        })
                      }
                      className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-red-500 font-mono"
                    />
                    <span className="text-[10px] text-stone-400 block mt-1">
                      Dispara alerta quando a ocupação de memória atingir o limite.
                    </span>
                  </div>

                  <div>
                    <label className="block text-stone-400 mb-1 font-semibold">
                      Alerta de Disco Cheio (%)
                    </label>
                    <input
                      type="number"
                      min="50"
                      max="99"
                      disabled={!isAdmin}
                      value={settings.alert_disk_threshold_pct}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          alert_disk_threshold_pct: Number(e.target.value),
                        })
                      }
                      className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-red-500 font-mono"
                    />
                    <span className="text-[10px] text-stone-400 block mt-1">
                      Dispara alerta quando o volume de sistema estiver perto de esgotar.
                    </span>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{saving ? 'Salvando...' : 'Salvar Regras'}</span>
                    </button>
                  </div>
                )}
              </form>

              {/* Password Change Form */}
              <form onSubmit={handleChangePassword} className="bg-stone-950/60 border border-stone-800 rounded-xl p-4 space-y-3">
                <h4 className="text-xs uppercase tracking-wider font-bold text-stone-300 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-stone-400" /> Alterar Senha de Acesso
                </h4>

                {pwdMsg && (
                  <div className={`p-2.5 rounded-lg text-xs font-semibold ${
                    pwdMsg.error ? 'bg-red-950/70 text-red-400 border border-red-800' : 'bg-emerald-950/70 text-emerald-400 border border-emerald-800'
                  }`}>
                    {pwdMsg.text}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-stone-400 mb-1 font-semibold">Senha Atual</label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-400 mb-1 font-semibold">Nova Senha</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-400 mb-1 font-semibold">Confirmar Senha</label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-red-500"
                      />
                      <button
                        type="submit"
                        disabled={pwdLoading}
                        className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-white font-bold rounded-lg shrink-0 transition-colors"
                      >
                        {pwdLoading ? '...' : 'Atualizar'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              {/* Server Networking Details */}
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 text-xs space-y-2">
                <div className="flex items-center space-x-2 text-stone-200 font-bold">
                  <Server className="w-4 h-4 text-stone-400" />
                  <span>Informações de Rede do Servidor Central</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-stone-400 font-mono">
                  <div>URL Base Local: <strong className="text-white">{window.location.origin}</strong></div>
                  <div>Endpoint API: <strong className="text-white">{window.location.origin}/api/v1</strong></div>
                  <div>Status Health: <strong className="text-emerald-400">{window.location.origin}/health</strong></div>
                  <div>Plataforma: <strong className="text-white">{serverInfo?.platform || 'windows'}</strong></div>
                </div>
              </div>
            </>
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
