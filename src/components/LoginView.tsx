import React, { useState } from 'react';
import { Cpu, Lock, User, AlertCircle, ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api';
import { User as UserType } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: UserType) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@Digitron2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.login(username, password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Falha na autenticação. Verifique os dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 selection:bg-red-600 selection:text-white">
      {/* Background ambient subtle glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-red-600/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        
        {/* Brand Header */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-600 flex items-center justify-center shadow-xl shadow-red-600/30 ring-1 ring-red-500/50 mx-auto mb-4">
            <Cpu className="w-9 h-9 text-white" />
          </div>
          <div className="flex items-center justify-center space-x-2">
            <h1 className="text-3xl font-extrabold tracking-wider text-white">DIGI-TRON</h1>
            <span className="text-xs uppercase tracking-widest font-bold bg-stone-800 text-red-400 px-2.5 py-1 rounded border border-stone-700">
              Monitor
            </span>
          </div>
          <p className="mt-2 text-sm text-stone-400 font-medium">
            Painel Central de Monitoramento de Rede Corporativa Windows
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {error && (
              <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-800/80 text-red-300 text-xs font-semibold flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1.5 uppercase tracking-wider">
                Usuário do Administrador
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-stone-600 focus:outline-none focus:border-red-500 transition-colors font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider">
                  Senha de Acesso
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-stone-600 focus:outline-none focus:border-red-500 transition-colors font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-500 hover:text-stone-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm flex items-center justify-center space-x-2 transition-all shadow-lg shadow-red-600/20 hover:shadow-red-600/30 cursor-pointer disabled:opacity-60"
            >
              <span>{loading ? 'Autenticando...' : 'Acessar Painel Central'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Seed Notice */}
          <div className="mt-6 pt-5 border-t border-stone-800/80 text-center">
            <div className="inline-flex items-center space-x-1.5 text-[11px] text-stone-400 font-mono bg-stone-950/60 px-3 py-1.5 rounded-lg border border-stone-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Acesso Inicial: <strong>admin</strong> / <strong>Admin@Digitron2026!</strong></span>
            </div>
            <p className="text-[10px] text-stone-500 mt-2">
              Proteção contra força bruta ativa: bloqueio automático após 5 tentativas incorretas.
            </p>
          </div>
        </div>

        {/* Corporate Footer */}
        <p className="text-center text-xs text-stone-400">
          DIGI-TRON Balanças e Automação Industrial © {new Date().getFullYear()}
        </p>

      </div>
    </div>
  );
};
